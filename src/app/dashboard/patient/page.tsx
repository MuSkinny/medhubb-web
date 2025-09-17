"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

export default function PatientDashboardPage() {
  const [patientData, setPatientData] = useState<{id: string; email?: string; profile?: {first_name?: string; last_name?: string; [key: string]: unknown}} | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{status: string; doctor?: {first_name?: string; last_name?: string; order_number?: string}; [key: string]: unknown} | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkPatientAuth();
  }, []);

  const checkPatientAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      // Verifica che sia un paziente
      const response = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        console.log("Patient dashboard - API call failed, redirecting to dashboard");
        router.push("/dashboard");
        return;
      }

      const userData = await response.json();
      console.log("Patient dashboard - user data:", userData);

      if (userData.role !== "patient") {
        console.log("Patient dashboard - user is not a patient, redirecting to dashboard");
        router.push("/dashboard");
        return;
      }

      setPatientData({ ...user, profile: userData.profile });

      // Controlla lo status del collegamento medico
      await checkConnectionStatus(user.id);
    } catch (error) {
      console.error("Errore autenticazione paziente:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async (patientId: string, retryCount = 0) => {
    try {
      console.log('Checking connection status for patient:', patientId, 'retry:', retryCount);

      // Ottieni il token di autenticazione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (retryCount < 3) {
          console.log('No session found, retrying in 500ms...');
          setTimeout(() => checkConnectionStatus(patientId, retryCount + 1), 500);
          return;
        }
        console.error('No session found after retries');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/connections/status?patientId=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Connection status response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Connection status data:', data);
        setConnectionStatus(data);

        // Se non connesso e non ha richieste pending, reindirizza alla selezione medico
        if (data.status === 'unconnected') {
          console.log('Patient not connected, redirecting to doctor selection');
          router.push('/dashboard/patient/select-doctor');
          return;
        }
      } else {
        let errorDetails;
        try {
          errorDetails = await response.json();
        } catch {
          errorDetails = await response.text();
        }

        console.error('Connection status error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          response: errorDetails
        });

        // Se c'è errore, assume unconnected e reindirizza
        console.log('API error occurred, assuming patient is unconnected and redirecting');
        router.push('/dashboard/patient/select-doctor');
      }
    } catch (error) {
      console.error("Errore controllo collegamento:", error);
      // Se c'è errore, assume unconnected e reindirizza
      console.log('Exception checking status, assuming unconnected');
      router.push('/dashboard/patient/select-doctor');
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
          <svg className="animate-spin h-8 w-8 text-green-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Caricamento area personale...</p>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return null;
  }

  const userName = `${patientData.profile?.first_name || ''} ${patientData.profile?.last_name || ''}`.trim();

  return (
    <div className="main-layout">
      <Sidebar
        userType="patient"
        userName={userName}
        userEmail={patientData.email || ''}
      />

      <div className="main-content">
        {/* Header */}
        <div className="main-header">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <p className="text-gray-600">
                Benvenuto, {userName.split(' ')[0]}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {connectionStatus?.status === 'connected' && (
                <div className="badge badge-success">
                  Collegato al medico
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="main-body">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* Status Alert */}
            {connectionStatus && (
              <div>
                {connectionStatus.status === 'connected' ? (
                  <div className="card">
                    <div className="card-header">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                          </div>
                          <div>
                            <div className="card-title text-base">Il tuo medico</div>
                            <div className="card-description">
                              Dr. {connectionStatus.doctor?.first_name} {connectionStatus.doctor?.last_name}
                            </div>
                          </div>
                        </div>
                        <button className="btn btn-secondary btn-sm">
                          Contatta
                        </button>
                      </div>
                    </div>
                  </div>
                ) : connectionStatus.status === 'pending' ? (
                  <div className="card">
                    <div className="card-header">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </div>
                        <div>
                          <div className="card-title text-base">Richiesta in corso</div>
                          <div className="card-description">
                            In attesa di approvazione dal medico
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Overview Stats */}
            <div>
              <h2 className="text-lg font-medium mb-4">Panoramica</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Prossima Visita */}
                <div className="card">
                  <div className="card-content pt-6">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <p className="text-sm font-medium text-gray-600">Prossima visita</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">Nessuna</p>
                      <p className="text-xs text-gray-600 mt-1">Programma un appuntamento</p>
                    </div>
                  </div>
                </div>

                {/* Prescrizioni Attive */}
                <div className="card">
                  <div className="card-content pt-6">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                      </svg>
                      <p className="text-sm font-medium text-gray-600">Prescrizioni</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-xs text-gray-600 mt-1">Ricette attive</p>
                    </div>
                  </div>
                </div>

                {/* Referti */}
                <div className="card">
                  <div className="card-content pt-6">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <p className="text-sm font-medium text-gray-600">Referti</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-xs text-gray-600 mt-1">Documenti medici</p>
                    </div>
                  </div>
                </div>

                {/* Stato Salute */}
                <div className="card">
                  <div className="card-content pt-6">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                      <p className="text-sm font-medium text-gray-600">Stato salute</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold text-green-600">Ottimo</p>
                      <p className="text-xs text-gray-600 mt-1">Tutto nella norma</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-medium mb-4">Azioni rapide</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* Prenota Appuntamento */}
                <div className="card cursor-pointer hover:shadow-md transition-shadow">
                  <div className="card-header">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <div className="card-title text-base">Prenota appuntamento</div>
                    </div>
                    <div className="card-description">
                      Programma una visita con il tuo medico
                    </div>
                  </div>
                  <div className="card-footer">
                    <button
                      onClick={() => router.push('/dashboard/patient/appointments')}
                      className="btn btn-default w-full"
                    >
                      Prenota ora
                    </button>
                  </div>
                </div>

              {/* Contatta Medico */}
              {connectionStatus?.status === 'connected' && (
                <div className="card">
                  <div className="card-content pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Messaggio rapido</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Invia una domanda al Dr. {connectionStatus.doctor?.first_name}
                    </p>
                  </div>
                  <div className="card-footer">
                    <button
                      onClick={() => router.push('/dashboard/patient/messages')}
                      className="btn btn-success w-full"
                    >
                      Scrivi messaggio
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">
              Le tue informazioni
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="card cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => router.push('/dashboard/patient/prescriptions')}>
                <div className="card-content pt-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Le mie ricette</h3>
                  <p className="text-sm text-gray-600">Prescrizioni e farmaci</p>
                </div>
              </div>

              <div className="card cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => router.push('/dashboard/patient/health')}>
                <div className="card-content pt-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">I miei referti</h3>
                  <p className="text-sm text-gray-600">Esami e analisi</p>
                </div>
              </div>

              <div className="card cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => router.push('/dashboard/patient/profile')}>
                <div className="card-content pt-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Il mio profilo</h3>
                  <p className="text-sm text-gray-600">Dati personali</p>
                </div>
              </div>
            </div>
          </div>

          {/* Health Timeline */}
          {connectionStatus?.status === 'connected' ? (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h2 className="card-title text-xl">La tua salute in sintesi</h2>
                  <div className="badge badge-secondary">Aggiornato oggi</div>
                </div>
              </div>
              <div className="card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Doctor Info Card */}
                  <div className="p-4 rounded-lg border-l-4 border-green-500 bg-green-50">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Il tuo medico</h3>
                        <p className="text-gray-600">
                          Dr. {connectionStatus.doctor?.first_name} {connectionStatus.doctor?.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        Ordine: {connectionStatus.doctor?.order_number}
                      </span>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => {/* Contatta medico */}}
                      >
                        Contatta
                      </button>
                    </div>
                  </div>

                  {/* Health Status */}
                  <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Stato generale</h3>
                        <p className="text-gray-600">Tutto nella norma</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        Ultima visita: --
                      </span>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-success mr-2"></div>
                        <span className="text-sm font-medium text-green-600">Ottimo</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Health Actions */}
                <div className="mt-6 pt-6 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="btn btn-ghost justify-start">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      Carica un referto
                    </button>

                    <button className="btn btn-ghost justify-start">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                      Inserisci sintomi
                    </button>

                    <button className="btn btn-ghost justify-start">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      Pianifica controllo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center">
              <div className="card-content pt-12 pb-8">
                <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">
                  Inizia il tuo percorso di salute
                </h3>
                <p className="text-gray-600 mb-6">
                  Collegati a un medico per accedere alla tua cartella clinica digitale e iniziare a monitorare la tua salute.
                </p>
                <button
                  onClick={() => router.push('/dashboard/patient/select-doctor')}
                  className="btn btn-default"
                >
                  Trova un medico
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}