'use client';

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Clock,
  Pill,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity
} from 'lucide-react';

interface PatientProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time?: string;
  status: string;
  visit_type: string;
  patient_notes?: string;
  doctor_notes?: string;
  created_at: string;
}

interface Prescription {
  id: string;
  status: string;
  urgency: string;
  patient_notes?: string;
  doctor_notes?: string;
  created_at: string;
  responded_at?: string;
  prescription_items: Array<{
    medication_name: string;
    dosage?: string;
    quantity?: string;
    patient_reason?: string;
  }>;
}

export default function PatientProfilePage() {
  const [doctorData, setDoctorData] = useState<{id: string; email?: string; profile: {first_name?: string; last_name?: string}} | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'prescriptions'>('overview');

  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

  const checkDoctorAuth = useCallback(async () => {
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

      setDoctorData({ ...user, profile: userData.profile });
      await loadPatientData(user.id);
    } catch (error) {
      console.error("Errore autenticazione dottore:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router, patientId]);

  const loadPatientData = async (doctorId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log('Loading patient data for:', { patientId, doctorId });

      // Carica profilo paziente
      const profileUrl = `/api/patients/profile?patientId=${patientId}&doctorId=${doctorId}`;
      console.log('Calling API URL:', profileUrl);

      const profileResponse = await fetch(profileUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Profile response status:', profileResponse.status);
      console.log('Profile response headers:', profileResponse.headers);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('Profile data received:', profileData);
        setPatientProfile(profileData.patient);
      } else {
        console.log('Profile response failed with status:', profileResponse.status);
        const responseText = await profileResponse.text();
        console.error('Profile API error response text:', responseText);

        try {
          const errorData = JSON.parse(responseText);
          console.error('Profile API error data:', errorData);
        } catch (e) {
          console.error('Failed to parse error response as JSON:', e);
        }
      }

      // Carica appuntamenti del paziente
      const appointmentsResponse = await fetch(`/api/appointments?patientId=${patientId}&doctorId=${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        setAppointments(appointmentsData.appointments || []);
      }

      // Carica prescrizioni del paziente
      const prescriptionsResponse = await fetch(`/api/prescriptions?patientId=${patientId}&doctorId=${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (prescriptionsResponse.ok) {
        const prescriptionsData = await prescriptionsResponse.json();
        setPrescriptions(prescriptionsData.requests || []);
      }

    } catch (error) {
      console.error("Errore caricamento dati paziente:", error);
    }
  };

  useEffect(() => {
    checkDoctorAuth();
  }, [checkDoctorAuth]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento profilo paziente...</p>
        </div>
      </div>
    );
  }

  if (!doctorData || !patientProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Paziente non trovato o accesso non autorizzato</p>
          <Button onClick={() => router.push('/dashboard/doctor')} className="mt-4">
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const userName = `${doctorData.profile?.first_name || ''} ${doctorData.profile?.last_name || ''}`.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10">
      <div className="container-responsive py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/doctor')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Torna alla Dashboard</span>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10">
                <Image
                  src="/logo2.svg"
                  alt="MedHubb Logo"
                  width={40}
                  height={40}
                  className="w-full h-full"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-600">MedHubb</h1>
                <p className="text-sm text-gray-500">Profilo Paziente</p>
              </div>
            </div>
          </div>
          <UserProfileDropdown
            userName={userName}
            userEmail={doctorData.email || ''}
            userType="doctor"
          />
        </div>

        {/* Patient Header Card */}
        <Card className="card-responsive mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {patientProfile.first_name} {patientProfile.last_name}
                  </h2>
                  <p className="text-gray-600">Paziente dal {formatDate(patientProfile.created_at)}</p>
                  {patientProfile.date_of_birth && (
                    <p className="text-sm text-gray-500">
                      {getAge(patientProfile.date_of_birth)} anni
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{patientProfile.email}</span>
                </div>
                {patientProfile.phone && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{patientProfile.phone}</span>
                  </div>
                )}
                {(patientProfile.address || patientProfile.city) && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {patientProfile.address && `${patientProfile.address}, `}
                      {patientProfile.city}
                      {patientProfile.postal_code && ` ${patientProfile.postal_code}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="tabs-responsive">
              {[
                { id: 'overview', label: 'Panoramica', icon: Activity },
                { id: 'appointments', label: 'Appuntamenti', icon: CalendarDays },
                { id: 'prescriptions', label: 'Prescrizioni', icon: Pill },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as 'overview' | 'appointments' | 'prescriptions')}
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

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appuntamenti totali</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appointments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {appointments.filter(a => a.status === 'confirmed').length} confermati
                  </p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prescrizioni totali</CardTitle>
                  <Pill className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{prescriptions.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {prescriptions.filter(p => p.status === 'approved').length} approvate
                  </p>
                </CardContent>
              </Card>

              <Card className="card-responsive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ultimo appuntamento</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {appointments.length > 0 ? formatDate(appointments[0].appointment_date) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">data ultima visita</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="card-responsive">
              <CardHeader>
                <CardTitle>Attività recente</CardTitle>
                <CardDescription>Ultimi appuntamenti e prescrizioni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <CalendarDays className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">Appuntamento - {appointment.visit_type}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(appointment.appointment_date)} alle {appointment.start_time}
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
                          Prescrizione: {prescription.prescription_items?.[0]?.medication_name || 'Farmaco'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(prescription.created_at)}
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
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nessuna attività recente</p>
                      <p className="text-sm text-gray-400 mt-1">Gli appuntamenti e prescrizioni appariranno qui</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'appointments' && (
          <Card className="card-responsive">
            <CardHeader>
              <CardTitle>Appuntamenti</CardTitle>
              <CardDescription>Cronologia completa degli appuntamenti</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nessun appuntamento registrato</p>
                  </div>
                ) : (
                  appointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium">{appointment.visit_type}</h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(appointment.appointment_date)} alle {appointment.start_time}
                            {appointment.end_time && ` - ${appointment.end_time}`}
                          </p>
                          {appointment.patient_notes && (
                            <p className="text-sm text-gray-700 mt-1">
                              <strong>Note paziente:</strong> {appointment.patient_notes}
                            </p>
                          )}
                          {appointment.doctor_notes && (
                            <p className="text-sm text-blue-700 mt-1">
                              <strong>Tue note:</strong> {appointment.doctor_notes}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${
                          appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status === 'confirmed' ? 'Confermato' :
                           appointment.status === 'pending' ? 'In attesa' :
                           appointment.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'prescriptions' && (
          <Card className="card-responsive">
            <CardHeader>
              <CardTitle>Prescrizioni</CardTitle>
              <CardDescription>Cronologia completa delle prescrizioni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prescriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nessuna prescrizione registrata</p>
                  </div>
                ) : (
                  prescriptions.map((prescription) => (
                    <div key={prescription.id} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium">
                            {prescription.prescription_items?.map(item => item.medication_name).join(', ') || 'Farmaci'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Richiesta il {formatDate(prescription.created_at)}
                            {prescription.responded_at && ` - Risposta il ${formatDate(prescription.responded_at)}`}
                          </p>

                          {prescription.prescription_items?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {prescription.prescription_items.map((item, index) => (
                                <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                                  <span className="font-medium">{item.medication_name}</span>
                                  {item.dosage && <span className="text-gray-500"> - {item.dosage}</span>}
                                  {item.quantity && <span className="text-gray-500"> ({item.quantity})</span>}
                                  {item.patient_reason && <span className="text-gray-500"> - {item.patient_reason}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {prescription.patient_notes && (
                            <p className="text-sm text-gray-700 mt-2">
                              <strong>Note paziente:</strong> {prescription.patient_notes}
                            </p>
                          )}
                          {prescription.doctor_notes && (
                            <p className="text-sm text-blue-700 mt-2">
                              <strong>Tue note:</strong> {prescription.doctor_notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${
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
                          {prescription.urgency === 'urgent' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Urgente
                            </span>
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
      </div>
    </div>
  );
}