export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customer_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string | null
          latitude: number | null
          longitude: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_delivery: string | null
          created_at: string
          driver_id: string | null
          driver_latitude: number | null
          driver_location_updated_at: string | null
          driver_longitude: number | null
          driver_name: string | null
          driver_notes: string | null
          driver_phone: string | null
          estimated_delivery: string | null
          id: string
          last_notification_at: string | null
          last_notification_status: string | null
          order_id: string
          picked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          created_at?: string
          driver_id?: string | null
          driver_latitude?: number | null
          driver_location_updated_at?: string | null
          driver_longitude?: number | null
          driver_name?: string | null
          driver_notes?: string | null
          driver_phone?: string | null
          estimated_delivery?: string | null
          id?: string
          last_notification_at?: string | null
          last_notification_status?: string | null
          order_id: string
          picked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          created_at?: string
          driver_id?: string | null
          driver_latitude?: number | null
          driver_location_updated_at?: string | null
          driver_longitude?: number | null
          driver_name?: string | null
          driver_notes?: string | null
          driver_phone?: string | null
          estimated_delivery?: string | null
          id?: string
          last_notification_at?: string | null
          last_notification_status?: string | null
          order_id?: string
          picked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_tracking: boolean | null
          last_location_lat: number | null
          last_location_lon: number | null
          location_updated_at: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_tracking?: boolean | null
          last_location_lat?: number | null
          last_location_lon?: number | null
          location_updated_at?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_tracking?: boolean | null
          last_location_lat?: number | null
          last_location_lon?: number | null
          location_updated_at?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
          subtotal: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          color?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          size?: string | null
          subtotal: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          subtotal?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          delivery_address: string | null
          delivery_distance: number | null
          delivery_fee: number | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          shipping_method: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          shipping_method?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          shipping_method?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          price_adjustment: number | null
          product_id: string
          size: string | null
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_adjustment?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_adjustment?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_active: boolean
          name: string
          pickup_enabled: boolean
          price: number
          stock: number
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_active?: boolean
          name: string
          pickup_enabled?: boolean
          price?: number
          stock?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_active?: boolean
          name?: string
          pickup_enabled?: boolean
          price?: number
          stock?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      shipping_tiers_uruguay: {
        Row: {
          created_at: string
          dimensions: string
          id: string
          max_weight_kg: number
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimensions: string
          id?: string
          max_weight_kg: number
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimensions?: string
          id?: string
          max_weight_kg?: number
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          brl_to_uyu_rate: number | null
          created_at: string
          delivery_base_fee: number | null
          delivery_max_km: number | null
          delivery_per_km: number | null
          id: string
          mercadopago_access_token: string | null
          mercadopago_brasil_access_token: string | null
          mercadopago_brasil_public_key: string | null
          pushinpay_api_key: string | null
          resend_api_key: string | null
          sedex_brazil_fee: number | null
          store_address: string | null
          store_latitude: number | null
          store_longitude: number | null
          store_name: string | null
          turil_uruguay_fee: number | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          brl_to_uyu_rate?: number | null
          created_at?: string
          delivery_base_fee?: number | null
          delivery_max_km?: number | null
          delivery_per_km?: number | null
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_brasil_access_token?: string | null
          mercadopago_brasil_public_key?: string | null
          pushinpay_api_key?: string | null
          resend_api_key?: string | null
          sedex_brazil_fee?: number | null
          store_address?: string | null
          store_latitude?: number | null
          store_longitude?: number | null
          store_name?: string | null
          turil_uruguay_fee?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          brl_to_uyu_rate?: number | null
          created_at?: string
          delivery_base_fee?: number | null
          delivery_max_km?: number | null
          delivery_per_km?: number | null
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_brasil_access_token?: string | null
          mercadopago_brasil_public_key?: string | null
          pushinpay_api_key?: string | null
          resend_api_key?: string | null
          sedex_brazil_fee?: number | null
          store_address?: string | null
          store_latitude?: number | null
          store_longitude?: number | null
          store_name?: string | null
          turil_uruguay_fee?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "driver"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "driver"],
    },
  },
} as const
