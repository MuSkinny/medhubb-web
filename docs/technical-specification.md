# MEDHUBB - TECHNICAL SPECIFICATION
## Sistema di Gestione Medico-Paziente Completo

---

## 📋 **PANORAMICA GENERALE**

MedHubb è una piattaforma web per la gestione della relazione medico-paziente che include:
- **Sistema di collegamento** medico-paziente con richieste e approvazioni
- **Gestione ambulatori** multipli per medico
- **Sistema di prenotazione appuntamenti** con calendario
- **Gestione richieste prescrizioni** (non emissione effettiva)

### **Architettura Tecnica:**
- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + Supabase
- **Database:** PostgreSQL con Row Level Security (RLS)
- **Auth:** Supabase Authentication

---

## 🏗️ **SISTEMA ESISTENTE (GIÀ IMPLEMENTATO)**

### **1. Gestione Utenti**
- ✅ Registrazione separata medici/pazienti
- ✅ Approvazione medici da parte admin
- ✅ Sistema di autenticazione sicuro

### **2. Sistema Collegamento Medico-Paziente**
- ✅ Richieste di collegamento da paziente a medico
- ✅ Approvazione/rifiuto da parte del medico
- ✅ Sistema di inviti diretti dal medico
- ✅ Dashboard per gestione richieste

### **Database Implementato:**
```sql
-- Tabelle esistenti
patients (id, email, first_name, last_name, status, ...)
doctors (id, email, first_name, last_name, status, ...)
patient_doctor_connections (id, patient_id, doctor_id, status, ...)
doctor_invites (id, doctor_id, invite_code, ...)
```

---

## 🚀 **NUOVE FUNZIONALITÀ DA IMPLEMENTARE**

## 🏥 **1. SISTEMA GESTIONE AMBULATORI**

### **Obiettivo:**
Permettere ai medici di gestire multipli ambulatori con orari specifici.

### **Funzionalità Medico:**
- **CRUD Ambulatori:** Creare, modificare, eliminare ambulatori
- **Informazioni Complete:** Nome, indirizzo completo, telefono, email
- **Gestione Orari:** Orari specifici per ogni ambulatorio per giorno della settimana
- **Configurazione Slot:** Durata appuntamenti personalizzabile per ambulatorio
- **Stato Attivo/Inattivo:** Disabilitare temporaneamente ambulatori

### **Funzionalità Paziente:**
- **Visualizzazione Ambulatori:** Lista ambulatori del proprio medico
- **Dettagli Completi:** Indirizzo, contatti, orari di apertura
- **Preferenza Ambulatorio:** Selezione ambulatorio preferito per appuntamento

### **Database Schema:**
```sql
-- Tabella principale ambulatori
doctor_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orari per ambulatorio
doctor_office_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES doctor_offices(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domenica, 6=Sabato
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER NOT NULL DEFAULT 30, -- minuti
    is_active BOOLEAN DEFAULT true,
    UNIQUE(office_id, day_of_week)
);
```

---

## 📅 **2. SISTEMA GESTIONE APPUNTAMENTI**

### **Obiettivo:**
Sistema completo di prenotazione e gestione appuntamenti tra medici e pazienti.

### **Workflow Appuntamenti:**
1. **Paziente:** Richiede appuntamento con ambulatorio preferito
2. **Medico:** Conferma/modifica ambulatorio e orario
3. **Sistema:** Gestisce stati e notifiche

### **Funzionalità Medico:**
- **Calendario Personale:** Vista giornaliera/settimanale/mensile
- **Gestione Richieste:** Conferma, rifiuta, riprogramma appuntamenti
- **Assegnazione Ambulatorio:** Conferma o cambia ambulatorio richiesto
- **Note Private:** Annotazioni per ogni appuntamento
- **Gestione Disponibilità:** Bloccare slot per ferie/impegni

### **Funzionalità Paziente:**
- **Richiesta Appuntamento:** Selezione data, orario, ambulatorio
- **Motivazione Visita:** Campo opzionale per specificare motivo
- **Gestione Esistenti:** Visualizza, modifica, cancella appuntamenti
- **Storico Completo:** Tutti gli appuntamenti passati

### **Stati Appuntamento:**
- `requested` - Paziente ha fatto richiesta
- `confirmed` - Medico ha confermato
- `office_changed` - Medico ha cambiato ambulatorio
- `rescheduled` - In attesa conferma nuovo orario
- `cancelled_by_patient` - Cancellato da paziente
- `cancelled_by_doctor` - Cancellato da medico
- `completed` - Visita completata
- `no_show` - Paziente non si è presentato

### **Tipologie Visite:**
- `first_visit` - Prima visita (durata maggiore)
- `follow_up` - Controllo
- `urgent` - Urgente
- `routine` - Routine

### **Database Schema:**
```sql
-- Tabella principale appuntamenti
appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    requested_office_id UUID REFERENCES doctor_offices(id), -- Ambulatorio richiesto
    confirmed_office_id UUID REFERENCES doctor_offices(id), -- Ambulatorio confermato
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
        'requested', 'confirmed', 'office_changed', 'rescheduled',
        'cancelled_by_patient', 'cancelled_by_doctor', 'completed', 'no_show'
    )),
    visit_type TEXT DEFAULT 'follow_up' CHECK (visit_type IN (
        'first_visit', 'follow_up', 'urgent', 'routine'
    )),
    patient_notes TEXT, -- Motivo/note del paziente
    doctor_notes TEXT, -- Note private del medico
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint per evitare sovrapposizioni
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Blocchi di indisponibilità del medico
doctor_unavailability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    office_id UUID REFERENCES doctor_offices(id), -- NULL = tutti gli ambulatori
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_period CHECK (end_datetime > start_datetime)
);
```

---

## 💊 **3. SISTEMA RICHIESTE PRESCRIZIONI**

### **Obiettivo:**
Gestire richieste di prescrizione (NON emissione effettiva) con workflow di approvazione.

### **Importante:**
Il sistema NON emette prescrizioni mediche ufficiali. Gestisce solo richieste che il medico può approvare indicando al paziente di recarsi in farmacia con la tessera sanitaria.

### **Funzionalità Paziente:**
- **Richiesta Multipla:** Più farmaci in una singola richiesta
- **Dettagli Completi:** Nome farmaco, dosaggio, quantità, motivazione
- **Livello Urgenza:** Normale, urgente
- **Storico Prescrizioni:** Tutte le richieste passate

### **Funzionalità Medico:**
- **Revisione Richieste:** Visualizza richieste con storico paziente
- **Tre Tipi di Risposta:**
  1. **Approvata:** "Ricetta autorizzata, recarsi in farmacia con tessera sanitaria"
  2. **Rifiutata:** Con motivazione dettagliata
  3. **Serve Appuntamento:** Rifiuto + necessità di visita
- **Note Mediche:** Annotazioni private per ogni richiesta
- **Collegamento Appuntamenti:** Possibilità di programmare visita

### **Stati Prescrizione:**
- `pending` - In attesa di revisione medica
- `approved` - Ricetta autorizzata
- `rejected` - Rifiutata con motivazione
- `requires_appointment` - Necessita appuntamento

### **Database Schema:**
```sql
-- Richiesta principale
prescription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'requires_appointment'
    )),
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
    patient_notes TEXT, -- Motivazione del paziente
    doctor_response TEXT, -- Risposta del medico
    doctor_notes TEXT, -- Note private del medico
    related_appointment_id UUID REFERENCES appointments(id), -- Se collegata a visita
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Farmaci nella richiesta
prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_request_id UUID NOT NULL REFERENCES prescription_requests(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100), -- Es: "500mg", "2 compresse"
    quantity VARCHAR(50), -- Es: "1 confezione", "30 compresse"
    patient_reason TEXT, -- Motivo specifico per questo farmaco
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔐 **SICUREZZA E PERMESSI**

### **Row Level Security (RLS):**
Tutte le nuove tabelle avranno RLS abilitato con policies specifiche:

```sql
-- Ambulatori: solo il medico proprietario
CREATE POLICY "doctors_own_offices" ON doctor_offices
    FOR ALL TO authenticated
    USING (doctor_id = auth.uid())
    WITH CHECK (doctor_id = auth.uid());

-- Appuntamenti: paziente e medico coinvolti
CREATE POLICY "appointment_participants" ON appointments
    FOR ALL TO authenticated
    USING (patient_id = auth.uid() OR doctor_id = auth.uid())
    WITH CHECK (patient_id = auth.uid() OR doctor_id = auth.uid());

-- Prescrizioni: paziente e medico coinvolti
CREATE POLICY "prescription_participants" ON prescription_requests
    FOR ALL TO authenticated
    USING (patient_id = auth.uid() OR doctor_id = auth.uid())
    WITH CHECK (patient_id = auth.uid() OR doctor_id = auth.uid());
```

### **Funzioni Sicure:**
Implementazione di funzioni `SECURITY DEFINER` per operazioni critiche:
- `create_appointment_request()`
- `confirm_appointment()`
- `create_prescription_request()`
- `respond_to_prescription()`

---

## 📱 **INTERFACCE UTENTE DA SVILUPPARE**

### **Dashboard Medico - Nuove Sezioni:**
1. **Gestione Ambulatori**
   - Lista ambulatori con mappa
   - Form creazione/modifica
   - Gestione orari settimanali

2. **Calendario Appuntamenti**
   - Vista mensile/settimanale/giornaliera
   - Drag & drop per riprogrammare
   - Filtri per ambulatorio/tipo visita

3. **Richieste Prescrizioni**
   - Lista richieste pending
   - Form risposta con tre opzioni
   - Storico per paziente

### **Dashboard Paziente - Nuove Sezioni:**
1. **Prenotazione Appuntamenti**
   - Selezione ambulatorio
   - Calendario disponibilità
   - Form richiesta con note

2. **Richiesta Prescrizioni**
   - Form multi-farmaco
   - Gestione urgenza
   - Storico richieste

3. **I Miei Appuntamenti**
   - Lista appuntamenti futuri
   - Possibilità modifica/cancellazione
   - Dettagli ambulatorio

---

## 🛠️ **TECNOLOGIE AGGIUNTIVE DA INTEGRARE**

### **Calendar Management:**
- **React Big Calendar** o **FullCalendar** per interfaccia calendario
- **date-fns** per manipolazione date
- **React Hook Form** per gestione form complessi

### **Maps Integration:**
- **Google Maps API** per visualizzazione ambulatori
- **Geocoding** per validazione indirizzi

### **Notifications:**
- **Email notifications** per conferme appuntamenti
- **In-app notifications** per aggiornamenti stati

---

## 📋 **PIANO DI IMPLEMENTAZIONE**

### **FASE 1: Database Foundation (1-2 giorni)**
1. ✅ Schema completo ambulatori
2. ✅ Schema completo appuntamenti
3. ✅ Schema completo prescrizioni
4. ✅ RLS policies e funzioni sicure
5. ✅ Indici per performance

### **FASE 2: API Layer (2-3 giorni)**
1. 🔄 API endpoints ambulatori (CRUD)
2. 🔄 API endpoints appuntamenti (gestione completa)
3. 🔄 API endpoints prescrizioni (workflow)
4. 🔄 API calendar utilities (disponibilità)

### **FASE 3: Interface Medico (3-4 giorni)**
1. 🔄 Gestione ambulatori (CRUD + orari)
2. 🔄 Calendario appuntamenti (multi-ambulatorio)
3. 🔄 Dashboard richieste (appuntamenti + prescrizioni)
4. 🔄 Workflow approvazioni

### **FASE 4: Interface Paziente (2-3 giorni)**
1. 🔄 Selezione ambulatori e prenotazione
2. 🔄 Form richiesta prescrizioni
3. 🔄 Dashboard personale (appuntamenti + prescrizioni)
4. 🔄 Gestione appuntamenti esistenti

### **FASE 5: Testing & Refinements (1-2 giorni)**
1. 🔄 Testing completo workflow
2. 🔄 Ottimizzazioni performance
3. 🔄 Bug fixing e polish UI
4. 🔄 Documentazione finale

---

## 🎯 **OBIETTIVI FINALI**

Al completamento dell'implementazione, MedHubb offrirà:

### **Per i Medici:**
- Gestione completa di multipli ambulatori
- Sistema calendario professionale multi-location
- Workflow efficiente per approvazioni prescrizioni
- Dashboard unificata per tutte le attività

### **Per i Pazienti:**
- Prenotazione appuntamenti semplice e intuitiva
- Richiesta prescrizioni digitale
- Storico completo delle interazioni mediche
- Informazioni sempre aggiornate sui propri medici

### **Per il Sistema:**
- Scalabilità per gestire centinaia di medici
- Sicurezza completa dei dati sanitari
- Performance ottimizzate per uso intensivo
- Compliance con normative privacy sanitarie

---

## 📖 **APPENDICE TECNICA**

### **Convenzioni Naming:**
- Tabelle: `snake_case` plurale
- Colonne: `snake_case`
- API Routes: `/api/[category]/[action]`
- Components: `PascalCase`

### **Error Handling:**
- HTTP status codes standard
- Messaggi error user-friendly in italiano
- Logging dettagliato per debugging

### **Performance Considerations:**
- Indici su foreign keys e colonne filtrate
- Pagination per liste lunghe
- Caching per dati statici (ambulatori)
- Optimistic updates dove possibile

---

*Documento redatto il: ${new Date().toLocaleDateString('it-IT')}*
*Versione: 1.0*
*Status: Pronto per implementazione*