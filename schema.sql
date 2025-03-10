

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."ticket_priority" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."ticket_priority" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'open',
    'in_progress',
    'closed'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'user',
    'support',
    'cliente'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'inactive',
    'pending'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_coupon"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_coupon_id UUID;
    v_discount_type VARCHAR(20);
    v_discount_value DECIMAL(10, 2);
    v_max_discount_amount DECIMAL(10, 2);
    v_final_discount DECIMAL(10, 2);
    v_has_customer_assignment BOOLEAN;
BEGIN
    -- Verificar se o cupom é válido
    IF NOT is_coupon_valid(p_coupon_code, p_customer_id, p_service_id, p_purchase_amount) THEN
        RETURN 0;
    END IF;
    
    -- Obter informações do cupom
    SELECT 
        id, 
        discount_type, 
        discount_value, 
        max_discount_amount
    INTO 
        v_coupon_id, 
        v_discount_type, 
        v_discount_value, 
        v_max_discount_amount
    FROM public.coupons
    WHERE code = p_coupon_code;
    
    -- Calcular o desconto
    IF v_discount_type = 'percentage' THEN
        v_final_discount := p_purchase_amount * (v_discount_value / 100);
    ELSE
        v_final_discount := v_discount_value;
    END IF;
    
    -- Aplicar limite máximo de desconto, se existir
    IF v_max_discount_amount IS NOT NULL AND v_final_discount > v_max_discount_amount THEN
        v_final_discount := v_max_discount_amount;
    END IF;
    
    -- Incrementar o contador de uso
    UPDATE public.coupons
    SET usage_count = usage_count + 1
    WHERE id = v_coupon_id;
    
    -- Verificar se o cupom está atribuído a clientes específicos
    SELECT EXISTS (
        SELECT 1 FROM public.coupon_customer_assignments WHERE coupon_id = v_coupon_id
    ) INTO v_has_customer_assignment;
    
    -- Se estiver atribuído a clientes, marcar como usado para este cliente
    IF v_has_customer_assignment THEN
        UPDATE public.coupon_customer_assignments
        SET is_used = TRUE, used_at = NOW()
        WHERE coupon_id = v_coupon_id AND customer_id = p_customer_id;
    END IF;
    
    RETURN v_final_discount;
END;
$$;


ALTER FUNCTION "public"."apply_coupon"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM public.sessions
    WHERE last_seen_at < now() - interval '24 hours';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consolidate_customers_by_email"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    email_record RECORD;
    primary_customer_id UUID;
    duplicate_customer RECORD;
BEGIN
    -- Para cada email com múltiplos registros
    FOR email_record IN 
        SELECT email, COUNT(*) as count
        FROM public.customers
        GROUP BY email
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Consolidando registros para o email: %', email_record.email;
        
        -- Selecionar o registro mais recente como primário
        SELECT id INTO primary_customer_id
        FROM public.customers
        WHERE email = email_record.email
        ORDER BY created_at DESC
        LIMIT 1;
        
        RAISE NOTICE 'Cliente primário selecionado: %', primary_customer_id;
        
        -- Para cada registro duplicado
        FOR duplicate_customer IN
            SELECT id
            FROM public.customers
            WHERE email = email_record.email
            AND id != primary_customer_id
        LOOP
            -- Atualizar todas as transações que apontam para o cliente duplicado
            UPDATE public.transactions
            SET customer_id = primary_customer_id
            WHERE customer_id = duplicate_customer.id;
            
            RAISE NOTICE 'Transações do cliente % atualizadas para apontar para %', duplicate_customer.id, primary_customer_id;
            
            -- Excluir o registro duplicado
            DELETE FROM public.customers
            WHERE id = duplicate_customer.id;
            
            RAISE NOTICE 'Cliente duplicado excluído: %', duplicate_customer.id;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Consolidação de clientes concluída.';
END;
$$;


ALTER FUNCTION "public"."consolidate_customers_by_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_and_assign_coupon_to_service_customers"("p_code" character varying, "p_description" "text", "p_discount_type" character varying, "p_discount_value" numeric, "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_service_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_coupon_id UUID;
    v_customer_id UUID;
BEGIN
    -- Criar o cupom
    INSERT INTO public.coupons (
        code, 
        description, 
        discount_type, 
        discount_value, 
        start_date, 
        end_date
    ) VALUES (
        p_code,
        p_description,
        p_discount_type,
        p_discount_value,
        p_start_date,
        p_end_date
    ) RETURNING id INTO v_coupon_id;
    
    -- Adicionar restrição para o serviço específico, se fornecido
    IF p_service_id IS NOT NULL THEN
        INSERT INTO public.coupon_service_restrictions (
            coupon_id,
            service_id
        ) VALUES (
            v_coupon_id,
            p_service_id
        );
    END IF;
    
    -- Atribuir o cupom a todos os clientes que compraram o serviço
    IF p_service_id IS NOT NULL THEN
        FOR v_customer_id IN 
            SELECT DISTINCT customer_id 
            FROM public.orders 
            WHERE service_id = p_service_id AND customer_id IS NOT NULL
        LOOP
            INSERT INTO public.coupon_customer_assignments (
                coupon_id,
                customer_id
            ) VALUES (
                v_coupon_id,
                v_customer_id
            ) ON CONFLICT (coupon_id, customer_id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN v_coupon_id;
END;
$$;


ALTER FUNCTION "public"."create_and_assign_coupon_to_service_customers"("p_code" character varying, "p_description" "text", "p_discount_type" character varying, "p_discount_value" numeric, "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_service_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_expired_analyses"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM shared_analyses WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."delete_expired_analyses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_service_cost"("service_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    cost_value DECIMAL(10, 4);
BEGIN
    SELECT cost_per_1000 INTO cost_value
    FROM public.service_costs
    WHERE service_id = get_current_service_cost.service_id
      AND (end_date IS NULL OR end_date > NOW())
      AND start_date <= NOW()
    ORDER BY start_date DESC
    LIMIT 1;
    
    RETURN COALESCE(cost_value, 0);
END;
$$;


ALTER FUNCTION "public"."get_current_service_cost"("service_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_coupon_valid"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_coupon_id UUID;
    v_is_valid BOOLEAN := FALSE;
    v_has_service_restriction BOOLEAN;
    v_has_customer_assignment BOOLEAN;
    v_is_used BOOLEAN;
BEGIN
    -- Verificar se o cupom existe e está ativo
    SELECT id INTO v_coupon_id
    FROM public.coupons
    WHERE 
        code = p_coupon_code
        AND is_active = TRUE
        AND NOW() BETWEEN start_date AND end_date
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (min_purchase_amount IS NULL OR p_purchase_amount >= min_purchase_amount);
    
    IF v_coupon_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se há restrições de serviço
    SELECT EXISTS (
        SELECT 1 FROM public.coupon_service_restrictions WHERE coupon_id = v_coupon_id
    ) INTO v_has_service_restriction;
    
    -- Se houver restrições, verificar se o serviço está incluído
    IF v_has_service_restriction THEN
        SELECT EXISTS (
            SELECT 1 
            FROM public.coupon_service_restrictions 
            WHERE coupon_id = v_coupon_id AND service_id = p_service_id
        ) INTO v_is_valid;
        
        IF NOT v_is_valid THEN
            RETURN FALSE;
        END IF;
    ELSE
        v_is_valid := TRUE;
    END IF;
    
    -- Verificar se o cupom está atribuído a clientes específicos
    SELECT EXISTS (
        SELECT 1 FROM public.coupon_customer_assignments WHERE coupon_id = v_coupon_id
    ) INTO v_has_customer_assignment;
    
    -- Se estiver atribuído a clientes, verificar se este cliente está incluído
    IF v_has_customer_assignment THEN
        SELECT EXISTS (
            SELECT 1 
            FROM public.coupon_customer_assignments 
            WHERE coupon_id = v_coupon_id AND customer_id = p_customer_id
        ) INTO v_is_valid;
        
        IF NOT v_is_valid THEN
            RETURN FALSE;
        END IF;
        
        -- Verificar se o cupom já foi usado por este cliente
        SELECT is_used INTO v_is_used
        FROM public.coupon_customer_assignments
        WHERE coupon_id = v_coupon_id AND customer_id = p_customer_id;
        
        IF v_is_used THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN v_is_valid;
END;
$$;


ALTER FUNCTION "public"."is_coupon_valid"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_configurations_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_configurations_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_service_costs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_service_costs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_transaction_customer_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    found_customer_id UUID;
BEGIN
    -- Se temos um email de cliente, buscar ou criar o registro na tabela customers
    IF NEW.customer_email IS NOT NULL AND NEW.customer_id IS NULL THEN
        -- Buscar o cliente pelo email
        SELECT id INTO found_customer_id
        FROM public.customers
        WHERE email = NEW.customer_email
        LIMIT 1;
        
        -- Se não encontrou, criar um novo cliente
        IF found_customer_id IS NULL THEN
            INSERT INTO public.customers (
                email, 
                name, 
                phone,
                metadata
            ) VALUES (
                NEW.customer_email,
                NEW.customer_name,
                NEW.customer_phone,
                COALESCE(NEW.metadata, '{}'::jsonb)
            )
            RETURNING id INTO found_customer_id;
        ELSE
            -- Cliente existe, atualizar se necessário
            -- Atualizar apenas se o nome não estiver vazio e for diferente do atual
            IF NEW.customer_name IS NOT NULL AND NEW.customer_name != '' THEN
                UPDATE public.customers
                SET 
                    name = CASE 
                        WHEN name IS NULL OR name = '' OR name = email THEN NEW.customer_name
                        ELSE name  -- Manter o nome existente se já tiver um nome válido
                    END,
                    phone = COALESCE(public.customers.phone, NEW.customer_phone),
                    updated_at = NOW()
                WHERE id = found_customer_id;
            END IF;
        END IF;
        
        -- Atualizar o customer_id na transação
        NEW.customer_id := found_customer_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_transaction_customer_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_transaction_customer_ids"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    trans RECORD;
    found_customer_id UUID;
BEGIN
    -- Para cada transação que tem customer_email mas não tem customer_id
    FOR trans IN 
        SELECT id, customer_email 
        FROM public.transactions 
        WHERE customer_email IS NOT NULL 
        AND transactions.customer_id IS NULL
    LOOP
        -- Buscar o ID do cliente pelo email
        SELECT id INTO found_customer_id
        FROM public.customers
        WHERE email = trans.customer_email
        LIMIT 1;
        
        -- Se encontrou o cliente, atualizar a transação
        IF found_customer_id IS NOT NULL THEN
            UPDATE public.transactions
            SET customer_id = found_customer_id
            WHERE id = trans.id;
            
            RAISE NOTICE 'Atualizada transação % com customer_id %', trans.id, found_customer_id;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_transaction_customer_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."api_configurations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "context" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "rapid_api_key" "text" NOT NULL,
    "rapid_api_host" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "page_link" "text"
);


ALTER TABLE "public"."api_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."api_configurations" IS 'Tabela para armazenar configurações de APIs utilizadas no sistema';



COMMENT ON COLUMN "public"."api_configurations"."page_link" IS 'Link da página correspondente à configuração de API';



CREATE TABLE IF NOT EXISTS "public"."api_order" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "enabled" boolean DEFAULT true,
    "order" integer NOT NULL,
    "max_requests" integer DEFAULT 1000,
    "current_requests" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_order" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."api_order_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."api_order_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."api_order_id_seq" OWNED BY "public"."api_order"."id";



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "description" "text",
    "icon" "text",
    "active" boolean DEFAULT true,
    "order_position" integer DEFAULT 0,
    "social_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "description" "text",
    "requires_profile_check" boolean DEFAULT false,
    "requires_public_profile" boolean DEFAULT false,
    "validation_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."checkout_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "type" "text" DEFAULT 'string'::"text",
    "description" "text",
    "group_name" "text",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_required" boolean DEFAULT false,
    "sensitive" boolean DEFAULT false,
    "editable" boolean DEFAULT true,
    "default_value" "text"
);


ALTER TABLE "public"."configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_customer_assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "is_used" boolean DEFAULT false,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coupon_customer_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_service_restrictions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coupon_service_restrictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "description" "text",
    "discount_type" character varying(20) NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "min_purchase_amount" numeric(10,2),
    "max_discount_amount" numeric(10,2),
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coupons_discount_type_check" CHECK ((("discount_type")::"text" = ANY ((ARRAY['percentage'::character varying, 'fixed_amount'::character varying])::"text"[])))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "phone" "text",
    "instagram_username" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Tabela que armazena informações dos clientes';



COMMENT ON COLUMN "public"."customers"."id" IS 'ID único do cliente';



COMMENT ON COLUMN "public"."customers"."email" IS 'Email do cliente (único)';



COMMENT ON COLUMN "public"."customers"."name" IS 'Nome do cliente';



COMMENT ON COLUMN "public"."customers"."phone" IS 'Telefone do cliente';



COMMENT ON COLUMN "public"."customers"."instagram_username" IS 'Nome de usuário do Instagram do cliente';



COMMENT ON COLUMN "public"."customers"."metadata" IS 'Metadados adicionais do cliente em formato JSON';



COMMENT ON COLUMN "public"."customers"."created_at" IS 'Data de criação do registro';



COMMENT ON COLUMN "public"."customers"."updated_at" IS 'Data da última atualização do registro';



CREATE TABLE IF NOT EXISTS "public"."depoimentos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nome" "text" NOT NULL,
    "texto" "text" NOT NULL,
    "avatar" "text",
    "estrelas" integer,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "depoimentos_estrelas_check" CHECK ((("estrelas" >= 1) AND ("estrelas" <= 5)))
);


ALTER TABLE "public"."depoimentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expense_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category" character varying(50) NOT NULL,
    "description" "text",
    "amount" numeric(10,2) NOT NULL,
    "expense_date" "date" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."failed_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection" "text" NOT NULL,
    "queue" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "exception" "text" NOT NULL,
    "failed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."failed_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" "text",
    "order_position" integer DEFAULT 0,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."faqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "service_id" "uuid",
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status",
    "quantity" integer NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "target_username" "text",
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "payment_method" "text",
    "payment_id" "text",
    "external_order_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "transaction_id" "uuid",
    "customer_id" "uuid"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_costs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "cost_per_1000" numeric(10,4) NOT NULL,
    "fixed_cost" numeric(10,4) DEFAULT 0,
    "currency" character varying(10) DEFAULT 'BRL'::character varying,
    "start_date" timestamp with time zone DEFAULT "now"(),
    "end_date" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."service_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "quantidade" integer NOT NULL,
    "preco" numeric(10,2) NOT NULL,
    "descricao" "text",
    "categoria" "text",
    "status" boolean DEFAULT true,
    "delivery_time" "text",
    "min_order" integer,
    "max_order" integer,
    "provider_id" "uuid",
    "success_rate" numeric(5,2),
    "external_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "category_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "featured" boolean DEFAULT false,
    "checkout_type_id" "uuid",
    "subcategory_id" "uuid",
    "service_variations" "jsonb",
    "service_details" "jsonb"
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."financial_report" AS
 WITH "order_costs" AS (
         SELECT "o"."id" AS "order_id",
            "o"."transaction_id",
            "o"."service_id",
            "s"."name" AS "service_name",
            "s"."type" AS "service_type",
            "o"."quantity",
            "o"."amount" AS "revenue",
                CASE
                    WHEN ("sc"."cost_per_1000" IS NOT NULL) THEN (((("o"."quantity")::numeric / 1000.0) * "sc"."cost_per_1000") + COALESCE("sc"."fixed_cost", (0)::numeric))
                    ELSE (0)::numeric
                END AS "cost",
            "o"."created_at",
            "date_trunc"('day'::"text", "o"."created_at") AS "order_date",
            "date_trunc"('week'::"text", "o"."created_at") AS "order_week",
            "date_trunc"('month'::"text", "o"."created_at") AS "order_month"
           FROM (("public"."orders" "o"
             LEFT JOIN "public"."services" "s" ON (("o"."service_id" = "s"."id")))
             LEFT JOIN "public"."service_costs" "sc" ON ((("s"."id" = "sc"."service_id") AND ("o"."created_at" >= "sc"."start_date") AND (("sc"."end_date" IS NULL) OR ("o"."created_at" < "sc"."end_date")))))
          WHERE ("o"."status" <> ALL (ARRAY['cancelled'::"public"."order_status", 'refunded'::"public"."order_status"]))
        )
 SELECT "order_costs"."order_date",
    "order_costs"."order_week",
    "order_costs"."order_month",
    "order_costs"."service_id",
    "order_costs"."service_name",
    "order_costs"."service_type",
    "sum"("order_costs"."quantity") AS "total_quantity",
    "sum"("order_costs"."revenue") AS "total_revenue",
    "sum"("order_costs"."cost") AS "total_cost",
    ("sum"("order_costs"."revenue") - "sum"("order_costs"."cost")) AS "gross_profit",
        CASE
            WHEN ("sum"("order_costs"."revenue") > (0)::numeric) THEN "round"(((("sum"("order_costs"."revenue") - "sum"("order_costs"."cost")) / "sum"("order_costs"."revenue")) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "gross_margin_percentage"
   FROM "order_costs"
  GROUP BY "order_costs"."order_date", "order_costs"."order_week", "order_costs"."order_month", "order_costs"."service_id", "order_costs"."service_name", "order_costs"."service_type";


ALTER TABLE "public"."financial_report" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."financial_summary" AS
 SELECT "financial_report"."order_date",
    "financial_report"."order_week",
    "financial_report"."order_month",
    "sum"("financial_report"."total_revenue") AS "total_revenue",
    "sum"("financial_report"."total_cost") AS "total_cost",
    "sum"("financial_report"."gross_profit") AS "gross_profit",
        CASE
            WHEN ("sum"("financial_report"."total_revenue") > (0)::numeric) THEN "round"((("sum"("financial_report"."gross_profit") / "sum"("financial_report"."total_revenue")) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "gross_margin_percentage"
   FROM "public"."financial_report"
  GROUP BY "financial_report"."order_date", "financial_report"."order_week", "financial_report"."order_month";


ALTER TABLE "public"."financial_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instagram_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text",
    "follower_count" integer,
    "following_count" integer,
    "profile_pic_url" "text",
    "is_private" boolean DEFAULT false,
    "last_analyzed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."instagram_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instagram_verification_history" (
    "id" integer NOT NULL,
    "username" character varying(255) NOT NULL,
    "api_name" character varying(255) NOT NULL,
    "verified_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."instagram_verification_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."instagram_verification_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."instagram_verification_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."instagram_verification_history_id_seq" OWNED BY "public"."instagram_verification_history"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."profit_loss_report" AS
 WITH "period_summary" AS (
         SELECT "date_trunc"('day'::"text", "financial_report"."order_date") AS "report_date",
            "date_trunc"('week'::"text", "financial_report"."order_week") AS "report_week",
            "date_trunc"('month'::"text", "financial_report"."order_month") AS "report_month",
            "sum"("financial_report"."total_revenue") AS "revenue",
            "sum"("financial_report"."total_cost") AS "service_costs",
            "sum"("financial_report"."gross_profit") AS "gross_profit"
           FROM "public"."financial_report"
          GROUP BY ("date_trunc"('day'::"text", "financial_report"."order_date")), ("date_trunc"('week'::"text", "financial_report"."order_week")), ("date_trunc"('month'::"text", "financial_report"."order_month"))
        ), "period_expenses" AS (
         SELECT "date_trunc"('day'::"text", ("expenses"."expense_date")::timestamp with time zone) AS "expense_day",
            "date_trunc"('week'::"text", ("expenses"."expense_date")::timestamp with time zone) AS "expense_week",
            "date_trunc"('month'::"text", ("expenses"."expense_date")::timestamp with time zone) AS "expense_month",
            "expenses"."category",
            "sum"("expenses"."amount") AS "expense_amount"
           FROM "public"."expenses"
          GROUP BY ("date_trunc"('day'::"text", ("expenses"."expense_date")::timestamp with time zone)), ("date_trunc"('week'::"text", ("expenses"."expense_date")::timestamp with time zone)), ("date_trunc"('month'::"text", ("expenses"."expense_date")::timestamp with time zone)), "expenses"."category"
        )
 SELECT "ps"."report_date",
    "ps"."report_week",
    "ps"."report_month",
    "ps"."revenue",
    "ps"."service_costs",
    "ps"."gross_profit",
    COALESCE("sum"("pe"."expense_amount") FILTER (WHERE (("pe"."category")::"text" = 'Anúncios'::"text")), (0)::numeric) AS "ads_expenses",
    COALESCE("sum"("pe"."expense_amount") FILTER (WHERE (("pe"."category")::"text" = 'Funcionários'::"text")), (0)::numeric) AS "employee_expenses",
    COALESCE("sum"("pe"."expense_amount") FILTER (WHERE (("pe"."category")::"text" = 'Impostos'::"text")), (0)::numeric) AS "tax_expenses",
    COALESCE("sum"("pe"."expense_amount") FILTER (WHERE (("pe"."category")::"text" = 'Infraestrutura'::"text")), (0)::numeric) AS "infrastructure_expenses",
    COALESCE("sum"("pe"."expense_amount") FILTER (WHERE (("pe"."category")::"text" = 'Outros'::"text")), (0)::numeric) AS "other_expenses",
    COALESCE("sum"("pe"."expense_amount"), (0)::numeric) AS "total_expenses",
    ("ps"."gross_profit" - COALESCE("sum"("pe"."expense_amount"), (0)::numeric)) AS "net_profit",
        CASE
            WHEN ("ps"."revenue" > (0)::numeric) THEN "round"(((("ps"."gross_profit" - COALESCE("sum"("pe"."expense_amount"), (0)::numeric)) / "ps"."revenue") * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "net_margin_percentage"
   FROM ("period_summary" "ps"
     LEFT JOIN "period_expenses" "pe" ON ((("ps"."report_date" = "pe"."expense_day") OR ("ps"."report_week" = "pe"."expense_week") OR ("ps"."report_month" = "pe"."expense_month"))))
  GROUP BY "ps"."report_date", "ps"."report_week", "ps"."report_month", "ps"."revenue", "ps"."service_costs", "ps"."gross_profit";


ALTER TABLE "public"."profit_loss_report" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "description" "text",
    "api_key" "text",
    "api_url" "text",
    "status" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "external_refill_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb",
    "customer_id" "uuid"
);


ALTER TABLE "public"."refills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."selected_posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "post_id" "text" NOT NULL,
    "post_code" "text" NOT NULL,
    "post_link" "text" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."selected_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "profile_id" "uuid",
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "category" "text" NOT NULL,
    "label" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_analyses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "username" "text" NOT NULL,
    "profile_data" "jsonb" NOT NULL,
    "content_data" "jsonb" NOT NULL,
    "metrics" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "expires_at" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '24:00:00'::interval),
    "view_count" integer DEFAULT 0
);


ALTER TABLE "public"."shared_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."socials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "url" "text",
    "active" boolean DEFAULT true,
    "order_position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "icon_url" "text"
);


ALTER TABLE "public"."socials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcategories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "slug" "text" NOT NULL,
    "category_id" "uuid",
    "active" boolean DEFAULT true,
    "order_position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."subcategories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."ticket_status" DEFAULT 'open'::"public"."ticket_status",
    "priority" "public"."ticket_priority" DEFAULT 'medium'::"public"."ticket_priority",
    "user_id" "uuid",
    "assigned_to" "uuid",
    "order_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "order_id" "uuid",
    "type" "text",
    "amount" numeric(10,2) NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "payment_method" "text",
    "payment_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "customer_name" "text",
    "customer_email" "text",
    "customer_phone" "text",
    "target_username" "text",
    "target_full_name" "text",
    "payment_qr_code" "text",
    "payment_qr_code_base64" "text",
    "payment_external_reference" "text",
    "service_id" "uuid",
    "target_profile_link" "text",
    "order_created" boolean DEFAULT false,
    "external_id" "text",
    "customer_id" "uuid"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."api_order" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."api_order_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."instagram_verification_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."instagram_verification_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."api_configurations"
    ADD CONSTRAINT "api_configurations_context_key" UNIQUE ("context");



ALTER TABLE ONLY "public"."api_configurations"
    ADD CONSTRAINT "api_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_order"
    ADD CONSTRAINT "api_order_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."checkout_types"
    ADD CONSTRAINT "checkout_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_types"
    ADD CONSTRAINT "checkout_types_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."configurations"
    ADD CONSTRAINT "configurations_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."configurations"
    ADD CONSTRAINT "configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_customer_assignments"
    ADD CONSTRAINT "coupon_customer_assignments_coupon_id_customer_id_key" UNIQUE ("coupon_id", "customer_id");



ALTER TABLE ONLY "public"."coupon_customer_assignments"
    ADD CONSTRAINT "coupon_customer_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_service_restrictions"
    ADD CONSTRAINT "coupon_service_restrictions_coupon_id_service_id_key" UNIQUE ("coupon_id", "service_id");



ALTER TABLE ONLY "public"."coupon_service_restrictions"
    ADD CONSTRAINT "coupon_service_restrictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."depoimentos"
    ADD CONSTRAINT "depoimentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."failed_jobs"
    ADD CONSTRAINT "failed_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instagram_verification_history"
    ADD CONSTRAINT "idx_username_api" UNIQUE ("username", "api_name");



ALTER TABLE ONLY "public"."instagram_profiles"
    ADD CONSTRAINT "instagram_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instagram_profiles"
    ADD CONSTRAINT "instagram_profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."instagram_verification_history"
    ADD CONSTRAINT "instagram_verification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."refills"
    ADD CONSTRAINT "refills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."selected_posts"
    ADD CONSTRAINT "selected_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_costs"
    ADD CONSTRAINT "service_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_analyses"
    ADD CONSTRAINT "shared_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."socials"
    ADD CONSTRAINT "socials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_slug_category_id_key" UNIQUE ("slug", "category_id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "categories_slug_idx" ON "public"."categories" USING "btree" ("slug");



CREATE INDEX "categories_social_id_idx" ON "public"."categories" USING "btree" ("social_id");



CREATE INDEX "configurations_group_name_idx" ON "public"."configurations" USING "btree" ("group_name");



CREATE INDEX "configurations_key_idx" ON "public"."configurations" USING "btree" ("key");



CREATE INDEX "idx_coupons_code" ON "public"."coupons" USING "btree" ("code");



CREATE INDEX "idx_coupons_dates" ON "public"."coupons" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_coupons_is_active" ON "public"."coupons" USING "btree" ("is_active");



CREATE INDEX "idx_customers_email" ON "public"."customers" USING "btree" ("email");



CREATE UNIQUE INDEX "idx_customers_email_unique" ON "public"."customers" USING "btree" ("email");



CREATE INDEX "idx_instagram_profiles_username" ON "public"."instagram_profiles" USING "btree" ("username");



CREATE INDEX "idx_orders_customer_id" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_selected_posts_transaction_id" ON "public"."selected_posts" USING "btree" ("transaction_id");



CREATE INDEX "idx_service_costs_dates" ON "public"."service_costs" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_service_costs_service_id" ON "public"."service_costs" USING "btree" ("service_id");



CREATE INDEX "idx_services_subcategory" ON "public"."services" USING "btree" ("subcategory_id");



CREATE INDEX "idx_shared_analyses_username" ON "public"."shared_analyses" USING "btree" ("username");



CREATE INDEX "idx_transactions_customer_id" ON "public"."transactions" USING "btree" ("customer_id");



CREATE INDEX "idx_transactions_external_id" ON "public"."transactions" USING "btree" ("external_id");



CREATE INDEX "idx_transactions_target_profile_link" ON "public"."transactions" USING "btree" ("target_profile_link");



CREATE INDEX "orders_external_order_id_idx" ON "public"."orders" USING "btree" ("external_order_id");



CREATE INDEX "orders_service_id_idx" ON "public"."orders" USING "btree" ("service_id");



CREATE INDEX "orders_user_id_idx" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "profiles_email_idx" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "providers_slug_idx" ON "public"."providers" USING "btree" ("slug");



CREATE UNIQUE INDEX "providers_slug_unique" ON "public"."providers" USING "btree" ("slug");



CREATE INDEX "refills_external_refill_id_idx" ON "public"."refills" USING "btree" ("external_refill_id");



CREATE INDEX "refills_order_id_idx" ON "public"."refills" USING "btree" ("order_id");



CREATE INDEX "refills_status_idx" ON "public"."refills" USING "btree" ("status");



CREATE INDEX "refills_user_id_idx" ON "public"."refills" USING "btree" ("user_id");



CREATE INDEX "services_category_id_idx" ON "public"."services" USING "btree" ("category_id");



CREATE INDEX "services_external_id_idx" ON "public"."services" USING "btree" ("external_id");



CREATE INDEX "services_provider_id_idx" ON "public"."services" USING "btree" ("provider_id");



CREATE INDEX "sessions_last_seen_at_idx" ON "public"."sessions" USING "btree" ("last_seen_at");



CREATE INDEX "sessions_user_id_idx" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "ticket_messages_ticket_id_idx" ON "public"."ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "ticket_messages_user_id_idx" ON "public"."ticket_messages" USING "btree" ("user_id");



CREATE INDEX "tickets_assigned_to_idx" ON "public"."tickets" USING "btree" ("assigned_to");



CREATE INDEX "tickets_order_id_idx" ON "public"."tickets" USING "btree" ("order_id");



CREATE INDEX "tickets_user_id_idx" ON "public"."tickets" USING "btree" ("user_id");



CREATE INDEX "transactions_order_id_idx" ON "public"."transactions" USING "btree" ("order_id");



CREATE INDEX "transactions_user_id_idx" ON "public"."transactions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "clean_expired_analyses" AFTER INSERT ON "public"."shared_analyses" FOR EACH STATEMENT EXECUTE FUNCTION "public"."delete_expired_analyses"();



CREATE OR REPLACE TRIGGER "customers_update_timestamp" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."refills" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "set_sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."subcategories" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "transactions_update_customer_id" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_transaction_customer_id"();



CREATE OR REPLACE TRIGGER "transactions_update_timestamp" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_service_costs_updated_at" BEFORE UPDATE ON "public"."service_costs" FOR EACH ROW EXECUTE FUNCTION "public"."update_service_costs_updated_at"();



CREATE OR REPLACE TRIGGER "update_api_configuration_modtime" BEFORE UPDATE ON "public"."api_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_api_order_updated_at" BEFORE UPDATE ON "public"."api_order" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_checkout_types_updated_at" BEFORE UPDATE ON "public"."checkout_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_configurations_modtime" BEFORE UPDATE ON "public"."configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_configurations_timestamp"();



CREATE OR REPLACE TRIGGER "update_coupons_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_depoimentos_modtime" BEFORE UPDATE ON "public"."depoimentos" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_instagram_profiles_modtime" BEFORE UPDATE ON "public"."instagram_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_selected_posts_updated_at" BEFORE UPDATE ON "public"."selected_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_social_id_fkey" FOREIGN KEY ("social_id") REFERENCES "public"."socials"("id");



ALTER TABLE ONLY "public"."coupon_customer_assignments"
    ADD CONSTRAINT "coupon_customer_assignments_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_customer_assignments"
    ADD CONSTRAINT "coupon_customer_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_service_restrictions"
    ADD CONSTRAINT "coupon_service_restrictions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_service_restrictions"
    ADD CONSTRAINT "coupon_service_restrictions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."refills"
    ADD CONSTRAINT "refills_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."refills"
    ADD CONSTRAINT "refills_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refills"
    ADD CONSTRAINT "refills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."selected_posts"
    ADD CONSTRAINT "selected_posts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."service_costs"
    ADD CONSTRAINT "service_costs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_checkout_type_id_fkey" FOREIGN KEY ("checkout_type_id") REFERENCES "public"."checkout_types"("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Admin users can do all" ON "public"."categories" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin users can do all" ON "public"."configurations" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin users can do all" ON "public"."orders" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin users can do all" ON "public"."profiles" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin users can do all" ON "public"."providers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin users can do all" ON "public"."services" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin users can do all" ON "public"."socials" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin users can do all" ON "public"."tickets" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin users can do all" ON "public"."transactions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Administradores podem gerenciar categorias de despesas" ON "public"."expense_categories" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role")))) WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));



CREATE POLICY "Administradores podem gerenciar custos de serviços" ON "public"."service_costs" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role")))) WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));



CREATE POLICY "Administradores podem gerenciar despesas" ON "public"."expenses" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role")))) WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));



CREATE POLICY "Administradores podem gerenciar todas as configurações" ON "public"."configurations" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Allow anonymous read access" ON "public"."customers" FOR SELECT USING (true);



CREATE POLICY "Allow authenticated insert" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated update" ON "public"."customers" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Apenas admin pode modificar categories" ON "public"."categories" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Apenas admin pode modificar configurations" ON "public"."configurations" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Apenas admin pode modificar providers" ON "public"."providers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Apenas admin pode modificar socials" ON "public"."socials" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Apenas administradores podem atualizar configurações de API" ON "public"."api_configurations" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));



CREATE POLICY "Categories são visíveis para todos" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Configurations privadas são visíveis para admin" ON "public"."configurations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Configurations públicas são visíveis para todos" ON "public"."configurations" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Configurações públicas visíveis para todos" ON "public"."configurations" FOR SELECT USING ((("is_public" = true) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."socials" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authentication service" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."socials" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."subcategories" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."socials" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable write access for admin users" ON "public"."subcategories" USING ((("auth"."role"() = 'authenticated'::"text") AND (((("auth"."jwt"() ->> 'user_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (((("auth"."jwt"() ->> 'user_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Providers are deletable by admins" ON "public"."providers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Providers are insertable by admins" ON "public"."providers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Providers are updatable by admins" ON "public"."providers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Providers are viewable by authenticated users" ON "public"."providers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Providers são visíveis para usuários autenticados" ON "public"."providers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Sessions são visíveis para admin" ON "public"."sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Socials são visíveis para todos" ON "public"."socials" FOR SELECT USING (true);



CREATE POLICY "Somente administradores podem editar configurações" ON "public"."settings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Todos podem visualizar configurações" ON "public"."settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can create orders" ON "public"."orders" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can create refills for their orders" ON "public"."refills" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "refills"."order_id") AND ("orders"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create ticket messages" ON "public"."ticket_messages" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can create tickets" ON "public"."tickets" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own orders" ON "public"."orders" FOR SELECT USING ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own refills" ON "public"."refills" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own ticket messages" ON "public"."ticket_messages" FOR SELECT USING ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can view their own tickets" ON "public"."tickets" FOR SELECT USING ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT USING ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Usuários autenticados podem atualizar configurações" ON "public"."configurations" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (("is_public" = true) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))))) WITH CHECK ((("is_public" = true) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Usuários autenticados podem inserir transações" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários autenticados podem ver configurações de API" ON "public"."api_configurations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Usuários autenticados podem ver suas próprias transações" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Usuários podem atualizar suas próprias sessions" ON "public"."sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem deletar suas próprias sessions" ON "public"."sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem inserir suas próprias sessions" ON "public"."sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem ver seu próprio perfil" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Usuários podem ver suas próprias sessions" ON "public"."sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."api_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."refills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."socials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subcategories" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";












































































































































































































GRANT ALL ON FUNCTION "public"."apply_coupon"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_coupon"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_coupon"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."consolidate_customers_by_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."consolidate_customers_by_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."consolidate_customers_by_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_and_assign_coupon_to_service_customers"("p_code" character varying, "p_description" "text", "p_discount_type" character varying, "p_discount_value" numeric, "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_service_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_and_assign_coupon_to_service_customers"("p_code" character varying, "p_description" "text", "p_discount_type" character varying, "p_discount_value" numeric, "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_service_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_and_assign_coupon_to_service_customers"("p_code" character varying, "p_description" "text", "p_discount_type" character varying, "p_discount_value" numeric, "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_service_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_expired_analyses"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_expired_analyses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_expired_analyses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_service_cost"("service_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_service_cost"("service_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_service_cost"("service_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_coupon_valid"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."is_coupon_valid"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_coupon_valid"("p_coupon_code" character varying, "p_customer_id" "uuid", "p_service_id" "uuid", "p_purchase_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_configurations_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_configurations_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_configurations_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_service_costs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_service_costs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_service_costs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_transaction_customer_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_transaction_customer_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transaction_customer_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_transaction_customer_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_transaction_customer_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transaction_customer_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."api_configurations" TO "anon";
GRANT ALL ON TABLE "public"."api_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."api_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."api_order" TO "anon";
GRANT ALL ON TABLE "public"."api_order" TO "authenticated";
GRANT ALL ON TABLE "public"."api_order" TO "service_role";



GRANT ALL ON SEQUENCE "public"."api_order_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."api_order_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."api_order_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_types" TO "anon";
GRANT ALL ON TABLE "public"."checkout_types" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_types" TO "service_role";



GRANT ALL ON TABLE "public"."configurations" TO "anon";
GRANT ALL ON TABLE "public"."configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."configurations" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_customer_assignments" TO "anon";
GRANT ALL ON TABLE "public"."coupon_customer_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_customer_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_service_restrictions" TO "anon";
GRANT ALL ON TABLE "public"."coupon_service_restrictions" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_service_restrictions" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."depoimentos" TO "anon";
GRANT ALL ON TABLE "public"."depoimentos" TO "authenticated";
GRANT ALL ON TABLE "public"."depoimentos" TO "service_role";



GRANT ALL ON TABLE "public"."expense_categories" TO "anon";
GRANT ALL ON TABLE "public"."expense_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_categories" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."failed_jobs" TO "anon";
GRANT ALL ON TABLE "public"."failed_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."failed_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."faqs" TO "anon";
GRANT ALL ON TABLE "public"."faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."faqs" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."service_costs" TO "anon";
GRANT ALL ON TABLE "public"."service_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."service_costs" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."financial_report" TO "anon";
GRANT ALL ON TABLE "public"."financial_report" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_report" TO "service_role";



GRANT ALL ON TABLE "public"."financial_summary" TO "anon";
GRANT ALL ON TABLE "public"."financial_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_summary" TO "service_role";



GRANT ALL ON TABLE "public"."instagram_profiles" TO "anon";
GRANT ALL ON TABLE "public"."instagram_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."instagram_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."instagram_verification_history" TO "anon";
GRANT ALL ON TABLE "public"."instagram_verification_history" TO "authenticated";
GRANT ALL ON TABLE "public"."instagram_verification_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."instagram_verification_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."instagram_verification_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."instagram_verification_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profit_loss_report" TO "anon";
GRANT ALL ON TABLE "public"."profit_loss_report" TO "authenticated";
GRANT ALL ON TABLE "public"."profit_loss_report" TO "service_role";



GRANT ALL ON TABLE "public"."providers" TO "anon";
GRANT ALL ON TABLE "public"."providers" TO "authenticated";
GRANT ALL ON TABLE "public"."providers" TO "service_role";



GRANT ALL ON TABLE "public"."refills" TO "anon";
GRANT ALL ON TABLE "public"."refills" TO "authenticated";
GRANT ALL ON TABLE "public"."refills" TO "service_role";



GRANT ALL ON TABLE "public"."selected_posts" TO "anon";
GRANT ALL ON TABLE "public"."selected_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."selected_posts" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."shared_analyses" TO "anon";
GRANT ALL ON TABLE "public"."shared_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_analyses" TO "service_role";



GRANT ALL ON TABLE "public"."socials" TO "anon";
GRANT ALL ON TABLE "public"."socials" TO "authenticated";
GRANT ALL ON TABLE "public"."socials" TO "service_role";



GRANT ALL ON TABLE "public"."subcategories" TO "anon";
GRANT ALL ON TABLE "public"."subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."subcategories" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
