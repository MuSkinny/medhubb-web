"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import SectionLoader from "@/components/SectionLoader";

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

      if (userData.profile.status !== "approved") {
        router.push("/dashboard/pending");
        return;
      }

      setDoctorData({ ...user, profile: userData.profile });
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
        await loadDoctorData(doctorData.id);
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore risposta richiesta:", error);
      alert("Errore nella elaborazione della risposta");
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
        const copyToClipboard = () => {
          navigator.clipboard.writeText(data.inviteLink);
          alert("Link copiato negli appunti!");
        };

        if (window.confirm(`Invito creato con successo!

Link: ${data.inviteLink}

Vuoi copiare il link negli appunti?`)) {
          copyToClipboard();
        }

        setInviteData({ email: '', message: '' });
        setShowInviteModal(false);
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore creazione invito:", error);
      alert("Errore nella creazione del invito");
    } finally {
      setCreatingInvite(false);
    }
  };

  if (loading) {
    return (
      <SectionLoader 
        sectionName="Dashboard Medico"
        userType="doctor"
      />
    );
  }

  if (!doctorData) {
    return null;
  }

  const userName = `${doctorData.profile?.first_name || ''} ${doctorData.profile?.last_name || ''}`.trim();

  return (
    <DashboardLayout
      userType="doctor"
      userName={userName}
      userEmail={doctorData.email || ''}
    >
      {/* Mobile Header */}
      <div className="lg:hidden healthcare-card m-4 mb-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Dr. {userName.split(' ')[0]}
            </h1>
            <p className="text-sm text-slate-600">
              {pendingRequests.length} richieste in attesa
            </p>
          </div>
          <button
            onClick={() => {/* Toggle sidebar */}}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-body">
        {/* Welcome Header - Desktop */}
        <div className="hidden lg:block mb-8 animate-fade-in">
          <div className="healthcare-card relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-slate-800">
                    Buongiorno, Dr. {userName.split(' ')[0]}!
                  </h1>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    Hai <span className="font-semibold text-blue-600">{pendingRequests.length} nuove richieste</span> da gestire e <span className="font-semibold text-green-600">{patients.length} pazienti</span> sotto la tua cura
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-md">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Oggi</p>
                  <p className="text-xs text-slate-600">
                    {new Date().toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Actions */}
        {pendingRequests.length > 0 && (
          <div className="mb-8 animate-fade-in">
            <div className="healthcare-card border-l-4 border-red-400 bg-gradient-to-r from-red-50 to-red-50/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">
                      {pendingRequests.length} richieste in attesa
                    </h3>
                    <p className="text-slate-600">
                      Nuovi pazienti richiedono la tua approvazione
                    </p>
                  </div>
                </div>
                <button
                  className="healthcare-button primary px-6 py-3 text-base shadow-lg hover:shadow-xl"
                  onClick={() => router.push('/dashboard/doctor/requests')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  Gestisci ora
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            Azioni rapide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Gestisci Pazienti */}
            <div className="healthcare-card group cursor-pointer hover:scale-105 transition-all duration-300"
                 onClick={() => router.push('/dashboard/doctor/patients')}>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Gestisci Pazienti</h3>
              <p className="text-slate-600 text-sm text-center">
                {patients.length} pazienti sotto la tua cura
              </p>
            </div>

            {/* Appuntamenti */}
            <div className="healthcare-card group cursor-pointer hover:scale-105 transition-all duration-300"
                 onClick={() => router.push('/dashboard/doctor/appointments')}>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Appuntamenti</h3>
              <p className="text-slate-600 text-sm text-center">
                Gestisci il calendario delle visite
              </p>
            </div>

            {/* Invita Paziente */}
            <div className="healthcare-card group cursor-pointer hover:scale-105 transition-all duration-300"
                 onClick={() => setShowInviteModal(true)}>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Invita Paziente</h3>
              <p className="text-slate-600 text-sm text-center">
                Crea un link di invito personalizzato
              </p>
            </div>

          </div>
        </div>

        {/* Recent Requests */}
        {pendingRequests.length > 0 && (
          <div className="healthcare-card mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Richieste Recenti</h2>
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                {pendingRequests.length} in attesa
              </div>
            </div>
            <div className="space-y-4">
              {pendingRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">
                        {request.patient_first_name} {request.patient_last_name}
                      </h4>
                      <p className="text-sm text-slate-600">{request.patient_email}</p>
                      {request.message && (
                        <p className="text-xs text-slate-600 mt-1">"{request.message}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleRequestResponse(request.id, 'accepted')}
                      disabled={processingRequest === request.id}
                      className="healthcare-button success px-4 py-2 text-sm"
                    >
                      {processingRequest === request.id ? "..." : "Accetta"}
                    </button>
                    <button
                      onClick={() => handleRequestResponse(request.id, 'rejected')}
                      disabled={processingRequest === request.id}
                      className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Rifiuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {creatingInvite ? "Creando..." : "Crea Invito"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}