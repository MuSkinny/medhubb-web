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
import { CompactCalendar } from '@/components/CompactCalendar';
import {
  CalendarDays,
  Pill,
  UserPlus,
  Plus,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Bell,
  MapPin,
  Phone
} from 'lucide-react';

export default function PatientDashboardPage() {
  const [patientData, setPatientData] = useState<{id: string; email?: string; profile?: {first_name?: string; last_name?: string; [key: string]: unknown}} | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{status: string; doctor?: {first_name?: string; last_name?: string; order_number?: string}; [key: string]: unknown} | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Nuovo stato per tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'prescriptions' | 'doctors'>('overview');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  
  // Stati per le sezioni SPA
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<any[]>([]);
  const [connectedDoctors, setConnectedDoctors] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState<{[key: string]: boolean}>({});
  const [prescriptionFilters, setPrescriptionFilters] = useState({
    doctor: 'all',
    status: 'all',
    period: 'all'
  });
  
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

  // Effetto per filtrare le prescrizioni quando cambiano i filtri
  useEffect(() => {
    applyPrescriptionFilters();
  }, [prescriptions, prescriptionFilters]);

  const applyPrescriptionFilters = () => {
    let filtered = [...prescriptions];

    // Filtro per dottore
    if (prescriptionFilters.doctor !== 'all') {
      filtered = filtered.filter((p: any) => p.doctor_id === prescriptionFilters.doctor);
    }

    // Filtro per status
    if (prescriptionFilters.status !== 'all') {
      filtered = filtered.filter((p: any) => p.status === prescriptionFilters.status);
    }

    // Filtro per periodo
    if (prescriptionFilters.period !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (prescriptionFilters.period) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter((p: any) =>
        new Date(p.created_at) >= filterDate
      );
    }

    setFilteredPrescriptions(filtered);
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appuntamenti in attesa</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appointments.filter(a => a.status === 'pending').length}</div>
                  <p className="text-xs text-muted-foreground">da confermare</p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ricette in attesa</CardTitle>
                  <Pill className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{prescriptions.filter(p => p.status === 'pending').length}</div>
                  <p className="text-xs text-muted-foreground">da approvare</p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Medici attivi</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {connectionStatus?.status === 'connected' ? '1' : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">approvati</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="card-responsive">
              <CardHeader>
                <CardTitle>Attività recente</CardTitle>
                <CardDescription>I tuoi ultimi appuntamenti e ricette</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <CalendarDays className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">Appuntamento con Dr. {appointment.doctors?.first_name} {appointment.doctors?.last_name}</p>
                        <p className="text-sm text-gray-600">
                          {appointment.appointment_date ?
                            new Date(appointment.appointment_date).toLocaleDateString('it-IT') :
                            `Richiesto ${new Date(appointment.created_at || '').toLocaleDateString('it-IT')}`
                          }
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
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

                  {prescriptions.slice(0, 2).map((prescription) => (
                    <div key={prescription.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <Pill className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          Ricetta: {prescription.prescription_items?.[0]?.medication_name || 'Farmaco'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Dr. {prescription.doctors?.first_name} {prescription.doctors?.last_name} - {new Date(prescription.created_at || '').toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        prescription.status === 'approved' ? 'bg-green-100 text-green-800' :
                        prescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        prescription.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {prescription.status === 'approved' ? 'Approvato' :
                         prescription.status === 'pending' ? 'In attesa' :
                         prescription.status === 'rejected' ? 'Rifiutato' :
                         prescription.status}
                      </span>
                    </div>
                  ))}

                  {appointments.length === 0 && prescriptions.length === 0 && (
                    <div className="text-center py-8">
                      <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nessuna attività recente</p>
                      <p className="text-sm text-gray-400 mt-1">I tuoi appuntamenti e ricette appariranno qui</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <Card className="card-responsive">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle>I miei appuntamenti</CardTitle>
                <CardDescription>Visualizza e gestisci i tuoi appuntamenti medici</CardDescription>
              </div>
              <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                <DialogTrigger asChild>
                  <Button
                    disabled={connectedDoctors.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Prenota Appuntamento
                  </Button>
                </DialogTrigger>
                    <DialogContent className="max-w-lg bg-white">
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

                  <div className="space-y-4">
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
                          <Button onClick={() => setShowBookingModal(true)}>
                            Prenota il Primo Appuntamento
                          </Button>
                        )}
                      </div>
                    ) : (
                      appointments.map((appointment: any) => (
                        <div key={appointment.id} className="border rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">Dr. {appointment.doctors?.first_name} {appointment.doctors?.last_name}</h3>
                              <p className="text-sm text-gray-600">
                                {appointment.appointment_date ?
                                  new Date(appointment.appointment_date).toLocaleDateString('it-IT') :
                                  'Data da definire'
                                }
                              </p>
                              {appointment.patient_notes && (
                                <p className="text-sm text-gray-700 mt-1 break-words">{appointment.patient_notes}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {appointment.status === 'confirmed' ? 'Confermato' :
                                 appointment.status === 'pending' ? 'In attesa' :
                                 appointment.status}
                              </span>
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
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6">
            {/* Filtri */}
            <Card className="card-responsive">
              <CardHeader>
                <CardTitle>Filtri Ricette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medico
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={prescriptionFilters.doctor}
                      onChange={(e) => setPrescriptionFilters({ ...prescriptionFilters, doctor: e.target.value })}
                    >
                      <option value="all">Tutti i medici</option>
                      {connectedDoctors.map((doctor: any) => (
                        <option key={doctor.id} value={doctor.id}>
                          Dr. {doctor.first_name} {doctor.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={prescriptionFilters.status}
                      onChange={(e) => setPrescriptionFilters({ ...prescriptionFilters, status: e.target.value })}
                    >
                      <option value="all">Tutti</option>
                      <option value="pending">In Attesa</option>
                      <option value="approved">Approvate</option>
                      <option value="rejected">Rifiutate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Periodo
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={prescriptionFilters.period}
                      onChange={(e) => setPrescriptionFilters({ ...prescriptionFilters, period: e.target.value })}
                    >
                      <option value="all">Tutto</option>
                      <option value="today">Oggi</option>
                      <option value="week">Questa settimana</option>
                      <option value="month">Questo mese</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-responsive">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <CardTitle>Le mie ricette</CardTitle>
                  <CardDescription>
                    Visualizza e gestisci le tue ricette mediche
                    {filteredPrescriptions.length !== prescriptions.length && (
                      <span className="ml-2 text-blue-600">
                        ({filteredPrescriptions.length} di {prescriptions.length} ricette)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {(prescriptionFilters.doctor !== 'all' || prescriptionFilters.status !== 'all' || prescriptionFilters.period !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrescriptionFilters({ doctor: 'all', status: 'all', period: 'all' })}
                    >
                      Reset Filtri
                    </Button>
                  )}
                  <Dialog open={showPrescriptionModal} onOpenChange={setShowPrescriptionModal}>
                    <DialogTrigger asChild>
                      <Button
                        disabled={connectedDoctors.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Richiedi Ricetta
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
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
                              className="w-full border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Aggiungi Farmaco
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Note Aggiuntive
                          </label>
                          <Textarea
                            placeholder="Fornisci informazioni aggiuntive che possono aiutare il medico..."
                            value={prescriptionForm.patientNotes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrescriptionForm({ ...prescriptionForm, patientNotes: e.target.value })}
                            className="min-h-[80px]"
                          />
                        </div>

                        <div className="flex space-x-4 pt-4">
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

                  <div className="space-y-4">
                    {loadingSections.prescriptions ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Caricamento prescrizioni...</p>
                      </div>
                    ) : filteredPrescriptions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Pill className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna ricetta trovata</h3>
                        <p className="text-gray-600 mb-4">
                          {prescriptions.length === 0
                            ? "Non hai ancora fatto richieste per ricette."
                            : "Nessuna ricetta corrisponde ai filtri selezionati."
                          }
                        </p>
                        {connectedDoctors.length > 0 && prescriptions.length === 0 && (
                          <Button onClick={() => setShowPrescriptionModal(true)}>
                            Crea la tua prima richiesta
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {filteredPrescriptions.map((prescription: any) => (
                          <div key={prescription.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                            <div className="flex flex-col space-y-4">
                              {/* Header con dottore e data */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Pill className="h-6 w-6 text-blue-600" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      Dr. {prescription.doctors?.first_name} {prescription.doctors?.last_name}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                      Richiesta il {new Date(prescription.created_at || '').toLocaleDateString('it-IT', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    prescription.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    prescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    prescription.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {prescription.status === 'approved' ? 'Approvata' :
                                     prescription.status === 'pending' ? 'In Attesa' :
                                     prescription.status === 'rejected' ? 'Rifiutata' :
                                     prescription.status}
                                  </span>
                                  {prescription.urgency === 'urgent' && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      Urgente
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Farmaci richiesti */}
                              {prescription.prescription_items && prescription.prescription_items.length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="font-medium text-gray-900 mb-3">Farmaci richiesti:</h4>
                                  <div className="grid gap-3">
                                    {prescription.prescription_items.map((item: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                                        <div>
                                          <span className="font-medium text-gray-900">{item.medication_name}</span>
                                          {item.dosage && <span className="text-gray-600 ml-2">• {item.dosage}</span>}
                                          {item.patient_reason && <span className="text-gray-500 ml-2">({item.patient_reason})</span>}
                                        </div>
                                        {item.quantity && (
                                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            Qtà: {item.quantity}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Note del paziente */}
                              {prescription.patient_notes && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <h4 className="font-medium text-blue-900 mb-2">Le tue note:</h4>
                                  <p className="text-blue-700 text-sm">{prescription.patient_notes}</p>
                                </div>
                              )}

                              {/* Note del dottore (se rifiutata) */}
                              {prescription.doctor_notes && prescription.status === 'rejected' && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                  <h4 className="font-medium text-red-900 mb-2">Note del medico:</h4>
                                  <p className="text-red-700 text-sm">{prescription.doctor_notes}</p>
                                </div>
                              )}

                              {/* Azioni */}
                              {prescription.status === 'approved' && (
                                <div className="flex justify-end pt-4 border-t">
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-green-800 text-sm font-medium">
                                      ✅ Ricetta approvata! Puoi recarti in farmacia con questo codice.
                                    </p>
                                    {prescription.prescription_code && (
                                      <p className="text-green-700 text-sm mt-1 font-mono">
                                        Codice: {prescription.prescription_code}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {prescription.status === 'pending' && (
                                <div className="flex justify-center pt-4 border-t">
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-yellow-800 text-sm">
                                      ⏳ La richiesta è in attesa di approvazione dal medico
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <Card className="card-responsive">
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
                    <Button onClick={() => router.push('/dashboard/patient/select-doctor')}>
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