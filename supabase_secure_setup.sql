-- ============================================================================
-- MEDHUBB SECURE DATABASE SETUP
-- ============================================================================
-- Esegui questo file nell'SQL Editor di Supabase per configurazione sicura

-- ==========================
-- 1. CLEANUP: RIMUOVI PERMESSI ECCESSIVI
-- ==========================

-- Revoca tutti i permessi generici precedenti
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM service_role;

-- ==========================
-- 2. TABELLE (se non esistono già)
-- ==========================

-- Doctors table
create table if not exists doctors (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  order_number text not null,
  status text not null default 'pending',
  created_at timestamp with time zone default now()
);

-- Patients table
create table if not exists patients (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  doctor_id uuid references doctors(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Audit log table per sicurezza
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  user_id uuid,
  user_email text,
  ip_address inet,
  user_agent text,
  details jsonb,
  created_at timestamp with time zone default now()
);

-- Rate limiting table
create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null, -- IP o user_id
  action_type text not null, -- 'registration', 'login', etc.
  count integer default 1,
  window_start timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(identifier, action_type)
);

-- ==========================
-- 3. INDEXES
-- ==========================

create index if not exists idx_doctors_email on doctors(email);
create index if not exists idx_patients_email on patients(email);
create index if not exists idx_patients_doctor_id on patients(doctor_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at);
create index if not exists idx_audit_log_action on audit_log(action);
create index if not exists idx_rate_limits_identifier on rate_limits(identifier, action_type);
create index if not exists idx_rate_limits_window on rate_limits(window_start);

-- ==========================
-- 4. RLS (Row Level Security)
-- ==========================

alter table doctors enable row level security;
alter table patients enable row level security;
alter table audit_log enable row level security;
alter table rate_limits enable row level security;

-- ==========================
-- 5. RUOLI SPECIFICI
-- ==========================

-- Ruolo per operazioni di registrazione
drop role if exists registration_service;
create role registration_service;

-- Ruolo per operazioni admin
drop role if exists admin_service;
create role admin_service;

-- ==========================
-- 6. PERMESSI MINIMI - SOLO QUELLO CHE SERVE
-- ==========================

-- Permessi per registration_service
grant usage on schema public to registration_service;
grant select on doctors to registration_service; -- per controllo email duplicata
grant insert on doctors to registration_service;
grant select on patients to registration_service; -- per controllo email duplicata
grant insert on patients to registration_service;
grant insert on audit_log to registration_service;
grant select, insert, update on rate_limits to registration_service;

-- Permessi per admin_service
grant usage on schema public to admin_service;
grant select on doctors to admin_service;
grant update (status) on doctors to admin_service; -- solo campo status
grant select on patients to admin_service;
grant insert on audit_log to admin_service;

-- Il service_role userà questi ruoli attraverso le funzioni
grant registration_service to service_role;
grant admin_service to service_role;

-- ==========================
-- 7. POLICIES RLS
-- ==========================

-- Doctors policies
drop policy if exists "Users can view own doctor profile" on doctors;
create policy "Users can view own doctor profile"
  on doctors for select
  using (auth.uid() = id);

drop policy if exists "Service role can manage doctors via functions" on doctors;
create policy "Service role can manage doctors via functions"
  on doctors for all
  to service_role
  using (true)
  with check (true);

-- Patients policies
drop policy if exists "Users can view own patient profile" on patients;
create policy "Users can view own patient profile"
  on patients for select
  using (auth.uid() = id);

drop policy if exists "Doctors can view their patients" on patients;
create policy "Doctors can view their patients"
  on patients for select
  using (
    exists (
      select 1 from doctors
      where doctors.id = auth.uid()
      and doctors.status = 'approved'
      and patients.doctor_id = doctors.id
    )
  );

drop policy if exists "Service role can manage patients via functions" on patients;
create policy "Service role can manage patients via functions"
  on patients for all
  to service_role
  using (true)
  with check (true);

-- Audit log policies
drop policy if exists "Service role can insert audit logs" on audit_log;
create policy "Service role can insert audit logs"
  on audit_log for insert
  to service_role
  with check (true);

drop policy if exists "Admins can view audit logs" on audit_log;
create policy "Admins can view audit logs"
  on audit_log for select
  to service_role
  using (true);

-- Rate limits policies
drop policy if exists "Service role can manage rate limits" on rate_limits;
create policy "Service role can manage rate limits"
  on rate_limits for all
  to service_role
  using (true)
  with check (true);

-- ==========================
-- 8. FUNZIONI SICURE PER REGISTRAZIONE
-- ==========================

-- Funzione per registrazione dottore
create or replace function register_doctor(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_order_number text,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer -- Esegue con privilegi del creatore
as $$
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

-- Funzione per registrazione paziente
create or replace function register_patient(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_doctor_id uuid default null,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
as $$
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

-- Funzione per rate limiting
create or replace function check_rate_limit(
  p_identifier text,
  p_action_type text,
  p_max_requests integer default 5,
  p_window_minutes integer default 60
)
returns boolean
language plpgsql
security definer
as $$
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

-- ==========================
-- 9. GRANT EXECUTE SULLE FUNZIONI
-- ==========================

grant execute on function register_doctor to service_role;
grant execute on function register_patient to service_role;
grant execute on function check_rate_limit to service_role;

-- ==========================
-- 10. FUNZIONI ADMIN
-- ==========================

create or replace function approve_doctor(
  p_doctor_id uuid,
  p_admin_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
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

create or replace function reject_doctor(
  p_doctor_id uuid,
  p_admin_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
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

grant execute on function approve_doctor to service_role;
grant execute on function reject_doctor to service_role;

-- ==========================
-- SETUP COMPLETATO
-- ==========================

-- Query di verifica
select 'Setup completato! Verifica permessi:' as status;
select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where grantee in ('service_role', 'registration_service', 'admin_service')
order by table_name, grantee;