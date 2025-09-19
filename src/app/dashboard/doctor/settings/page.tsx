'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface DoctorProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  specialization?: string;
  hospital?: string;
  phone?: string;
  order_number?: string;
  created_at: string;
}

interface DoctorData {
  id: string;
  email?: string;
  profile?: DoctorProfile;
}

export default function DoctorSettingsPage() {
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null);
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
    specialization: '',
    hospital: '',
    phone: '',
    order_number: ''
  });
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

      const fullDoctorData = { ...user, profile: userData.profile };
      setDoctorData(fullDoctorData);
      
      // Popola il form con i dati esistenti
      setProfileForm({
        first_name: userData.profile.first_name || '',
        last_name: userData.profile.last_name || '',
        specialization: userData.profile.specialization || '',
        hospital: userData.profile.hospital || '',
        phone: userData.profile.phone || '',
        order_number: userData.profile.order_number || ''
      });
    } catch (error) {
      console.error("Errore autenticazione medico:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorData) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/doctor/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctorId: doctorData.id,
          ...profileForm
        })
      });

      if (response.ok) {
        alert('Profilo aggiornato con successo!');
        checkDoctorAuth();
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

  if (!doctorData || !doctorData.profile) {
    return null;
  }

  const userName = `${doctorData.profile.first_name} ${doctorData.profile.last_name}`.trim();

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
                <img 
                  src="/logo2.svg" 
                  alt="MedHubb Logo" 
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
              userEmail={doctorData.email}
              userType="doctor"
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
                <span className="medical-subtitle text-slate-800">Informazioni Professionali</span>
              </CardTitle>
              <CardDescription>Modifica i tuoi dati professionali e di contatto</CardDescription>
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
                      Specializzazione
                    </label>
                    <Input
                      value={profileForm.specialization}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                      placeholder="es: Cardiologo, Medico di base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Ospedale/Struttura
                    </label>
                    <Input
                      value={profileForm.hospital}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, hospital: e.target.value })}
                      placeholder="Nome ospedale o clinica"
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
                      Numero Ordine
                    </label>
                    <Input
                      value={profileForm.order_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, order_number: e.target.value })}
                      placeholder="Numero iscrizione ordine medici"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <div className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700">
                      {doctorData.profile.email}
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
                          <Input
                            type="password"
                            value={passwords.new}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswords({ ...passwords, new: e.target.value })}
                            required
                            minLength={6}
                            placeholder="Almeno 6 caratteri"
                          />
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
                    <p className="text-sm text-gray-600">{doctorData.profile.email}</p>
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
                  <h4 className="font-medium text-gray-900 mb-2">ID Medico</h4>
                  <p className="text-sm text-gray-600 font-mono">{doctorData.profile.id}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Account creato</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(doctorData.profile.created_at).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {doctorData.profile.order_number && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Ordine dei Medici</h4>
                    <p className="text-sm text-blue-700">N. {doctorData.profile.order_number}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
