"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function PendingApprovalPage() {
  const [doctorInfo, setDoctorInfo] = useState<{status: string; first_name?: string; last_name?: string; email?: string; order_number?: string; created_at?: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkDoctorStatus();
  }, []);

  const checkDoctorStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      console.log("Pending page - user check:", { user, error });

      if (error || !user) {
        console.log("Pending page - no user, redirecting to login");
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      // Usa l'API per controllare lo status del dottore
      const response = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        console.log("Pending page - API call failed, redirecting to login");
        router.push("/login");
        return;
      }

      const userData = await response.json();
      console.log("Pending page - user data:", userData);

      if (userData.role !== "doctor") {
        console.log("Pending page - user is not a doctor, redirecting to dashboard");
        router.push("/dashboard");
        return;
      }

      setDoctorInfo(userData.profile);

      // Se approvato, redirect alla dashboard
      if (userData.profile.status === "approved") {
        router.push("/dashboard/doctor");
        return;
      }

      // Se rifiutato, mostra messaggio diverso
      if (userData.profile.status === "rejected") {
        setDoctorInfo({ ...userData.profile, status: "rejected" });
      }

    } catch (error) {
      console.error("Errore nel controllo status:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Verifica del tuo account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">MedHubb</h1>
              <p className="text-blue-100 text-sm">Gestione Medica</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-white text-sm">
              Dr. {doctorInfo?.first_name} {doctorInfo?.last_name}
            </span>
            <button
              onClick={handleLogout}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors duration-200 text-sm"
            >
              Esci
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {doctorInfo?.status === "pending" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Account in Attesa di Approvazione
            </h2>

            {/* Message */}
            <div className="space-y-4 mb-8">
              <p className="text-gray-600 text-lg">
                Ciao <strong>Dr. {doctorInfo.first_name} {doctorInfo.last_name}</strong>!
              </p>
              <p className="text-gray-600">
                Il tuo account è stato creato con successo e ora è in attesa di approvazione da parte del nostro team amministrativo.
              </p>
              <p className="text-gray-600">
                Riceverai una notifica via email non appena il tuo account sarà stato verificato e approvato.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-blue-900 mb-2">Informazioni del tuo account:</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Email:</strong> {doctorInfo.email}</p>
                    <p><strong>Numero Ordine:</strong> {doctorInfo.order_number}</p>
                    <p><strong>Data Registrazione:</strong> {doctorInfo.created_at ? new Date(doctorInfo.created_at).toLocaleDateString('it-IT') : 'N/A'}</p>
                    <p><strong>Status:</strong> <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">In Attesa</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="text-left bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-medium text-gray-900 mb-4">Processo di Approvazione:</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Account registrato</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-sm text-gray-600">Verifica documenti in corso</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-400">Approvazione finale</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-400">Accesso completo alla piattaforma</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={checkDoctorStatus}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Aggiorna Status
              </button>
              <Link
                href="/"
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 text-center"
              >
                Torna alla Home
              </Link>
            </div>
          </div>
        )}

        {doctorInfo?.status === "rejected" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Account Non Approvato
            </h2>

            {/* Message */}
            <div className="space-y-4 mb-8">
              <p className="text-gray-600 text-lg">
                Ci dispiace, <strong>Dr. {doctorInfo.first_name} {doctorInfo.last_name}</strong>
              </p>
              <p className="text-gray-600">
                Il tuo account non è stato approvato. Questo può essere dovuto a documentazione incompleta o non corretta.
              </p>
              <p className="text-gray-600">
                Ti preghiamo di contattare il supporto per maggiori informazioni o per ripresentare la tua candidatura.
              </p>
            </div>

            {/* Contact Info */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <h3 className="font-medium text-red-900 mb-2">Contatta il Supporto:</h3>
              <p className="text-red-700">Email: support@medhub.com</p>
              <p className="text-red-700">Tel: +39 123 456 7890</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 text-center"
              >
                Torna alla Home
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Esci dall&apos;Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}