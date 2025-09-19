# API Mancanti per MedHubb

Questo documento elenca le API che devono essere implementate per completare le funzionalità delle dashboard aggiornate.

## 🏥 API per Gestione Ambulatori (Priorità Alta)

### `/api/offices`
**Status**: ❌ Non implementata
**Metodi necessari**: GET, POST, PUT, DELETE
**Descrizione**: Gestione ambulatori medici

```typescript
// GET /api/offices?doctorId={id}
{
  success: true,
  offices: [
    {
      id: string,
      doctor_id: string,
      name: string,
      address: string,
      city: string,
      postal_code: string,
      phone: string,
      is_active: boolean,
      created_at: string
    }
  ]
}

// POST /api/offices
{
  doctor_id: string,
  name: string,
  address: string,
  city: string,
  postal_code?: string,
  phone?: string,
  is_active: boolean
}
```

### `/api/offices/schedules`
**Status**: ❌ Non implementata
**Metodi necessari**: GET, POST, PUT, DELETE
**Descrizione**: Gestione orari ambulatori

```typescript
// GET /api/offices/schedules?officeId={id}
{
  success: true,
  schedules: [
    {
      id: string,
      office_id: string,
      day_of_week: number, // 0-6 (domenica-sabato)
      start_time: string, // "09:00"
      end_time: string, // "17:00"
      break_start?: string, // "13:00"
      break_end?: string, // "14:00"
      is_active: boolean
    }
  ]
}
```

## 📅 API per Gestione Appuntamenti (Priorità Alta)

### `/api/appointments` - Miglioramenti
**Status**: 🔄 Parzialmente implementata
**Miglioramenti necessari**:

1. **Filtri mancanti**:
   - Per data: `?date=YYYY-MM-DD`
   - Per status: `?status=pending,confirmed,cancelled`
   - Per paziente: `?patientId={id}`

2. **Campi mancanti nella risposta**:
   ```typescript
   {
     id: string,
     patient_id: string,
     doctor_id: string,
     office_id?: string, // ⚠️ MANCANTE
     appointment_date: string,
     start_time: string,
     end_time: string,
     status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
     visit_type: string,
     patient_notes?: string,
     doctor_notes?: string,
     created_at: string,
     // Relazioni
     patients: { first_name: string, last_name: string, email: string },
     doctors: { first_name: string, last_name: string },
     offices?: { name: string, address: string } // ⚠️ MANCANTE
   }
   ```

3. **Endpoint mancanti**:
   - `PUT /api/appointments/{id}/confirm` - Conferma appuntamento
   - `PUT /api/appointments/{id}/cancel` - Cancella appuntamento
   - `PUT /api/appointments/{id}/reschedule` - Riprogramma appuntamento

## 👥 API per Gestione Pazienti Avanzata (Priorità Media)

### `/api/patients/history`
**Status**: ❌ Non implementata
**Descrizione**: Storico completo paziente per il modal PatientProfileModal

```typescript
// GET /api/patients/history?patientId={id}&doctorId={id}
{
  success: true,
  patient: {
    id: string,
    nome: string,
    cognome: string,
    email: string,
    telefono?: string,
    data_nascita?: string,
    codice_fiscale?: string,
    indirizzo?: string,
    citta?: string,
    cap?: string,
    created_at: string
  },
  appointments: Appointment[],
  prescriptions: Prescription[]
}
```

### `/api/patients/profile`
**Status**: ❌ Non implementata
**Descrizione**: Gestione profili pazienti dettagliati

```typescript
// GET /api/patients/profile?patientId={id}
// PUT /api/patients/profile/{id}
```

## 📊 API per Dashboard Analytics (Priorità Bassa)

### `/api/dashboard/stats`
**Status**: ❌ Non implementata
**Descrizione**: Statistiche per dashboard overview

```typescript
// GET /api/dashboard/stats?doctorId={id}&period=week|month|year
{
  success: true,
  stats: {
    total_patients: number,
    pending_appointments: number,
    pending_prescriptions: number,
    today_appointments: number,
    weekly_appointments: number,
    monthly_prescriptions: number
  }
}

// GET /api/dashboard/stats?patientId={id}
{
  success: true,
  stats: {
    pending_appointments: number,
    pending_prescriptions: number,
    total_appointments: number,
    total_prescriptions: number,
    last_visit_date?: string
  }
}
```

## 🔔 API per Notifiche (Priorità Bassa)

### `/api/notifications`
**Status**: ❌ Non implementata
**Descrizione**: Sistema notifiche per pazienti e dottori

```typescript
// GET /api/notifications?userId={id}&userType=patient|doctor
{
  success: true,
  notifications: [
    {
      id: string,
      user_id: string,
      user_type: 'patient' | 'doctor',
      type: 'appointment_confirmed' | 'prescription_approved' | 'new_request',
      title: string,
      message: string,
      read: boolean,
      created_at: string
    }
  ]
}

// PUT /api/notifications/{id}/read
// POST /api/notifications (per creare notifiche)
```

## 🏗️ Modifiche Database Necessarie

### Tabella `appointments`
```sql
-- Aggiungere colonna office_id
ALTER TABLE appointments ADD COLUMN office_id UUID REFERENCES doctor_offices(id);

-- Aggiungere indici per performance
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_office ON appointments(office_id);
```

### Tabella `doctor_offices` (Nuova)
```sql
CREATE TABLE doctor_offices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doctors(user_id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE doctor_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage their own offices" ON doctor_offices
  USING (auth.uid() = doctor_id);
```

### Tabella `doctor_office_schedules` (Nuova)
```sql
CREATE TABLE doctor_office_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  office_id UUID NOT NULL REFERENCES doctor_offices(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(office_id, day_of_week)
);

-- RLS Policies
ALTER TABLE doctor_office_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage schedules for their offices" ON doctor_office_schedules
  USING (
    office_id IN (
      SELECT id FROM doctor_offices WHERE doctor_id = auth.uid()
    )
  );
```

## 📝 Priorità di Implementazione

### Fase 1 (Subito) - Funzionalità Base Mancanti
1. **API Ambulatori** (`/api/offices`) - Necessaria per prenotazioni
2. **Miglioramenti API Appuntamenti** - Office_id e endpoint mancanti
3. **Database migrations** - Tabelle ambulatori

### Fase 2 (Prossima settimana) - Esperienza Utente
1. **API Storico Pazienti** (`/api/patients/history`) - Per modal profilo
2. **API Dashboard Stats** - Statistiche vere nelle card overview
3. **Endpoint conferma/cancella appuntamenti**

### Fase 3 (Futuro) - Features Avanzate
1. **API Notifiche** - Sistema notifiche push
2. **API Gestione Profili** - Profili pazienti dettagliati
3. **Analytics avanzate** - Report e statistiche

## 🔍 Note per l'Implementazione

1. **Sicurezza**: Tutte le nuove API devono seguire il pattern di autenticazione esistente con Bearer token e RLS
2. **Consistenza**: Usare lo stesso formato di risposta `{ success: boolean, data: any, error?: string }`
3. **Validazione**: Implementare validazione robusta per tutti i campi input
4. **Testing**: Testare con account paziente e dottore separati
5. **Performance**: Aggiungere indici database per query frequenti

## 🎯 File da Aggiornare

Quando implementi le API, ricorda di aggiornare:
- `CLAUDE.md` - Aggiornare la sezione "Development Status"
- `PROJECT_STATUS.md` - Marcare feature come implementate
- `TECHNICAL_SPECIFICATIONS.md` - Aggiornare documentazione API