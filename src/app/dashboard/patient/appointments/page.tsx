"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

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
  const [patientData, setPatientData] = useState<{id: string; profile?: {[key: string]: unknown}} | null>(null);
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
    if (bookingForm.doctorId && bookingForm.officeId && bookingForm.appointmentDate) {
      loadAvailableSlots();
    }
  }, [bookingForm.doctorId, bookingForm.officeId, bookingForm.appointmentDate]);

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

  const loadConnectedDoctors = async () => {
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
        if (data.success && data.status === 'connected' && data.connection) {
          // Convert connection data to doctors array format
          const doctor = {
            id: data.connection.doctorId,
            first_name: data.connection.doctorFirstName,
            last_name: data.connection.doctorLastName,
            email: '' // Not provided by this API
          };
          setConnectedDoctors([doctor]);
          setBookingForm(prev => ({ ...prev, doctorId: doctor.id }));
        } else {
          setConnectedDoctors([]);
        }
      } else {
        setConnectedDoctors([]);
      }
    } catch (error) {
      console.error("Errore caricamento medici:", error);
      setConnectedDoctors([]);
    }
  };

  const loadDoctorOffices = async () => {
    if (!bookingForm.doctorId || !patientData) return;

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
    if (!bookingForm.doctorId || !bookingForm.officeId || !bookingForm.appointmentDate) return;

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
          doctorId: bookingForm.doctorId,
          officeId: bookingForm.officeId,
          date: bookingForm.appointmentDate,
          visitType: bookingForm.visitType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error("Errore caricamento slot:", error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadAppointments = async () => {
    if (!patientData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/appointments?patientId=${patientData.id}&dateRange=all`, {
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

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData || !bookingForm.selectedSlot) return;

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessione scaduta, effettua di nuovo il login');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          doctorId: bookingForm.doctorId,
          requestedOfficeId: bookingForm.officeId,
          appointmentDate: bookingForm.appointmentDate,
          startTime: bookingForm.selectedSlot.startTime,
          endTime: bookingForm.selectedSlot.endTime,
          visitType: bookingForm.visitType,
          patientNotes: bookingForm.patientNotes || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message);
        setShowBookingModal(false);
        resetBookingForm();
        await loadAppointments();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore prenotazione:", error);
      alert("Errore nella prenotazione");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Sei sicuro di voler cancellare questo appuntamento?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessione scaduta, effettua di nuovo il login');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          appointmentId,
          reason: 'Cancellato dal paziente'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message);
        await loadAppointments();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore cancellazione:", error);
      alert("Errore nella cancellazione");
    }
  };

  const resetBookingForm = () => {
    setBookingForm({
      doctorId: connectedDoctors[0]?.id || '',
      officeId: '',
      appointmentDate: '',
      selectedSlot: null,
      visitType: 'follow_up',
      patientNotes: ''
    });
    setAvailableSlots([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getStats = () => {
    const total = appointments.length;
    const upcoming = appointments.filter(a => {
      const appointmentDate = new Date(a.appointment_date);
      const today = new Date();
      return appointmentDate >= today && ['requested', 'confirmed'].includes(a.status);
    }).length;
    const pending = appointments.filter(a => a.status === 'requested').length;
    const completed = appointments.filter(a => a.status === 'completed').length;

    return { total, upcoming, pending, completed };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
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
  const upcomingAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.appointment_date);
    const today = new Date();
    return appointmentDate >= today && ['requested', 'confirmed'].includes(a.status);
  }).slice(0, 3);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        userType="patient"
        userName={userName}
        userEmail={patientData.email}
      />

      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">I Miei Appuntamenti</h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">I Miei Appuntamenti</h1>
                <p className="text-gray-600">Prenota e gestisci i tuoi appuntamenti medici</p>
              </div>
              <button
                onClick={() => {
                  resetBookingForm();
                  setShowBookingModal(true);
                }}
                disabled={connectedDoctors.length === 0}
                className="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Prenota Appuntamento
              </button>
            </div>
          </div>

          {connectedDoctors.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{stats.total}</h2>
                  <p className="text-gray-600">Totali</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{stats.upcoming}</h2>
                  <p className="text-gray-600">Prossimi</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{stats.pending}</h2>
                  <p className="text-gray-600">In Attesa</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{stats.completed}</h2>
                  <p className="text-gray-600">Completati</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Prossimi Appuntamenti</h3>
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-medium text-gray-900">
                          Dr. {appointment.doctors.first_name} {appointment.doctors.last_name}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.color}`}>
                          {STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(appointment.appointment_date)} alle {formatTime(appointment.start_time)}
                      </div>
                      {appointment.confirmed_office && (
                        <div className="text-xs text-gray-500">
                          {appointment.confirmed_office.name}, {appointment.confirmed_office.city}
                        </div>
                      )}
                    </div>
                    {appointment.status === 'requested' && (
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Cancella
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Appointments */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Tutti gli Appuntamenti ({appointments.length})
              </h3>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun appuntamento</h3>
                <p className="text-gray-600 mb-4">Non hai ancora prenotato nessun appuntamento.</p>
                {connectedDoctors.length > 0 && (
                  <button
                    onClick={() => {
                      resetBookingForm();
                      setShowBookingModal(true);
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Prenota il Primo Appuntamento
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            Dr. {appointment.doctors.first_name} {appointment.doctors.last_name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.color}`}>
                            {STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.label}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {VISIT_TYPE_LABELS[appointment.visit_type as keyof typeof VISIT_TYPE_LABELS]}
                          </span>
                        </div>

                        <div className="mb-2">
                          <p className="text-gray-700">
                            <span className="font-medium">Data:</span> {formatDate(appointment.appointment_date)}
                          </p>
                          <p className="text-gray-700">
                            <span className="font-medium">Orario:</span> {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                          </p>
                        </div>

                        {(appointment.confirmed_office || appointment.requested_office) && (
                          <div className="mb-2">
                            <p className="text-gray-700">
                              <span className="font-medium">Ambulatorio:</span>{' '}
                              {appointment.confirmed_office
                                ? `${appointment.confirmed_office.name}, ${appointment.confirmed_office.city}`
                                : `${appointment.requested_office?.name}, ${appointment.requested_office?.city} (Richiesto)`
                              }
                            </p>
                          </div>
                        )}

                        {appointment.patient_notes && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">
                              <span className="font-medium">Le tue note:</span> {appointment.patient_notes}
                            </p>
                          </div>
                        )}

                        {appointment.doctor_notes && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-700 bg-green-50 p-2 rounded">
                              <span className="font-medium">Note del medico:</span> {appointment.doctor_notes}
                            </p>
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          Prenotato il {new Date(appointment.created_at).toLocaleDateString('it-IT')}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-6">
                        {appointment.status === 'requested' && (
                          <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                          >
                            Cancella
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Prenota Appuntamento</h3>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    resetBookingForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medico
                  </label>
                  <select
                    value={bookingForm.doctorId}
                    onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value, officeId: '', selectedSlot: null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleziona medico</option>
                    {connectedDoctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {bookingForm.doctorId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ambulatorio
                    </label>
                    <select
                      value={bookingForm.officeId}
                      onChange={(e) => setBookingForm({ ...bookingForm, officeId: e.target.value, selectedSlot: null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleziona ambulatorio</option>
                      {offices.map(office => (
                        <option key={office.id} value={office.id}>
                          {office.name} - {office.city}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Appuntamento
                    </label>
                    <input
                      type="date"
                      value={bookingForm.appointmentDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value, selectedSlot: null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      min={getMinDate()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo di Visita
                    </label>
                    <select
                      value={bookingForm.visitType}
                      onChange={(e) => setBookingForm({ ...bookingForm, visitType: e.target.value, selectedSlot: null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="first_visit">Prima Visita</option>
                      <option value="follow_up">Controllo</option>
                      <option value="urgent">Urgente</option>
                      <option value="routine">Routine</option>
                    </select>
                  </div>
                </div>

                {bookingForm.appointmentDate && bookingForm.officeId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orari Disponibili
                    </label>
                    {loadingSlots ? (
                      <div className="text-center py-4">
                        <svg className="animate-spin h-6 w-6 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-600 mt-2">Caricamento orari...</p>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">Nessun orario disponibile per questa data</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setBookingForm({ ...bookingForm, selectedSlot: slot })}
                            className={`p-2 rounded border text-sm ${
                              bookingForm.selectedSlot === slot
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:border-blue-300'
                            }`}
                          >
                            {slot.startTime} - {slot.endTime}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (opzionale)
                  </label>
                  <textarea
                    value={bookingForm.patientNotes}
                    onChange={(e) => setBookingForm({ ...bookingForm, patientNotes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Descrivi il motivo della visita..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingModal(false);
                      resetBookingForm();
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !bookingForm.selectedSlot}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {submitting ? "Prenotazione..." : "Prenota Appuntamento"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}