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
      categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          order_position: number | null
          slug: string | null
          social_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_position?: number | null
          slug?: string | null
          social_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_position?: number | null
          slug?: string | null
          social_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_social_id_fkey"
            columns: ["social_id"]
            isOneToOne: false
            referencedRelation: "socials"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          requires_profile_check: boolean | null
          requires_public_profile: boolean | null
          slug: string
          updated_at: string | null
          validation_fields: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          requires_profile_check?: boolean | null
          requires_public_profile?: boolean | null
          slug: string
          updated_at?: string | null
          validation_fields?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          requires_profile_check?: boolean | null
          requires_public_profile?: boolean | null
          slug?: string
          updated_at?: string | null
          validation_fields?: Json | null
        }
        Relationships: []
      }
      configurations: {
        Row: {
          created_at: string | null
          default_value: string | null
          description: string | null
          editable: boolean | null
          group_name: string | null
          id: string
          is_public: boolean | null
          is_required: boolean | null
          key: string
          sensitive: boolean | null
          type: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          editable?: boolean | null
          group_name?: string | null
          id?: string
          is_public?: boolean | null
          is_required?: boolean | null
          key: string
          sensitive?: boolean | null
          type?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          editable?: boolean | null
          group_name?: string | null
          id?: string
          is_public?: boolean | null
          is_required?: boolean | null
          key?: string
          sensitive?: boolean | null
          type?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          instagram_username: string | null
          metadata: Json | null
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          instagram_username?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          instagram_username?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      depoimentos: {
        Row: {
          active: boolean | null
          avatar: string | null
          created_at: string | null
          estrelas: number | null
          id: string
          nome: string
          texto: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          avatar?: string | null
          created_at?: string | null
          estrelas?: number | null
          id?: string
          nome: string
          texto: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          avatar?: string | null
          created_at?: string | null
          estrelas?: number | null
          id?: string
          nome?: string
          texto?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_jobs: {
        Row: {
          connection: string
          exception: string
          failed_at: string | null
          id: string
          payload: Json
          queue: string
        }
        Insert: {
          connection: string
          exception: string
          failed_at?: string | null
          id?: string
          payload: Json
          queue: string
        }
        Update: {
          connection?: string
          exception?: string
          failed_at?: string | null
          id?: string
          payload?: Json
          queue?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean | null
          answer: string
          category: string | null
          created_at: string | null
          id: string
          order_position: number | null
          question: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          order_position?: number | null
          question: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          order_position?: number | null
          question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      instagram_profiles: {
        Row: {
          created_at: string | null
          follower_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          is_private: boolean | null
          last_analyzed_at: string | null
          profile_pic_url: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          is_private?: boolean | null
          last_analyzed_at?: string | null
          profile_pic_url?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          is_private?: boolean | null
          last_analyzed_at?: string | null
          profile_pic_url?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          external_order_id: string | null
          id: string
          metadata: Json | null
          payment_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          quantity: number
          service_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          target_username: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          external_order_id?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          quantity: number
          service_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          target_username?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          external_order_id?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          quantity?: number
          service_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          target_username?: string | null
          transaction_id?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          slug: string | null
          status: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          slug?: string | null
          status?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          slug?: string | null
          status?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      refills: {
        Row: {
          created_at: string
          external_refill_id: string
          id: string
          metadata: Json | null
          order_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_refill_id: string
          id?: string
          metadata?: Json | null
          order_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_refill_id?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refills_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      selected_posts: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          post_code: string
          post_id: string
          post_link: string
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          post_code: string
          post_id: string
          post_link: string
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          post_code?: string
          post_id?: string
          post_link?: string
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selected_posts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_costs: {
        Row: {
          cost_per_1000: number
          created_at: string | null
          currency: string | null
          end_date: string | null
          fixed_cost: number | null
          id: string
          notes: string | null
          service_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          cost_per_1000: number
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          fixed_cost?: number | null
          id?: string
          notes?: string | null
          service_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_per_1000?: number
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          fixed_cost?: number | null
          id?: string
          notes?: string | null
          service_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_costs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          categoria: string | null
          category_id: string | null
          checkout_type_id: string | null
          created_at: string | null
          delivery_time: string | null
          descricao: string | null
          external_id: string | null
          featured: boolean | null
          id: string
          max_order: number | null
          metadata: Json | null
          min_order: number | null
          name: string
          preco: number
          provider_id: string | null
          quantidade: number
          service_details: Json | null
          service_variations: Json | null
          status: boolean | null
          subcategory_id: string | null
          success_rate: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          category_id?: string | null
          checkout_type_id?: string | null
          created_at?: string | null
          delivery_time?: string | null
          descricao?: string | null
          external_id?: string | null
          featured?: boolean | null
          id?: string
          max_order?: number | null
          metadata?: Json | null
          min_order?: number | null
          name: string
          preco: number
          provider_id?: string | null
          quantidade: number
          service_details?: Json | null
          service_variations?: Json | null
          status?: boolean | null
          subcategory_id?: string | null
          success_rate?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          category_id?: string | null
          checkout_type_id?: string | null
          created_at?: string | null
          delivery_time?: string | null
          descricao?: string | null
          external_id?: string | null
          featured?: boolean | null
          id?: string
          max_order?: number | null
          metadata?: Json | null
          min_order?: number | null
          name?: string
          preco?: number
          provider_id?: string | null
          quantidade?: number
          service_details?: Json | null
          service_variations?: Json | null
          status?: boolean | null
          subcategory_id?: string | null
          success_rate?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_checkout_type_id_fkey"
            columns: ["checkout_type_id"]
            isOneToOne: false
            referencedRelation: "checkout_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          last_seen_at: string | null
          metadata: Json | null
          profile_id: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          last_seen_at?: string | null
          metadata?: Json | null
          profile_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          last_seen_at?: string | null
          metadata?: Json | null
          profile_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          key: string
          label: string
          type: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
          type: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
          type?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      shared_analyses: {
        Row: {
          content_data: Json
          created_at: string | null
          expires_at: string | null
          id: string
          metrics: Json
          profile_data: Json
          username: string
          view_count: number | null
        }
        Insert: {
          content_data: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metrics: Json
          profile_data: Json
          username: string
          view_count?: number | null
        }
        Update: {
          content_data?: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metrics?: Json
          profile_data?: Json
          username?: string
          view_count?: number | null
        }
        Relationships: []
      }
      socials: {
        Row: {
          active: boolean | null
          created_at: string | null
          icon: string | null
          icon_url: string | null
          id: string
          name: string
          order_position: number | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          name: string
          order_position?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          order_position?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          order_position: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_position?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_position?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          order_created: boolean | null
          order_id: string | null
          payment_external_reference: string | null
          payment_id: string | null
          payment_method: string | null
          payment_qr_code: string | null
          payment_qr_code_base64: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          target_full_name: string | null
          target_profile_link: string | null
          target_username: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          order_created?: boolean | null
          order_id?: string | null
          payment_external_reference?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_qr_code?: string | null
          payment_qr_code_base64?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          target_full_name?: string | null
          target_profile_link?: string | null
          target_username?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          order_created?: boolean | null
          order_id?: string | null
          payment_external_reference?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_qr_code?: string | null
          payment_qr_code_base64?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          target_full_name?: string | null
          target_profile_link?: string | null
          target_username?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      financial_report: {
        Row: {
          gross_margin_percentage: number | null
          gross_profit: number | null
          order_date: string | null
          order_month: string | null
          order_week: string | null
          service_id: string | null
          service_name: string | null
          service_type: string | null
          total_cost: number | null
          total_quantity: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_summary: {
        Row: {
          gross_margin_percentage: number | null
          gross_profit: number | null
          order_date: string | null
          order_month: string | null
          order_week: string | null
          total_cost: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      profit_loss_report: {
        Row: {
          ads_expenses: number | null
          employee_expenses: number | null
          gross_profit: number | null
          infrastructure_expenses: number | null
          net_margin_percentage: number | null
          net_profit: number | null
          other_expenses: number | null
          report_date: string | null
          report_month: string | null
          report_week: string | null
          revenue: number | null
          service_costs: number | null
          tax_expenses: number | null
          total_expenses: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      consolidate_customers_by_email: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_service_cost: {
        Args: {
          service_id: string
        }
        Returns: number
      }
      update_transaction_customer_ids: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      order_status:
        | "pending"
        | "processing"
        | "completed"
        | "cancelled"
        | "refunded"
      payment_status: "pending" | "approved" | "rejected" | "refunded"
      ticket_priority: "low" | "medium" | "high"
      ticket_status: "open" | "in_progress" | "closed"
      user_role: "admin" | "user" | "support" | "cliente"
      user_status: "active" | "inactive" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
