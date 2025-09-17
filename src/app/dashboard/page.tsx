"use client";

import { useEffect, useState } from "react";
// import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<{id: string; email?: string; [key: string]: unknown} | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserAndRedirect();
  }, []);

  const checkUserAndRedirect = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        // Pulisci la sessione se c'è un errore di token
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      // Usa l'API di login per determinare il tipo di utente
      const response = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("User data from API:", userData);

        if (userData.role === "doctor") {
          if (userData.profile?.status === "approved") {
            router.push("/dashboard/doctor");
          } else {
            router.push("/dashboard/pending");
          }
          return;
        }

        if (userData.role === "patient") {
          router.push("/dashboard/patient");
          return;
        }
      }

      // Fallback: controlla direttamente le tabelle
      try {
        const { data: doctorData, error: doctorError } = await supabase
          .from("doctors")
          .select("*")
          .eq("id", user.id)
          .single();

        console.log("Doctor check:", { doctorData, doctorError, userId: user.id });
        if (doctorError) console.error("Doctor query error:", doctorError);

        if (doctorData && !doctorError) {
          console.log("Doctor status:", doctorData.status);
          if (doctorData.status === "approved") {
            router.push("/dashboard/doctor");
          } else {
            router.push("/dashboard/pending");
          }
          return;
        }

        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select("*")
          .eq("id", user.id)
          .single();

        console.log("Patient check:", { patientData, patientError });
        if (patientError) console.error("Patient query error:", patientError);

        if (patientData && !patientError) {
          router.push("/dashboard/patient");
          return;
        }
      } catch (fallbackError) {
        console.error("Fallback query error:", fallbackError);
      }

      // Se non è né dottore né paziente, mantieni la dashboard generica
      setUser({
        ...user,
        email: user.email || '',
      });
      setLoading(false);
    } catch (error) {
      console.error("Errore nel controllo utente:", error);
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-3 text-lg text-gray-600">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">MedHubb</h1>
              <p className="text-blue-100 text-sm">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-white text-sm">
              <span className="text-blue-100">Benvenuto,</span> {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Benvenuto in MedHubb
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              La tua dashboard principale per accedere a tutti i servizi sanitari digitali.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Il Mio Profilo</h3>
            <p className="text-gray-600 mb-4">Visualizza e modifica le tue informazioni personali</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
              Gestisci Profilo →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a4 4 0 118 0v4m-4 10V9M2 9h20"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sicurezza</h3>
            <p className="text-gray-600 mb-4">Gestisci password e impostazioni di sicurezza</p>
            <button className="text-cyan-600 hover:text-cyan-800 font-medium transition-colors duration-200">
              Impostazioni →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 010 19.5 9.75 9.75 0 010-19.5z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Supporto</h3>
            <p className="text-gray-600 mb-4">Ottieni aiuto e contatta il supporto tecnico</p>
            <button className="text-green-600 hover:text-green-800 font-medium transition-colors duration-200">
              Contattaci →
            </button>
          </div>
        </div>

        
      </div>
    </div>
  );
}