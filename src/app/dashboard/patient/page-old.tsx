"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import SectionLoader from "@/components/SectionLoader";

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

        if (data.status === 'unconnected') {
          console.log('Patient not connected, redirecting to doctor selection');
          router.push('/dashboard/patient/select-doctor');
          return;
        }
      } else {
        console.log('API error occurred, assuming patient is unconnected and redirecting');
        router.push('/dashboard/patient/select-doctor');
      }
    } catch (error) {
      console.error("Errore controllo collegamento:", error);
      console.log('Exception checking status, assuming unconnected');
      router.push('/dashboard/patient/select-doctor');
    }
  };

  if (loading) {
    return (
      <SectionLoader 
        sectionName="Area Personale"
        userType="patient"
      />
    );
  }

  if (!patientData) {
    return null;
  }

  const userName = `${patientData.profile?.first_name || ''} ${patientData.profile?.last_name || ''}`.trim();

  return (
    <DashboardLayout
      userType="patient"
      userName={userName}
      userEmail={patientData.email || ''}
    >
      {/* Header */}
      <div className="p-6 bg-white/50 backdrop-blur-sm border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Area Personale</h1>
              <p className="text-slate-600">
                Benvenuto, <span className="font-semibold">{userName.split(' ')[0]}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {connectionStatus?.status === 'connected' && (
              <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
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
                <div className="healthcare-card shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Il tuo medico</h3>
                        <p className="text-slate-600">
                          Dr. {connectionStatus.doctor?.first_name} {connectionStatus.doctor?.last_name}
                        </p>
                      </div>
                    </div>
                    <button className="healthcare-button secondary">
                      Contatta
                    </button>
                  </div>
                </div>
              ) : connectionStatus.status === 'pending' ? (
                <div className="healthcare-card shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Richiesta in corso</h3>
                      <p className="text-slate-600">
                        In attesa di approvazione dal medico
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Overview Stats */}
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Panoramica</h2>
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Prossima Visita */}
              <div className="healthcare-stat-card group cursor-pointer"
                   onClick={() => router.push('/dashboard/patient/appointments')}>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2 text-slate-800 group-hover:text-slate-900 transition-colors">
                    Nessuna
                  </div>
                  <h3 className="font-bold mb-1 text-slate-800 group-hover:text-slate-900 transition-colors">
                    Prossima visita
                  </h3>
                  <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors">
                    Programma un appuntamento
                  </p>
                </div>
              </div>

              {/* Prescrizioni Attive */}
              <div className="healthcare-stat-card group cursor-pointer"
                   onClick={() => router.push('/dashboard/patient/prescriptions')}>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2 text-slate-800 group-hover:text-slate-900 transition-colors">
                    0
                  </div>
                  <h3 className="font-bold mb-1 text-slate-800 group-hover:text-slate-900 transition-colors">
                    Prescrizioni
                  </h3>
                  <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors">
                    Ricette attive
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Azioni rapide</h2>
            <div className="grid gap-6 md:grid-cols-2">

              {/* Prenota Appuntamento */}
              <div className="healthcare-card group cursor-pointer hover:scale-105 transition-all duration-300"
                   onClick={() => router.push('/dashboard/patient/appointments')}>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Prenota Appuntamento</h3>
                <p className="text-slate-600 text-sm text-center">
                  Programma una visita con il tuo medico
                </p>
              </div>

              {/* Prescrizioni */}
              <div className="healthcare-card group cursor-pointer hover:scale-105 transition-all duration-300"
                   onClick={() => router.push('/dashboard/patient/prescriptions')}>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Le mie ricette</h3>
                <p className="text-slate-600 text-sm text-center">
                  Prescrizioni e farmaci
                </p>
              </div>

            </div>
          </div>

          {/* Connection Call to Action */}
          {connectionStatus?.status !== 'connected' && (
            <div className="healthcare-card text-center shadow-lg">
              <div className="py-12">
                <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">
                  Inizia il tuo percorso di salute
                </h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Collegati a un medico per accedere alla tua cartella clinica digitale e iniziare a monitorare la tua salute.
                </p>
                <button
                  onClick={() => router.push('/dashboard/patient/select-doctor')}
                  className="healthcare-button primary px-8 py-3 shadow-lg"
                >
                  Trova un medico
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}