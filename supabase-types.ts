export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      api_configurations: {
        Row: {
          id: string
          name: string
          endpoint: string
          context: string
          is_active: boolean | null
          created_at: string | null
          description: string | null
          page_link: string | null
        }
        Insert: {
          id?: string
          name: string
          endpoint: string
          context: string
          is_active?: boolean | null
          created_at?: string | null
          description?: string | null
          page_link?: string | null
        }
        Update: {
          id?: string
          name?: string
          endpoint?: string
          context?: string
          is_active?: boolean | null
          created_at?: string | null
          description?: string | null
          page_link?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          icon: string | null
          url: string | null
          social_id: string | null
          active: boolean
          order_position: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
          url?: string | null
          social_id?: string | null
          active?: boolean
          order_position?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          url?: string | null
          social_id?: string | null
          active?: boolean
          order_position?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_social_id_fkey"
            columns: ["social_id"]
            referencedRelation: "socials"
            referencedColumns: ["id"]
          }
        ]
      }
      depoimentos: {
        Row: {
          id: string
          nome: string
          texto: string
          estrelas: number
          avatar: string | null
          created_at: string | null
          active: boolean
        }
        Insert: {
          id?: string
          nome: string
          texto: string
          estrelas: number
          avatar?: string | null
          created_at?: string | null
          active?: boolean
        }
        Update: {
          id?: string
          nome?: string
          texto?: string
          estrelas?: number
          avatar?: string | null
          created_at?: string | null
          active?: boolean
        }
        Relationships: []
      }
      faqs: {
        Row: {
          id: string
          question: string
          answer: string
          category: string
          created_at: string | null
          active: boolean
          order_position: number | null
        }
        Insert: {
          id?: string
          question: string
          answer: string
          category: string
          created_at?: string | null
          active?: boolean
          order_position?: number | null
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          category?: string
          created_at?: string | null
          active?: boolean
          order_position?: number | null
        }
        Relationships: []
      }
      legal_configurations: {
        Row: {
          id: string
          type: string
          content: string
          created_at: string
          updated_at: string | null
          active: boolean
        }
        Insert: {
          id?: string
          type: string
          content: string
          created_at?: string
          updated_at?: string | null
          active?: boolean
        }
        Update: {
          id?: string
          type?: string
          content?: string
          created_at?: string
          updated_at?: string | null
          active?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          transaction_id: string
          service_id: string
          quantity: number
          price: number
          status: string
          created_at: string
          updated_at: string | null
          external_order_id: string | null
          metadata: Json | null
          provider_id: string | null
        }
        Insert: {
          id?: string
          transaction_id: string
          service_id: string
          quantity: number
          price: number
          status?: string
          created_at?: string
          updated_at?: string | null
          external_order_id?: string | null
          metadata?: Json | null
          provider_id?: string | null
        }
        Update: {
          id?: string
          transaction_id?: string
          service_id?: string
          quantity?: number
          price?: number
          status?: string
          created_at?: string
          updated_at?: string | null
          external_order_id?: string | null
          metadata?: Json | null
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_provider_id_fkey"
            columns: ["provider_id"]
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_transaction_id_fkey"
            columns: ["transaction_id"]
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          }
        ]
      }
      price_variations: {
        Row: {
          id: string
          service_id: string
          min_quantity: number
          max_quantity: number | null
          price: number
          created_at: string | null
          active: boolean
        }
        Insert: {
          id?: string
          service_id: string
          min_quantity: number
          max_quantity?: number | null
          price: number
          created_at?: string | null
          active?: boolean
        }
        Update: {
          id?: string
          service_id?: string
          min_quantity?: number
          max_quantity?: number | null
          price?: number
          created_at?: string | null
          active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "price_variations_service_id_fkey"
            columns: ["service_id"]
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          created_at: string | null
          updated_at: string | null
          phone: string | null
          role: string | null
          metadata: Json | null
        }
        Insert: {
          id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          phone?: string | null
          role?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          phone?: string | null
          role?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      providers: {
        Row: {
          id: string
          name: string
          api_key: string | null
          api_url: string | null
          created_at: string | null
          status: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          name: string
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          status?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          name?: string
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          status?: boolean
          metadata?: Json | null
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          preco: number
          status: boolean
          created_at: string | null
          category_id: string | null
          provider_id: string | null
          external_id: string | null
          metadata: Json | null
          subcategory_id: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          preco: number
          status?: boolean
          created_at?: string | null
          category_id?: string | null
          provider_id?: string | null
          external_id?: string | null
          metadata?: Json | null
          subcategory_id: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          preco?: number
          status?: boolean
          created_at?: string | null
          category_id?: string | null
          provider_id?: string | null
          external_id?: string | null
          metadata?: Json | null
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          }
        ]
      }
      socials: {
        Row: {
          id: string
          name: string
          icon: string | null
          url: string | null
          slug: string | null
          active: boolean
          order_position: number | null
          created_at: string | null
          icon_url: string | null
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
          url?: string | null
          slug?: string | null
          active?: boolean
          order_position?: number | null
          created_at?: string | null
          icon_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          url?: string | null
          slug?: string | null
          active?: boolean
          order_position?: number | null
          created_at?: string | null
          icon_url?: string | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          id: string
          name: string
          category_id: string | null
          active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category_id?: string | null
          active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category_id?: string | null
          active?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string | null
          amount: number
          status: string
          payment_method: string | null
          payment_id: string | null
          created_at: string
          updated_at: string | null
          metadata: Json | null
          delivered: boolean
          delivered_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          amount: number
          status?: string
          payment_method?: string | null
          payment_id?: string | null
          created_at?: string
          updated_at?: string | null
          metadata?: Json | null
          delivered?: boolean
          delivered_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          amount?: number
          status?: string
          payment_method?: string | null
          payment_id?: string | null
          created_at?: string
          updated_at?: string | null
          metadata?: Json | null
          delivered?: boolean
          delivered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
