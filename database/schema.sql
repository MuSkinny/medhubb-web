
\restrict 1sXZUWvkcMI8zCsJff0Eolhn9nOKwWH2hUJfcvX1bTMiKnER0AcBGzo29Ho6hyG


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




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."approve_doctor"("p_doctor_id" "uuid", "p_admin_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_doctor record;
begin
  -- Verifica che il dottore esista
  select * into v_doctor from doctors where id = p_doctor_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Dottore non trovato');
  end if;

  -- Approva
  update doctors set status = 'approved' where id = p_doctor_id;

  -- Log audit
  insert into audit_log (action, user_id, details)
  values (
    'doctor_approved',
    p_admin_user_id,
    jsonb_build_object('doctor_id', p_doctor_id, 'doctor_email', v_doctor.email)
  );

  return jsonb_build_object('success', true, 'message', 'Dottore approvato');
end;
$$;


ALTER FUNCTION "public"."approve_doctor"("p_doctor_id" "uuid", "p_admin_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_doctor_availability"("p_doctor_id" "uuid", "p_office_id" "uuid", "p_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_day_of_week INTEGER;
    v_schedule_exists BOOLEAN;
    v_conflict_exists BOOLEAN;
    v_unavailable BOOLEAN;
BEGIN
    -- Get day of week (0=Sunday, 6=Saturday)
    v_day_of_week := EXTRACT(DOW FROM p_date);

    -- Check if office has schedule for this day
    SELECT EXISTS (
        SELECT 1 FROM doctor_office_schedules
        WHERE doctor_id = p_doctor_id
        AND office_id = p_office_id
        AND day_of_week = v_day_of_week
        AND is_active = true
        AND p_start_time >= start_time
        AND p_end_time <= end_time
    ) INTO v_schedule_exists;

    -- Check for appointment conflicts
    SELECT EXISTS (
        SELECT 1 FROM appointments
        WHERE doctor_id = p_doctor_id
        AND appointment_date = p_date
        AND status NOT IN ('cancelled_by_patient', 'cancelled_by_doctor', 'completed', 'no_show')
        AND (
            (p_start_time >= start_time AND p_start_time < end_time) OR
            (p_end_time > start_time AND p_end_time <= end_time) OR
            (p_start_time <= start_time AND p_end_time >= end_time)
        )
    ) INTO v_conflict_exists;

    -- Check for doctor unavailability
    SELECT EXISTS (
        SELECT 1 FROM doctor_unavailability
        WHERE doctor_id = p_doctor_id
        AND (office_id = p_office_id OR office_id IS NULL)
        AND (p_date + p_start_time::TIME) >= start_datetime
        AND (p_date + p_end_time::TIME) <= end_datetime
    ) INTO v_unavailable;

    RETURN json_build_object(
        'available', v_schedule_exists AND NOT v_conflict_exists AND NOT v_unavailable,
        'has_schedule', v_schedule_exists,
        'has_conflict', v_conflict_exists,
        'is_unavailable', v_unavailable
    );
END;
$$;


ALTER FUNCTION "public"."check_doctor_availability"("p_doctor_id" "uuid", "p_office_id" "uuid", "p_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_requests" integer DEFAULT 5, "p_window_minutes" integer DEFAULT 60) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_current_count integer;
  v_window_start timestamp with time zone;
begin
  v_window_start := now() - interval '1 minute' * p_window_minutes;

  -- Pulisci vecchie entry
  delete from rate_limits
  where identifier = p_identifier
    and action_type = p_action_type
    and window_start < v_window_start;

  -- Controlla count attuale
  select count, window_start into v_current_count, v_window_start
  from rate_limits
  where identifier = p_identifier and action_type = p_action_type;

  if v_current_count is null then
    -- Prima richiesta
    insert into rate_limits (identifier, action_type, count)
    values (p_identifier, p_action_type, 1)
    on conflict (identifier, action_type)
    do update set count = 1, window_start = now();
    return true;
  elsif v_current_count >= p_max_requests then
    -- Limite raggiunto
    return false;
  else
    -- Incrementa counter
    update rate_limits
    set count = count + 1
    where identifier = p_identifier and action_type = p_action_type;
    return true;
  end if;
end;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_requests" integer, "p_window_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_requests"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE patient_doctor_requests
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_requests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_appointment"("p_appointment_id" "uuid", "p_confirmed_office_id" "uuid", "p_action" "text" DEFAULT 'confirm'::"text", "p_appointment_date" "date" DEFAULT NULL::"date", "p_start_time" time without time zone DEFAULT NULL::time without time zone, "p_end_time" time without time zone DEFAULT NULL::time without time zone, "p_doctor_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_doctor_id UUID;
    v_appointment appointments%ROWTYPE;
    v_new_status TEXT;
    v_message TEXT;
BEGIN
    -- Get authenticated doctor
    v_doctor_id := auth.uid();

    IF v_doctor_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Non autenticato');
    END IF;

    -- Get appointment and verify ownership
    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id AND doctor_id = v_doctor_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Appuntamento non trovato o non autorizzato');
    END IF;

    IF v_appointment.status NOT IN ('requested', 'rescheduled') THEN
        RETURN json_build_object('success', false, 'error', 'Appuntamento non può essere modificato in questo stato');
    END IF;

    -- Validate office belongs to doctor
    IF NOT EXISTS (SELECT 1 FROM doctor_offices WHERE id = p_confirmed_office_id AND doctor_id = v_doctor_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'error', 'Ambulatorio non valido');
    END IF;

    -- Handle different actions
    IF p_action = 'confirm' THEN
        v_new_status := 'confirmed';
        v_message := 'Appuntamento confermato con successo';

        UPDATE appointments
        SET status = v_new_status,
            confirmed_office_id = p_confirmed_office_id,
            doctor_notes = p_doctor_notes,
            updated_at = NOW()
        WHERE id = p_appointment_id;

    ELSIF p_action = 'reschedule' THEN
        -- Validate new date/time provided
        IF p_appointment_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Data e orari sono richiesti per riprogrammare');
        END IF;

        v_new_status := 'confirmed';
        v_message := 'Appuntamento riprogrammato con successo';

        UPDATE appointments
        SET status = v_new_status,
            confirmed_office_id = p_confirmed_office_id,
            appointment_date = p_appointment_date,
            start_time = p_start_time,
            end_time = p_end_time,
            doctor_notes = p_doctor_notes,
            updated_at = NOW()
        WHERE id = p_appointment_id;

    ELSIF p_action = 'reject' THEN
        v_new_status := 'cancelled_by_doctor';
        v_message := 'Appuntamento rifiutato';

        UPDATE appointments
        SET status = v_new_status,
            doctor_notes = p_doctor_notes,
            updated_at = NOW()
        WHERE id = p_appointment_id;

    ELSE
        RETURN json_build_object('success', false, 'error', 'Azione non valida');
    END IF;

    RETURN json_build_object('success', true, 'message', v_message);
END;
$$;


ALTER FUNCTION "public"."confirm_appointment"("p_appointment_id" "uuid", "p_confirmed_office_id" "uuid", "p_action" "text", "p_appointment_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_doctor_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_connection_request"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text" DEFAULT NULL::"text", "p_initiated_by" "text" DEFAULT 'patient'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    request_id UUID;
    calling_user_id UUID;
BEGIN
    calling_user_id := auth.uid();

    -- Validazione: il calling user deve corrispondere al patient_id o doctor_id
    IF p_initiated_by = 'patient' AND calling_user_id != p_patient_id THEN
        RETURN json_build_object('success', false, 'error', 'Non autorizzato');
    END IF;

    IF p_initiated_by = 'doctor' AND calling_user_id != p_doctor_id THEN
        RETURN json_build_object('success', false, 'error', 'Non autorizzato');
    END IF;

    -- Verifica che il medico sia approvato
    IF NOT EXISTS (SELECT 1 FROM doctors WHERE id = p_doctor_id AND status = 'approved') THEN
        RETURN json_build_object('success', false, 'error', 'Medico non disponibile');
    END IF;

    -- Verifica che il paziente non abbia già un collegamento attivo
    IF EXISTS (SELECT 1 FROM patient_doctor_links WHERE patient_id = p_patient_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'error', 'Paziente già collegato a un medico');
    END IF;

    -- Verifica richieste duplicate pending
    IF EXISTS (
        SELECT 1 FROM connection_requests
        WHERE patient_id = p_patient_id
        AND doctor_id = p_doctor_id
        AND status = 'pending'
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Richiesta già esistente');
    END IF;

    -- Crea la richiesta
    INSERT INTO connection_requests (
        patient_id, doctor_id, message, initiated_by, status
    ) VALUES (
        p_patient_id, p_doctor_id, p_message, p_initiated_by, 'pending'
    ) RETURNING id INTO request_id;

    RETURN json_build_object(
        'success', true,
        'request_id', request_id,
        'message', 'Richiesta creata con successo'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Errore interno del database');
END;
$$;


ALTER FUNCTION "public"."create_connection_request"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text", "p_initiated_by" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_connection_request"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text", "p_initiated_by" "text") IS 'Crea richiesta - validazioni incluse, compatibile con patients/doctors che sono auth.users';



CREATE OR REPLACE FUNCTION "public"."create_doctor_invite"("p_doctor_id" "uuid", "p_patient_email" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_patient_id UUID;
    v_request_id UUID;
    v_invitation_token VARCHAR(255);
    v_doctor_approved BOOLEAN;
BEGIN
    -- Verifica che il medico sia approvato
    SELECT status = 'approved' INTO v_doctor_approved
    FROM doctors WHERE id = p_doctor_id;

    IF NOT v_doctor_approved THEN
        RETURN json_build_object('success', false, 'error', 'Doctor not approved');
    END IF;

    -- Trova il paziente tramite email
    SELECT p.id INTO v_patient_id
    FROM patients p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email = p_patient_email;

    IF v_patient_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Patient not found');
    END IF;

    -- Verifica che il paziente non abbia già un collegamento attivo
    IF EXISTS (SELECT 1 FROM patient_doctor_links WHERE patient_id = v_patient_id AND status = 'active') THEN
        RETURN json_build_object('success', false, 'error', 'Patient already has active connection');
    END IF;

    -- Genera token unico
    v_invitation_token := encode(gen_random_bytes(32), 'base64');

    -- Crea invito
    INSERT INTO patient_doctor_requests (
        patient_id,
        doctor_id,
        request_type,
        invitation_token,
        message,
        expires_at
    ) VALUES (
        v_patient_id,
        p_doctor_id,
        'doctor_invite',
        v_invitation_token,
        p_message,
        NOW() + INTERVAL '7 days'
    ) RETURNING id INTO v_request_id;

    RETURN json_build_object(
        'success', true,
        'request_id', v_request_id,
        'invitation_token', v_invitation_token,
        'expires_at', NOW() + INTERVAL '7 days',
        'message', 'Invitation created successfully'
    );
END;
$$;


ALTER FUNCTION "public"."create_doctor_invite"("p_doctor_id" "uuid", "p_patient_email" "text", "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_doctor_invite"("p_doctor_id" "uuid", "p_patient_email" "text", "p_message" "text") IS 'Crea un invito diretto da parte del medico';



CREATE OR REPLACE FUNCTION "public"."create_patient_request"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_request_id UUID;
    v_existing_link UUID;
    v_doctor_approved BOOLEAN;
BEGIN
    -- Verifica che il paziente sia effettivamente un paziente
    IF NOT EXISTS (SELECT 1 FROM patients WHERE id = p_patient_id) THEN
        RETURN json_build_object('success', false, 'error', 'Invalid patient ID');
    END IF;

    -- Verifica che il medico sia approvato
    SELECT status = 'approved' INTO v_doctor_approved
    FROM doctors WHERE id = p_doctor_id;

    IF NOT v_doctor_approved THEN
        RETURN json_build_object('success', false, 'error', 'Doctor not approved');
    END IF;

    -- Verifica che non ci sia già un collegamento attivo
    SELECT id INTO v_existing_link
    FROM patient_doctor_links
    WHERE patient_id = p_patient_id AND status = 'active';

    IF v_existing_link IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Patient already has active connection');
    END IF;

    -- Cancella eventuali richieste pending esistenti per questo paziente
    UPDATE patient_doctor_requests
    SET status = 'cancelled'
    WHERE patient_id = p_patient_id AND status = 'pending';

    -- Crea nuova richiesta
    INSERT INTO patient_doctor_requests (
        patient_id,
        doctor_id,
        request_type,
        message
    ) VALUES (
        p_patient_id,
        p_doctor_id,
        'patient_request',
        p_message
    ) RETURNING id INTO v_request_id;

    RETURN json_build_object(
        'success', true,
        'request_id', v_request_id,
        'message', 'Request created successfully'
    );
END;
$$;


ALTER FUNCTION "public"."create_patient_request"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_patient_request"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text") IS 'Crea una richiesta di collegamento da parte del paziente';



CREATE OR REPLACE FUNCTION "public"."create_patient_request_secure"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- VALIDAZIONE CRITICA: Solo il paziente stesso può creare la richiesta
    IF auth.uid() != p_patient_id THEN
        RETURN json_build_object('success', false, 'error', 'Non autorizzato');
    END IF;

    -- Verifica che il medico sia approvato
    IF NOT EXISTS (SELECT 1 FROM doctors WHERE id = p_doctor_id AND status = 'approved') THEN
        RETURN json_build_object('success', false, 'error', 'Medico non disponibile');
    END IF;

    -- Verifica collegamento esistente
    IF EXISTS (SELECT 1 FROM patient_doctor_connections WHERE patient_id = p_patient_id AND status = 'connected') THEN
        RETURN json_build_object('success', false, 'error', 'Già collegato a un medico');
    END IF;

    -- Verifica richiesta duplicata
    IF EXISTS (SELECT 1 FROM patient_doctor_connections WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id AND status = 'pending') THEN
        RETURN json_build_object('success', false, 'error', 'Richiesta già esistente');
    END IF;

    -- Crea richiesta
    INSERT INTO patient_doctor_connections (
        patient_id, doctor_id, status, message, requested_at
    ) VALUES (
        p_patient_id, p_doctor_id, 'pending', p_message, NOW()
    );

    RETURN json_build_object('success', true, 'message', 'Richiesta creata');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Errore interno');
END;
$$;


ALTER FUNCTION "public"."create_patient_request_secure"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_prescription_request"("p_doctor_id" "uuid", "p_medications" "jsonb", "p_urgency" "text" DEFAULT 'normal'::"text", "p_patient_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_patient_id UUID;
    v_request_id UUID;
    v_connection_status TEXT;
    v_medication JSONB;
    v_med_count INTEGER;
BEGIN
    -- Get authenticated patient
    v_patient_id := auth.uid();

    IF v_patient_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Non autenticato');
    END IF;

    -- Verify patient-doctor connection
    SELECT status INTO v_connection_status
    FROM patient_doctor_connections
    WHERE patient_id = v_patient_id AND doctor_id = p_doctor_id;

    IF v_connection_status != 'connected' THEN
        RETURN json_build_object('success', false, 'error', 'Non collegato a questo medico');
    END IF;

    -- Validate medications array
    IF p_medications IS NULL OR jsonb_array_length(p_medications) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Almeno un farmaco deve essere specificato');
    END IF;

    v_med_count := jsonb_array_length(p_medications);
    IF v_med_count > 10 THEN
        RETURN json_build_object('success', false, 'error', 'Massimo 10 farmaci per richiesta');
    END IF;

    -- Validate urgency
    IF p_urgency NOT IN ('normal', 'urgent') THEN
        RETURN json_build_object('success', false, 'error', 'Livello di urgenza non valido');
    END IF;

    -- Create prescription request
    INSERT INTO prescription_requests (patient_id, doctor_id, urgency, patient_notes)
    VALUES (v_patient_id, p_doctor_id, p_urgency, p_patient_notes)
    RETURNING id INTO v_request_id;

    -- Add medication items
    FOR i IN 0..v_med_count-1 LOOP
        v_medication := p_medications->i;

        -- Validate medication data
        IF NOT (v_medication ? 'medication_name') OR (v_medication->>'medication_name') = '' THEN
            RETURN json_build_object('success', false, 'error', 'Nome farmaco richiesto per tutti i farmaci');
        END IF;

        INSERT INTO prescription_items (
            prescription_request_id,
            medication_name,
            dosage,
            quantity,
            patient_reason
        )
        VALUES (
            v_request_id,
            v_medication->>'medication_name',
            v_medication->>'dosage',
            v_medication->>'quantity',
            v_medication->>'patient_reason'
        );
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'message', 'Richiesta prescrizione inviata con successo',
        'request_id', v_request_id
    );
END;
$$;


ALTER FUNCTION "public"."create_prescription_request"("p_doctor_id" "uuid", "p_medications" "jsonb", "p_urgency" "text", "p_patient_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_doctor_office"("p_name" character varying, "p_address" "text", "p_city" character varying, "p_office_id" "uuid" DEFAULT NULL::"uuid", "p_postal_code" character varying DEFAULT NULL::character varying, "p_phone" character varying DEFAULT NULL::character varying, "p_email" character varying DEFAULT NULL::character varying, "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_doctor_id UUID;
    v_office_id UUID;
    v_action TEXT;
BEGIN
    -- Get authenticated doctor
    v_doctor_id := auth.uid();

    IF v_doctor_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Non autenticato');
    END IF;

    -- Validate doctor exists and is approved
    IF NOT EXISTS (SELECT 1 FROM doctors WHERE id = v_doctor_id AND status = 'approved') THEN
        RETURN json_build_object('success', false, 'error', 'Medico non trovato o non approvato');
    END IF;

    -- Validate required fields
    IF p_name IS NULL OR p_name = '' OR p_address IS NULL OR p_address = '' OR p_city IS NULL OR p_city = '' THEN
        RETURN json_build_object('success', false, 'error', 'Nome, indirizzo e città sono obbligatori');
    END IF;

    IF p_office_id IS NULL THEN
        -- CREATE new office
        INSERT INTO doctor_offices (doctor_id, name, address, city, postal_code, phone, email, notes)
        VALUES (v_doctor_id, p_name, p_address, p_city, p_postal_code, p_phone, p_email, p_notes)
        RETURNING id INTO v_office_id;

        v_action := 'creato';
    ELSE
        -- UPDATE existing office
        -- Verify ownership
        IF NOT EXISTS (SELECT 1 FROM doctor_offices WHERE id = p_office_id AND doctor_id = v_doctor_id) THEN
            RETURN json_build_object('success', false, 'error', 'Ambulatorio non trovato o non autorizzato');
        END IF;

        UPDATE doctor_offices
        SET name = p_name,
            address = p_address,
            city = p_city,
            postal_code = p_postal_code,
            phone = p_phone,
            email = p_email,
            notes = p_notes,
            updated_at = NOW()
        WHERE id = p_office_id AND doctor_id = v_doctor_id;

        v_office_id := p_office_id;
        v_action := 'aggiornato';
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Ambulatorio ' || v_action || ' con successo',
        'office_id', v_office_id
    );
END;
$$;


ALTER FUNCTION "public"."manage_doctor_office"("p_name" character varying, "p_address" "text", "p_city" character varying, "p_office_id" "uuid", "p_postal_code" character varying, "p_phone" character varying, "p_email" character varying, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_doctor"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_order_number" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_existing_doctor record;
begin
  -- Validazione input
  if p_user_id is null or p_email is null or p_first_name is null or p_last_name is null or p_order_number is null then
    return jsonb_build_object('success', false, 'error', 'Tutti i campi sono obbligatori');
  end if;

  -- Controllo email duplicata
  select * into v_existing_doctor from doctors where email = p_email limit 1;
  if found then
    return jsonb_build_object('success', false, 'error', 'Email già registrata come dottore');
  end if;

  -- Inserisci in tabella doctors usando l'ID dell'utente auth
  insert into doctors (id, email, first_name, last_name, order_number, status)
  values (p_user_id, p_email, p_first_name, p_last_name, p_order_number, 'pending');

  -- Log audit
  insert into audit_log (action, user_id, user_email, ip_address, user_agent, details)
  values (
    'doctor_registration',
    p_user_id,
    p_email,
    p_ip_address,
    p_user_agent,
    jsonb_build_object('order_number', p_order_number, 'name', p_first_name || ' ' || p_last_name)
  );

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'Dottore registrato con successo. In attesa di approvazione.'
  );

exception
  when others then
    return jsonb_build_object('success', false, 'error', 'Errore interno: ' || sqlerrm);
end;
$$;


ALTER FUNCTION "public"."register_doctor"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_order_number" "text", "p_ip_address" "inet", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_patient"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_doctor_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_existing_patient record;
  v_doctor_check record;
begin
  -- Validazione input
  if p_user_id is null or p_email is null or p_first_name is null or p_last_name is null then
    return jsonb_build_object('success', false, 'error', 'Tutti i campi sono obbligatori');
  end if;

  -- Controllo email duplicata
  select * into v_existing_patient from patients where email = p_email limit 1;
  if found then
    return jsonb_build_object('success', false, 'error', 'Email già registrata come paziente');
  end if;

  -- Se doctor_id fornito, verifica che sia approvato
  if p_doctor_id is not null then
    select * into v_doctor_check from doctors where id = p_doctor_id and status = 'approved';
    if not found then
      return jsonb_build_object('success', false, 'error', 'Dottore non trovato o non ancora approvato');
    end if;
  end if;

  -- Inserisci in tabella patients usando l'ID dell'utente auth
  insert into patients (id, email, first_name, last_name, doctor_id)
  values (p_user_id, p_email, p_first_name, p_last_name, p_doctor_id);

  -- Log audit
  insert into audit_log (action, user_id, user_email, ip_address, user_agent, details)
  values (
    'patient_registration',
    p_user_id,
    p_email,
    p_ip_address,
    p_user_agent,
    jsonb_build_object('doctor_id', p_doctor_id, 'name', p_first_name || ' ' || p_last_name)
  );

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'Paziente registrato con successo'
  );

exception
  when others then
    return jsonb_build_object('success', false, 'error', 'Errore interno: ' || sqlerrm);
end;
$$;


ALTER FUNCTION "public"."register_patient"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_doctor_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_doctor"("p_doctor_id" "uuid", "p_admin_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_doctor record;
begin
  select * into v_doctor from doctors where id = p_doctor_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Dottore non trovato');
  end if;

  update doctors set status = 'rejected' where id = p_doctor_id;

  insert into audit_log (action, user_id, details)
  values (
    'doctor_rejected',
    p_admin_user_id,
    jsonb_build_object('doctor_id', p_doctor_id, 'doctor_email', v_doctor.email)
  );

  return jsonb_build_object('success', true, 'message', 'Dottore rifiutato');
end;
$$;


ALTER FUNCTION "public"."reject_doctor"("p_doctor_id" "uuid", "p_admin_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_appointment"("p_doctor_id" "uuid", "p_requested_office_id" "uuid", "p_appointment_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_visit_type" "text" DEFAULT 'follow_up'::"text", "p_patient_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_patient_id UUID;
    v_appointment_id UUID;
    v_connection_status TEXT;
BEGIN
    -- Get authenticated patient
    v_patient_id := auth.uid();

    IF v_patient_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Non autenticato');
    END IF;

    -- Verify patient-doctor connection
    SELECT status INTO v_connection_status
    FROM patient_doctor_connections
    WHERE patient_id = v_patient_id AND doctor_id = p_doctor_id;

    IF v_connection_status IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Non collegato a questo medico');
    END IF;

    IF v_connection_status != 'connected' THEN
        RETURN json_build_object('success', false, 'error', 'Collegamento non attivo con questo medico');
    END IF;

    -- Validate appointment is in the future
    IF p_appointment_date < CURRENT_DATE OR
       (p_appointment_date = CURRENT_DATE AND p_start_time <= CURRENT_TIME) THEN
        RETURN json_build_object('success', false, 'error', 'Appuntamento deve essere nel futuro');
    END IF;

    -- Validate time range
    IF p_start_time >= p_end_time THEN
        RETURN json_build_object('success', false, 'error', 'Orario di inizio deve essere precedente a quello di fine');
    END IF;

    -- Validate office belongs to doctor
    IF NOT EXISTS (SELECT 1 FROM doctor_offices WHERE id = p_requested_office_id AND doctor_id = p_doctor_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'error', 'Ambulatorio non valido per questo medico');
    END IF;

    -- Check for existing appointment in the same time slot
    IF EXISTS (
        SELECT 1 FROM appointments
        WHERE doctor_id = p_doctor_id
        AND appointment_date = p_appointment_date
        AND status NOT IN ('cancelled_by_patient', 'cancelled_by_doctor', 'completed', 'no_show')
        AND (
            (p_start_time >= start_time AND p_start_time < end_time) OR
            (p_end_time > start_time AND p_end_time <= end_time) OR
            (p_start_time <= start_time AND p_end_time >= end_time)
        )
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Slot temporale non disponibile');
    END IF;

    -- Create appointment
    INSERT INTO appointments (
        patient_id, doctor_id, requested_office_id, appointment_date,
        start_time, end_time, visit_type, patient_notes
    )
    VALUES (
        v_patient_id, p_doctor_id, p_requested_office_id, p_appointment_date,
        p_start_time, p_end_time, p_visit_type, p_patient_notes
    )
    RETURNING id INTO v_appointment_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Richiesta appuntamento inviata con successo',
        'appointment_id', v_appointment_id
    );
END;
$$;


ALTER FUNCTION "public"."request_appointment"("p_doctor_id" "uuid", "p_requested_office_id" "uuid", "p_appointment_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_visit_type" "text", "p_patient_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_doctor_connection"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Verifica che sia il paziente giusto
    IF auth.uid() != p_patient_id THEN
        RETURN json_build_object('success', false, 'error', 'Non autorizzato');
    END IF;

    -- Verifica medico approvato
    IF NOT EXISTS (SELECT 1 FROM doctors WHERE id = p_doctor_id AND status = 'approved') THEN
        RETURN json_build_object('success', false, 'error', 'Medico non disponibile');
    END IF;

    -- Verifica che non sia già collegato
    IF EXISTS (SELECT 1 FROM patient_doctor_connections WHERE patient_id = p_patient_id AND status = 'connected') THEN
        RETURN json_build_object('success', false, 'error', 'Già collegato a un medico');
    END IF;

    -- Cancella vecchie richieste pending
    DELETE FROM patient_doctor_connections
    WHERE patient_id = p_patient_id AND status = 'pending';

    -- Crea nuova richiesta
    INSERT INTO patient_doctor_connections (patient_id, doctor_id, message, status)
    VALUES (p_patient_id, p_doctor_id, p_message, 'pending');

    RETURN json_build_object('success', true, 'message', 'Richiesta inviata');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Errore database');
END;
$$;


ALTER FUNCTION "public"."request_doctor_connection"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_to_connection"("p_connection_id" "uuid", "p_response" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    connection_record RECORD;
BEGIN
    -- Trova la connessione
    SELECT * INTO connection_record
    FROM patient_doctor_connections
    WHERE id = p_connection_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Richiesta non trovata');
    END IF;

    -- Verifica che sia il medico giusto
    IF auth.uid() != connection_record.doctor_id THEN
        RETURN json_build_object('success', false, 'error', 'Non autorizzato');
    END IF;

    -- Aggiorna lo status
    UPDATE patient_doctor_connections
    SET
        status = CASE WHEN p_response = 'approved' THEN 'connected' ELSE 'rejected' END,
        doctor_note = p_note,
        responded_at = NOW()
    WHERE id = p_connection_id;

    RETURN json_build_object('success', true, 'message', 'Risposta registrata');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Errore database');
END;
$$;


ALTER FUNCTION "public"."respond_to_connection"("p_connection_id" "uuid", "p_response" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_to_connection_request"("p_request_id" "uuid", "p_response" "text", "p_response_note" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    req_record RECORD;
    link_id UUID;
    calling_user_id UUID;
BEGIN
    calling_user_id := auth.uid();

    -- Ottieni dettagli richiesta
    SELECT * INTO req_record
    FROM connection_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Richiesta non trovata');
    END IF;

    -- Verifica autorizzazione (solo il medico destinatario)
    IF calling_user_id != req_record.doctor_id THEN
        RETURN json_build_object('success', false, 'error', 'Non autorizzato');
    END IF;

    -- Verifica che la richiesta sia ancora pending
    IF req_record.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Richiesta già processata');
    END IF;

    -- Aggiorna la richiesta
    UPDATE connection_requests
    SET
        status = p_response,
        response_note = p_response_note,
        responded_at = NOW()
    WHERE id = p_request_id;

    -- Se approvata, crea il collegamento
    IF p_response = 'approved' THEN
        INSERT INTO patient_doctor_links (
            patient_id,
            doctor_id,
            connection_type,
            source_request_id,
            connected_at
        ) VALUES (
            req_record.patient_id,
            req_record.doctor_id,
            'approved_request',
            p_request_id,
            NOW()
        ) RETURNING id INTO link_id;

        RETURN json_build_object(
            'success', true,
            'link_id', link_id,
            'message', 'Richiesta approvata e collegamento creato'
        );
    ELSE
        RETURN json_build_object(
            'success', true,
            'message', 'Richiesta rifiutata'
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Errore interno del database');
END;
$$;


ALTER FUNCTION "public"."respond_to_connection_request"("p_request_id" "uuid", "p_response" "text", "p_response_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."respond_to_connection_request"("p_request_id" "uuid", "p_response" "text", "p_response_note" "text") IS 'Medico risponde a richiesta - crea automaticamente collegamento se approvata';



CREATE OR REPLACE FUNCTION "public"."respond_to_prescription"("p_request_id" "uuid", "p_response" "text", "p_doctor_response" "text", "p_doctor_notes" "text" DEFAULT NULL::"text", "p_create_appointment" boolean DEFAULT false) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_doctor_id UUID;
    v_request prescription_requests%ROWTYPE;
    v_message TEXT;
BEGIN
    -- Get authenticated doctor
    v_doctor_id := auth.uid();

    IF v_doctor_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Non autenticato');
    END IF;

    -- Get request and verify ownership
    SELECT * INTO v_request
    FROM prescription_requests
    WHERE id = p_request_id AND doctor_id = v_doctor_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Richiesta non trovata o non autorizzata');
    END IF;

    IF v_request.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Richiesta già processata');
    END IF;

    -- Validate response type
    IF p_response NOT IN ('approved', 'rejected', 'requires_appointment') THEN
        RETURN json_build_object('success', false, 'error', 'Tipo di risposta non valido');
    END IF;

    -- Set appropriate message based on response
    v_message := CASE p_response
        WHEN 'approved' THEN 'Prescrizione approvata. Il paziente può recarsi in farmacia con la tessera sanitaria.'
        WHEN 'rejected' THEN 'Richiesta prescrizione rifiutata.'
        WHEN 'requires_appointment' THEN 'È necessario un appuntamento prima di procedere con la prescrizione.'
    END;

    -- Update prescription request
    UPDATE prescription_requests
    SET status = p_response,
        doctor_response = p_doctor_response,
        doctor_notes = p_doctor_notes,
        responded_at = NOW()
    WHERE id = p_request_id;

    RETURN json_build_object(
        'success', true,
        'message', v_message,
        'response_type', p_response
    );
END;
$$;


ALTER FUNCTION "public"."respond_to_prescription"("p_request_id" "uuid", "p_response" "text", "p_doctor_response" "text", "p_doctor_notes" "text", "p_create_appointment" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_to_request"("p_request_id" "uuid", "p_doctor_id" "uuid", "p_response" character varying, "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_request_record RECORD;
    v_link_id UUID;
BEGIN
    -- Recupera la richiesta
    SELECT * INTO v_request_record
    FROM patient_doctor_requests
    WHERE id = p_request_id AND doctor_id = p_doctor_id AND status = 'pending';

    IF v_request_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request not found or not pending');
    END IF;

    -- Aggiorna la richiesta
    UPDATE patient_doctor_requests
    SET status = p_response, updated_at = NOW()
    WHERE id = p_request_id;

    -- Se accettata, crea il collegamento
    IF p_response = 'accepted' THEN
        INSERT INTO patient_doctor_links (
            patient_id,
            doctor_id,
            initiated_by,
            notes
        ) VALUES (
            v_request_record.patient_id,
            v_request_record.doctor_id,
            'patient',
            p_notes
        ) RETURNING id INTO v_link_id;

        RETURN json_build_object(
            'success', true,
            'link_id', v_link_id,
            'message', 'Request accepted and connection created'
        );
    ELSE
        RETURN json_build_object(
            'success', true,
            'message', 'Request rejected'
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."respond_to_request"("p_request_id" "uuid", "p_doctor_id" "uuid", "p_response" character varying, "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."respond_to_request"("p_request_id" "uuid", "p_doctor_id" "uuid", "p_response" character varying, "p_notes" "text") IS 'Permette al medico di accettare/rifiutare richieste';



CREATE OR REPLACE FUNCTION "public"."respond_to_request_secure"("p_request_id" "uuid", "p_response" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    req_doctor_id UUID;
BEGIN
    -- Ottieni il doctor_id della richiesta
    SELECT doctor_id INTO req_doctor_id
    FROM patient_doctor_connections
    WHERE id = p_request_id AND status = 'pending';

    IF req_doctor_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Richiesta non trovata');
    END IF;

    -- VALIDAZIONE CRITICA: Solo il medico destinatario può rispondere
    IF auth.uid() != req_doctor_id THEN
        RETURN json_build_object('success', false, 'error', 'Non autorizzato');
    END IF;

    -- Aggiorna richiesta
    UPDATE patient_doctor_connections
    SET
        status = CASE WHEN p_response = 'approved' THEN 'connected' ELSE 'rejected' END,
        doctor_note = p_note,
        responded_at = NOW()
    WHERE id = p_request_id;

    RETURN json_build_object('success', true, 'message', 'Risposta registrata');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Errore interno');
END;
$$;


ALTER FUNCTION "public"."respond_to_request_secure"("p_request_id" "uuid", "p_response" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_office_schedule"("p_office_id" "uuid", "p_day_of_week" integer, "p_start_time" time without time zone, "p_end_time" time without time zone, "p_slot_duration" integer DEFAULT 30) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_doctor_id UUID;
BEGIN
    -- Get authenticated doctor
    v_doctor_id := auth.uid();

    IF v_doctor_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Non autenticato');
    END IF;

    -- Verify office ownership
    IF NOT EXISTS (SELECT 1 FROM doctor_offices WHERE id = p_office_id AND doctor_id = v_doctor_id) THEN
        RETURN json_build_object('success', false, 'error', 'Ambulatorio non trovato o non autorizzato');
    END IF;

    -- Validate inputs
    IF p_day_of_week < 0 OR p_day_of_week > 6 THEN
        RETURN json_build_object('success', false, 'error', 'Giorno della settimana non valido (0-6)');
    END IF;

    IF p_start_time >= p_end_time THEN
        RETURN json_build_object('success', false, 'error', 'Orario di inizio deve essere precedente a quello di fine');
    END IF;

    IF p_slot_duration < 15 OR p_slot_duration > 120 THEN
        RETURN json_build_object('success', false, 'error', 'Durata slot deve essere tra 15 e 120 minuti');
    END IF;

    -- Insert or update schedule
    INSERT INTO doctor_office_schedules (office_id, doctor_id, day_of_week, start_time, end_time, slot_duration)
    VALUES (p_office_id, v_doctor_id, p_day_of_week, p_start_time, p_end_time, p_slot_duration)
    ON CONFLICT (office_id, day_of_week)
    DO UPDATE SET
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        slot_duration = EXCLUDED.slot_duration,
        is_active = true;

    RETURN json_build_object('success', true, 'message', 'Orario impostato con successo');
END;
$$;


ALTER FUNCTION "public"."set_office_schedule"("p_office_id" "uuid", "p_day_of_week" integer, "p_start_time" time without time zone, "p_end_time" time without time zone, "p_slot_duration" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_prescription_responded_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
        NEW.responded_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_prescription_responded_at"() OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "requested_office_id" "uuid",
    "confirmed_office_id" "uuid",
    "appointment_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "status" "text" DEFAULT 'requested'::"text" NOT NULL,
    "visit_type" "text" DEFAULT 'follow_up'::"text",
    "patient_notes" "text",
    "doctor_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'confirmed'::"text", 'office_changed'::"text", 'rescheduled'::"text", 'cancelled_by_patient'::"text", 'cancelled_by_doctor'::"text", 'completed'::"text", 'no_show'::"text"]))),
    CONSTRAINT "appointments_visit_type_check" CHECK (("visit_type" = ANY (ARRAY['first_visit'::"text", 'follow_up'::"text", 'urgent'::"text", 'routine'::"text"]))),
    CONSTRAINT "future_appointment" CHECK ((("appointment_date" >= CURRENT_DATE) OR (("appointment_date" = CURRENT_DATE) AND (("start_time")::time with time zone >= CURRENT_TIME)))),
    CONSTRAINT "valid_appointment_time" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_doctor_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "message" "text",
    "doctor_note" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone,
    CONSTRAINT "patient_doctor_connections_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'connected'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."patient_doctor_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_doctor_connections" IS 'Una sola tabella per tutto: richieste pending, collegamenti attivi, richieste rifiutate';



CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "doctor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."doctor_active_patients" AS
 SELECT "c"."id" AS "link_id",
    "c"."patient_id",
    "c"."responded_at" AS "linked_at",
    "p"."first_name",
    "p"."last_name",
    "p"."email",
    "c"."doctor_id"
   FROM ("public"."patient_doctor_connections" "c"
     JOIN "public"."patients" "p" ON (("c"."patient_id" = "p"."id")))
  WHERE ("c"."status" = 'connected'::"text");


ALTER VIEW "public"."doctor_active_patients" OWNER TO "postgres";


COMMENT ON VIEW "public"."doctor_active_patients" IS 'Pazienti collegati attivamente al medico - query semplificata per API';



CREATE TABLE IF NOT EXISTS "public"."doctor_office_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "office_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "slot_duration" integer DEFAULT 30 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "doctor_office_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "valid_office_hours" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."doctor_office_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctor_offices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "address" "text" NOT NULL,
    "city" character varying(100) NOT NULL,
    "postal_code" character varying(20),
    "phone" character varying(50),
    "email" character varying(255),
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."doctor_offices" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."doctor_office_availability" AS
 SELECT "o"."id" AS "office_id",
    "o"."doctor_id",
    "o"."name" AS "office_name",
    "o"."address",
    "o"."city",
    "s"."day_of_week",
    "s"."start_time",
    "s"."end_time",
    "s"."slot_duration"
   FROM ("public"."doctor_offices" "o"
     JOIN "public"."doctor_office_schedules" "s" ON (("o"."id" = "s"."office_id")))
  WHERE (("o"."is_active" = true) AND ("s"."is_active" = true));


ALTER VIEW "public"."doctor_office_availability" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."doctor_pending_requests" AS
 SELECT "c"."id",
    "c"."patient_id",
    "c"."message",
    "c"."requested_at",
    "p"."first_name" AS "patient_first_name",
    "p"."last_name" AS "patient_last_name",
    "p"."email" AS "patient_email",
    "c"."doctor_id"
   FROM ("public"."patient_doctor_connections" "c"
     JOIN "public"."patients" "p" ON (("c"."patient_id" = "p"."id")))
  WHERE ("c"."status" = 'pending'::"text");


ALTER VIEW "public"."doctor_pending_requests" OWNER TO "postgres";


COMMENT ON VIEW "public"."doctor_pending_requests" IS 'Richieste che aspettano risposta del medico - query semplificata per API';



CREATE TABLE IF NOT EXISTS "public"."doctor_unavailability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "office_id" "uuid",
    "start_datetime" timestamp with time zone NOT NULL,
    "end_datetime" timestamp with time zone NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_unavailability_period" CHECK (("end_datetime" > "start_datetime"))
);


ALTER TABLE "public"."doctor_unavailability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctors" (
    "id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "order_number" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."doctors" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."patient_connection_status" AS
 SELECT "p"."id" AS "patient_id",
    COALESCE("c"."status", 'unconnected'::"text") AS "status",
    "c"."doctor_id",
    "d"."first_name" AS "doctor_first_name",
    "d"."last_name" AS "doctor_last_name",
    "c"."responded_at" AS "connected_at",
    "c"."id" AS "connection_id",
    "c"."message",
    "c"."requested_at"
   FROM (("public"."patients" "p"
     LEFT JOIN "public"."patient_doctor_connections" "c" ON ((("p"."id" = "c"."patient_id") AND ("c"."status" = ANY (ARRAY['pending'::"text", 'connected'::"text"])))))
     LEFT JOIN "public"."doctors" "d" ON (("c"."doctor_id" = "d"."id")));


ALTER VIEW "public"."patient_connection_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."patient_connection_status" IS 'Status di collegamento del paziente: unconnected/pending/connected';



CREATE TABLE IF NOT EXISTS "public"."patient_doctor_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "request_type" character varying(20) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "invitation_token" character varying(255),
    "message" "text",
    "expires_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "no_self_request" CHECK (("patient_id" <> "doctor_id")),
    CONSTRAINT "patient_doctor_requests_request_type_check" CHECK ((("request_type")::"text" = ANY ((ARRAY['patient_request'::character varying, 'doctor_invite'::character varying])::"text"[]))),
    CONSTRAINT "patient_doctor_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."patient_doctor_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_doctor_requests" IS 'Gestisce richieste di collegamento e inviti tra pazienti e medici';



CREATE OR REPLACE VIEW "public"."pending_prescription_requests" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "patient_id",
    NULL::"uuid" AS "doctor_id",
    NULL::"text" AS "status",
    NULL::"text" AS "urgency",
    NULL::"text" AS "patient_notes",
    NULL::"text" AS "doctor_response",
    NULL::"text" AS "doctor_notes",
    NULL::"uuid" AS "related_appointment_id",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "responded_at",
    NULL::"text" AS "patient_first_name",
    NULL::"text" AS "patient_last_name",
    NULL::"text" AS "patient_email",
    NULL::bigint AS "medication_count";


ALTER VIEW "public"."pending_prescription_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prescription_request_id" "uuid" NOT NULL,
    "medication_name" character varying(255) NOT NULL,
    "dosage" character varying(100),
    "quantity" character varying(50),
    "patient_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."prescription_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "urgency" "text" DEFAULT 'normal'::"text",
    "patient_notes" "text",
    "doctor_response" "text",
    "doctor_notes" "text",
    "related_appointment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone,
    CONSTRAINT "prescription_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'requires_appointment'::"text"]))),
    CONSTRAINT "prescription_requests_urgency_check" CHECK (("urgency" = ANY (ARRAY['normal'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."prescription_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identifier" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "count" integer DEFAULT 1,
    "window_start" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."upcoming_appointments" AS
 SELECT "a"."id",
    "a"."patient_id",
    "a"."doctor_id",
    "a"."requested_office_id",
    "a"."confirmed_office_id",
    "a"."appointment_date",
    "a"."start_time",
    "a"."end_time",
    "a"."status",
    "a"."visit_type",
    "a"."patient_notes",
    "a"."doctor_notes",
    "a"."created_at",
    "a"."updated_at",
    "p"."first_name" AS "patient_first_name",
    "p"."last_name" AS "patient_last_name",
    "p"."email" AS "patient_email",
    "o"."name" AS "office_name",
    "o"."address" AS "office_address",
    "o"."city" AS "office_city"
   FROM (("public"."appointments" "a"
     JOIN "public"."patients" "p" ON (("a"."patient_id" = "p"."id")))
     LEFT JOIN "public"."doctor_offices" "o" ON (("a"."confirmed_office_id" = "o"."id")))
  WHERE ("a"."appointment_date" >= CURRENT_DATE)
  ORDER BY "a"."appointment_date", "a"."start_time";


ALTER VIEW "public"."upcoming_appointments" OWNER TO "postgres";


ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctor_office_schedules"
    ADD CONSTRAINT "doctor_office_schedules_office_id_day_of_week_key" UNIQUE ("office_id", "day_of_week");



ALTER TABLE ONLY "public"."doctor_office_schedules"
    ADD CONSTRAINT "doctor_office_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctor_offices"
    ADD CONSTRAINT "doctor_offices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctor_unavailability"
    ADD CONSTRAINT "doctor_unavailability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_doctor_connections"
    ADD CONSTRAINT "patient_doctor_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_doctor_requests"
    ADD CONSTRAINT "patient_doctor_requests_invitation_token_key" UNIQUE ("invitation_token");



ALTER TABLE ONLY "public"."patient_doctor_requests"
    ADD CONSTRAINT "patient_doctor_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_requests"
    ADD CONSTRAINT "prescription_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_identifier_action_type_key" UNIQUE ("identifier", "action_type");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_doctor_connections"
    ADD CONSTRAINT "unique_active_patient" EXCLUDE USING "btree" ("patient_id" WITH =) WHERE (("status" = 'connected'::"text"));



CREATE INDEX "idx_appointments_date" ON "public"."appointments" USING "btree" ("appointment_date");



CREATE INDEX "idx_appointments_doctor" ON "public"."appointments" USING "btree" ("doctor_id");



CREATE INDEX "idx_appointments_doctor_date" ON "public"."appointments" USING "btree" ("doctor_id", "appointment_date");



CREATE INDEX "idx_appointments_office" ON "public"."appointments" USING "btree" ("confirmed_office_id");



CREATE INDEX "idx_appointments_patient" ON "public"."appointments" USING "btree" ("patient_id");



CREATE INDEX "idx_appointments_status" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "idx_audit_log_action" ON "public"."audit_log" USING "btree" ("action");



CREATE INDEX "idx_audit_log_created_at" ON "public"."audit_log" USING "btree" ("created_at");



CREATE INDEX "idx_doctor_connections" ON "public"."patient_doctor_connections" USING "btree" ("doctor_id");



CREATE INDEX "idx_doctors_email" ON "public"."doctors" USING "btree" ("email");



CREATE INDEX "idx_office_schedules_doctor" ON "public"."doctor_office_schedules" USING "btree" ("doctor_id") WHERE ("is_active" = true);



CREATE INDEX "idx_office_schedules_office" ON "public"."doctor_office_schedules" USING "btree" ("office_id") WHERE ("is_active" = true);



CREATE INDEX "idx_offices_doctor" ON "public"."doctor_offices" USING "btree" ("doctor_id") WHERE ("is_active" = true);



CREATE INDEX "idx_patient_connections" ON "public"."patient_doctor_connections" USING "btree" ("patient_id");



CREATE INDEX "idx_patients_doctor_id" ON "public"."patients" USING "btree" ("doctor_id");



CREATE INDEX "idx_patients_email" ON "public"."patients" USING "btree" ("email");



CREATE INDEX "idx_prescription_items_request" ON "public"."prescription_items" USING "btree" ("prescription_request_id");



CREATE INDEX "idx_prescription_requests_doctor" ON "public"."prescription_requests" USING "btree" ("doctor_id");



CREATE INDEX "idx_prescription_requests_patient" ON "public"."prescription_requests" USING "btree" ("patient_id");



CREATE INDEX "idx_prescription_requests_status" ON "public"."prescription_requests" USING "btree" ("status");



CREATE INDEX "idx_rate_limits_identifier" ON "public"."rate_limits" USING "btree" ("identifier", "action_type");



CREATE INDEX "idx_rate_limits_window" ON "public"."rate_limits" USING "btree" ("window_start");



CREATE INDEX "idx_requests_doctor_id" ON "public"."patient_doctor_requests" USING "btree" ("doctor_id");



CREATE INDEX "idx_requests_expires" ON "public"."patient_doctor_requests" USING "btree" ("expires_at");



CREATE INDEX "idx_requests_patient_id" ON "public"."patient_doctor_requests" USING "btree" ("patient_id");



CREATE INDEX "idx_requests_status" ON "public"."patient_doctor_requests" USING "btree" ("status");



CREATE INDEX "idx_requests_token" ON "public"."patient_doctor_requests" USING "btree" ("invitation_token");



CREATE INDEX "idx_status" ON "public"."patient_doctor_connections" USING "btree" ("status");



CREATE INDEX "idx_unavailability_doctor" ON "public"."doctor_unavailability" USING "btree" ("doctor_id");



CREATE INDEX "idx_unavailability_period" ON "public"."doctor_unavailability" USING "btree" ("start_datetime", "end_datetime");



CREATE OR REPLACE VIEW "public"."pending_prescription_requests" AS
 SELECT "pr"."id",
    "pr"."patient_id",
    "pr"."doctor_id",
    "pr"."status",
    "pr"."urgency",
    "pr"."patient_notes",
    "pr"."doctor_response",
    "pr"."doctor_notes",
    "pr"."related_appointment_id",
    "pr"."created_at",
    "pr"."responded_at",
    "p"."first_name" AS "patient_first_name",
    "p"."last_name" AS "patient_last_name",
    "p"."email" AS "patient_email",
    "count"("pi"."id") AS "medication_count"
   FROM (("public"."prescription_requests" "pr"
     JOIN "public"."patients" "p" ON (("pr"."patient_id" = "p"."id")))
     LEFT JOIN "public"."prescription_items" "pi" ON (("pr"."id" = "pi"."prescription_request_id")))
  WHERE ("pr"."status" = 'pending'::"text")
  GROUP BY "pr"."id", "p"."first_name", "p"."last_name", "p"."email"
  ORDER BY "pr"."created_at" DESC;



CREATE OR REPLACE TRIGGER "prescription_auto_responded_at" BEFORE UPDATE ON "public"."prescription_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_prescription_responded_at"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_doctor_offices_updated_at" BEFORE UPDATE ON "public"."doctor_offices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_requests_updated_at" BEFORE UPDATE ON "public"."patient_doctor_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_confirmed_office_id_fkey" FOREIGN KEY ("confirmed_office_id") REFERENCES "public"."doctor_offices"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_requested_office_id_fkey" FOREIGN KEY ("requested_office_id") REFERENCES "public"."doctor_offices"("id");



ALTER TABLE ONLY "public"."doctor_office_schedules"
    ADD CONSTRAINT "doctor_office_schedules_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_office_schedules"
    ADD CONSTRAINT "doctor_office_schedules_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "public"."doctor_offices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_offices"
    ADD CONSTRAINT "doctor_offices_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_unavailability"
    ADD CONSTRAINT "doctor_unavailability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_unavailability"
    ADD CONSTRAINT "doctor_unavailability_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "public"."doctor_offices"("id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_doctor_connections"
    ADD CONSTRAINT "patient_doctor_connections_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_doctor_connections"
    ADD CONSTRAINT "patient_doctor_connections_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_doctor_requests"
    ADD CONSTRAINT "patient_doctor_requests_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_doctor_requests"
    ADD CONSTRAINT "patient_doctor_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_prescription_request_id_fkey" FOREIGN KEY ("prescription_request_id") REFERENCES "public"."prescription_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_requests"
    ADD CONSTRAINT "prescription_requests_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_requests"
    ADD CONSTRAINT "prescription_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_requests"
    ADD CONSTRAINT "prescription_requests_related_appointment_id_fkey" FOREIGN KEY ("related_appointment_id") REFERENCES "public"."appointments"("id");



CREATE POLICY "Admins can view audit logs" ON "public"."audit_log" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Doctors can update their requests" ON "public"."patient_doctor_requests" FOR UPDATE USING ((("auth"."uid"() = "doctor_id") AND (EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "auth"."uid"()) AND ("doctors"."status" = 'approved'::"text"))))));



CREATE POLICY "Doctors can view their patients" ON "public"."patients" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."doctors"
  WHERE (("doctors"."id" = "auth"."uid"()) AND ("doctors"."status" = 'approved'::"text") AND ("patients"."doctor_id" = "doctors"."id")))));



CREATE POLICY "Patients can create requests" ON "public"."patient_doctor_requests" FOR INSERT WITH CHECK ((("auth"."uid"() = "patient_id") AND (EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE ("patients"."id" = "auth"."uid"())))));



CREATE POLICY "Patients can view own requests" ON "public"."patient_doctor_requests";



CREATE POLICY "Service role can insert audit logs" ON "public"."audit_log" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can manage doctors via functions" ON "public"."doctors" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage patients via functions" ON "public"."patients" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage rate limits" ON "public"."rate_limits" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can view own doctor profile" ON "public"."doctors" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own patient profile" ON "public"."patients" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own requests" ON "public"."patient_doctor_requests" FOR SELECT USING ((("auth"."uid"() = "patient_id") OR ("auth"."uid"() = "doctor_id")));



CREATE POLICY "appointment_participants_access" ON "public"."appointments" TO "authenticated" USING ((("patient_id" = "auth"."uid"()) OR ("doctor_id" = "auth"."uid"()))) WITH CHECK ((("patient_id" = "auth"."uid"()) OR ("doctor_id" = "auth"."uid"())));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctor_office_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctor_offices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctor_unavailability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doctors_manage_office_schedules" ON "public"."doctor_office_schedules" TO "authenticated" USING (("doctor_id" = "auth"."uid"())) WITH CHECK (("doctor_id" = "auth"."uid"()));



CREATE POLICY "doctors_manage_own_offices" ON "public"."doctor_offices" TO "authenticated" USING (("doctor_id" = "auth"."uid"())) WITH CHECK (("doctor_id" = "auth"."uid"()));



CREATE POLICY "doctors_manage_unavailability" ON "public"."doctor_unavailability" TO "authenticated" USING (("doctor_id" = "auth"."uid"())) WITH CHECK (("doctor_id" = "auth"."uid"()));



CREATE POLICY "doctors_own_connections" ON "public"."patient_doctor_connections" TO "authenticated" USING (("doctor_id" = "auth"."uid"())) WITH CHECK (("doctor_id" = "auth"."uid"()));



COMMENT ON POLICY "doctors_own_connections" ON "public"."patient_doctor_connections" IS 'Sicurezza produzione: medici accedono solo ai propri pazienti';



CREATE POLICY "doctors_read_connected_patients" ON "public"."patients" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "patient_doctor_connections"."patient_id"
   FROM "public"."patient_doctor_connections"
  WHERE (("patient_doctor_connections"."doctor_id" = "auth"."uid"()) AND ("patient_doctor_connections"."status" = 'connected'::"text")))));



CREATE POLICY "own_connections" ON "public"."patient_doctor_connections" TO "authenticated" USING ((("patient_id" = "auth"."uid"()) OR ("doctor_id" = "auth"."uid"())));



ALTER TABLE "public"."patient_doctor_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_doctor_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patients_own_connections" ON "public"."patient_doctor_connections" TO "authenticated" USING (("patient_id" = "auth"."uid"())) WITH CHECK (("patient_id" = "auth"."uid"()));



COMMENT ON POLICY "patients_own_connections" ON "public"."patient_doctor_connections" IS 'Sicurezza produzione: pazienti accedono solo ai propri dati';



CREATE POLICY "patients_view_connected_doctor_offices" ON "public"."doctor_offices" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND ("doctor_id" IN ( SELECT "patient_doctor_connections"."doctor_id"
   FROM "public"."patient_doctor_connections"
  WHERE (("patient_doctor_connections"."patient_id" = "auth"."uid"()) AND ("patient_doctor_connections"."status" = 'connected'::"text"))))));



CREATE POLICY "patients_view_connected_schedules" ON "public"."doctor_office_schedules" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND ("doctor_id" IN ( SELECT "patient_doctor_connections"."doctor_id"
   FROM "public"."patient_doctor_connections"
  WHERE (("patient_doctor_connections"."patient_id" = "auth"."uid"()) AND ("patient_doctor_connections"."status" = 'connected'::"text"))))));



ALTER TABLE "public"."prescription_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prescription_items_access" ON "public"."prescription_items" TO "authenticated" USING (("prescription_request_id" IN ( SELECT "prescription_requests"."id"
   FROM "public"."prescription_requests"
  WHERE (("prescription_requests"."patient_id" = "auth"."uid"()) OR ("prescription_requests"."doctor_id" = "auth"."uid"()))))) WITH CHECK (("prescription_request_id" IN ( SELECT "prescription_requests"."id"
   FROM "public"."prescription_requests"
  WHERE ("prescription_requests"."patient_id" = "auth"."uid"()))));



CREATE POLICY "prescription_participants_access" ON "public"."prescription_requests" TO "authenticated" USING ((("patient_id" = "auth"."uid"()) OR ("doctor_id" = "auth"."uid"()))) WITH CHECK ((("patient_id" = "auth"."uid"()) OR ("doctor_id" = "auth"."uid"())));



ALTER TABLE "public"."prescription_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "registration_service";
GRANT USAGE ON SCHEMA "public" TO "admin_service";
GRANT USAGE ON SCHEMA "public" TO "authenticated";

























































































































































GRANT ALL ON FUNCTION "public"."approve_doctor"("p_doctor_id" "uuid", "p_admin_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."approve_doctor"("p_doctor_id" "uuid", "p_admin_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."check_doctor_availability"("p_doctor_id" "uuid", "p_office_id" "uuid", "p_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "authenticated";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_requests" integer, "p_window_minutes" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_requests" integer, "p_window_minutes" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."cleanup_expired_requests"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."confirm_appointment"("p_appointment_id" "uuid", "p_confirmed_office_id" "uuid", "p_action" "text", "p_appointment_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_doctor_notes" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_connection_request"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text", "p_initiated_by" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_doctor_invite"("p_doctor_id" "uuid", "p_patient_email" "text", "p_message" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_patient_request"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_patient_request_secure"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_prescription_request"("p_doctor_id" "uuid", "p_medications" "jsonb", "p_urgency" "text", "p_patient_notes" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."manage_doctor_office"("p_name" character varying, "p_address" "text", "p_city" character varying, "p_office_id" "uuid", "p_postal_code" character varying, "p_phone" character varying, "p_email" character varying, "p_notes" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."register_doctor"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_order_number" "text", "p_ip_address" "inet", "p_user_agent" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."register_doctor"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_order_number" "text", "p_ip_address" "inet", "p_user_agent" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."register_patient"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_doctor_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."register_patient"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_doctor_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."reject_doctor"("p_doctor_id" "uuid", "p_admin_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."reject_doctor"("p_doctor_id" "uuid", "p_admin_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."request_appointment"("p_doctor_id" "uuid", "p_requested_office_id" "uuid", "p_appointment_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_visit_type" "text", "p_patient_notes" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."request_doctor_connection"("p_patient_id" "uuid", "p_doctor_id" "uuid", "p_message" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."respond_to_connection"("p_connection_id" "uuid", "p_response" "text", "p_note" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."respond_to_connection_request"("p_request_id" "uuid", "p_response" "text", "p_response_note" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."respond_to_prescription"("p_request_id" "uuid", "p_response" "text", "p_doctor_response" "text", "p_doctor_notes" "text", "p_create_appointment" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."respond_to_request"("p_request_id" "uuid", "p_doctor_id" "uuid", "p_response" character varying, "p_notes" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."respond_to_request_secure"("p_request_id" "uuid", "p_response" "text", "p_note" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_office_schedule"("p_office_id" "uuid", "p_day_of_week" integer, "p_start_time" time without time zone, "p_end_time" time without time zone, "p_slot_duration" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";


















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."appointments" TO "authenticated";



GRANT INSERT ON TABLE "public"."audit_log" TO "registration_service";
GRANT INSERT ON TABLE "public"."audit_log" TO "admin_service";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";



GRANT ALL ON TABLE "public"."patient_doctor_connections" TO "authenticated";



GRANT SELECT,INSERT ON TABLE "public"."patients" TO "registration_service";
GRANT SELECT ON TABLE "public"."patients" TO "admin_service";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";



GRANT ALL ON TABLE "public"."doctor_active_patients" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."doctor_office_schedules" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."doctor_offices" TO "authenticated";



GRANT SELECT ON TABLE "public"."doctor_office_availability" TO "authenticated";



GRANT ALL ON TABLE "public"."doctor_pending_requests" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."doctor_unavailability" TO "authenticated";



GRANT SELECT,INSERT ON TABLE "public"."doctors" TO "registration_service";
GRANT SELECT ON TABLE "public"."doctors" TO "admin_service";
GRANT ALL ON TABLE "public"."doctors" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."doctors" TO "admin_service";



GRANT ALL ON TABLE "public"."patient_connection_status" TO "authenticated";



GRANT ALL ON TABLE "public"."patient_doctor_requests" TO "authenticated";



GRANT SELECT ON TABLE "public"."pending_prescription_requests" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."prescription_items" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."prescription_requests" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."rate_limits" TO "registration_service";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";



GRANT SELECT ON TABLE "public"."upcoming_appointments" TO "authenticated";

































\unrestrict 1sXZUWvkcMI8zCsJff0Eolhn9nOKwWH2hUJfcvX1bTMiKnER0AcBGzo29Ho6hyG

RESET ALL;
