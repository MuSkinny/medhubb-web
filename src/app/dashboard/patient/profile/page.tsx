'use client';

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail,
  Calendar,
  Shield,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';

interface PatientProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  doctor_id?: string;
  created_at: string;
}

interface PatientData {
  id: string;
  email?: string;
  profile?: PatientProfile;
}

interface ConnectionStatus {
  status: string;
  doctor?: {
    first_name?: string;
    last_name?: string;
    order_number?: string;
    email?: string;
  };
  [key: string]: unknown;
}

export default function PatientProfilePage() {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkPatientAuth = useCallback(async () => {
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
        console.log("Patient profile - API call failed, redirecting to dashboard");
        router.push("/dashboard");
        return;
      }

      const userData = await response.json();

      if (userData.role !== "patient") {
        console.log("Patient profile - user is not a patient, redirecting to dashboard");
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

  const checkConnectionStatus = async (patientId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
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
      }
    } catch (error) {
      console.error("Errore controllo collegamento:", error);
    }
  }, [router]);

  useEffect(() => {
    checkPatientAuth();
  }, [checkPatientAuth]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  if (!patientData || !patientData.profile) {
    return null;
  }

  const userName = `${patientData.profile.first_name} ${patientData.profile.last_name}`.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10">
      <div className="container-responsive py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Indietro</span>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10">
                <Image
                  src="/logo2.svg"
                  alt="MedHubb Logo"
                  width={40}
                  height={40}
                  className="w-full h-full"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-600">MedHubb</h1>
                <p className="text-sm text-gray-500">Il mio profilo</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline">{userName}</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="medical-surface-elevated">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <span className="medical-subtitle text-slate-800">Informazioni Personali</span>
              </CardTitle>
              <CardDescription>I tuoi dati anagrafici e di contatto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Nome
                  </label>
                  <div className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700">
                    {patientData.profile.first_name}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Cognome
                  </label>
                  <div className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700">
                    {patientData.profile.last_name}
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <div className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700">
                    {patientData.profile.email}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  Informazioni Account
                </h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Account creato: {new Date(patientData.profile.created_at).toLocaleDateString('it-IT')}
                  </p>
                  <p>• ID Paziente: {patientData.profile.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card className="medical-surface-elevated">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <span className="medical-subtitle text-slate-800">Stato Collegamento</span>
              </CardTitle>
              <CardDescription>Il tuo collegamento con i medici su MedHubb</CardDescription>
            </CardHeader>
            <CardContent>
              {connectionStatus ? (
                <div>
                  {connectionStatus.status === 'connected' ? (
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">Collegato al medico</h3>
                          <p className="text-slate-600">
                            Dr. {connectionStatus.doctor?.first_name} {connectionStatus.doctor?.last_name}
                          </p>
                          {connectionStatus.doctor?.email && (
                            <p className="text-sm text-slate-500">
                              {connectionStatus.doctor.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : connectionStatus.status === 'pending' ? (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">Richiesta in corso</h3>
                          <p className="text-slate-600">
                            In attesa di approvazione dal medico
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">Nessun medico collegato</h3>
                          <p className="text-slate-600">
                            Collegati a un medico per utilizzare MedHubb
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Verifica dello stato di collegamento...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
