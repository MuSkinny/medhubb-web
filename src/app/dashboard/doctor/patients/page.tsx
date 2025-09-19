"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import SectionLoader from "@/components/SectionLoader";

interface Patient {
  link_id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email: string;
  linked_at: string;
}

export default function DoctorPatientsPage() {
  const [doctorData, setDoctorData] = useState<{id: string; email?: string; profile: {status: string}} | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
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

      setDoctorData({
        id: user.id,
        email: user.email || '',
        profile: userData.profile
      });
      await loadPatients(user.id);
    } catch (error) {
      console.error("Errore autenticazione dottore:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async (doctorId: string) => {
    try {
      const response = await fetch(`/api/connections/patients?doctorId=${doctorId}`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error("Errore caricamento pazienti:", error);
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
          <p className="text-gray-600">Caricamento pazienti...</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">I Miei Pazienti</h1>
              <p className="text-blue-100 text-sm">
                Gestisci i pazienti collegati al tuo account
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
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{patients.length}</h2>
              <p className="text-gray-600">Pazienti totali collegati</p>
            </div>
          </div>
        </div>

        {/* Pazienti Lista */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              Pazienti Collegati ({patients.length})
            </h3>
          </div>

          {patients.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun paziente collegato</h3>
              <p className="text-gray-600">I pazienti che richiederanno un collegamento appariranno qui.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {patients.map((patient) => (
                <div key={patient.link_id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                        <p className="text-xs text-gray-500">
                          Collegato dal {new Date(patient.linked_at).toLocaleDateString('it-IT', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                        Visualizza Profilo
                      </button>
                      <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm">
                        Cartella Clinica
                      </button>
                      <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
                        Messaggio
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