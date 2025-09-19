'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { 
  CalendarDays, 
  Pill, 
  UserPlus, 
  Plus,
  Clock,
  XCircle,
  AlertCircle,
  User
} from 'lucide-react';

export default function PatientDashboardPage() {
  const [patientData, setPatientData] = useState<{id: string; email?: string; profile?: {first_name?: string; last_name?: string; [key: string]: unknown}} | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{status: string; doctor?: {first_name?: string; last_name?: string; order_number?: string}; [key: string]: unknown} | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Nuovo stato per tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'prescriptions' | 'doctors'>('overview');
  
  // Stati per le sezioni SPA
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [connectedDoctors, setConnectedDoctors] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState<{[key: string]: boolean}>({});
  
  // Stati per modals e forms
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    officeId: '',
    appointmentDate: '',
    visitType: 'follow_up',
    patientNotes: ''
  });
  const [prescriptionForm, setPrescriptionForm] = useState({
    doctorId: '',
    urgency: 'normal',
    patientNotes: ''
  });
  const [medications, setMedications] = useState([
    { medication_name: '', dosage: '', quantity: '', patient_reason: '' }
  ]);
  
  const router = useRouter();

  // Carica dati quando si cambia tab
  useEffect(() => {
    if (!patientData) return;

    switch (activeTab) {
      case 'appointments':
        loadAppointments();
        loadConnectedDoctorsData();
        break;
      case 'prescriptions':
        loadPrescriptions();
        loadConnectedDoctorsData();
        break;
    }
  }, [activeTab, patientData]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento Dashboard Paziente...</p>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return null;
  }

  const userName = `${patientData.profile?.first_name || ''} ${patientData.profile?.last_name || ''}`.trim();

  // Funzioni per caricare dati delle sezioni
  const loadAppointments = async () => {
    if (!patientData) return;
    
    setLoadingSections(prev => ({ ...prev, appointments: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/appointments', {
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
    if (!patientData) return;
    
    setLoadingSections(prev => ({ ...prev, prescriptions: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/prescriptions', {
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

  const loadConnectedDoctorsData = async () => {
    if (!patientData) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/connections/status?patientId=${patientData.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'connected' && data.connection) {
          const doctor = {
            id: data.connection.doctorId,
            first_name: data.connection.doctorFirstName,
            last_name: data.connection.doctorLastName,
            email: ''
          };
          setConnectedDoctors([doctor]);
          setBookingForm(prev => ({ ...prev, doctorId: doctor.id }));
          setPrescriptionForm(prev => ({ ...prev, doctorId: doctor.id }));
        }
      }
    } catch (error) {
      console.error("Errore caricamento medici:", error);
    }
  };

  // Gestione form appuntamenti
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: patientData.id,
          doctorId: bookingForm.doctorId,
          visitType: bookingForm.visitType,
          patientNotes: bookingForm.patientNotes
        })
      });

      if (response.ok) {
        alert('Appuntamento richiesto con successo!');
        setShowBookingModal(false);
        loadAppointments();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error("Errore prenotazione:", error);
      alert("Errore durante la richiesta");
    }
  };

  // Gestione form prescrizioni
  const handleSubmitPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: patientData.id,
          doctorId: prescriptionForm.doctorId,
          urgency: prescriptionForm.urgency,
          patientNotes: prescriptionForm.patientNotes,
          medications: medications.filter(m => m.medication_name.trim())
        })
      });

      if (response.ok) {
        alert('Richiesta ricetta inviata con successo!');
        setShowPrescriptionModal(false);
        loadPrescriptions();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error("Errore richiesta ricetta:", error);
      alert("Errore durante la richiesta");
    }
  };

  const addMedication = () => {
    if (medications.length < 10) {
      setMedications([...medications, { medication_name: '', dosage: '', quantity: '', patient_reason: '' }]);
    }
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

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
                <p className="text-sm text-gray-500">Dashboard Paziente</p>
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

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="tabs-responsive">
              {[
                { id: 'overview', label: 'Panoramica', icon: CalendarDays },
                { id: 'appointments', label: 'Appuntamenti', icon: CalendarDays },
                { id: 'prescriptions', label: 'Ricette', icon: Pill },
                { id: 'doctors', label: 'Il mio medico', icon: UserPlus },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as 'overview' | 'appointments' | 'prescriptions' | 'doctors')}
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
            <div className="grid-responsive lg:grid-cols-3 gap-6">
              <Card className="medical-surface-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="medical-caption text-slate-700">Appuntamenti attivi</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-slate-900">0</div>
                  <p className="medical-caption text-slate-500">programmati</p>
                </CardContent>
              </Card>

              <Card className="medical-surface-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="medical-caption text-slate-700">Ricette attive</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Pill className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-slate-900">0</div>
                  <p className="medical-caption text-slate-500">da ritirare</p>
                </CardContent>
              </Card>

              <Card className="medical-surface-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="medical-caption text-slate-700">Medico di fiducia</CardTitle>
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <UserPlus className="h-4 w-4 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-slate-900">
                    {connectionStatus?.status === 'connected' ? '1' : '0'}
                  </div>
                  <p className="medical-caption text-slate-500">collegato</p>
                </CardContent>
              </Card>
            </div>

            {/* Status Alert */}
            {connectionStatus && (
              <div className="space-y-6">
                {connectionStatus.status === 'connected' ? (
                  <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <UserPlus className="h-5 w-5 text-green-600" />
                        </div>
                        <span className="medical-subtitle text-slate-800">Il tuo medico di fiducia</span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                          Attivo
                        </span>
                      </CardTitle>
                      <CardDescription>Medico attualmente collegato al tuo profilo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <UserPlus className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  Dr. {connectionStatus.doctor?.first_name} {connectionStatus.doctor?.last_name}
                                </p>
                                <p className="text-sm text-green-600">Medico di fiducia</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                          <Button
                            size="sm"
                            className="flex-1 medical-btn-success"
                            onClick={() => setActiveTab('appointments')}
                          >
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Prenota Appuntamento
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setActiveTab('prescriptions')}
                          >
                            <Pill className="h-4 w-4 mr-2" />
                            Richiedi Ricetta
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : connectionStatus.status === 'pending' ? (
                  <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <UserPlus className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="medical-subtitle text-slate-800">Richiesta in corso</span>
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-semibold">
                          In attesa
                        </span>
                      </CardTitle>
                      <CardDescription>La tua richiesta di associazione è in attesa di approvazione</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <UserPlus className="h-6 w-6 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Richiesta inviata</h3>
                        <p className="text-slate-600 mb-4">
                          Il medico deve ancora approvare la tua richiesta di associazione. 
                          Riceverai una notifica non appena sarà completata.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Plus className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="medical-subtitle text-slate-800">Inizia il tuo percorso</span>
                      </CardTitle>
                      <CardDescription>Collegati a un medico per iniziare a utilizzare MedHubb</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Plus className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Trova il tuo medico</h3>
                        <p className="text-slate-600 mb-4">
                          Per utilizzare MedHubb devi essere collegato a un medico che utilizza la piattaforma.
                        </p>
                        <Button
                          onClick={() => router.push('/dashboard/patient/select-doctor')}
                          className="medical-btn-success"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Trova un medico
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid-responsive-2 gap-6">
              {/* Prenota Appuntamento */}
              <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
                    onClick={() => setActiveTab('appointments')}>
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    <CalendarDays className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="medical-subtitle text-slate-800 group-hover:text-slate-900 transition-colors">
                    Prenota Appuntamento
                  </CardTitle>
                  <CardDescription className="group-hover:text-slate-700 transition-colors">
                    Programma una visita con il tuo medico
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Richiedi Ricetta */}
              <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
                    onClick={() => setActiveTab('prescriptions')}>
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    <Pill className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="medical-subtitle text-slate-800 group-hover:text-slate-900 transition-colors">
                    Le mie ricette
                  </CardTitle>
                  <CardDescription className="group-hover:text-slate-700 transition-colors">
                    Gestisci prescrizioni e farmaci
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <Card className="medical-surface-elevated">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle className="medical-subtitle text-slate-800">I miei appuntamenti</CardTitle>
                    <CardDescription>Visualizza e gestisci i tuoi appuntamenti medici</CardDescription>
                  </div>
                  <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                    <DialogTrigger asChild>
                      <Button 
                        className="medical-btn-success"
                        disabled={connectedDoctors.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Prenota Appuntamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Prenota Appuntamento</DialogTitle>
                      </DialogHeader>
                      
                      <form onSubmit={handleSubmitBooking} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Medico
                          </label>
                          <Select 
                            value={bookingForm.doctorId} 
                            onValueChange={(value) => setBookingForm({ ...bookingForm, doctorId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona medico" />
                            </SelectTrigger>
                            <SelectContent>
                              {connectedDoctors.map(doctor => (
                                <SelectItem key={doctor.id} value={doctor.id}>
                                  Dr. {doctor.first_name} {doctor.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo di Visita
                          </label>
                          <Select 
                            value={bookingForm.visitType} 
                            onValueChange={(value) => setBookingForm({ ...bookingForm, visitType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="first_visit">Prima Visita</SelectItem>
                              <SelectItem value="follow_up">Controllo</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                              <SelectItem value="routine">Routine</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Note (opzionale)
                          </label>
                          <Textarea
                            value={bookingForm.patientNotes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBookingForm({ ...bookingForm, patientNotes: e.target.value })}
                            rows={3}
                            placeholder="Descrivi il motivo della visita..."
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowBookingModal(false)}
                            className="flex-1"
                          >
                            Annulla
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 medical-btn-success"
                          >
                            Richiedi Appuntamento
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {connectedDoctors.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                      <div>
                        <h3 className="text-yellow-800 font-medium">Nessun medico collegato</h3>
                        <p className="text-yellow-700 text-sm mt-1">
                          Per prenotare appuntamenti devi prima collegarti a un medico.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {loadingSections.appointments ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento appuntamenti...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarDays className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun appuntamento</h3>
                    <p className="text-gray-600 mb-4">Non hai ancora prenotato nessun appuntamento.</p>
                    {connectedDoctors.length > 0 && (
                      <Button
                        onClick={() => setShowBookingModal(true)}
                        className="medical-btn-success"
                      >
                        Prenota il Primo Appuntamento
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment: any) => (
                      <Card key={appointment.id} className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    Dr. {appointment.doctors?.first_name} {appointment.doctors?.last_name}
                                  </h3>
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
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

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <CalendarDays className="w-4 h-4" />
                                  <span>
                                    {appointment.appointment_date ? 
                                      new Date(appointment.appointment_date).toLocaleDateString('it-IT') :
                                      'Data da definire'
                                    }
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {appointment.start_time ? 
                                      `${appointment.start_time} - ${appointment.end_time}` :
                                      'Orario da definire'
                                    }
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 text-gray-600">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>
                                    {appointment.visit_type === 'first_visit' ? 'Prima Visita' :
                                     appointment.visit_type === 'follow_up' ? 'Controllo' :
                                     appointment.visit_type === 'urgent' ? 'Urgente' :
                                     appointment.visit_type === 'routine' ? 'Routine' :
                                     appointment.visit_type}
                                  </span>
                                </div>
                              </div>

                              {appointment.patient_notes && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                  <span className="text-sm font-medium text-gray-700">Le tue note: </span>
                                  <span className="text-sm text-gray-600">{appointment.patient_notes}</span>
                                </div>
                              )}

                              {appointment.doctor_notes && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <span className="text-sm font-medium text-blue-800">Note del medico: </span>
                                  <span className="text-sm text-blue-700">{appointment.doctor_notes}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col space-y-2">
                              {appointment.status === 'requested' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancella
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle className="medical-subtitle text-slate-800">Le mie ricette</CardTitle>
                    <CardDescription>Visualizza e gestisci le tue ricette mediche</CardDescription>
                  </div>
                  <Dialog open={showPrescriptionModal} onOpenChange={setShowPrescriptionModal}>
                    <DialogTrigger asChild>
                      <Button 
                        className="medical-btn-success"
                        disabled={connectedDoctors.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Richiedi Ricetta
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Richiedi Ricetta</DialogTitle>
                      </DialogHeader>
                      
                      <form onSubmit={handleSubmitPrescription} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Medico
                          </label>
                          <Select 
                            value={prescriptionForm.doctorId} 
                            onValueChange={(value) => setPrescriptionForm({ ...prescriptionForm, doctorId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona medico" />
                            </SelectTrigger>
                            <SelectContent>
                              {connectedDoctors.map(doctor => (
                                <SelectItem key={doctor.id} value={doctor.id}>
                                  Dr. {doctor.first_name} {doctor.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Urgenza
                          </label>
                          <Select 
                            value={prescriptionForm.urgency} 
                            onValueChange={(value) => setPrescriptionForm({ ...prescriptionForm, urgency: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normale</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Farmaci Richiesti
                          </label>
                          <div className="space-y-3">
                            {medications.map((medication, index) => (
                              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-gray-200 rounded-lg">
                                <Input
                                  placeholder="Nome farmaco"
                                  value={medication.medication_name}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMedication(index, 'medication_name', e.target.value)}
                                  required
                                />
                                <Input
                                  placeholder="Dosaggio (es: 500mg)"
                                  value={medication.dosage}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMedication(index, 'dosage', e.target.value)}
                                />
                                <Input
                                  placeholder="Quantità (es: 30 compresse)"
                                  value={medication.quantity}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMedication(index, 'quantity', e.target.value)}
                                />
                                <Input
                                  placeholder="Motivo"
                                  value={medication.patient_reason}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMedication(index, 'patient_reason', e.target.value)}
                                />
                                {medications.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeMedication(index)}
                                    className="md:col-span-2 border-red-300 text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rimuovi
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addMedication}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Aggiungi Farmaco
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Note aggiuntive (opzionale)
                          </label>
                          <Textarea
                            value={prescriptionForm.patientNotes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrescriptionForm({ ...prescriptionForm, patientNotes: e.target.value })}
                            rows={3}
                            placeholder="Aggiungi informazioni aggiuntive..."
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPrescriptionModal(false)}
                            className="flex-1"
                          >
                            Annulla
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 medical-btn-success"
                          >
                            Invia Richiesta
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {connectedDoctors.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                      <div>
                        <h3 className="text-yellow-800 font-medium">Nessun medico collegato</h3>
                        <p className="text-yellow-700 text-sm mt-1">
                          Per richiedere ricette devi prima collegarti a un medico.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                    <p className="text-gray-600 mb-4">Non hai ancora fatto richieste per ricette.</p>
                    {connectedDoctors.length > 0 && (
                      <Button
                        onClick={() => setShowPrescriptionModal(true)}
                        className="medical-btn-success"
                      >
                        Crea la tua prima richiesta
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((prescription: any) => (
                      <Card key={prescription.id} className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Pill className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    Dr. {prescription.doctors?.first_name} {prescription.doctors?.last_name}
                                  </h3>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
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

                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700">Farmaci richiesti:</h4>
                                <div className="space-y-1">
                                  {prescription.prescription_items?.map((item: any, index: number) => (
                                    <div key={index} className="text-sm text-gray-600 bg-slate-50 p-2 rounded">
                                      <span className="font-medium">{item.medication_name}</span>
                                      {item.dosage && <span className="text-gray-500"> - {item.dosage}</span>}
                                      {item.quantity && <span className="text-gray-500"> ({item.quantity})</span>}
                                      {item.patient_reason && <span className="text-gray-500"> - {item.patient_reason}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {prescription.patient_notes && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                  <span className="text-sm font-medium text-gray-700">Note: </span>
                                  <span className="text-sm text-gray-600">{prescription.patient_notes}</span>
                                </div>
                              )}

                              {prescription.doctor_notes && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <span className="text-sm font-medium text-blue-800">Risposta del medico: </span>
                                  <span className="text-sm text-blue-700">{prescription.doctor_notes}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end space-y-2">
                              <span className="text-xs text-gray-500">
                                {new Date(prescription.created_at).toLocaleDateString('it-IT')}
                              </span>
                              {prescription.responded_at && (
                                <span className="text-xs text-gray-500">
                                  Risposto: {new Date(prescription.responded_at).toLocaleDateString('it-IT')}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <Card className="medical-surface-elevated">
              <CardHeader>
                <CardTitle>Il mio medico</CardTitle>
                <CardDescription>Il medico di fiducia con cui hai una relazione attiva</CardDescription>
              </CardHeader>
              <CardContent>
                {connectionStatus?.status !== 'connected' ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserPlus className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nessun medico associato
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Per utilizzare MedHubb, devi essere associato a un medico che utilizza la piattaforma.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-blue-900 mb-2">Come associarmi a un medico?</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• Il tuo medico ti inviterà direttamente sulla piattaforma</p>
                        <p>• Oppure puoi selezionarlo durante la registrazione</p>
                        <p>• Contatta il tuo medico e chiedigli di utilizzare MedHubb</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push('/dashboard/patient/select-doctor')}
                      className="medical-btn-success"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Trova un medico
                    </Button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                        <UserPlus className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          Dr. {connectionStatus.doctor?.first_name} {connectionStatus.doctor?.last_name}
                        </h3>
                        <p className="text-blue-700 font-medium mb-2">Medico di base</p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 flex-shrink-0">
                          Collegato
                        </span>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => setActiveTab('appointments')}>
                            Prenota
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setActiveTab('prescriptions')}>
                            Ricette
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}