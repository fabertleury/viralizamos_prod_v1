export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_configurations: {
        Row: {
          context: string
          created_at: string | null
          description: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          name: string
          page_link: string | null
          rapid_api_host: string
          rapid_api_key: string
          type: string
          updated_at: string | null
        }
        Insert: {
          context: string
          created_at?: string | null
          description?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          name: string
          page_link?: string | null
          rapid_api_host: string
          rapid_api_key: string
          type: string
          updated_at?: string | null
        }
        Update: {
          context?: string
          created_at?: string | null
          description?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          name?: string
          page_link?: string | null
          rapid_api_host?: string
          rapid_api_key?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          customer_ids: string[] | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          id: string
          max_uses: number | null
          service_ids: string[] | null
          start_date: string | null
          status: string
          updated_at: string | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          customer_ids?: string[] | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          max_uses?: number | null
          service_ids?: string[] | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          customer_ids?: string[] | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          max_uses?: number | null
          service_ids?: string[] | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          uses?: number
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string
          customer_email: string
          id: string
          order_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          customer_email: string
          id?: string
          order_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          customer_email?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          coupon_code: string | null
          created_at: string
          customer_id: string
          discount_amount: number | null
          id: string
          metadata: Json | null
          original_amount: number | null
          payment_id: string | null
          service_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          coupon_code?: string | null
          created_at?: string
          customer_id: string
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          original_amount?: number | null
          payment_id?: string | null
          service_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          customer_id?: string
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          original_amount?: number | null
          payment_id?: string | null
          service_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      providers: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          name: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          name: string
          preco: number
          provider_id: string | null
          quantidade: number
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          preco: number
          provider_id?: string | null
          quantidade: number
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          preco?: number
          provider_id?: string | null
          quantidade?: number
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            referencedRelation: "providers"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          payment_id: string | null
          payment_method: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method: string
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_coupon_valid: {
        Args: {
          p_coupon_code: string
          p_customer_id: string
          p_service_id: string
          p_purchase_amount: number
        }
        Returns: {
          valid: boolean
          message: string
          discount_amount: number
          final_amount: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
