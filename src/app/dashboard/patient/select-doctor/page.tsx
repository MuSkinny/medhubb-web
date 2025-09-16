"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  order_number: string;
  status: string;
  created_at: string;
}

export default function SelectDoctorPage() {
  const [patientData, setPatientData] = useState<{id: string; profile?: {[key: string]: unknown}} | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{status: string; [key: string]: unknown} | null>(null);
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
        router.push("/dashboard");
        return;
      }

      const userData = await response.json();

      if (userData.role !== "patient") {
        router.push("/dashboard");
        return;
      }

      setPatientData({ ...user, profile: userData.profile });

      // Controlla status collegamento
      await checkConnectionStatus(user.id);

      // Carica medici disponibili
      await loadAvailableDoctors();
    } catch (error) {
      console.error("Errore autenticazione paziente:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async (patientId: string) => {
    try {
      // Ottieni il token di autenticazione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found in checkConnectionStatus');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/connections/status?patientId=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);

        // Se già connesso, reindirizza alla dashboard
        if (data.status === 'connected') {
          router.push('/dashboard/patient');
          return;
        }
      } else {
        console.error('Status check failed:', response.status, await response.text());
      }
    } catch (error) {
      console.error("Errore controllo collegamento:", error);
    }
  };

  const loadAvailableDoctors = async () => {
    try {
      console.log("Loading available doctors...");
      const response = await fetch(`/api/connections/doctors`);
      console.log("Doctors API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Doctors API response data:", data);
        setDoctors(data.doctors || []);
      } else {
        const errorData = await response.json();
        console.error("Doctors API error:", errorData);
      }
    } catch (error) {
      console.error("Errore caricamento medici:", error);
    }
  };

  const handleRequestDoctor = async (doctorId: string) => {
    if (!patientData) return;

    setRequesting(doctorId);

    try {
      // Ottieni il token di autenticazione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessione scaduta, effettua di nuovo il login');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          patientId: patientData.id,
          doctorId: doctorId,
          message: `Richiesta di collegamento da ${patientData.profile.first_name} ${patientData.profile.last_name}`
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Richiesta inviata con successo! Il medico riceverà la tua richiesta.");
        // Ricarica lo status per mostrare la richiesta pending
        await checkConnectionStatus(patientData.id);
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore invio richiesta:", error);
      alert("Errore nell'invio della richiesta");
    } finally {
      setRequesting(null);
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
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Mostra status pending se c'è una richiesta in attesa
  if (connectionStatus?.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">MedHubb</h1>
                <p className="text-green-100 text-sm">Richiesta in attesa</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors duration-200"
            >
              Esci
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Richiesta in Attesa</h2>
            <p className="text-gray-600 mb-4">
              Hai inviato una richiesta di collegamento al medico. Ti notificheremo non appena il medico risponderà alla tua richiesta.
            </p>
            {connectionStatus.pendingRequest && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700">
                  <strong>Medico richiesto:</strong> Dr. {connectionStatus.pendingRequest.doctors.first_name} {connectionStatus.pendingRequest.doctors.last_name}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Aggiorna Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Scegli il tuo Medico</h1>
              <p className="text-green-100 text-sm">
                Seleziona un medico per iniziare il tuo percorso sanitario
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors duration-200"
          >
            Esci
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Info Card */}
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <h3 className="font-medium text-blue-900 mb-2">Come funziona:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Seleziona un medico dalla lista dei professionisti disponibili</li>
                  <li>• Invia una richiesta di collegamento</li>
                  <li>• Il medico riceverà la tua richiesta e potrà accettarla o rifiutarla</li>
                  <li>• Una volta accettata, potrai accedere alla tua dashboard personale</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Medici disponibili */}
        {doctors.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun medico disponibile</h3>
            <p className="text-gray-600">Al momento non ci sono medici disponibili per nuovi collegamenti.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">
                  Medici Disponibili ({doctors.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-xl font-semibold text-gray-900">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </h4>
                            <p className="text-gray-600 text-sm">{doctor.email}</p>
                          </div>
                        </div>

                        <div className="ml-16">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Ordine: {doctor.order_number}
                          </div>
                        </div>
                      </div>

                      <div className="ml-6">
                        <button
                          onClick={() => handleRequestDoctor(doctor.id)}
                          disabled={requesting === doctor.id}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center min-w-[140px] justify-center"
                        >
                          {requesting === doctor.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Invio...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                              </svg>
                              Richiedi
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}