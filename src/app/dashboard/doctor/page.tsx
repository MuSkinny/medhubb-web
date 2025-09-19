'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { 
  CalendarDays, 
  Clock,
  Pill, 
  Users, 
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react';

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
  
  // Nuovo stato per tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'prescriptions' | 'patients' | 'offices' | 'calendar'>('overview');
  
  // Stati per il nuovo design
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);

  // Stati per le sezioni SPA
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [doctorPatients, setDoctorPatients] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState<{[key: string]: boolean}>({});
  
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

  const handleRejectRequest = () => {
    if (requestToReject && rejectReason.trim()) {
      handleRequestResponse(requestToReject, 'rejected');
      setIsRejectDialogOpen(false);
      setRejectReason('');
      setRequestToReject(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'oggi';
    if (diffInDays === 1) return 'ieri';
    if (diffInDays < 7) return `${diffInDays} giorni fa`;
    return formatDate(dateString);
  };

  // Funzioni per caricare dati delle sezioni
  const loadAppointments = async () => {
    if (!doctorData) return;
    
    setLoadingSections(prev => ({ ...prev, appointments: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/appointments?doctorId=${doctorData.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error("Errore caricamento appuntamenti:", error);
    } finally {
      setLoadingSections(prev => ({ ...prev, appointments: false }));
    }
  };

  const loadPrescriptions = async () => {
    if (!doctorData) return;
    
    setLoadingSections(prev => ({ ...prev, prescriptions: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/prescriptions?doctorId=${doctorData.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.requests || []);
      }
    } catch (error) {
      console.error("Errore caricamento prescrizioni:", error);
    } finally {
      setLoadingSections(prev => ({ ...prev, prescriptions: false }));
    }
  };

  const loadDoctorPatients = async () => {
    if (!doctorData) return;
    
    setLoadingSections(prev => ({ ...prev, patients: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/connections/patients?doctorId=${doctorData.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDoctorPatients(data.patients || []);
      }
    } catch (error) {
      console.error("Errore caricamento pazienti:", error);
    } finally {
      setLoadingSections(prev => ({ ...prev, patients: false }));
    }
  };

  const loadOffices = async () => {
    if (!doctorData) return;
    
    setLoadingSections(prev => ({ ...prev, offices: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/offices?doctorId=${doctorData.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOffices(data.offices || []);
      }
    } catch (error) {
      console.error("Errore caricamento ambulatori:", error);
    } finally {
      setLoadingSections(prev => ({ ...prev, offices: false }));
    }
  };

  // Carica dati quando si cambia tab
  useEffect(() => {
    if (!doctorData) return;

    switch (activeTab) {
      case 'appointments':
        loadAppointments();
        break;
      case 'prescriptions':
        loadPrescriptions();
        break;
      case 'patients':
        loadDoctorPatients();
        break;
      case 'offices':
        loadOffices();
        break;
    }
  }, [activeTab, doctorData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento Dashboard Medico...</p>
        </div>
      </div>
    );
  }

  if (!doctorData) {
    return null;
  }

  const userName = `${doctorData.profile?.first_name || ''} ${doctorData.profile?.last_name || ''}`.trim();

  // SPA Navigation - no redirects, show content based on activeTab

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10">
      <div className="container-responsive py-8">
        {/* Header with Logo and User Profile */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
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
                <p className="text-sm text-gray-500">Dashboard Medico</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <UserProfileDropdown 
              userName={userName}
              userEmail={doctorData.email || ''}
              userType="doctor"
              className="self-start sm:self-auto"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="tabs-responsive">
              {[
                { id: 'overview', label: 'Panoramica', icon: CalendarDays },
                { id: 'appointments', label: 'Appuntamenti', icon: Clock },
                { id: 'prescriptions', label: 'Ricette', icon: Pill },
                { id: 'patients', label: 'Pazienti', icon: Users },
                { id: 'offices', label: 'Ambulatori', icon: MapPin },
                { id: 'calendar', label: 'Calendario', icon: Calendar },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as 'overview' | 'appointments' | 'prescriptions' | 'patients' | 'offices' | 'calendar')}
                  className={`tab-responsive transition-all duration-200 ${
                    activeTab === id
                      ? 'border-blue-600 text-blue-700 bg-blue-50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid-responsive lg:grid-cols-4 gap-6">
              <Card className="medical-surface-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="medical-caption text-slate-700">Pazienti totali</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-slate-900">{patients.length}</div>
                  <p className="medical-caption text-slate-500">attivi</p>
                </CardContent>
              </Card>

              <Card className="medical-surface-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="medical-caption text-slate-700">Richieste in attesa</CardTitle>
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-slate-900">{pendingRequests.length}</div>
                  <p className="medical-caption text-slate-500">da gestire</p>
                </CardContent>
              </Card>

              <Card className="medical-surface-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="medical-caption text-slate-700">Appuntamenti oggi</CardTitle>
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <CalendarDays className="h-4 w-4 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-slate-900">0</div>
                  <p className="medical-caption text-slate-500">in programma</p>
                </CardContent>
              </Card>

              <Card className="medical-surface-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="medical-caption text-slate-700">Richieste ricette</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Pill className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-slate-900">0</div>
                  <p className="medical-caption text-slate-500">da gestire</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              {/* Pending Requests - Priority */}
              {pendingRequests.length > 0 && (
                <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Users className="h-5 w-5 text-red-600" />
                      </div>
                      <span className="medical-subtitle text-slate-800">Richieste di associazione</span>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {pendingRequests.length}
                      </span>
                    </CardTitle>
                    <CardDescription>Nuovi pazienti richiedono la tua approvazione</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingRequests.slice(0, 3).map((request) => (
                        <div key={request.id} className="bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <Users className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {request.patient_first_name} {request.patient_last_name}
                                  </p>
                                  <p className="text-sm text-red-600">Richiesta di associazione</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Email:</span>
                                  <p className="text-gray-600">{request.patient_email}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Richiesta inviata:</span>
                                  <p className="text-gray-600">{getRelativeDate(request.created_at)}</p>
                                </div>
                                {request.message && (
                                  <div className="col-span-full">
                                    <span className="font-medium text-gray-700">Messaggio:</span>
                                    <p className="text-gray-600 italic">&quot;{request.message}&quot;</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                            <Button
                              size="sm"
                              className="flex-1 medical-btn-success"
                              onClick={() => handleRequestResponse(request.id, 'accepted')}
                              disabled={processingRequest === request.id}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {processingRequest === request.id ? 'Approvando...' : 'Approva Paziente'}
                            </Button>
                            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                                  onClick={() => {
                                    setRequestToReject(request.id);
                                    setIsRejectDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rifiuta Richiesta
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Rifiuta richiesta di associazione</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm text-gray-600 mb-2">
                                      Paziente: <strong>{request.patient_first_name} {request.patient_last_name}</strong>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Email: <strong>{request.patient_email}</strong>
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Motivo del rifiuto (opzionale)
                                    </label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                      placeholder="Spiega perché rifiuti questa richiesta..."
                      className="min-h-[100px]"
                    />
                                  </div>
                                  <div className="flex space-x-2 pt-4">
                                    <Button
                                      onClick={handleRejectRequest}
                                      disabled={processingRequest === request.id}
                                      className="flex-1 bg-red-600 hover:bg-red-700"
                                    >
                                      {processingRequest === request.id ? 'Rifiutando...' : 'Rifiuta richiesta'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setIsRejectDialogOpen(false);
                                        setRejectReason('');
                                        setRequestToReject(null);
                                      }}
                                      className="flex-1"
                                    >
                                      Annulla
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions Grid */}
              <div className="grid-responsive-2 gap-6">
                {/* Gestisci Pazienti */}
                <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
                      onClick={() => setActiveTab('patients')}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="medical-subtitle text-slate-800 group-hover:text-slate-900 transition-colors">
                      Gestisci Pazienti
                    </CardTitle>
                    <CardDescription className="group-hover:text-slate-700 transition-colors">
                      {patients.length} pazienti sotto la tua cura
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Appuntamenti */}
                <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
                      onClick={() => setActiveTab('appointments')}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="medical-subtitle text-slate-800 group-hover:text-slate-900 transition-colors">
                      Appuntamenti
                    </CardTitle>
                    <CardDescription className="group-hover:text-slate-700 transition-colors">
                      Gestisci il calendario delle visite
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Ricette */}
                <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
                      onClick={() => setActiveTab('prescriptions')}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Pill className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="medical-subtitle text-slate-800 group-hover:text-slate-900 transition-colors">
                      Ricette
                    </CardTitle>
                    <CardDescription className="group-hover:text-slate-700 transition-colors">
                      Gestisci le richieste di prescrizioni
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Invita Paziente */}
                <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
                      onClick={() => setShowInviteModal(true)}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="medical-subtitle text-slate-800 group-hover:text-slate-900 transition-colors">
                      Invita Paziente
                    </CardTitle>
                    <CardDescription className="group-hover:text-slate-700 transition-colors">
                      Crea un link di invito personalizzato
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <Card className="medical-surface-elevated">
              <CardHeader>
                <CardTitle className="medical-subtitle text-slate-800">Gestione Appuntamenti</CardTitle>
                <CardDescription>Visualizza e gestisci tutti i tuoi appuntamenti</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSections.appointments ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento appuntamenti...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun appuntamento</h3>
                    <p className="text-gray-600">Non ci sono appuntamenti in programma</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment: any) => (
                      <div key={appointment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900">
                              {appointment.patients?.first_name} {appointment.patients?.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {new Date(appointment.appointment_date).toLocaleDateString('it-IT')} - {appointment.start_time}
                            </p>
                            {appointment.patient_notes && (
                              <p className="text-sm text-gray-700 mt-1">{appointment.patient_notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status === 'confirmed' ? 'Confermato' :
                               appointment.status === 'requested' ? 'In Attesa' :
                               appointment.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6">
            <Card className="medical-surface-elevated">
              <CardHeader>
                <CardTitle className="medical-subtitle text-slate-800">Richieste Ricette</CardTitle>
                <CardDescription>Gestisci le richieste ricette dai pazienti</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSections.prescriptions ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento prescrizioni...</p>
                  </div>
                ) : prescriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Pill className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna richiesta ricetta</h3>
                    <p className="text-gray-600">Non ci sono richieste di prescrizioni</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((prescription: any) => (
                      <div key={prescription.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900">
                              {prescription.patients?.first_name} {prescription.patients?.last_name}
                            </h3>
                            <div className="text-sm text-gray-600">
                              {prescription.prescription_items?.map((item: any, index: number) => (
                                <div key={index} className="mt-1">
                                  <span className="font-medium">{item.medication_name}</span>
                                  {item.dosage && <span> - {item.dosage}</span>}
                                  {item.quantity && <span> ({item.quantity})</span>}
                                </div>
                              ))}
                            </div>
                            {prescription.patient_notes && (
                              <p className="text-sm text-gray-700 mt-2">{prescription.patient_notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              prescription.status === 'approved' ? 'bg-green-100 text-green-800' :
                              prescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              prescription.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {prescription.status === 'approved' ? 'Approvato' :
                               prescription.status === 'pending' ? 'In Attesa' :
                               prescription.status === 'rejected' ? 'Rifiutato' :
                               prescription.status}
                            </span>
                            {prescription.urgency === 'urgent' && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Urgente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="space-y-6">
            <Card className="medical-surface-elevated">
              <CardHeader>
                <CardTitle className="medical-subtitle text-slate-800">I miei pazienti</CardTitle>
                <CardDescription>Gestisci i tuoi pazienti e le loro richieste</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSections.patients ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento pazienti...</p>
                  </div>
                ) : doctorPatients.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun paziente</h3>
                    <p className="text-gray-600">Non hai ancora pazienti collegati</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {doctorPatients.map((patient: any) => (
                      <div key={patient.link_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900">
                              {patient.first_name} {patient.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">{patient.email}</p>
                            <p className="text-sm text-gray-500">
                              Collegato il {new Date(patient.linked_at).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              Attivo
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Offices Tab */}
        {activeTab === 'offices' && (
          <div className="space-y-6">
            <Card className="medical-surface-elevated">
              <CardHeader>
                <CardTitle className="medical-subtitle text-slate-800">Gestione Ambulatori</CardTitle>
                <CardDescription>Gestisci i tuoi ambulatori e orari</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSections.offices ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento ambulatori...</p>
                  </div>
                ) : offices.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun ambulatorio</h3>
                    <p className="text-gray-600">Non hai ancora configurato ambulatori</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {offices.map((office: any) => (
                      <div key={office.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900">{office.name}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{office.address}, {office.city}</span>
                                {office.postal_code && <span>({office.postal_code})</span>}
                              </div>
                              {office.phone && (
                                <p>📞 {office.phone}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              office.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {office.is_active ? 'Attivo' : 'Inattivo'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <Card className="medical-surface-elevated">
              <CardHeader>
                <CardTitle className="medical-subtitle text-slate-800">Calendario</CardTitle>
                <CardDescription>Vista calendario degli appuntamenti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Vista Calendario</h3>
                  <p className="text-gray-600 mb-4">Questa sezione mostrerà il calendario con la logica esistente</p>
                  <p className="text-sm text-blue-600">Vista calendario integrata</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal per Invito */}
      {showInviteModal && (
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Invito Paziente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Paziente (opzionale)
                </label>
                <Input
                  type="email"
                  value={inviteData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="paziente@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Messaggio (opzionale)
                </label>
                <Textarea
                  value={inviteData.message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInviteData({ ...inviteData, message: e.target.value })}
                  placeholder="Messaggio personalizzato..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(false)}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                onClick={handleCreateInvite}
                disabled={creatingInvite}
                className="flex-1"
              >
                {creatingInvite ? "Creando..." : "Crea Invito"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}