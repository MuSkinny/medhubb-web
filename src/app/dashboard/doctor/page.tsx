"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

interface PendingRequest {
  id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  message?: string;
  created_at: string;
}

interface Patient {
  link_id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email: string;
  linked_at: string;
}

export default function DoctorDashboardPage() {
  const [doctorData, setDoctorData] = useState<{id: string; email?: string; profile: {status: string; first_name?: string; last_name?: string}} | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', message: '' });
  const [creatingInvite, setCreatingInvite] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkDoctorAuth();
  }, []);

  const checkDoctorAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      // Usa l'API per verificare che sia un dottore
      const response = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        console.log("Doctor dashboard - API call failed, redirecting to dashboard");
        router.push("/dashboard");
        return;
      }

      const userData = await response.json();
      console.log("Doctor dashboard - user data:", userData);

      if (userData.role !== "doctor") {
        console.log("Doctor dashboard - user is not a doctor, redirecting to dashboard");
        router.push("/dashboard");
        return;
      }

      // Se non approvato, vai alla pagina pending
      if (userData.profile.status !== "approved") {
        router.push("/dashboard/pending");
        return;
      }

      setDoctorData({ ...user, profile: userData.profile });

      // Carica richieste pending e pazienti
      await loadDoctorData(user.id);
    } catch (error) {
      console.error("Errore autenticazione dottore:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorData = async (doctorId: string) => {
    await Promise.all([
      loadPendingRequests(doctorId),
      loadPatients(doctorId)
    ]);
  };

  const loadPendingRequests = async (doctorId: string) => {
    try {
      // Ottieni il token di autenticazione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found for doctor');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/connections/requests?doctorId=${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
      } else {
        console.error('Failed to load requests:', response.status, await response.text());
      }
    } catch (error) {
      console.error("Errore caricamento richieste:", error);
    }
  };

  const loadPatients = async (doctorId: string) => {
    try {
      // Ottieni il token di autenticazione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found for doctor');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/connections/patients?doctorId=${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      } else {
        console.error('Failed to load patients:', response.status, await response.text());
      }
    } catch (error) {
      console.error("Errore caricamento pazienti:", error);
    }
  };

  const handleRequestResponse = async (requestId: string, response: 'accepted' | 'rejected') => {
    if (!doctorData) return;

    setProcessingRequest(requestId);

    try {
      // Ottieni il token di autenticazione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessione scaduta, effettua di nuovo il login');
        router.push('/login');
        return;
      }

      const apiResponse = await fetch('/api/connections/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requestId,
          doctorId: doctorData.id,
          response,
          notes: response === 'accepted' ? 'Richiesta accettata tramite dashboard' : 'Richiesta rifiutata'
        })
      });

      const data = await apiResponse.json();

      if (apiResponse.ok && data.success) {
        alert(data.message);
        // Ricarica i dati
        await loadDoctorData(doctorData.id);
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore risposta richiesta:", error);
      alert("Errore nell'elaborazione della risposta");
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCreateInvite = async () => {
    if (!doctorData) return;

    setCreatingInvite(true);

    try {
      const response = await fetch('/api/connections/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctorData.id,
          patientEmail: inviteData.email || null,
          message: inviteData.message || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Mostra il link di invito
        const copyToClipboard = () => {
          navigator.clipboard.writeText(data.inviteLink);
          alert("Link copiato negli appunti!");
        };

        if (window.confirm(`Invito creato con successo!\n\nLink: ${data.inviteLink}\n\nVuoi copiare il link negli appunti?`)) {
          copyToClipboard();
        }

        // Reset form
        setInviteData({ email: '', message: '' });
        setShowInviteModal(false);
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore creazione invito:", error);
      alert("Errore nella creazione dell'invito");
    } finally {
      setCreatingInvite(false);
    }
  };

  // const handleLogout = async () => {
  //   await supabase.auth.signOut();
  //   router.push("/");
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Caricamento dashboard medico...</p>
        </div>
      </div>
    );
  }

  if (!doctorData) {
    return null;
  }

  const userName = `${doctorData.profile?.first_name || ''} ${doctorData.profile?.last_name || ''}`.trim();

  return (
    <div className="main-layout">
      <Sidebar
        userType="doctor"
        userName={userName}
        userEmail={doctorData.email || ''}
      />

      <div className="main-content">
        {/* Mobile Header */}
        <div className="lg:hidden card m-4 mb-0">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">
                  Dr. {userName.split(' ')[0]}
                </h1>
                <p className="text-sm text-gray-600">
                  {pendingRequests.length} richieste in attesa
                </p>
              </div>
              <button
                onClick={() => {/* Toggle sidebar */}}
                className="btn btn-ghost p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="main-body">
          {/* Welcome Header - Desktop */}
          <div className="hidden lg:block mb-8">
            <div className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      Buongiorno, Dr. {userName.split(' ')[0]}! 👨‍⚕️
                    </h1>
                    <p className="text-gray-600">
                      Hai {pendingRequests.length} nuove richieste da gestire e {patients.length} pazienti sotto la tua cura
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {new Date().toLocaleDateString('it-IT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Actions */}
          {pendingRequests.length > 0 && (
            <div className="mb-8">
              <div className="card border-l-4 border-red-500 bg-red-50">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {pendingRequests.length} richieste in attesa
                        </h3>
                        <p className="text-gray-600">
                          Nuovi pazienti da approvare
                        </p>
                      </div>
                    </div>
                    <button
                      className="btn btn-default"
                      onClick={() => router.push('/dashboard/doctor/requests')}
                    >
                      Gestisci ora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Practice Metrics */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">
              La tua pratica oggi
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pazienti Totali */}
              <div className="card text-center">
                <div className="card-content pt-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {patients.length}
                  </div>
                  <h3 className="font-semibold mb-1">
                    Pazienti
                  </h3>
                  <p className="text-sm text-gray-600">
                    Sotto la tua cura
                  </p>
                </div>
              </div>

              {/* Appuntamenti Oggi */}
              <div className="card text-center">
                <div className="card-content pt-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    0
                  </div>
                  <h3 className="font-semibold mb-1">
                    Oggi
                  </h3>
                  <p className="text-sm text-gray-600">
                    Visite programmate
                  </p>
                </div>
              </div>

              {/* Richieste */}
              <div className="card text-center">
                <div className="card-content pt-6">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {pendingRequests.length}
                  </div>
                  <h3 className="font-semibold mb-1">
                    Richieste
                  </h3>
                  <p className="text-sm text-gray-600">
                    Da approvare
                  </p>
                </div>
              </div>

              {/* Attività */}
              <div className="card text-center">
                <div className="card-content pt-6">
                  <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    100%
                  </div>
                  <h3 className="font-semibold mb-1">
                    Attività
                  </h3>
                  <p className="text-sm text-gray-600">
                    Completamento
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Doctor Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">
              Azioni rapide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Gestisci Pazienti - CTA Principale */}
              <div className="card">
                <div className="card-content pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">{patients.length} pazienti</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Gestisci pazienti</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Visualizza cartelle cliniche e storico visite
                  </p>
                </div>
                <div className="card-footer">
                  <button
                    onClick={() => router.push('/dashboard/doctor/patients')}
                    className="btn btn-default w-full"
                  >
                    Visualizza tutti
                  </button>
                </div>
              </div>

              {/* Invita Nuovo Paziente */}
              <div className="card">
                <div className="card-content pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Nuovo collegamento</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Invita paziente</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Crea un link di invito personalizzato
                  </p>
                </div>
                <div className="card-footer">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="btn btn-success w-full"
                  >
                    Crea invito
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">
              Gestione pratica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="card cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => router.push('/dashboard/doctor/schedule')}>
                <div className="card-content pt-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Agenda</h3>
                  <p className="text-sm text-gray-600">Programma visite</p>
                </div>
              </div>

              <div className="card cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => router.push('/dashboard/doctor/prescriptions')}>
                <div className="card-content pt-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Prescrizioni</h3>
                  <p className="text-sm text-gray-600">Ricette digitali</p>
                </div>
              </div>

              <div className="card cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => router.push('/dashboard/doctor/analytics')}>
                <div className="card-content pt-6 text-center">
                  <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Analytics</h3>
                  <p className="text-sm text-gray-600">Statistiche pratica</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Requests Section */}
          {pendingRequests.length > 0 && (
            <div className="card mb-8">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h2 className="card-title">Richieste di Collegamento in Attesa</h2>
                  <div className="badge badge-secondary">
                    {pendingRequests.length} in attesa
                  </div>
                </div>
              </div>
              <div className="card-content">
                <div className="space-y-4">
                  {pendingRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {request.patient_first_name} {request.patient_last_name}
                          </h4>
                          <p className="text-sm text-gray-600">{request.patient_email}</p>
                          {request.message && (
                            <p className="text-xs text-gray-600 mt-1">&ldquo;{request.message}&rdquo;</p>
                          )}
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(request.created_at).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleRequestResponse(request.id, 'accepted')}
                          disabled={processingRequest === request.id}
                          className="btn btn-sm btn-success"
                        >
                          {processingRequest === request.id ? (
                            <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                            </svg>
                          )}
                          Accetta
                        </button>
                        <button
                          onClick={() => handleRequestResponse(request.id, 'rejected')}
                          disabled={processingRequest === request.id}
                          className="btn btn-sm btn-ghost text-red-600 hover:bg-red-100"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          Rifiuta
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingRequests.length > 3 && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => router.push('/dashboard/doctor/requests')}
                        className="btn btn-ghost text-blue-600"
                      >
                        Visualizza tutte le {pendingRequests.length} richieste →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Attività Recente</h2>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingRequests.length > 0 && (
                <div className="p-4 rounded-lg border-l-4 border-red-500 bg-red-50">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <h3 className="font-semibold">Richieste in Attesa</h3>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Hai {pendingRequests.length} richieste da processare.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/doctor/requests')}
                    className="btn btn-sm btn-default"
                  >
                    Gestisci
                  </button>
                </div>
              )}

              <div
                className="p-4 rounded-lg border-l-4"
                style={{
                  background: 'rgba(74, 144, 226, 0.05)',
                  borderColor: '#4A90E2'
                }}
              >
                <div className="flex items-center mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                    style={{ background: 'rgba(74, 144, 226, 0.2)' }}
                  >
                    <svg className="w-4 h-4" style={{ color: '#4A90E2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-blue-800">Pazienti</h3>
                </div>
                <p className="text-blue-700 mb-3">
                  {patients.length === 0
                    ? "Nessun paziente collegato ancora."
                    : `${patients.length} pazient${patients.length === 1 ? 'e' : 'i'} collegat${patients.length === 1 ? 'o' : 'i'}.`
                  }
                </p>
                <button
                  onClick={() => router.push('/dashboard/doctor/patients')}
                  className="px-4 py-2 rounded-lg text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #4A90E2 0%, #5DADE2 100%)' }}
                >
                  Visualizza
                </button>
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>

      {/* Modal per Invito */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Crea Invito Paziente</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Paziente (opzionale)
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="paziente@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Messaggio (opzionale)
                </label>
                <textarea
                  value={inviteData.message}
                  onChange={(e) => setInviteData({ ...inviteData, message: e.target.value })}
                  placeholder="Messaggio personalizzato..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateInvite}
                disabled={creatingInvite}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {creatingInvite ? "Creando..." : "Crea Invito"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}