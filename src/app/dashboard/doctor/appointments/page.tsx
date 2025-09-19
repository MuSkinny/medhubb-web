"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/DashboardLayout";
import SectionLoader from "@/components/SectionLoader";

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  requested_office_id?: string;
  confirmed_office_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  visit_type: string;
  patient_notes?: string;
  doctor_notes?: string;
  created_at: string;
  updated_at: string;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  requested_office: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
  confirmed_office: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
}

interface Office {
  id: string;
  name: string;
  address: string;
  city: string;
  is_active?: boolean;
}

const STATUS_LABELS = {
  'requested': { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-800' },
  'confirmed': { label: 'Confermato', color: 'bg-green-100 text-green-800' },
  'office_changed': { label: 'Ambulatorio Cambiato', color: 'bg-blue-100 text-blue-800' },
  'rescheduled': { label: 'Riprogrammato', color: 'bg-purple-100 text-purple-800' },
  'cancelled_by_patient': { label: 'Cancellato Paziente', color: 'bg-red-100 text-red-800' },
  'cancelled_by_doctor': { label: 'Cancellato Medico', color: 'bg-red-100 text-red-800' },
  'completed': { label: 'Completato', color: 'bg-gray-100 text-gray-800' },
  'no_show': { label: 'Paziente Assente', color: 'bg-orange-100 text-orange-800' }
};

const VISIT_TYPE_LABELS = {
  'first_visit': 'Prima Visita',
  'follow_up': 'Controllo',
  'urgent': 'Urgente',
  'routine': 'Routine'
};

export default function DoctorAppointmentsPage() {
  const [doctorData, setDoctorData] = useState<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
    [key: string]: unknown;
  } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  // const [selectedDate, setSelectedDate] = useState(() => {
  //   const today = new Date();
  //   return today.toISOString().split('T')[0];
  // });
  const [dateRange, setDateRange] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [processingAppointment, setProcessingAppointment] = useState<string | null>(null);
  const router = useRouter();

  const [appointmentForm, setAppointmentForm] = useState({
    action: 'confirm' as 'confirm' | 'reschedule' | 'reject',
    confirmedOfficeId: '',
    appointmentDate: '',
    startTime: '',
    endTime: '',
    doctorNotes: ''
  });

  useEffect(() => {
    checkDoctorAuth();
  }, []);

  useEffect(() => {
    if (doctorData) {
      loadAppointments();
    }
  }, [doctorData, dateRange, statusFilter]);

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

      setDoctorData({
        id: user.id,
        email: user.email || '',
        first_name: userData.profile.first_name || '',
        last_name: userData.profile.last_name || '',
        status: userData.profile.status
      });
      await loadOffices(user.id);
    } catch (error) {
      console.error("Errore autenticazione dottore:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadOffices = async (doctorId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/offices?doctorId=${doctorId}`, {
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
    }
  };

  const loadAppointments = async () => {
    if (!doctorData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      let url = `/api/appointments?doctorId=${doctorData.id}&dateRange=${dateRange}`;

      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        console.error('Failed to load appointments:', response.status);
      }
    } catch (error) {
      console.error("Errore caricamento appuntamenti:", error);
    }
  };

  const handleAppointmentAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !doctorData) return;

    setProcessingAppointment(selectedAppointment.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessione scaduta, effettua di nuovo il login');
        router.push('/login');
        return;
      }

      const payload: {
        appointmentId: string;
        confirmedOfficeId: string;
        action: string;
        doctorNotes: string;
        appointmentDate?: string;
        startTime?: string;
        endTime?: string;
      } = {
        appointmentId: selectedAppointment.id,
        confirmedOfficeId: appointmentForm.confirmedOfficeId,
        action: appointmentForm.action,
        doctorNotes: appointmentForm.doctorNotes
      };

      if (appointmentForm.action === 'reschedule') {
        payload.appointmentDate = appointmentForm.appointmentDate;
        payload.startTime = appointmentForm.startTime;
        payload.endTime = appointmentForm.endTime;
      }

      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message);
        setShowAppointmentModal(false);
        setSelectedAppointment(null);
        resetAppointmentForm();
        await loadAppointments();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore gestione appuntamento:", error);
      alert("Errore nell'elaborazione");
    } finally {
      setProcessingAppointment(null);
    }
  };

  const openAppointmentModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentForm({
      action: 'confirm',
      confirmedOfficeId: appointment.requested_office_id || offices[0]?.id || '',
      appointmentDate: appointment.appointment_date,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
      doctorNotes: appointment.doctor_notes || ''
    });
    setShowAppointmentModal(true);
  };

  const resetAppointmentForm = () => {
    setAppointmentForm({
      action: 'confirm',
      confirmedOfficeId: '',
      appointmentDate: '',
      startTime: '',
      endTime: '',
      doctorNotes: ''
    });
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

  const getAppointmentsByDate = () => {
    const grouped: { [date: string]: Appointment[] } = {};

    appointments.forEach(appointment => {
      const date = appointment.appointment_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(appointment);
    });

    // Sort dates
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  };

  const getStats = () => {
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === 'requested').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed').length;

    return { total, pending, confirmed, completed };
  };

  if (loading) {
    return (
      <SectionLoader 
        sectionName="Appuntamenti"
        userType="doctor"
      />
    );
  }

  if (!doctorData) {
    return null;
  }

  const userName = `${doctorData.first_name || ''} ${doctorData.last_name || ''}`.trim();
  const stats = getStats();
  const appointmentsByDate = getAppointmentsByDate();

  return (
    <DashboardLayout
      userType="doctor"
      userName={userName}
      userEmail={doctorData.email || ''}
    >
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Appuntamenti</h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Agenda Appuntamenti</h1>
                <p className="text-gray-600">Gestisci le richieste e conferma gli appuntamenti</p>
              </div>
            </div>
          </div>

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
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{stats.confirmed}</h2>
                  <p className="text-gray-600">Confermati</p>
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

          {/* Filters */}
          <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Periodo
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as 'upcoming' | 'past' | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="upcoming">Prossimi</option>
                  <option value="past">Passati</option>
                  <option value="all">Tutti</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stato
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="requested">In Attesa</option>
                  <option value="confirmed">Confermati</option>
                  <option value="completed">Completati</option>
                  <option value="cancelled_by_patient">Cancellati</option>
                </select>
              </div>

              <div className="flex-1">
                <div className="text-sm text-gray-600">
                  Mostrando {appointments.length} appuntament{appointments.length === 1 ? 'o' : 'i'}
                </div>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Appuntamenti ({appointments.length})
              </h3>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun appuntamento trovato</h3>
                <p className="text-gray-600">Non ci sono appuntamenti per i filtri selezionati.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {appointmentsByDate.map(([date, dayAppointments]) => (
                  <div key={date} className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                      {formatDate(date)}
                    </h4>

                    <div className="space-y-4">
                      {dayAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center text-sm font-medium text-gray-900">
                                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>
                                  {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.color || 'bg-gray-100 text-gray-800'}`}>
                                  {STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.label || appointment.status}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {VISIT_TYPE_LABELS[appointment.visit_type as keyof typeof VISIT_TYPE_LABELS] || appointment.visit_type}
                                </span>
                              </div>
                            </div>

                            <div className="mb-2">
                              <p className="font-medium text-gray-900">
                                {appointment.patients.first_name} {appointment.patients.last_name}
                              </p>
                              <p className="text-sm text-gray-600">{appointment.patients.email}</p>
                            </div>

                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                              </svg>
                              {appointment.confirmed_office
                                ? `${appointment.confirmed_office.name} - ${appointment.confirmed_office.city}`
                                : appointment.requested_office
                                  ? `${appointment.requested_office.name} - ${appointment.requested_office.city} (Richiesto)`
                                  : 'Ambulatorio da confermare'
                              }
                            </div>

                            {appointment.patient_notes && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">
                                  <span className="font-medium">Note paziente:</span> {appointment.patient_notes}
                                </p>
                              </div>
                            )}

                            {appointment.doctor_notes && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-700 bg-green-50 p-2 rounded">
                                  <span className="font-medium">Note medico:</span> {appointment.doctor_notes}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col space-y-2 ml-6">
                            {appointment.status === 'requested' && (
                              <button
                                onClick={() => openAppointmentModal(appointment)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Gestisci
                              </button>
                            )}

                            {appointment.status === 'confirmed' && (
                              <button
                                onClick={() => openAppointmentModal(appointment)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm flex items-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Modifica
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

      {/* Appointment Management Modal */}
      {showAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Gestisci Appuntamento
                </h3>
                <button
                  onClick={() => {
                    setShowAppointmentModal(false);
                    setSelectedAppointment(null);
                    resetAppointmentForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Patient Info */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Informazioni Paziente</h4>
                <p className="text-gray-700">
                  <span className="font-medium">Nome:</span> {selectedAppointment.patients.first_name} {selectedAppointment.patients.last_name}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Email:</span> {selectedAppointment.patients.email}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Tipo visita:</span> {VISIT_TYPE_LABELS[selectedAppointment.visit_type as keyof typeof VISIT_TYPE_LABELS]}
                </p>
                {selectedAppointment.patient_notes && (
                  <p className="text-gray-700 mt-2">
                    <span className="font-medium">Note paziente:</span> {selectedAppointment.patient_notes}
                  </p>
                )}
              </div>

              <form onSubmit={handleAppointmentAction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Azione
                  </label>
                  <select
                    value={appointmentForm.action}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, action: e.target.value as 'confirm' | 'reschedule' | 'reject' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="confirm">Conferma</option>
                    <option value="reschedule">Riprogramma</option>
                    <option value="reject">Rifiuta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ambulatorio
                  </label>
                  <select
                    value={appointmentForm.confirmedOfficeId}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, confirmedOfficeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleziona ambulatorio</option>
                    {offices.filter(o => o.is_active).map(office => (
                      <option key={office.id} value={office.id}>
                        {office.name} - {office.city}
                      </option>
                    ))}
                  </select>
                </div>

                {appointmentForm.action === 'reschedule' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nuova Data
                      </label>
                      <input
                        type="date"
                        value={appointmentForm.appointmentDate}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Orario Inizio
                        </label>
                        <input
                          type="time"
                          value={appointmentForm.startTime}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Orario Fine
                        </label>
                        <input
                          type="time"
                          value={appointmentForm.endTime}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Medico
                  </label>
                  <textarea
                    value={appointmentForm.doctorNotes}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, doctorNotes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Note aggiuntive..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAppointmentModal(false);
                      setSelectedAppointment(null);
                      resetAppointmentForm();
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={processingAppointment === selectedAppointment.id}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {processingAppointment === selectedAppointment.id ? "Elaborazione..." : "Conferma"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}