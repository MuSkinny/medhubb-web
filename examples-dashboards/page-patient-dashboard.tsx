'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { CreateAppointmentModal } from '@/components/appointments/CreateAppointmentModal';
import { CreatePrescriptionModal } from '@/components/prescriptions/CreatePrescriptionModal';
import { formatDate, getRelativeDate, formatDateTime, getAppointmentStatus } from '@/utils/date';
import { getStatusLabel, getStatusColor } from '@/utils/status';
import { CalendarDays, Pill, UserPlus, Bell, MapPin, Phone } from 'lucide-react';
import { getDoctorTitle } from '@/utils/doctorUtils';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { RequestRescheduleModal } from '@/components/appointments/RequestRescheduleModal';

export default function PatientDashboard() {
  const { user, userType } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'prescriptions' | 'doctors'>('overview');

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', 'paziente'],
    queryFn: () => api.getAppointments('paziente'),
    enabled: !!user,
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions', 'paziente'],
    queryFn: () => api.getPrescriptions('paziente'),
    enabled: !!user,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['patient-doctors', 'paziente'],
    queryFn: () => api.getPatientDoctorRelationships('paziente'),
    enabled: !!user,
  });

  const approvedDoctor = doctors.find(rel => rel.stato === 'approved')?.doctor;

  const { data: doctorOffices = [] } = useQuery({
    queryKey: ['doctor-offices', approvedDoctor?.id],
    queryFn: () => api.getMedicalOffices(approvedDoctor?.id),
    enabled: !!approvedDoctor?.id,
  });


  const pendingAppointments = appointments.filter(app => app.stato === 'pending').length;
  const pendingPrescriptions = prescriptions.filter(presc => presc.stato === 'pending').length;
  const approvedDoctors = doctors.filter(rel => rel.stato === 'approved').length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
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
            <p className="text-responsive-md text-gray-600">Gestisci i tuoi appuntamenti e ricette mediche</p>
            <UserProfileDropdown className="self-start sm:self-auto" />
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
                  onClick={() => setActiveTab(id as any)}
                  className={`tab-responsive ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <div className="grid-responsive-2 lg:grid-cols-3 gap-6">
              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appuntamenti in attesa</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingAppointments}</div>
                  <p className="text-xs text-muted-foreground">da confermare</p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ricette in attesa</CardTitle>
                  <Pill className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingPrescriptions}</div>
                  <p className="text-xs text-muted-foreground">da approvare</p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Medici attivi</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{approvedDoctors}</div>
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
                  {appointments.slice(0, 3).map((appointment) => {
                    const displayStatus = getAppointmentStatus(appointment);
                    return (
                      <div key={appointment.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">Appuntamento con Dr. {appointment.doctor?.cognome}</p>
                          <p className="text-sm text-gray-600">
                            {appointment.data_ora ? formatDateTime(appointment.data_ora) : `Richiesto ${getRelativeDate(appointment.created_at)}`}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)} flex-shrink-0`}>
                          {getStatusLabel(displayStatus)}
                        </span>
                      </div>
                    );
                  })}
                  
                  {prescriptions.slice(0, 2).map((prescription) => (
                    <div key={prescription.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <Pill className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">Ricetta: {prescription.farmaco}</p>
                        <p className="text-sm text-gray-600">Dr. {prescription.doctor?.cognome} - {getRelativeDate(prescription.created_at)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.stato)} flex-shrink-0`}>
                        {getStatusLabel(prescription.stato)}
                      </span>
                    </div>
                  ))}
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
              <CreateAppointmentModal />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nessun appuntamento trovato</p>
                ) : (
                  appointments.map((appointment) => {
                    const displayStatus = getAppointmentStatus(appointment);
                    return (
                      <div key={appointment.id} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">Dr. {appointment.doctor?.nome} {appointment.doctor?.cognome}</h3>
                            {appointment.data_ora ? (
                              <p className="text-sm text-gray-600">{formatDateTime(appointment.data_ora)}</p>
                            ) : (
                              <p className="text-sm text-blue-600 font-medium">In attesa di programmazione</p>
                            )}
                            {appointment.office && (
                              <p className="text-sm text-gray-500">📍 {appointment.office.nome}, {appointment.office.citta}</p>
                            )}
                            {appointment.note && (
                              <p className="text-sm text-gray-700 mt-1 break-words">{appointment.note}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {appointment.stato === 'confirmed' && appointment.data_ora && displayStatus !== 'expired' && (
                              <RequestRescheduleModal
                                appointment={appointment}
                                onSuccess={() => {
                                  // Optional: add success callback
                                }}
                              />
                            )}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(displayStatus)}`}>
                              {getStatusLabel(displayStatus)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <Card className="card-responsive">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle>Le mie ricette</CardTitle>
                <CardDescription>Visualizza e gestisci le tue ricette mediche</CardDescription>
              </div>
              <CreatePrescriptionModal />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prescriptions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nessuna ricetta trovata</p>
                ) : (
                  prescriptions.map((prescription) => (
                    <div key={prescription.id} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{prescription.farmaco}</h3>
                          <p className="text-sm text-gray-600">Dr. {prescription.doctor?.nome} {prescription.doctor?.cognome}</p>
                          <p className="text-sm text-gray-600">{formatDate(prescription.created_at)}</p>
                          {prescription.note && (
                            <p className="text-sm text-gray-700 mt-1 break-words">{prescription.note}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(prescription.stato)} flex-shrink-0`}>
                          {getStatusLabel(prescription.stato)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
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
                {doctors.length === 0 ? (
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    {doctors.slice(0, 1).map((relation) => (
                      <div key={relation.id} className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-start space-x-4">
                          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                            <UserPlus className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                              {getDoctorTitle(relation.doctor?.genere)} {relation.doctor?.nome} {relation.doctor?.cognome}
                            </h3>
                            <p className="text-blue-700 font-medium mb-2">{relation.doctor?.specializzazione || 'Medico di base'}</p>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>📧 {relation.doctor?.email}</p>
                              {relation.doctor?.ospedale && <p>🏥 {relation.doctor?.ospedale}</p>}
                              {relation.doctor?.telefono && <p>📞 {relation.doctor?.telefono}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(relation.stato)} flex-shrink-0`}>
                              {getStatusLabel(relation.stato)}
                            </span>
                            {relation.stato === 'approved' && (
                              <div className="flex space-x-2">
                                <Button size="sm" onClick={() => setActiveTab('appointments')}>
                                  Prenota
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setActiveTab('prescriptions')}>
                                  Ricette
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {relation.stato === 'approved' && (
                          <>
                            <div className="mt-4 pt-4 border-t border-blue-200">
                              <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-white/50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-blue-900">{appointments.filter(a => a.doctor_id === relation.doctor_id).length}</div>
                                  <div className="text-xs text-blue-700">Appuntamenti</div>
                                </div>
                                <div className="bg-white/50 rounded-lg p-3">
                                  <div className="text-lg font-bold text-blue-900">{prescriptions.filter(p => p.doctor_id === relation.doctor_id).length}</div>
                                  <div className="text-xs text-blue-700">Ricette</div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* Sezione Ambulatori */}
                    {approvedDoctor && doctorOffices.length > 0 && (
                      <Card className="card-responsive mt-6">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <span>Ambulatori di {getDoctorTitle(approvedDoctor.genere)} {approvedDoctor.cognome}</span>
                          </CardTitle>
                          <CardDescription>Sedi dove puoi prenotare appuntamenti</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {doctorOffices.map((office) => (
                              <div key={office.id} className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">{office.nome}</h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{office.indirizzo}, {office.citta} {office.cap}</span>
                                    {office.provincia && <span>({office.provincia})</span>}
                                  </div>
                                  {office.telefono && (
                                    <div className="flex items-center space-x-2">
                                      <Phone className="h-4 w-4" />
                                      <span>{office.telefono}</span>
                                    </div>
                                  )}
                                  {office.note && (
                                    <p className="text-gray-500 mt-2 italic">{office.note}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {doctors.length > 1 && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Nota:</strong> Hai più medici associati. Viene mostrato solo il medico principale.
                        </p>
                      </div>
                    )}
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