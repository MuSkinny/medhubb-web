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
import { CompactCalendar } from '@/components/CompactCalendar';
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
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pazienti totali</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{patients.length}</div>
                  <p className="text-xs text-muted-foreground">sotto la tua cura</p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Richieste in attesa</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{pendingRequests.length}</div>
                  <p className="text-xs text-muted-foreground">da gestire</p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appuntamenti oggi</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{appointments.filter(a => a.appointment_date === new Date().toISOString().split('T')[0]).length}</div>
                  <p className="text-xs text-muted-foreground">in programma</p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ricette in attesa</CardTitle>
                  <Pill className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{prescriptions.filter(p => p.status === 'pending').length}</div>
                  <p className="text-xs text-muted-foreground">da approvare</p>
                </CardContent>
              </Card>
            </div>
            {/* Pending Requests - Priority */}
            {pendingRequests.length > 0 && (
              <Card className="card-responsive border-amber-200 bg-amber-50/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Users className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-amber-800">Richieste in attesa</CardTitle>
                        <CardDescription className="text-amber-700">Nuovi pazienti richiedono la tua approvazione</CardDescription>
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {pendingRequests.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="bg-white border border-amber-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {request.patient_first_name} {request.patient_last_name}
                              </p>
                              <p className="text-sm text-gray-600">{request.patient_email}</p>
                              <p className="text-xs text-gray-500">{getRelativeDate(request.created_at)}</p>
                            </div>
                          </div>
                        </div>

                        {request.message && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-700 italic">&quot;{request.message}&quot;</p>
                          </div>
                        )}

                        <div className="flex space-x-3">
                          <Button
                            onClick={() => handleRequestResponse(request.id, 'accepted')}
                            disabled={processingRequest === request.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {processingRequest === request.id ? 'Approvando...' : 'Approva'}
                          </Button>
                          <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setRequestToReject(request.id);
                                  setIsRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rifiuta
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white">
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card
                className="card-responsive cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => setActiveTab('patients')}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Gestisci Pazienti</h3>
                  <p className="text-sm text-gray-600">{patients.length} pazienti sotto la tua cura</p>
                </CardContent>
              </Card>

              <Card
                className="card-responsive cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => setActiveTab('appointments')}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Appuntamenti</h3>
                  <p className="text-sm text-gray-600">Gestisci il calendario delle visite</p>
                </CardContent>
              </Card>

              <Card
                className="card-responsive cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => setActiveTab('prescriptions')}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Pill className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Ricette</h3>
                  <p className="text-sm text-gray-600">Gestisci le richieste di prescrizioni</p>
                </CardContent>
              </Card>

              <Card
                className="card-responsive cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => setShowInviteModal(true)}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Invita Paziente</h3>
                  <p className="text-sm text-gray-600">Crea un link di invito personalizzato</p>
                </CardContent>
              </Card>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Full Calendar */}
              <div className="lg:col-span-2">
                <Card className="card-responsive">
                  <CardHeader>
                    <CardTitle>Calendario Appuntamenti</CardTitle>
                    <CardDescription>Vista completa del tuo calendario medico</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompactCalendar
                      appointments={appointments}
                      userType="doctor"
                      selectedDate={selectedCalendarDate}
                      onDateSelect={setSelectedCalendarDate}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar with appointments info */}
              <div className="space-y-6">
                {/* Today's Appointments */}
                <Card className="card-responsive">
                  <CardHeader>
                    <CardTitle className="text-lg">Appuntamenti di oggi</CardTitle>
                    <CardDescription>
                      {new Date().toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {appointments.filter(apt => {
                      const today = new Date().toISOString().split('T')[0];
                      return apt.appointment_date === today;
                    }).length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarDays className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Nessun appuntamento oggi</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appointments
                          .filter(apt => {
                            const today = new Date().toISOString().split('T')[0];
                            return apt.appointment_date === today;
                          })
                          .sort((a, b) => a.start_time.localeCompare(b.start_time))
                          .map((appointment) => (
                            <div key={appointment.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Clock className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {appointment.patients?.first_name} {appointment.patients?.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {appointment.start_time} - {appointment.visit_type}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {appointment.status === 'confirmed' ? 'Confermato' :
                                 appointment.status === 'pending' ? 'In attesa' :
                                 appointment.status}
                              </span>
                            </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="card-responsive">
                  <CardHeader>
                    <CardTitle className="text-lg">Statistiche rapide</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CalendarDays className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-600">Appuntamenti settimana</span>
                        </div>
                        <span className="text-sm font-semibold text-blue-600">
                          {appointments.filter(apt => {
                            const aptDate = new Date(apt.appointment_date);
                            const today = new Date();
                            const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
                            const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
                            return aptDate >= weekStart && aptDate <= weekEnd;
                          }).length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <span className="text-sm text-gray-600">In attesa di conferma</span>
                        </div>
                        <span className="text-sm font-semibold text-amber-600">
                          {appointments.filter(apt => apt.status === 'pending').length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-600">Pazienti questo mese</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          {new Set(appointments
                            .filter(apt => {
                              const aptDate = new Date(apt.appointment_date);
                              const now = new Date();
                              return aptDate.getMonth() === now.getMonth() &&
                                     aptDate.getFullYear() === now.getFullYear();
                            })
                            .map(apt => apt.patient_id)
                          ).size}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Date Appointments */}
                {selectedCalendarDate && (
                  <Card className="card-responsive">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {selectedCalendarDate.toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {appointments.filter(apt => {
                        const aptDate = new Date(apt.appointment_date);
                        return aptDate.toDateString() === selectedCalendarDate.toDateString();
                      }).length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">Nessun appuntamento</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {appointments
                            .filter(apt => {
                              const aptDate = new Date(apt.appointment_date);
                              return aptDate.toDateString() === selectedCalendarDate.toDateString();
                            })
                            .sort((a, b) => a.start_time.localeCompare(b.start_time))
                            .map((appointment) => (
                              <div key={appointment.id} className="p-2 border rounded text-sm">
                                <p className="font-medium">
                                  {appointment.start_time} - {appointment.patients?.first_name} {appointment.patients?.last_name}
                                </p>
                                <p className="text-gray-600">{appointment.visit_type}</p>
                              </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
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