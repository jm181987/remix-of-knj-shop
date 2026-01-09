import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  product_id: string;
  quantity: number;
}

interface CreateOrderRequest {
  items: CartItem[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  delivery: {
    latitude: number;
    longitude: number;
    distance: number;
    shipping_method: 'pickup' | 'local' | 'sedex_brazil' | 'turil_uruguay';
  };
  notes?: string;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateDeliveryFee(
  distanceKm: number,
  baseFee: number,
  perKmFee: number,
  maxKm: number
): number {
  const chargeableKm = Math.min(distanceKm, maxKm);
  return baseFee + chargeableKm * perKmFee;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateOrderRequest = await req.json();
    
    // Validate request structure
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      console.error('Invalid items:', body.items);
      return new Response(
        JSON.stringify({ error: 'Items array is required and cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.customer || !body.customer.name || !body.customer.phone) {
      console.error('Invalid customer data:', body.customer);
      return new Response(
        JSON.stringify({ error: 'Customer name and phone are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.delivery || !body.delivery.shipping_method) {
      console.error('Invalid delivery data:', body.delivery);
      return new Response(
        JSON.stringify({ error: 'Delivery information with shipping method is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths to prevent abuse
    if (body.customer.name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Customer name too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (body.customer.phone.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Phone number too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (body.customer.email && body.customer.email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Email too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (body.customer.address && body.customer.address.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Address too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (body.notes && body.notes.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Notes too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate items (product_id format and quantity)
    for (const item of body.items) {
      if (!item.product_id || typeof item.product_id !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid product_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 999) {
        return new Response(
          JSON.stringify({ error: 'Invalid quantity' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Processing order request:', {
      itemCount: body.items.length,
      shippingMethod: body.delivery.shipping_method,
      customerPhone: body.customer.phone.substring(0, 4) + '****'
    });

    // 1. Fetch store settings for delivery fee calculation
    const { data: storeSettings, error: settingsError } = await supabase
      .from('store_settings')
      .select('store_latitude, store_longitude, delivery_base_fee, delivery_per_km, delivery_max_km, sedex_brazil_fee, turil_uruguay_fee')
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching store settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch store settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Uruguay shipping tiers
    const { data: uruguayTiers, error: tiersError } = await supabase
      .from('shipping_tiers_uruguay')
      .select('*')
      .order('max_weight_kg', { ascending: true });

    if (tiersError) {
      console.error('Error fetching shipping tiers:', tiersError);
    }

    const storeLat = Number(storeSettings?.store_latitude) || -34.6037;
    const storeLon = Number(storeSettings?.store_longitude) || -58.3816;
    const baseFee = Number(storeSettings?.delivery_base_fee) || 5;
    const perKmFee = Number(storeSettings?.delivery_per_km) || 1.5;
    const maxKm = Number(storeSettings?.delivery_max_km) || 4;
    const sedexFee = Number(storeSettings?.sedex_brazil_fee) || 30;

    // 2. Fetch product data from database (SERVER-SIDE PRICE VALIDATION)
    const productIds = body.items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock, is_active, weight_kg')
      .in('id', productIds);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch product data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate all products exist and are active
    const productMap = new Map(products?.map(p => [p.id, p]) || []);
    const orderItems: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }> = [];

    let subtotal = 0;
    let totalWeight = 0;

    for (const item of body.items) {
      const product = productMap.get(item.product_id);
      
      if (!product) {
        console.error('Product not found:', item.product_id);
        return new Response(
          JSON.stringify({ error: `Product not found: ${item.product_id}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!product.is_active) {
        console.error('Product not active:', item.product_id);
        return new Response(
          JSON.stringify({ error: `Product is not available: ${product.name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        console.error('Insufficient stock:', { product: product.name, available: product.stock, requested: item.quantity });
        return new Response(
          JSON.stringify({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use SERVER-SIDE price from database (not client-provided)
      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;
      
      // Accumulate weight
      const productWeight = Number(product.weight_kg) || 0.5;
      totalWeight += productWeight * item.quantity;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal: itemSubtotal,
      });
    }

    // 4. Calculate delivery fee SERVER-SIDE
    let deliveryFee = 0;
    let validatedDistance = 0;

    if (body.delivery.shipping_method === 'pickup') {
      deliveryFee = 0;
    } else if (body.delivery.shipping_method === 'local') {
      // Validate and recalculate distance on server
      // Check for valid coordinates (not null/undefined, but 0 is valid)
      if (body.delivery.latitude != null && body.delivery.longitude != null && 
          (body.delivery.latitude !== 0 || body.delivery.longitude !== 0)) {
        validatedDistance = calculateDistance(
          storeLat,
          storeLon,
          body.delivery.latitude,
          body.delivery.longitude
        );
        
        // Check if within local delivery range
        if (validatedDistance > maxKm) {
          console.error('Local delivery out of range:', { distance: validatedDistance, maxKm });
          return new Response(
            JSON.stringify({ error: `Local delivery only available within ${maxKm}km. Distance: ${validatedDistance.toFixed(1)}km` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        deliveryFee = calculateDeliveryFee(validatedDistance, baseFee, perKmFee, maxKm);
      } else {
        return new Response(
          JSON.stringify({ error: 'Location required for local delivery' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (body.delivery.shipping_method === 'sedex_brazil') {
      deliveryFee = sedexFee;
    } else if (body.delivery.shipping_method === 'turil_uruguay') {
      // Calculate Uruguay shipping fee based on weight tiers
      if (uruguayTiers && uruguayTiers.length > 0) {
        // Find the appropriate tier based on total weight
        const tier = uruguayTiers.find(t => totalWeight <= Number(t.max_weight_kg));
        if (tier) {
          deliveryFee = Number(tier.price);
        } else {
          // If weight exceeds all tiers, use the highest tier
          deliveryFee = Number(uruguayTiers[uruguayTiers.length - 1].price);
        }
        console.log('Uruguay shipping calculated:', { totalWeight, selectedTier: tier, deliveryFee });
      } else {
        // Fallback to old flat fee
        deliveryFee = Number(storeSettings?.turil_uruguay_fee) || 245;
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid shipping method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderTotal = subtotal + deliveryFee;

    console.log('Order calculation:', {
      subtotal,
      deliveryFee,
      orderTotal,
      shippingMethod: body.delivery.shipping_method,
      distance: validatedDistance
    });

    // 5. Create or find customer
    let customerId: string;

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', body.customer.phone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update customer info
      await supabase
        .from('customers')
        .update({
          name: body.customer.name,
          email: body.customer.email || null,
          address: body.customer.address || null,
          latitude: body.delivery.latitude || null,
          longitude: body.delivery.longitude || null,
        })
        .eq('id', customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: body.customer.name,
          email: body.customer.email || null,
          phone: body.customer.phone,
          address: body.customer.address || null,
          latitude: body.delivery.latitude || null,
          longitude: body.delivery.longitude || null,
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return new Response(
          JSON.stringify({ error: 'Failed to create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      customerId = newCustomer.id;
    }

    // 6. Create order with SERVER-VALIDATED prices
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        total: orderTotal,
        delivery_address: body.customer.address || null,
        delivery_fee: deliveryFee,
        delivery_distance: validatedDistance || null,
        delivery_latitude: body.delivery.latitude || null,
        delivery_longitude: body.delivery.longitude || null,
        shipping_method: body.delivery.shipping_method,
        notes: body.notes || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Create order items with SERVER-VALIDATED prices
    const orderItemsToInsert = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Attempt to clean up the order
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create order items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Create delivery record
    const { error: deliveryError } = await supabase
      .from('deliveries')
      .insert({
        order_id: order.id,
        status: 'pending',
        driver_id: null,
      });

    if (deliveryError) {
      console.error('Error creating delivery:', deliveryError);
      // Don't fail the order, delivery record is secondary
    }

    console.log('Order created successfully:', { orderId: order.id, total: orderTotal });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        total: orderTotal,
        subtotal,
        delivery_fee: deliveryFee,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in create-order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
