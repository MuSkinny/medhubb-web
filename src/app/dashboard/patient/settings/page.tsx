'use client';

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { 
  User, 
  Calendar,
  Shield,
  ArrowLeft,
  Save
} from 'lucide-react';

interface PatientProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  created_at: string;
}

interface PatientData {
  id: string;
  email?: string;
  profile?: PatientProfile;
}

export default function PatientSettingsPage() {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: ''
  });
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
        router.push("/dashboard");
        return;
      }

      const userData = await response.json();

      if (userData.role !== "patient") {
        router.push("/dashboard");
        return;
      }

      const fullPatientData = { ...user, profile: userData.profile };
      setPatientData(fullPatientData);
      
      // Popola il form con i dati esistenti
      setProfileForm({
        first_name: userData.profile.first_name || '',
        last_name: userData.profile.last_name || '',
        phone: userData.profile.phone || '',
        date_of_birth: userData.profile.date_of_birth || ''
      });
    } catch (error) {
      console.error("Errore autenticazione paziente:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkPatientAuth();
  }, [checkPatientAuth]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/patient/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: patientData.id,
          ...profileForm
        })
      });

      if (response.ok) {
        alert('Profilo aggiornato con successo!');
        // Ricarica i dati
        checkPatientAuth();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error("Errore aggiornamento profilo:", error);
      alert("Errore durante l'aggiornamento");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      alert('Le password non coincidono');
      return;
    }

    if (passwords.new.length < 6) {
      alert('La password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) {
        alert(`Errore: ${error.message}`);
      } else {
        alert('Password cambiata con successo!');
        setPasswords({ current: '', new: '', confirm: '' });
        setShowPasswordForm(false);
      }
    } catch (error) {
      console.error("Errore cambio password:", error);
      alert("Errore durante il cambio password");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento impostazioni...</p>
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
                <p className="text-sm text-gray-500">Impostazioni profilo</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <UserProfileDropdown 
              userName={userName}
              userEmail={patientData.email}
              userType="patient"
              className="self-start sm:self-auto"
            />
          </div>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Profile Information */}
          <Card className="medical-surface-elevated">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <span className="medical-subtitle text-slate-800">Informazioni Personali</span>
              </CardTitle>
              <CardDescription>Modifica i tuoi dati anagrafici e di contatto</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome *
                    </label>
                    <Input
                      value={profileForm.first_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cognome *
                    </label>
                    <Input
                      value={profileForm.last_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Telefono
                    </label>
                    <Input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+39 123 456 7890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Data di nascita
                    </label>
                    <Input
                      type="date"
                      value={profileForm.date_of_birth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <div className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700">
                      {patientData.profile.email}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      L&apos;email non può essere modificata. Contatta il supporto se necessario.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="medical-btn-success"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salva Modifiche'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="medical-surface-elevated">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <span className="medical-subtitle text-slate-800">Sicurezza Account</span>
              </CardTitle>
              <CardDescription>Gestisci la sicurezza del tuo account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Password</h4>
                    <p className="text-sm text-gray-600">Ultima modifica: Mai</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                  >
                    Cambia Password
                  </Button>
                </div>

                {showPasswordForm && (
                  <Card className="border-blue-200 bg-blue-50/20">
                    <CardContent className="p-4">
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nuova Password *
                          </label>
                          <div className="relative">
                            <Input
                              type="password"
                              value={passwords.new}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswords({ ...passwords, new: e.target.value })}
                              required
                              minLength={6}
                              placeholder="Almeno 6 caratteri"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Conferma Nuova Password *
                          </label>
                          <Input
                            type="password"
                            value={passwords.confirm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswords({ ...passwords, confirm: e.target.value })}
                            required
                            minLength={6}
                            placeholder="Ripeti la nuova password"
                          />
                        </div>

                        <div className="flex space-x-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswords({ current: '', new: '', confirm: '' });
                            }}
                            className="flex-1"
                          >
                            Annulla
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 medical-btn-success"
                          >
                            Cambia Password
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Email verificata</h4>
                    <p className="text-sm text-gray-600">{patientData.profile.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-medium">Verificata</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="medical-surface-elevated">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-teal-600" />
                </div>
                <span className="medical-subtitle text-slate-800">Informazioni Account</span>
              </CardTitle>
              <CardDescription>Dettagli del tuo account MedHubb</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">ID Paziente</h4>
                  <p className="text-sm text-gray-600 font-mono">{patientData.profile.id}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Account creato</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(patientData.profile.created_at).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="medical-surface-elevated border-red-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-red-700">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <span className="medical-subtitle">Zona Pericolosa</span>
              </CardTitle>
              <CardDescription>Azioni irreversibili per il tuo account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Elimina Account</h4>
                <p className="text-sm text-red-700 mb-4">
                  Questa azione eliminerà permanentemente il tuo account e tutti i dati associati. 
                  Questa azione non può essere annullata.
                </p>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => alert('Funzionalità in sviluppo. Contatta il supporto per eliminare il tuo account.')}
                >
                  Elimina Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
