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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          at: string
          before: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      ingredient_supplier_links: {
        Row: {
          catalog_item_id: string
          id: string
          last_purchase_price: number | null
          last_purchased_at: string | null
          preferred: boolean
          store_ingredient_id: string
        }
        Insert: {
          catalog_item_id: string
          id?: string
          last_purchase_price?: number | null
          last_purchased_at?: string | null
          preferred?: boolean
          store_ingredient_id: string
        }
        Update: {
          catalog_item_id?: string
          id?: string
          last_purchase_price?: number | null
          last_purchased_at?: string | null
          preferred?: boolean
          store_ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_supplier_links_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_supplier_links_store_ingredient_id_fkey"
            columns: ["store_ingredient_id"]
            isOneToOne: false
            referencedRelation: "store_ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number | null
          reseller_price: number | null
          sku: string | null
          thumbnail_url: string | null
          variants: Json | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          reseller_price?: number | null
          sku?: string | null
          thumbnail_url?: string | null
          variants?: Json | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          reseller_price?: number | null
          sku?: string | null
          thumbnail_url?: string | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          discount: number
          id: string
          menu_id: string
          order_id: string
          price: number
          qty: number
          tax: number
          variant: string | null
        }
        Insert: {
          discount?: number
          id?: string
          menu_id: string
          order_id: string
          price: number
          qty: number
          tax?: number
          variant?: string | null
        }
        Update: {
          discount?: number
          id?: string
          menu_id?: string
          order_id?: string
          price?: number
          qty?: number
          tax?: number
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: Database["public"]["Enums"]["channel"]
          client_ref: string | null
          created_at: string
          created_by: string | null
          customer_note: string | null
          due_date: string | null
          id: string
          number: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          reseller_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          totals: Json
        }
        Insert: {
          channel: Database["public"]["Enums"]["channel"]
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          customer_note?: string | null
          due_date?: string | null
          id?: string
          number: string
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          reseller_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          totals?: Json
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel"]
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          customer_note?: string | null
          due_date?: string | null
          id?: string
          number?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          reseller_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          email: string | null
          is_active: boolean
          last_login_at: string | null
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email?: string | null
          is_active?: boolean
          last_login_at?: string | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string | null
          is_active?: boolean
          last_login_at?: string | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          completed_at: string | null
          created_by: string | null
          id: string
          issued_at: string | null
          items: Json
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string | null
          totals: Json
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          id?: string
          issued_at?: string | null
          items?: Json
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          totals?: Json
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          id?: string
          issued_at?: string | null
          items?: Json
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_variant_overrides: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          items: Json
          menu_id: string
          size: string
          temperature: string
          version: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          items: Json
          menu_id: string
          size: string
          temperature: string
          version?: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          items?: Json
          menu_id?: string
          size?: string
          temperature?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_variant_overrides_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          items: Json
          menu_id: string
          method_overrides: Json
          method_steps: Json
          thumbnail_url: string | null
          version: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          items: Json
          menu_id: string
          method_overrides?: Json
          method_steps?: Json
          thumbnail_url?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          items?: Json
          menu_id?: string
          method_overrides?: Json
          method_steps?: Json
          thumbnail_url?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          contact: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          terms: Json
        }
        Insert: {
          contact?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          terms?: Json
        }
        Update: {
          contact?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          terms?: Json
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          items: Json
          notes: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items: Json
          notes?: string
          status: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          notes?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          at: string
          delta_qty: number
          id: string
          ingredient_id: string
          reason: string
          ref_id: string | null
          ref_type: string | null
          uom: Database["public"]["Enums"]["base_uom"]
        }
        Insert: {
          at?: string
          delta_qty: number
          id?: string
          ingredient_id: string
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          uom: Database["public"]["Enums"]["base_uom"]
        }
        Update: {
          at?: string
          delta_qty?: number
          id?: string
          ingredient_id?: string
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          uom?: Database["public"]["Enums"]["base_uom"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "store_ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      store_ingredients: {
        Row: {
          avg_cost: number
          base_uom: Database["public"]["Enums"]["base_uom"]
          created_at: string
          current_stock: number
          deleted_at: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          sku: string | null
        }
        Insert: {
          avg_cost?: number
          base_uom: Database["public"]["Enums"]["base_uom"]
          created_at?: string
          current_stock?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          sku?: string | null
        }
        Update: {
          avg_cost?: number
          base_uom?: Database["public"]["Enums"]["base_uom"]
          created_at?: string
          current_stock?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          sku?: string | null
        }
        Relationships: []
      }
      supplier_catalog_items: {
        Row: {
          base_uom: Database["public"]["Enums"]["base_uom"]
          conversion_rate: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          purchase_price: number
          supplier_id: string
          unit_label: string | null
        }
        Insert: {
          base_uom: Database["public"]["Enums"]["base_uom"]
          conversion_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          purchase_price: number
          supplier_id: string
          unit_label?: string | null
        }
        Update: {
          base_uom?: Database["public"]["Enums"]["base_uom"]
          conversion_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          purchase_price?: number
          supplier_id?: string
          unit_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_catalog_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          contact?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          contact?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role_id: string
          user_id: string
        }
        Insert: {
          role_id: string
          user_id: string
        }
        Update: {
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      purchase_order_item_entries: {
        Row: {
          base_uom: string | null
          catalog_item_id: string | null
          completed_at: string | null
          created_by: string | null
          issued_at: string | null
          price: number | null
          purchase_order_id: string | null
          qty: number | null
          status: Database["public"]["Enums"]["po_status"] | null
          store_ingredient_id: string | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      has_role: { Args: { role_name: string; uid: string }; Returns: boolean }
      is_last_admin_user: { Args: { p_user_id: string }; Returns: boolean }
      is_role_admin_id: { Args: { p_role_id: string }; Returns: boolean }
      is_user_admin: { Args: { p_user_id: string }; Returns: boolean }
      pos_checkout: { Args: { payload: Json }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      base_uom: "gr" | "ml" | "pcs"
      channel: "pos" | "reseller"
      kds_item_status: "queue" | "making" | "ready" | "served"
      order_status: "open" | "paid" | "void" | "refunded"
      payment_method: "cash" | "transfer"
      payment_status: "paid" | "unpaid" | "void"
      po_status: "draft" | "pending" | "complete"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      base_uom: ["gr", "ml", "pcs"],
      channel: ["pos", "reseller"],
      kds_item_status: ["queue", "making", "ready", "served"],
      order_status: ["open", "paid", "void", "refunded"],
      payment_method: ["cash", "transfer"],
      payment_status: ["paid", "unpaid", "void"],
      po_status: ["draft", "pending", "complete"],
    },
  },
} as const
