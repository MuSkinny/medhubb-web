"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Doctor {
  first_name: string;
  last_name: string;
  specialization?: string;
  bio?: string;
}

interface InviteData {
  token: string;
  doctor: Doctor;
  message?: string;
  patientEmail?: string;
  createdAt: string;
  expiresAt: string;
}

export default function InviteAcceptPage() {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [user, setUser] = useState<{id: string; email?: string; profile?: {first_name?: string; last_name?: string; [key: string]: unknown}} | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    if (token) {
      loadInviteData();
      checkAuth();
    }
  }, [token]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Verifica che sia un paziente
        const response = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });

        if (response.ok) {
          const userData = await response.json();
          if (userData.role === "patient") {
            setUser({ ...user, profile: userData.profile });
          }
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  const loadInviteData = async () => {
    try {
      const response = await fetch(`/api/connections/invites/accept?token=${token}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setInviteData(data.invite);
      } else {
        setError(data.error || "Invito non valido");
      }
    } catch (error) {
      console.error("Error loading invite:", error);
      setError("Errore nel caricamento dell'invito");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user || !inviteData) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch('/api/connections/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteToken: token,
          patientId: user.id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Collegamento creato con successo!");
        router.push('/dashboard/patient');
      } else {
        setError(data.error || "Errore nell'accettazione dell'invito");
      }
    } catch (error) {
      console.error("Accept error:", error);
      setError("Errore nell'accettazione dell'invito");
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-green-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Caricamento invito...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invito Non Valido</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Torna alla Home
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
        <div className="max-w-4xl mx-auto flex items-center">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Invito Medico</h1>
            <p className="text-green-100 text-sm">Accetta l&apos;invito per collegarti con il tuo medico</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {inviteData && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Doctor Info */}
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 text-white">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    Dr. {inviteData.doctor.first_name} {inviteData.doctor.last_name}
                  </h2>
                  {inviteData.doctor.specialization && (
                    <p className="text-green-100">{inviteData.doctor.specialization}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Invito di Collegamento</h3>
                <p className="text-gray-600">
                  Il Dr. {inviteData.doctor.first_name} {inviteData.doctor.last_name} ti ha invitato a collegarti
                  per gestire le tue cure mediche attraverso MedHubb.
                </p>
              </div>

              {inviteData.message && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">Messaggio del medico:</h4>
                  <p className="text-blue-700">{inviteData.message}</p>
                </div>
              )}

              {inviteData.doctor.bio && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Informazioni sul medico:</h4>
                  <p className="text-gray-600">{inviteData.doctor.bio}</p>
                </div>
              )}

              {/* Auth Status */}
              {!user ? (
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Per accettare l&apos;invito devi prima:</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleLogin}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Accedi al tuo account
                    </button>
                    <button
                      onClick={handleRegister}
                      className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Registrati come paziente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-700">
                      <span className="font-medium">Account:</span> {user.email}
                    </p>
                    <p className="text-green-700">
                      <span className="font-medium">Nome:</span> {user.profile?.first_name} {user.profile?.last_name}
                    </p>
                  </div>

                  <button
                    onClick={handleAcceptInvite}
                    disabled={accepting}
                    className="w-full bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {accepting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Accettazione in corso...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Accetta Invito e Collegati
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Questo invito scade il {new Date(inviteData.expiresAt).toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}