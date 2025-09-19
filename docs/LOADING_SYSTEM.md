# Sistema di Caricamento Dinamico - MedHubb

## Panoramica

Il nuovo sistema di caricamento dinamico di MedHubb sostituisce le pagine bianche di caricamento con animazioni fluide e transizioni moderne che mantengono la sidebar visibile e forniscono feedback visivo all'utente durante i cambi di sezione.

## Componenti Principali

### 1. `SectionLoader` 
**Caricamento Full-Screen per inizializzazione**
- Utilizzato per il caricamento iniziale delle dashboard
- Animazioni circolari con logo MedHubb
- Personalizzabile per medico/paziente
- Include barra di progresso e indicatori di stato

```tsx
<SectionLoader 
  sectionName="Dashboard Medico"
  userType="doctor"
/>
```

### 2. `InlineSectionLoader`
**Caricamento In-Line per transizioni tra sezioni**
- Mantiene la sidebar visibile
- Skeleton loading per preview del contenuto
- Animazioni fluide e non invasive
- Feedback di stato della connessione

```tsx
<InlineSectionLoader 
  sectionName="Appuntamenti"
  userType="doctor"
  compact={false}
/>
```

### 3. `DashboardLayout`
**Layout Wrapper con Transizioni Automatiche**
- Gestisce automaticamente le transizioni tra sezioni
- Rileva i cambi di rotta e attiva il loading
- Overlay con blur effect durante il caricamento
- Supporta sia medico che paziente

```tsx
<DashboardLayout
  userType="doctor"
  userName={userName}
  userEmail={userEmail}
>
  {/* Contenuto della pagina */}
</DashboardLayout>
```

### 4. `useSectionTransition` Hook
**Gestione Programmatica delle Transizioni**
- Controllo manuale delle transizioni
- Tempo minimo di caricamento configurabile
- Supporto per funzioni di caricamento async
- Stato della transizione in tempo reale

```tsx
const { isLoading, currentSection, startSectionTransition } = useSectionTransition({
  minLoadingTime: 800,
  transitionDuration: 300
});

// Avvia transizione manualmente
await startSectionTransition('Nuova Sezione', async () => {
  // Carica dati
  await fetchData();
});
```

## Implementazione nelle Dashboard

### Dashboard Medico/Paziente Esistenti

**Prima:**
```tsx
export default function DoctorDashboard() {
  if (loading) {
    return <div>Caricamento...</div>; // Pagina bianca
  }
  
  return (
    <div className="main-layout">
      <Sidebar />
      <div className="main-content">
        {/* contenuto */}
      </div>
    </div>
  );
}
```

**Dopo:**
```tsx
export default function DoctorDashboard() {
  if (loading) {
    return <SectionLoader sectionName="Dashboard" userType="doctor" />;
  }
  
  return (
    <DashboardLayout userType="doctor" userName={userName} userEmail={userEmail}>
      {/* contenuto - sidebar gestita automaticamente */}
    </DashboardLayout>
  );
}
```

### Nuove Sezioni

Per nuove sezioni, basta utilizzare il `DashboardLayout`:

```tsx
export default function NewSection() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <SectionLoader sectionName="Nuova Sezione" userType="doctor" />;
  }
  
  return (
    <DashboardLayout userType="doctor" userName={userName} userEmail={userEmail}>
      <div className="main-body">
        {/* Contenuto della sezione */}
      </div>
    </DashboardLayout>
  );
}
```

## Caratteristiche del Sistema

### 🎨 **Animazioni Fluide**
- Transizioni CSS3 con easing personalizzato
- Effetti di blur e scala durante il caricamento
- Animazioni sincronizzate con i cambi di rotta

### ⚡ **Performance Ottimizzate**
- Caricamento asincrono delle sezioni
- Tempo minimo di caricamento per evitare flicker
- Lazy loading dei contenuti pesanti

### 🎯 **UX Migliorata**
- Feedback visivo costante
- Sidebar sempre visibile
- Indicatori di progresso informativi
- Animazioni contextual per medico/paziente

### 🔧 **Configurabile**
- Tempi di caricamento personalizzabili per sezione
- Colori e gradienti basati sul tipo utente
- Messaggi di caricamento specifici per sezione

## Tempi di Caricamento per Sezione

Il sistema simula diversi tempi di caricamento basati sulla complessità della sezione:

- **Panoramica**: 600ms (veloce)
- **Prescrizioni**: 800ms (medio)
- **Pazienti**: 900ms (medio-lento)
- **Appuntamenti**: 1200ms (lento - più dati)

## Personalizzazione Colori

### Medico (Blu)
- Gradiente primario: `from-blue-500 to-blue-600`
- Background: `from-blue-50/30 via-white to-green-50/30`
- Accenti: Blu con sfumature verdi

### Paziente (Verde)
- Gradiente primario: `from-green-500 to-green-600`  
- Background: `from-green-50/30 via-white to-blue-50/30`
- Accenti: Verde con sfumature blu

## Migrazione Esistente

Per migrare le pagine esistenti:

1. **Sostituire** i loading states con `SectionLoader`
2. **Wrappare** il contenuto con `DashboardLayout`
3. **Rimuovere** i componenti Sidebar manuali
4. **Aggiornare** gli import necessari

## Estensioni Future

- **Skeleton loading** specifico per tipo di contenuto
- **Preloading** intelligente delle sezioni
- **Animazioni personalizzate** per azioni specifiche
- **Indicatori di caricamento** per operazioni lunghe
