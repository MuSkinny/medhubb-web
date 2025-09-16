"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
// import Sidebar from "@/components/Sidebar";

export default function PatientDashboardPage() {
  const [patientData, setPatientData] = useState<{id: string; [key: string]: unknown} | null>(null);
  // const [connectionStatus, setConnectionStatus] = useState<any>(null);
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
      // Usa l'API per verificare che sia un paziente
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

        // Se ha una richiesta pending, mostra messaggio
        if (data.status === 'pending') {
          console.log('Patient has pending request, staying on dashboard');
        }

        // Se è connesso, mostra dashboard normale
        if (data.status === 'connected') {
          console.log('Patient is connected to doctor, showing dashboard');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-center justify-center">
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
    return null; // Reindirizzamento in corso
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50">
      {/* Header Paziente */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Area Personale</h1>
              <p className="text-green-100 text-sm">
                Benvenuto {patientData.profile?.first_name} {patientData.profile?.last_name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-white text-sm font-medium">{patientData.email}</p>
              <p className="text-green-100 text-xs">
                CF: {patientData.profile?.fiscal_code}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors duration-200"
            >
              Esci
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Card */}
        <div className="mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Benvenuto in MedHubb</h3>
                <p className="text-green-700">La tua salute � la nostra priorit�. Accedi a tutti i servizi sanitari digitali.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">0</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Prossimi Appuntamenti</h3>
            <p className="text-gray-600 text-sm">Visite programmate</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">0</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Referti</h3>
            <p className="text-gray-600 text-sm">Documenti disponibili</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 7v8m6-8v8"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">0</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Prescrizioni</h3>
            <p className="text-gray-600 text-sm">Ricette mediche attive</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">0</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Messaggi</h3>
            <p className="text-gray-600 text-sm">Comunicazioni dai medici</p>
          </div>
        </div>

        {/* Services Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Prenota Visita</h3>
            <p className="text-gray-600 mb-4 text-sm">Prenota una visita con i nostri specialisti</p>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors duration-200">
              Prenota Ora
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">I Miei Referti</h3>
            <p className="text-gray-600 mb-4 text-sm">Consulta tutti i tuoi referti medici</p>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200">
              Visualizza Referti
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 7v8m6-8v8"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Prescrizioni</h3>
            <p className="text-gray-600 mb-4 text-sm">Gestisci le tue ricette e prescrizioni mediche</p>
            <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors duration-200">
              Le Mie Ricette
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Il Mio Profilo</h3>
            <p className="text-gray-600 mb-4 text-sm">Modifica le tue informazioni personali</p>
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors duration-200">
              Gestisci Profilo
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Storico Sanitario</h3>
            <p className="text-gray-600 mb-4 text-sm">Visualizza la cronologia delle tue visite</p>
            <button className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors duration-200">
              Visualizza Storico
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 010 19.5 9.75 9.75 0 010-19.5z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Supporto</h3>
            <p className="text-gray-600 mb-4 text-sm">Contatta il nostro team di supporto</p>
            <button className="w-full bg-pink-600 text-white py-2 px-4 rounded-lg hover:bg-pink-700 transition-colors duration-200">
              Contattaci
            </button>
          </div>
        </div>

        {/* Health Summary */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Riepilogo Sanitario</h2>
            <button className="text-green-600 hover:text-green-700 text-sm font-medium">
              Visualizza Dettagli
            </button>
          </div>

          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun dato disponibile</h3>
            <p className="text-gray-600">Prenota la tua prima visita per iniziare il tuo percorso sanitario digitale.</p>
          </div>
        </div>
      </div>
    </div>
  );
}