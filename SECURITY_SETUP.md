# 🔒 MedHubb Security Setup Guide

## Panoramica
Questa guida implementa un sistema di sicurezza multi-layer per MedHubb con:
- **Database functions sicure** invece di query dirette
- **Rate limiting** per prevenire abusi
- **Audit logging** per tracciare operazioni
- **Middleware di autenticazione** per API protette
- **Principio dei minimi privilegi** per permessi database

---

## 🚀 Setup Iniziale

### 1. Configurazione Database Supabase

**Esegui il file SQL:**
```bash
# Copia il contenuto di supabase_secure_setup.sql
# Incollalo nell'SQL Editor di Supabase
# Clicca "Run"
```

**Cosa fa questo script:**
- ✅ Crea tabelle sicure con RLS
- ✅ Configura ruoli specifici (registration_service, admin_service)
- ✅ Implementa database functions per operazioni critiche
- ✅ Aggiunge audit logging e rate limiting
- ✅ Configura permessi minimi

### 2. Verifica Setup

**Controlla che le funzioni siano create:**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('register_doctor', 'register_patient', 'approve_doctor', 'reject_doctor');
```

**Controlla permessi:**
```sql
SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE grantee IN ('service_role', 'registration_service', 'admin_service');
```

---

## 🛡️ Architettura di Sicurezza

### Layer 1: Database Functions
```sql
-- Invece di query dirette, usiamo funzioni sicure
SELECT register_doctor('email', 'password', 'name', 'surname', 'order');
```
**Benefici:**
- Logica centralizzata nel database
- Validazioni automatiche
- Transazioni atomiche
- Controllo granulare degli accessi

### Layer 2: Rate Limiting
```typescript
// 3 registrazioni per ora per IP
withRateLimit(registrationRateLimit, handler)

// 10 login per 15 minuti
withRateLimit(loginRateLimit, handler)
```

### Layer 3: Authentication Middleware
```typescript
// Solo admin possono accedere
withAdminAuth(handler)

// Solo dottori approvati
withDoctorAuth(handler)
```

### Layer 4: Audit Logging
Ogni operazione viene tracciata in `audit_log` con:
- Azione eseguita
- User ID
- IP address
- User agent
- Dettagli specifici

---

## 📊 Tabelle Create

### `doctors`
```sql
- id (UUID, FK a auth.users)
- first_name, last_name, email
- order_number (numero ordine medici)
- status: 'pending' | 'approved' | 'rejected'
- created_at
```

### `patients`
```sql
- id (UUID, FK a auth.users)
- first_name, last_name, email
- doctor_id (FK a doctors, nullable)
- created_at
```

### `audit_log` (Nuovo)
```sql
- id, action, user_id, user_email
- ip_address, user_agent, details (JSONB)
- created_at
```

### `rate_limits` (Nuovo)
```sql
- identifier (IP o user_id)
- action_type, count, window_start
- created_at
```

---

## 🔧 API Endpoints Aggiornate

### Registrazione (Rate Limited)

**POST `/api/auth/register/doctor`**
```json
{
  "email": "doctor@test.com",
  "password": "password123",
  "first_name": "Mario",
  "last_name": "Rossi",
  "order_number": "OM12345"
}
```
- ✅ Rate limit: 3/ora
- ✅ Usa `register_doctor()` function
- ✅ Audit log automatico

**POST `/api/auth/register/patient`**
```json
{
  "email": "patient@test.com",
  "password": "password123",
  "first_name": "Luigi",
  "last_name": "Verdi",
  "doctor_id": "uuid-optional"
}
```

### Admin (Auth Required)

**Headers richiesti:**
```
Authorization: Bearer <jwt-token>
```

**GET `/api/admin/doctors/pending`**
- ✅ Solo admin
- ✅ Rate limited
- ✅ Audit logged

**POST `/api/admin/doctors/approve`**
```json
{ "id": "doctor-uuid" }
```

**POST `/api/admin/doctors/reject`**
```json
{ "id": "doctor-uuid" }
```

---

## 🔐 Livelli di Sicurezza

### ❌ Prima (Insicuro)
```typescript
// Service role con GRANT ALL - PERICOLOSO!
await supabaseAdmin.from('doctors').insert(data);
```

### ✅ Ora (Sicuro)
```typescript
// Database function con validazioni
await supabaseAdmin.rpc('register_doctor', params);
```

### Differenze Chiave:
| **Prima** | **Ora** |
|-----------|---------|
| Query dirette | Database functions |
| Nessun rate limiting | Rate limiting attivo |
| Nessun audit | Tutto loggato |
| Admin non protetti | Middleware auth |
| Service role = super admin | Permessi minimi |

---

## 🚨 Monitoraggio

### Query Utili per Audit

**Registrazioni recenti:**
```sql
SELECT * FROM audit_log
WHERE action IN ('doctor_registration', 'patient_registration')
ORDER BY created_at DESC LIMIT 10;
```

**Rate limit violations:**
```sql
SELECT identifier, action_type, count
FROM rate_limits
WHERE count >= 3;
```

**Operazioni admin:**
```sql
SELECT * FROM audit_log
WHERE action IN ('doctor_approved', 'doctor_rejected')
ORDER BY created_at DESC;
```

---

## ⚠️ Note Importanti

1. **Service Role Key**: Ora ha permessi minimi, non più super admin
2. **Database Functions**: Validano input e gestiscono transazioni
3. **Rate Limiting**: Previene spam e attacchi brute force
4. **Audit Trail**: Ogni azione è tracciata per compliance
5. **Middleware**: Proteggono API sensibili

---

## 🔄 Deploy in Produzione

1. **Esegui SQL setup** in ambiente di produzione
2. **Verifica permessi** con le query di controllo
3. **Testa rate limiting** con tool come Postman
4. **Monitora audit logs** regolarmente
5. **Rotazione chiavi** ogni 90 giorni

**Il sistema ora è pronto per produzione con sicurezza enterprise-grade!** 🚀