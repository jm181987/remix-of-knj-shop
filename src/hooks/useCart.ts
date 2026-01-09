import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  variant_id?: string | null;
  size?: string | null;
  color?: string | null;
}

const CART_STORAGE_KEY = "store-cart";

// Generate a unique key for cart items based on product and variant
const getCartItemKey = (productId: string, variantId?: string | null) => {
  return variantId ? `${productId}_${variantId}` : productId;
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const itemKey = getCartItemKey(product.id, product.variant_id);
      const existing = prev.find(
        (item) => getCartItemKey(item.id, item.variant_id) === itemKey
      );
      if (existing) {
        return prev.map((item) =>
          getCartItemKey(item.id, item.variant_id) === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string | null) => {
    const itemKey = getCartItemKey(productId, variantId);
    setItems((prev) => 
      prev.filter((item) => getCartItemKey(item.id, item.variant_id) !== itemKey)
    );
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string | null) => {
    const itemKey = getCartItemKey(productId, variantId);
    if (quantity <= 0) {
      setItems((prev) => 
        prev.filter((item) => getCartItemKey(item.id, item.variant_id) !== itemKey)
      );
    } else {
      setItems((prev) =>
        prev.map((item) =>
          getCartItemKey(item.id, item.variant_id) === itemKey 
            ? { ...item, quantity } 
            : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  };
}