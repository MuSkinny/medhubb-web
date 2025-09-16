"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface PendingRequest {
  id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  message?: string;
  created_at: string;
}

export default function DoctorRequestsPage() {
  const [doctorData, setDoctorData] = useState<{id: string; profile: {status: string}} | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
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

      if (userData.role !== "doctor") {
        router.push("/dashboard");
        return;
      }

      if (userData.profile.status !== "approved") {
        router.push("/dashboard/pending");
        return;
      }

      setDoctorData({ ...user, profile: userData.profile });
      await loadPendingRequests(user.id);
    } catch (error) {
      console.error("Errore autenticazione dottore:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async (doctorId: string) => {
    try {
      const response = await fetch(`/api/connections/requests?doctorId=${doctorId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Errore caricamento richieste:", error);
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
        // Ricarica le richieste
        await loadPendingRequests(doctorData.id);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Caricamento richieste...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Richieste Pazienti</h1>
              <p className="text-blue-100 text-sm">
                Gestisci le richieste di collegamento dai pazienti
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard/doctor')}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors duration-200"
            >
              Dashboard
            </button>
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
        {/* Stats */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{pendingRequests.length}</h2>
              <p className="text-gray-600">Richieste in attesa di risposta</p>
            </div>
          </div>
        </div>

        {/* Richieste Lista */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              Richieste di Collegamento ({pendingRequests.length})
            </h3>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna richiesta pending</h3>
              <p className="text-gray-600">Al momento non ci sono richieste da processare.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {request.patient_first_name} {request.patient_last_name}
                          </h4>
                          <p className="text-sm text-gray-600">{request.patient_email}</p>
                        </div>
                      </div>

                      {request.message && (
                        <div className="ml-16 mb-3">
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            <span className="font-medium">Messaggio:</span> {request.message}
                          </p>
                        </div>
                      )}

                      <div className="ml-16">
                        <p className="text-xs text-gray-500">
                          Richiesta inviata il {new Date(request.created_at).toLocaleDateString('it-IT', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-3 ml-6">
                      <button
                        onClick={() => handleRequestResponse(request.id, 'accepted')}
                        disabled={processingRequest === request.id}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center"
                      >
                        {processingRequest === request.id ? (
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        )}
                        Accetta
                      </button>
                      <button
                        onClick={() => handleRequestResponse(request.id, 'rejected')}
                        disabled={processingRequest === request.id}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Rifiuta
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}