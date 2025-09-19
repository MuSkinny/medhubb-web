'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/services/api';
import { formatDate, formatDateTime, getRelativeDate } from '@/utils/date';
import { getStatusLabel, getStatusColor } from '@/utils/status';
import { 
  CalendarDays, 
  Pill, 
  Users, 
  Bell, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Plus,
  MapPin,
  Filter
} from 'lucide-react';
import { Appointment, Prescription } from '@/types';
import { PatientProfileModal } from '@/components/patients/PatientProfileModal';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { ScheduleAppointmentModal } from '@/components/appointments/ScheduleAppointmentModal';
import OfficeManagement from '@/components/OfficeManagement';
import { CalendarView } from '@/components/calendar/CalendarView';

export default function DoctorDashboard() {
  const { user, userType } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'prescriptions' | 'patients' | 'calendar' | 'offices'>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [prescriptionToReject, setPrescriptionToReject] = useState<string | null>(null);
  
  // Filtri appuntamenti
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('');
  const [showOnlyToday, setShowOnlyToday] = useState(true);
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');

  // Filtri ricette
  const [selectedPatientFilterRx, setSelectedPatientFilterRx] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [prescriptionSearch, setPrescriptionSearch] = useState<string>('');

  // Queries
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', 'medico'],
    queryFn: () => api.getAppointments('medico'),
    enabled: !!user,
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions', 'medico'],
    queryFn: () => api.getPrescriptions('medico'),
    enabled: !!user,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patient-doctors', 'medico'],
    queryFn: () => api.getPatientDoctorRelationships('medico'),
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats('medico'),
    enabled: !!user,
  });

  // Preload all patient history when switching to patients tab
  const { data: allPatientsHistory, isLoading: isLoadingHistory, error: historyError } = useQuery({
    queryKey: ['all-patients-history', user?.id],
    queryFn: () => {
      console.log('Dashboard: Loading all patients history for doctor:', user?.id);
      console.log('Dashboard: Current activeTab:', activeTab);
      return api.getAllPatientsHistory(user?.id || '');
    },
    enabled: !!user && activeTab === 'patients',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Log when preloaded data changes
  React.useEffect(() => {
    console.log('Dashboard: allPatientsHistory changed:', allPatientsHistory);
    console.log('Dashboard: isLoadingHistory:', isLoadingHistory);
    if (historyError) {
      console.error('Dashboard: Error loading all patients history:', historyError);
    }
  }, [allPatientsHistory, isLoadingHistory, historyError]);

  const { data: daySchedule = [] } = useQuery({
    queryKey: ['doctor-schedule', selectedDate],
    queryFn: () => api.getDoctorSchedule(user?.id || '', selectedDate),
    enabled: !!user && activeTab === 'calendar',
  });

  // Filtra e ordina gli appuntamenti
  const filteredAndSortedAppointments = React.useMemo(() => {
    let filtered = appointments;
    
    // Filtro per paziente
    if (selectedPatientFilter) {
      filtered = filtered.filter(apt => apt.patient_id === selectedPatientFilter);
    }
    
    // Filtro per ricerca testuale
    if (appointmentSearch.trim()) {
      const searchTerm = appointmentSearch.toLowerCase().trim();
      filtered = filtered.filter(apt => {
        const patient = apt.patient;
        if (!patient) return false;
        
        const fullName = `${patient.nome} ${patient.cognome}`.toLowerCase();
        const reverseName = `${patient.cognome} ${patient.nome}`.toLowerCase();
        const email = patient.email?.toLowerCase() || '';
        const note = apt.note?.toLowerCase() || '';
        
        return fullName.includes(searchTerm) || 
               reverseName.includes(searchTerm) ||
               patient.nome.toLowerCase().includes(searchTerm) ||
               patient.cognome.toLowerCase().includes(searchTerm) ||
               email.includes(searchTerm) ||
               note.includes(searchTerm);
      });
    }
    
    // Filtro per oggi (solo appuntamenti futuri di oggi) se abilitato
    if (showOnlyToday && !selectedPatientFilter && !appointmentSearch.trim()) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const now = new Date();
      
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.data_ora);
        return aptDate >= now && aptDate >= todayStart && aptDate < todayEnd;
      });
    }
    
    // Ordinamento: prossimo appuntamento prima
    return filtered.sort((a, b) => {
      const dateA = new Date(a.data_ora);
      const dateB = new Date(b.data_ora);
      return dateA.getTime() - dateB.getTime();
    });
  }, [appointments, selectedPatientFilter, showOnlyToday, appointmentSearch]);

  // Filtra e ordina le prescrizioni
  const filteredAndSortedPrescriptions = React.useMemo(() => {
    let filtered = prescriptions;
    
    // Filtro per paziente
    if (selectedPatientFilterRx) {
      filtered = filtered.filter(rx => rx.patient_id === selectedPatientFilterRx);
    }
    
    // Filtro per ricerca testuale
    if (prescriptionSearch.trim()) {
      const searchTerm = prescriptionSearch.toLowerCase().trim();
      filtered = filtered.filter(rx => {
        const patient = rx.patient;
        if (!patient) return false;
        
        const fullName = `${patient.nome} ${patient.cognome}`.toLowerCase();
        const reverseName = `${patient.cognome} ${patient.nome}`.toLowerCase();
        const email = patient.email?.toLowerCase() || '';
        const farmaco = rx.farmaco?.toLowerCase() || '';
        const note = rx.note?.toLowerCase() || '';
        
        return fullName.includes(searchTerm) || 
               reverseName.includes(searchTerm) ||
               patient.nome.toLowerCase().includes(searchTerm) ||
               patient.cognome.toLowerCase().includes(searchTerm) ||
               email.includes(searchTerm) ||
               farmaco.includes(searchTerm) ||
               note.includes(searchTerm);
      });
    }
    
    // Filtro per stato
    if (selectedStatusFilter) {
      filtered = filtered.filter(rx => rx.stato === selectedStatusFilter);
    }
    
    // Ordinamento: più recenti prima
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, [prescriptions, selectedPatientFilterRx, selectedStatusFilter, prescriptionSearch]);

  // Mutations
  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Appointment> }) =>
      api.updateAppointment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Prescription> }) =>
      api.updatePrescription(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'medico'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsRejectDialogOpen(false);
      setRejectReason('');
      setPrescriptionToReject(null);
    },
    onError: (error) => {
      console.error('Error updating prescription:', error);
    },
  });

  const handleRejectPrescription = () => {
    if (prescriptionToReject && rejectReason.trim()) {
      updatePrescriptionMutation.mutate({
        id: prescriptionToReject,
        updates: { stato: 'rejected', note: rejectReason.trim() }
      });
    }
  };

  const approvePatientMutation = useMutation({
    mutationFn: (relationshipId: string) => api.approvePatient(relationshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-doctors'] });
    },
  });

  if (!user) return null;

  const pendingPatients = patients.filter(p => p.stato === 'pending');
  const approvedPatients = patients.filter(p => p.stato === 'approved');
  const pendingAppointments = appointments.filter(a => a.stato === 'pending');
  const unscheduledAppointments = pendingAppointments.filter(a => !a.data_ora);
  const scheduledPendingAppointments = pendingAppointments.filter(a => a.data_ora);
  const pendingPrescriptions = prescriptions.filter(p => p.stato === 'pending');

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
            <UserProfileDropdown className="self-start sm:self-auto" />
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
                  onClick={() => setActiveTab(id as any)}
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
                  <div className="text-3xl font-bold text-slate-900">{stats?.patients || 0}</div>
                  <p className="medical-caption text-slate-500">attivi</p>
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
                  <div className="text-3xl font-bold text-slate-900">{stats?.appointments || 0}</div>
                  <p className="medical-caption text-slate-500">in programma</p>
                </CardContent>
              </Card>

              <Card className="medical-surface-elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="medical-caption text-slate-700">Appuntamenti in attesa</CardTitle>
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-slate-900">{stats?.appointments || 0}</div>
                  <p className="medical-caption text-slate-500">da confermare</p>
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
                  <div className="text-3xl font-bold text-slate-900">{stats?.prescriptions || 0}</div>
                  <p className="medical-caption text-slate-500">da gestire</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              {/* Unscheduled Appointments - Need to be scheduled */}
              {unscheduledAppointments.length > 0 && (
                <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="medical-subtitle text-slate-800">Richieste appuntamento da programmare</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {unscheduledAppointments.length}
                      </span>
                    </CardTitle>
                    <CardDescription>I pazienti hanno richiesto appuntamenti. Stabilisci data e ora.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {unscheduledAppointments.slice(0, 3).map((appointment) => (
                        <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-3 sm:space-y-0 hover:shadow-md transition-shadow duration-200">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{appointment.patient?.nome} {appointment.patient?.cognome}</p>
                            <p className="text-sm text-blue-600 font-medium">Richiesta da programmare</p>
                            {appointment.note && (
                              <div className="mt-2 p-2 bg-white rounded border">
                                <p className="text-sm text-gray-600"><strong>Motivo:</strong> {appointment.note}</p>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Richiesta inviata: {getRelativeDate(appointment.created_at)}</p>
                          </div>
                          <div className="flex space-x-2 flex-shrink-0">
                            <ScheduleAppointmentModal
                              appointment={appointment}
                              onSuccess={() => {
                                // Optional: add success callback
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAppointmentMutation.mutate({
                                id: appointment.id,
                                updates: { stato: 'cancelled' }
                              })}
                              className="btn-responsive-sm border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              <span className="sr-only sm:not-sr-only">Rifiuta</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid-responsive-2 gap-6">
                {/* Scheduled Pending Appointments - Need confirmation */}
                {scheduledPendingAppointments.length > 0 && (
                  <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="medical-subtitle text-slate-800">Appuntamenti programmati</span>
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {scheduledPendingAppointments.length}
                        </span>
                      </CardTitle>
                      <CardDescription>Appuntamenti già programmati in attesa di conferma finale</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {scheduledPendingAppointments.slice(0, 3).map((appointment) => (
                          <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg space-y-3 sm:space-y-0 hover:shadow-md transition-shadow duration-200">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{appointment.patient?.nome} {appointment.patient?.cognome}</p>
                              <p className="text-sm text-gray-600">{formatDateTime(appointment.data_ora)}</p>
                              {appointment.note && (
                                <p className="text-sm text-gray-500 break-words">{appointment.note}</p>
                              )}
                            </div>
                            <div className="flex space-x-2 flex-shrink-0">
                              <Button
                                size="sm"
                                onClick={() => updateAppointmentMutation.mutate({
                                  id: appointment.id,
                                  updates: { stato: 'confirmed' }
                                })}
                                className="btn-responsive-sm medical-btn-success"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span className="sr-only sm:not-sr-only">Conferma</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAppointmentMutation.mutate({
                                  id: appointment.id,
                                  updates: { stato: 'cancelled' }
                                })}
                                className="btn-responsive-sm border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                <span className="sr-only sm:not-sr-only">Annulla</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Pending Prescriptions */}
              <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Pill className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="medical-subtitle text-slate-800">Richieste per ricette</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                      {pendingPrescriptions.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingPrescriptions.slice(0, 3).map((prescription) => (
                      <div key={prescription.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg space-y-3 sm:space-y-0 hover:shadow-md transition-shadow duration-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{prescription.patient?.nome} {prescription.patient?.cognome}</p>
                          <p className="text-sm text-gray-600">{prescription.farmaco}</p>
                          {prescription.note && (
                            <p className="text-sm text-gray-500 break-words">{prescription.note}</p>
                          )}
                        </div>
                        <div className="flex space-x-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => updatePrescriptionMutation.mutate({
                              id: prescription.id,
                              updates: { stato: 'ready' }
                            })}
                            className="btn-responsive-sm medical-btn-success"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="sr-only sm:not-sr-only">Fatta</span>
                          </Button>
                          <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="btn-responsive-sm border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setPrescriptionToReject(prescription.id);
                                  setIsRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                <span className="sr-only sm:not-sr-only">Rifiuta</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Rifiuta richiesta ricetta</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    Paziente: <strong>{prescription.patient?.nome} {prescription.patient?.cognome}</strong>
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Farmaco richiesto: <strong>{prescription.farmaco}</strong>
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Motivo del rifiuto
                                  </label>
                                  <Textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Spiega perché rifiuti questa richiesta..."
                                    className="min-h-[100px]"
                                  />
                                </div>
                                <div className="flex space-x-2 pt-4">
                                  <Button
                                    onClick={handleRejectPrescription}
                                    disabled={!rejectReason.trim() || updatePrescriptionMutation.isPending}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                  >
                                    {updatePrescriptionMutation.isPending ? 'Rifiutando...' : 'Rifiuta richiesta'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setIsRejectDialogOpen(false);
                                      setRejectReason('');
                                      setPrescriptionToReject(null);
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
                    {pendingPrescriptions.length === 0 && (
                      <p className="text-gray-500 text-center py-4">Nessuna richiesta ricetta</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Patients */}
            {pendingPatients.length > 0 && (
              <Card className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="medical-subtitle text-slate-800">Richieste di associazione</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                      {pendingPatients.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingPatients.map((relation) => (
                      <div key={relation.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {relation.patient?.nome} {relation.patient?.cognome}
                                </p>
                                <p className="text-sm text-blue-600">Richiesta di associazione</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Email:</span>
                                <p className="text-gray-600">{relation.patient?.email}</p>
                              </div>
                              {relation.patient?.data_nascita && (
                                <div>
                                  <span className="font-medium text-gray-700">Data di nascita:</span>
                                  <p className="text-gray-600">{formatDate(relation.patient.data_nascita)}</p>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-700">Richiesta inviata:</span>
                                <p className="text-gray-600">{getRelativeDate(relation.created_at)}</p>
                              </div>
                              {relation.patient?.telefono && (
                                <div>
                                  <span className="font-medium text-gray-700">Telefono:</span>
                                  <p className="text-gray-600">{relation.patient.telefono}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                          {relation.patient && (
                            <PatientProfileModal
                              patient={relation.patient}
                              relationshipDate={relation.created_at}
                              preloadedHistory={allPatientsHistory ? {
                                appointments: allPatientsHistory.appointmentsByPatient[relation.patient.id] || [],
                                prescriptions: allPatientsHistory.prescriptionsByPatient[relation.patient.id] || []
                              } : undefined}
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizza Profilo
                                </Button>
                              }
                            />
                          )}
                          <Button
                            size="sm"
                            className="flex-1 medical-btn-success"
                            onClick={() => approvePatientMutation.mutate(relation.id)}
                            disabled={approvePatientMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {approvePatientMutation.isPending ? 'Approvando...' : 'Approva Paziente'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rifiuta Richiesta
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <Card className="card-responsive">
              <CardHeader>
                <CardTitle>Gestione Appuntamenti</CardTitle>
                <CardDescription>Visualizza e gestisci tutti i tuoi appuntamenti</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtri */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700">Filtri</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ricerca
                      </label>
                      <Input
                        type="text"
                        placeholder="Cerca per nome, cognome, email o note..."
                        value={appointmentSearch}
                        onChange={(e) => setAppointmentSearch(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paziente
                      </label>
                      <Select value={selectedPatientFilter || 'all'} onValueChange={(value) => setSelectedPatientFilter(value === 'all' ? '' : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tutti i pazienti" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i pazienti</SelectItem>
                          {patients
                            .filter(pd => pd.stato === 'approved')
                            .map((pd) => (
                              <SelectItem key={pd.id} value={pd.patient?.id || 'unknown'}>
                                {pd.patient?.nome} {pd.patient?.cognome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <div className="flex items-center space-x-2">
                        <input
                          id="today-only"
                          type="checkbox"
                          checked={showOnlyToday}
                          onChange={(e) => setShowOnlyToday(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="today-only" className="text-sm font-medium text-gray-700">
                          Solo oggi
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-end">
                      <div className="text-xs text-gray-500">
                        {filteredAndSortedAppointments.length} appuntament{filteredAndSortedAppointments.length !== 1 ? 'i' : 'o'}
                      </div>
                    </div>
                  </div>

                  {/* Indicatori filtri attivi */}
                  {(selectedPatientFilter || showOnlyToday || appointmentSearch.trim()) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {appointmentSearch.trim() && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          <span>Ricerca: "{appointmentSearch.trim()}"</span>
                          <button
                            onClick={() => setAppointmentSearch('')}
                            className="ml-1 text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {selectedPatientFilter && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          <span>Paziente: {patients.find(pd => pd.patient?.id === selectedPatientFilter)?.patient?.nome} {patients.find(pd => pd.patient?.id === selectedPatientFilter)?.patient?.cognome}</span>
                          <button
                            onClick={() => setSelectedPatientFilter('')}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {showOnlyToday && !selectedPatientFilter && !appointmentSearch.trim() && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          <span>Solo appuntamenti di oggi</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {filteredAndSortedAppointments.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Nessun appuntamento trovato</p>
                  ) : (
                    filteredAndSortedAppointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col space-y-2">
                              <div>
                                <h3 className="font-medium truncate">{appointment.patient?.nome} {appointment.patient?.cognome}</h3>
                                <p className="text-sm text-gray-600">{formatDateTime(appointment.data_ora)}</p>
                                {appointment.note && (
                                  <p className="text-sm text-gray-700 mt-1 break-words">Note: {appointment.note}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.stato)} flex-shrink-0`}>
                              {getStatusLabel(appointment.stato)}
                            </span>
                            {appointment.stato === 'pending' && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateAppointmentMutation.mutate({
                                    id: appointment.id,
                                    updates: { stato: 'confirmed' }
                                  })}
                                  className="btn-responsive-sm"
                                >
                                  Conferma
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateAppointmentMutation.mutate({
                                    id: appointment.id,
                                    updates: { stato: 'cancelled' }
                                  })}
                                  className="btn-responsive-sm"
                                >
                                  Annulla
                                </Button>
                              </div>
                            )}
                            {appointment.stato === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAppointmentMutation.mutate({
                                  id: appointment.id,
                                  updates: { stato: 'completed' }
                                })}
                                className="btn-responsive-sm"
                              >
                                Completa
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
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6">
            <Card className="card-responsive">
              <CardHeader>
                <CardTitle>Richieste Ricette</CardTitle>
                <CardDescription>Gestisci le richieste ricette dai pazienti</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtri Prescrizioni */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700">Filtri</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ricerca
                      </label>
                      <Input
                        type="text"
                        placeholder="Cerca per nome, farmaco, note..."
                        value={prescriptionSearch}
                        onChange={(e) => setPrescriptionSearch(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paziente
                      </label>
                      <Select value={selectedPatientFilterRx || 'all'} onValueChange={(value) => setSelectedPatientFilterRx(value === 'all' ? '' : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tutti i pazienti" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i pazienti</SelectItem>
                          {patients
                            .filter(pd => pd.stato === 'approved')
                            .map((pd) => (
                              <SelectItem key={pd.id} value={pd.patient?.id || 'unknown'}>
                                {pd.patient?.nome} {pd.patient?.cognome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stato
                      </label>
                      <Select value={selectedStatusFilter || 'all'} onValueChange={(value) => setSelectedStatusFilter(value === 'all' ? '' : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tutti gli stati" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti gli stati</SelectItem>
                          <SelectItem value="pending">In attesa</SelectItem>
                          <SelectItem value="ready">Pronta</SelectItem>
                          <SelectItem value="rejected">Rifiutata</SelectItem>
                          <SelectItem value="collected">Ritirata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <div className="text-xs text-gray-500">
                        {filteredAndSortedPrescriptions.length} ricett{filteredAndSortedPrescriptions.length !== 1 ? 'e' : 'a'}
                      </div>
                    </div>
                  </div>

                  {/* Indicatori filtri attivi */}
                  {(selectedPatientFilterRx || selectedStatusFilter || prescriptionSearch.trim()) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {prescriptionSearch.trim() && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          <span>Ricerca: "{prescriptionSearch.trim()}"</span>
                          <button
                            onClick={() => setPrescriptionSearch('')}
                            className="ml-1 text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {selectedPatientFilterRx && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          <span>Paziente: {patients.find(pd => pd.patient?.id === selectedPatientFilterRx)?.patient?.nome} {patients.find(pd => pd.patient?.id === selectedPatientFilterRx)?.patient?.cognome}</span>
                          <button
                            onClick={() => setSelectedPatientFilterRx('')}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {selectedStatusFilter && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          <span>Stato: {
                            selectedStatusFilter === 'pending' ? 'In attesa' :
                            selectedStatusFilter === 'ready' ? 'Pronta' :
                            selectedStatusFilter === 'rejected' ? 'Rifiutata' :
                            selectedStatusFilter === 'collected' ? 'Ritirata' :
                            selectedStatusFilter
                          }</span>
                          <button
                            onClick={() => setSelectedStatusFilter('')}
                            className="ml-1 text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {filteredAndSortedPrescriptions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Nessuna richiesta ricetta</p>
                  ) : (
                    filteredAndSortedPrescriptions.map((prescription) => (
                      <div key={prescription.id} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{prescription.patient?.nome} {prescription.patient?.cognome}</h3>
                            <p className="text-lg text-blue-600 font-semibold break-words">{prescription.farmaco}</p>
                            <p className="text-sm text-gray-600">{formatDate(prescription.created_at)}</p>
                            {prescription.note && (
                              <p className="text-sm text-gray-700 mt-1 break-words">Istruzioni: {prescription.note}</p>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(prescription.stato)} flex-shrink-0`}>
                              {getStatusLabel(prescription.stato)}
                            </span>
                            {prescription.stato === 'pending' && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => updatePrescriptionMutation.mutate({
                                    id: prescription.id,
                                    updates: { stato: 'ready' }
                                  })}
                                  className="btn-responsive-sm"
                                >
                                  Fatta
                                </Button>
                                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="btn-responsive-sm border-red-300 text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setPrescriptionToReject(prescription.id);
                                        setIsRejectDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Rifiuta
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Rifiuta richiesta ricetta</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <p className="text-sm text-gray-600 mb-2">
                                          Paziente: <strong>{prescription.patient?.nome} {prescription.patient?.cognome}</strong>
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Farmaco richiesto: <strong>{prescription.farmaco}</strong>
                                        </p>
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Motivo del rifiuto
                                        </label>
                                        <Textarea
                                          value={rejectReason}
                                          onChange={(e) => setRejectReason(e.target.value)}
                                          placeholder="Spiega perché rifiuti questa richiesta..."
                                          className="min-h-[100px]"
                                        />
                                      </div>
                                      <div className="flex space-x-2 pt-4">
                                        <Button
                                          onClick={handleRejectPrescription}
                                          disabled={!rejectReason.trim() || updatePrescriptionMutation.isPending}
                                          className="flex-1 bg-red-600 hover:bg-red-700"
                                        >
                                          {updatePrescriptionMutation.isPending ? 'Rifiutando...' : 'Rifiuta richiesta'}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setIsRejectDialogOpen(false);
                                            setRejectReason('');
                                            setPrescriptionToReject(null);
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
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="space-y-6">
            <Card className="card-responsive">
              <CardHeader>
                <CardTitle>I miei pazienti</CardTitle>
                <CardDescription>Gestisci i tuoi pazienti e le loro richieste</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Loading indicator for patient history preload */}
                {isLoadingHistory && (
                  <div className="flex items-center justify-center py-4 mb-4 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-600">Caricamento storico pazienti...</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  {approvedPatients.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Nessun paziente associato</p>
                  ) : (
                    approvedPatients.map((relation) => (
                      <div key={relation.id} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{relation.patient?.nome} {relation.patient?.cognome}</h3>
                            <p className="text-sm text-gray-600 truncate">{relation.patient?.email}</p>
                            <p className="text-sm text-gray-500">Associato il {formatDate(relation.created_at)}</p>
                          </div>
                          <div className="flex space-x-2 flex-shrink-0">
                            {relation.patient && (
                              <PatientProfileModal
                                patient={relation.patient}
                                relationshipDate={relation.created_at}
                                preloadedHistory={allPatientsHistory ? {
                                  appointments: allPatientsHistory.appointmentsByPatient[relation.patient.id] || [],
                                  prescriptions: allPatientsHistory.prescriptionsByPatient[relation.patient.id] || []
                                } : undefined}
                                trigger={
                                  <Button size="sm" variant="outline" className="btn-responsive-sm">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizza profilo
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Offices Tab */}
        {activeTab === 'offices' && (
          <OfficeManagement />
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <CalendarView 
            appointments={appointments}
            selectedDate={new Date(selectedDate)}
            onDateSelect={(date) => setSelectedDate(date.toISOString().split('T')[0])}
          />
        )}
      </div>
    </div>
  );
}