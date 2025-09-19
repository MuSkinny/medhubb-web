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
import { 
  CalendarDays, 
  Clock,
  MapPin,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  ArrowLeft
} from 'lucide-react';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Office {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code?: string;
  phone?: string;
}

interface Appointment {
  id: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  visit_type: string;
  patient_notes?: string;
  doctor_notes?: string;
  created_at: string;
  doctors: Doctor;
  confirmed_office: Office | null;
  requested_office: Office | null;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  duration: number;
  available: boolean;
}

const STATUS_LABELS = {
  'requested': { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-800' },
  'confirmed': { label: 'Confermato', color: 'bg-green-100 text-green-800' },
  'office_changed': { label: 'Ambulatorio Cambiato', color: 'bg-blue-100 text-blue-800' },
  'rescheduled': { label: 'Riprogrammato', color: 'bg-purple-100 text-purple-800' },
  'cancelled_by_patient': { label: 'Cancellato', color: 'bg-red-100 text-red-800' },
  'cancelled_by_doctor': { label: 'Cancellato Medico', color: 'bg-red-100 text-red-800' },
  'completed': { label: 'Completato', color: 'bg-gray-100 text-gray-800' },
  'no_show': { label: 'Assente', color: 'bg-orange-100 text-orange-800' }
};

const VISIT_TYPE_LABELS = {
  'first_visit': 'Prima Visita',
  'follow_up': 'Controllo',
  'urgent': 'Urgente',
  'routine': 'Routine'
};

export default function PatientAppointmentsPage() {
  const [patientData, setPatientData] = useState<{id: string; email?: string; profile?: {first_name?: string; last_name?: string; [key: string]: unknown}} | null>(null);
  const [connectedDoctors, setConnectedDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    officeId: '',
    appointmentDate: '',
    selectedSlot: null as AvailableSlot | null,
    visitType: 'follow_up' as string,
    patientNotes: ''
  });

  useEffect(() => {
    checkPatientAuth();
  }, []);

  useEffect(() => {
    if (patientData) {
      loadAppointments();
      loadConnectedDoctors();
    }
  }, [patientData]);

  useEffect(() => {
    if (bookingForm.doctorId) {
      loadDoctorOffices();
    }
  }, [bookingForm.doctorId]);

  useEffect(() => {
    if (bookingForm.appointmentDate && bookingForm.officeId && bookingForm.visitType) {
      loadAvailableSlots();
    }
  }, [bookingForm.appointmentDate, bookingForm.officeId, bookingForm.visitType]);

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
        router.push("/dashboard");
        return;
      }

      const userData = await response.json();
      if (userData.role !== "patient") {
        router.push("/dashboard");
        return;
      }

      setPatientData({ ...user, profile: userData.profile });
    } catch (error) {
      console.error("Errore autenticazione paziente:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
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
    }
  };

  const loadConnectedDoctors = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !patientData) return;

      const response = await fetch(`/api/connections/status?patientId=${patientData.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'connected' && data.connection) {
          const doctor: Doctor = {
            id: data.connection.doctorId,
            first_name: data.connection.doctorFirstName,
            last_name: data.connection.doctorLastName,
            email: ''
          };
          setConnectedDoctors([doctor]);
          setBookingForm(prev => ({ ...prev, doctorId: doctor.id }));
        }
      }
    } catch (error) {
      console.error("Errore caricamento medici:", error);
    }
  };

  const loadDoctorOffices = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/offices?doctorId=${bookingForm.doctorId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const activeOffices = data.offices?.filter((o: Office & {is_active: boolean}) => o.is_active) || [];
        setOffices(activeOffices);

        if (activeOffices.length === 1) {
          setBookingForm(prev => ({ ...prev, officeId: activeOffices[0].id }));
        }
      }
    } catch (error) {
      console.error("Errore caricamento ambulatori:", error);
    }
  };

  const loadAvailableSlots = async () => {
    if (!bookingForm.appointmentDate || !bookingForm.officeId || !bookingForm.visitType) return;

    setLoadingSlots(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/offices/availability', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          officeId: bookingForm.officeId,
          date: bookingForm.appointmentDate,
          visitType: bookingForm.visitType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      }
    } catch (error) {
      console.error("Errore caricamento slot:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.selectedSlot || !patientData) return;

    setSubmitting(true);
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
          officeId: bookingForm.officeId,
          appointmentDate: bookingForm.appointmentDate,
          startTime: bookingForm.selectedSlot.startTime,
          endTime: bookingForm.selectedSlot.endTime,
          visitType: bookingForm.visitType,
          patientNotes: bookingForm.patientNotes
        })
      });

      if (response.ok) {
        alert('Appuntamento prenotato con successo!');
        setShowBookingModal(false);
        resetBookingForm();
        loadAppointments();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error("Errore prenotazione:", error);
      alert("Errore durante la prenotazione");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Sei sicuro di voler cancellare questo appuntamento?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId,
          status: 'cancelled_by_patient'
        })
      });

      if (response.ok) {
        alert('Appuntamento cancellato');
        loadAppointments();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error("Errore cancellazione:", error);
      alert("Errore durante la cancellazione");
    }
  };

  const resetBookingForm = () => {
    setBookingForm({
      doctorId: connectedDoctors.length > 0 ? connectedDoctors[0].id : '',
      officeId: '',
      appointmentDate: '',
      selectedSlot: null,
      visitType: 'follow_up',
      patientNotes: ''
    });
    setAvailableSlots([]);
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const getStats = () => {
    return {
      total: appointments.length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      pending: appointments.filter(a => a.status === 'requested').length,
      completed: appointments.filter(a => a.status === 'completed').length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento appuntamenti...</p>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return null;
  }

  const userName = `${patientData.profile?.first_name || ''} ${patientData.profile?.last_name || ''}`.trim();
  const stats = getStats();

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
                <p className="text-sm text-gray-500">I miei appuntamenti</p>
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
          {/* Stats Cards */}
          <div className="grid-responsive lg:grid-cols-4 gap-6">
            <Card className="medical-surface-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="medical-caption text-slate-700">Totali</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                <p className="medical-caption text-slate-500">appuntamenti</p>
              </CardContent>
            </Card>

            <Card className="medical-surface-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="medical-caption text-slate-700">Confermati</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">{stats.confirmed}</div>
                <p className="medical-caption text-slate-500">confermati</p>
              </CardContent>
            </Card>

            <Card className="medical-surface-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="medical-caption text-slate-700">In attesa</CardTitle>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">{stats.pending}</div>
                <p className="medical-caption text-slate-500">da confermare</p>
              </CardContent>
            </Card>

            <Card className="medical-surface-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="medical-caption text-slate-700">Medici</CardTitle>
                <div className="p-2 bg-teal-100 rounded-lg">
                  <User className="h-4 w-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">{connectedDoctors.length}</div>
                <p className="medical-caption text-slate-500">collegati</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card className="medical-surface-elevated">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <CardTitle className="medical-subtitle text-slate-800">Gestione Appuntamenti</CardTitle>
                  <CardDescription>Visualizza e gestisci tutti i tuoi appuntamenti medici</CardDescription>
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
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                          onValueChange={(value) => setBookingForm({ ...bookingForm, doctorId: value, officeId: '', selectedSlot: null })}
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

                      {bookingForm.doctorId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ambulatorio
                          </label>
                          <Select 
                            value={bookingForm.officeId} 
                            onValueChange={(value) => setBookingForm({ ...bookingForm, officeId: value, selectedSlot: null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona ambulatorio" />
                            </SelectTrigger>
                            <SelectContent>
                              {offices.map(office => (
                                <SelectItem key={office.id} value={office.id}>
                                  {office.name} - {office.city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data Appuntamento
                          </label>
                          <Input
                            type="date"
                            value={bookingForm.appointmentDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value, selectedSlot: null })}
                            required
                            min={getMinDate()}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo di Visita
                          </label>
                          <Select 
                            value={bookingForm.visitType} 
                            onValueChange={(value) => setBookingForm({ ...bookingForm, visitType: value, selectedSlot: null })}
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
                      </div>

                      {bookingForm.appointmentDate && bookingForm.officeId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Orari Disponibili
                          </label>
                          {loadingSlots ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-sm text-gray-600">Caricamento orari...</p>
                            </div>
                          ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                              {availableSlots.filter(slot => slot.available).map((slot, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => setBookingForm({ ...bookingForm, selectedSlot: slot })}
                                  className={`p-2 text-sm rounded-lg border transition-colors ${
                                    bookingForm.selectedSlot === slot
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                                  }`}
                                >
                                  {slot.startTime} - {slot.endTime}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              Nessun orario disponibile per questa data
                            </p>
                          )}
                        </div>
                      )}

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
                          onClick={() => {
                            setShowBookingModal(false);
                            resetBookingForm();
                          }}
                          className="flex-1"
                        >
                          Annulla
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitting || !bookingForm.selectedSlot}
                          className="flex-1 medical-btn-success"
                        >
                          {submitting ? "Prenotazione..." : "Prenota Appuntamento"}
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
                        Per prenotare appuntamenti devi prima collegarti a un medico.{' '}
                        <button
                          onClick={() => router.push('/dashboard/patient/select-doctor')}
                          className="underline font-medium"
                        >
                          Collegati ora
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarDays className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun appuntamento</h3>
                    <p className="text-gray-600 mb-4">Non hai ancora prenotato nessun appuntamento.</p>
                    {connectedDoctors.length > 0 && (
                      <Button
                        onClick={() => {
                          resetBookingForm();
                          setShowBookingModal(true);
                        }}
                        className="medical-btn-success"
                      >
                        Prenota il Primo Appuntamento
                      </Button>
                    )}
                  </div>
                ) : (
                  appointments.map((appointment) => {
                    const statusInfo = STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS] || { label: appointment.status, color: 'bg-gray-100 text-gray-800' };
                    const visitTypeLabel = VISIT_TYPE_LABELS[appointment.visit_type as keyof typeof VISIT_TYPE_LABELS] || appointment.visit_type;
                    const office = appointment.confirmed_office || appointment.requested_office;

                    return (
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
                                    Dr. {appointment.doctors.first_name} {appointment.doctors.last_name}
                                  </h3>
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                    {statusInfo.label}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <CalendarDays className="w-4 h-4" />
                                  <span>{formatDate(appointment.appointment_date)}</span>
                                </div>

                                <div className="flex items-center space-x-2 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                                </div>

                                {office && (
                                  <div className="flex items-center space-x-2 text-gray-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{office.name}, {office.city}</span>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2 text-gray-600">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>{visitTypeLabel}</span>
                                </div>
                              </div>

                              {(appointment.patient_notes || appointment.doctor_notes) && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                  {appointment.patient_notes && (
                                    <div className="mb-2">
                                      <span className="text-sm font-medium text-gray-700">Le tue note: </span>
                                      <span className="text-sm text-gray-600">{appointment.patient_notes}</span>
                                    </div>
                                  )}
                                  {appointment.doctor_notes && (
                                    <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                      <span className="text-sm font-medium text-blue-800">Note del medico: </span>
                                      <span className="text-sm text-blue-700">{appointment.doctor_notes}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2">
                              {appointment.status === 'requested' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelAppointment(appointment.id)}
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
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
