CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'driver'
);


--
-- Name: handle_new_customer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_customer() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.customer_profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_stock_on_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_stock_on_order() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text DEFAULT 'Casa'::text,
    address text NOT NULL,
    latitude numeric,
    longitude numeric,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    driver_name text,
    driver_phone text,
    estimated_delivery timestamp with time zone,
    actual_delivery timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    driver_id uuid,
    picked_at timestamp with time zone,
    driver_latitude numeric,
    driver_longitude numeric,
    driver_location_updated_at timestamp with time zone,
    last_notification_at timestamp with time zone,
    last_notification_status text,
    driver_notes text,
    CONSTRAINT deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'assigned'::text, 'in_transit'::text, 'delivered'::text, 'failed'::text])))
);


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    is_tracking boolean DEFAULT false,
    last_location_lat numeric,
    last_location_lon numeric,
    location_updated_at timestamp with time zone
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    variant_id uuid,
    size text,
    color text
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_reference text,
    delivery_address text,
    delivery_latitude numeric(10,8),
    delivery_longitude numeric(11,8),
    delivery_distance numeric(10,2),
    delivery_fee numeric(10,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shipping_method text DEFAULT 'local'::text,
    user_id uuid,
    payment_method text,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'preparing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    size text,
    color text,
    stock integer DEFAULT 0 NOT NULL,
    price_adjustment numeric DEFAULT 0,
    sku text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    image_url text,
    category text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pickup_enabled boolean DEFAULT false NOT NULL,
    cost_price numeric DEFAULT 0,
    image_urls text[] DEFAULT '{}'::text[],
    weight_kg numeric DEFAULT 0.5
);


--
-- Name: shipping_tiers_uruguay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_tiers_uruguay (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    max_weight_kg numeric NOT NULL,
    dimensions text NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_name text DEFAULT 'Mi Tienda'::text,
    store_latitude numeric(10,8) DEFAULT '-34.6037'::numeric,
    store_longitude numeric(11,8) DEFAULT '-58.3816'::numeric,
    delivery_base_fee numeric(10,2) DEFAULT 5.00,
    delivery_per_km numeric(10,2) DEFAULT 1.50,
    pushinpay_api_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_max_km numeric DEFAULT 4,
    sedex_brazil_fee numeric DEFAULT 30,
    turil_uruguay_fee numeric DEFAULT 30,
    store_address text,
    whatsapp_number text,
    brl_to_uyu_rate numeric DEFAULT 8.5,
    mercadopago_access_token text,
    resend_api_key text,
    mercadopago_brasil_access_token text,
    mercadopago_brasil_public_key text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles customer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles customer_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_user_id_key UNIQUE (user_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: shipping_tiers_uruguay shipping_tiers_uruguay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_tiers_uruguay
    ADD CONSTRAINT shipping_tiers_uruguay_pkey PRIMARY KEY (id);


--
-- Name: store_settings store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: customer_addresses update_customer_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_profiles update_customer_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deliveries update_deliveries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variants update_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_items update_stock_after_order_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_after_order_item AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_order();


--
-- Name: store_settings update_store_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_addresses customer_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customer_profiles customer_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES auth.users(id);


--
-- Name: deliveries deliveries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: drivers drivers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customers Admins can delete customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete customers" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customers Admins can insert customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: deliveries Admins can manage deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage deliveries" ON public.deliveries TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: drivers Admins can manage drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage drivers" ON public.drivers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: order_items Admins can manage order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage order items" ON public.order_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins can manage orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage orders" ON public.orders TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.products TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: store_settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.store_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipping_tiers_uruguay Admins can manage shipping tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipping tiers" ON public.shipping_tiers_uruguay USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_variants Admins can manage variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage variants" ON public.product_variants TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customers Admins can update customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customer_addresses Admins can view all addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all addresses" ON public.customer_addresses FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customer_profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.customer_profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customers Admins can view customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view customers" ON public.customers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: store_settings Admins can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view settings" ON public.store_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: drivers Block anonymous access to drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous access to drivers" ON public.drivers TO anon USING (false);


--
-- Name: order_items Block anonymous access to order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous access to order items" ON public.order_items FOR SELECT TO anon USING (false);


--
-- Name: orders Block anonymous access to orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous access to orders" ON public.orders TO anon USING (false);


--
-- Name: store_settings Block anonymous access to store settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous access to store settings" ON public.store_settings FOR SELECT TO anon USING (false);


--
-- Name: products Block anonymous delete to products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous delete to products" ON public.products FOR DELETE TO anon USING (false);


--
-- Name: products Block anonymous insert to products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous insert to products" ON public.products FOR INSERT TO anon WITH CHECK (false);


--
-- Name: products Block anonymous update to products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous update to products" ON public.products FOR UPDATE TO anon USING (false);


--
-- Name: deliveries Drivers can claim unassigned deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can claim unassigned deliveries" ON public.deliveries FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'driver'::public.app_role) AND (driver_id IS NULL))) WITH CHECK (public.has_role(auth.uid(), 'driver'::public.app_role));


--
-- Name: orders Drivers can mark orders as delivered; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can mark orders as delivered" ON public.orders FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'driver'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.deliveries
  WHERE ((deliveries.order_id = orders.id) AND (deliveries.driver_id = auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'driver'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.deliveries
  WHERE ((deliveries.order_id = orders.id) AND (deliveries.driver_id = auth.uid()))))));


--
-- Name: deliveries Drivers can update assigned deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can update assigned deliveries" ON public.deliveries FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'driver'::public.app_role) AND (driver_id = auth.uid()))) WITH CHECK ((public.has_role(auth.uid(), 'driver'::public.app_role) AND (driver_id = auth.uid())));


--
-- Name: drivers Drivers can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can update own profile" ON public.drivers FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: deliveries Drivers can view available and assigned deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view available and assigned deliveries" ON public.deliveries FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'driver'::public.app_role) AND ((driver_id IS NULL) OR (driver_id = auth.uid()))));


--
-- Name: drivers Drivers can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view own profile" ON public.drivers FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: orders Drivers can view their delivery orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view their delivery orders" ON public.orders FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'driver'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.deliveries
  WHERE ((deliveries.order_id = orders.id) AND (deliveries.driver_id = auth.uid()))))));


--
-- Name: products Public can view active products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active products" ON public.products FOR SELECT TO anon USING ((is_active = true));


--
-- Name: product_variants Public can view active variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active variants" ON public.product_variants FOR SELECT TO authenticated, anon USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_variants.product_id) AND (products.is_active = true))))));


--
-- Name: shipping_tiers_uruguay Public can view shipping tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view shipping tiers" ON public.shipping_tiers_uruguay FOR SELECT USING (true);


--
-- Name: store_settings Public can view store settings for checkout; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view store settings for checkout" ON public.store_settings FOR SELECT USING (true);


--
-- Name: customer_profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.customer_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: customer_addresses Users can manage their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own addresses" ON public.customer_addresses USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: customer_profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.customer_profiles FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: customer_profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.customer_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: drivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_tiers_uruguay; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_tiers_uruguay ENABLE ROW LEVEL SECURITY;

--
-- Name: store_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;