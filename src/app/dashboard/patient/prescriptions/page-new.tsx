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
  Pill, 
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  ArrowLeft,
  Clock
} from 'lucide-react';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Medication {
  medication_name: string;
  dosage: string;
  quantity: string;
  patient_reason: string;
}

interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage?: string;
  quantity?: string;
  patient_reason?: string;
}

interface PrescriptionRequest {
  id: string;
  doctor_id: string;
  status: string;
  urgency: string;
  patient_notes?: string;
  doctor_response?: string;
  doctor_notes?: string;
  created_at: string;
  responded_at?: string;
  doctors: Doctor;
  prescription_items: PrescriptionItem[];
}

const STATUS_LABELS = {
  'pending': { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-800' },
  'approved': { label: 'Approvato', color: 'bg-green-100 text-green-800' },
  'rejected': { label: 'Rifiutato', color: 'bg-red-100 text-red-800' },
  'requires_appointment': { label: 'Richiede Appuntamento', color: 'bg-blue-100 text-blue-800' }
};

const URGENCY_LABELS = {
  'normal': { label: 'Normale', color: 'bg-gray-100 text-gray-800' },
  'urgent': { label: 'Urgente', color: 'bg-orange-100 text-orange-800' }
};

export default function PatientPrescriptions() {
  const [session, setSession] = useState<{user: {id: string}; access_token: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [connectedDoctors, setConnectedDoctors] = useState<Doctor[]>([]);
  const [doctorInfo, setDoctorInfo] = useState<{id: string; name?: string; first_name?: string; last_name?: string; email?: string} | null>(null);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRequest | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    doctorId: '',
    urgency: 'normal',
    patientNotes: ''
  });
  const [medications, setMedications] = useState<Medication[]>([
    { medication_name: '', dosage: '', quantity: '', patient_reason: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session) {
        router.push('/login');
        return;
      }

      setSession(session);
      await Promise.all([
        loadPrescriptions(session),
        loadConnectedDoctors(session)
      ]);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptions = async (session: {user: {id: string}; access_token: string}) => {
    try {
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
      console.error('Error loading prescriptions:', error);
    }
  };

  const loadConnectedDoctors = async (session: {user: {id: string}; access_token: string}) => {
    try {
      const response = await fetch(`/api/connections/status?patientId=${session.user.id}`, {
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
          setDoctorInfo({
            id: doctor.id,
            name: `${doctor.first_name} ${doctor.last_name}`,
            first_name: doctor.first_name,
            last_name: doctor.last_name
          });
          setFormData(prev => ({ ...prev, doctorId: doctor.id }));
        }
      }
    } catch (error) {
      console.error('Error loading connected doctors:', error);
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

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || medications.some(m => !m.medication_name.trim())) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: session.user.id,
          doctorId: formData.doctorId,
          urgency: formData.urgency,
          patientNotes: formData.patientNotes,
          medications: medications.filter(m => m.medication_name.trim())
        })
      });

      if (response.ok) {
        alert('Richiesta inviata con successo!');
        setShowNewRequestModal(false);
        setFormData({ doctorId: connectedDoctors[0]?.id || '', urgency: 'normal', patientNotes: '' });
        setMedications([{ medication_name: '', dosage: '', quantity: '', patient_reason: '' }]);
        loadPrescriptions(session);
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Errore durante l\'invio della richiesta');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStats = () => {
    return {
      total: prescriptions.length,
      pending: prescriptions.filter(p => p.status === 'pending').length,
      approved: prescriptions.filter(p => p.status === 'approved').length,
      rejected: prescriptions.filter(p => p.status === 'rejected').length,
      requiresAppointment: prescriptions.filter(p => p.status === 'requires_appointment').length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento prescrizioni...</p>
        </div>
      </div>
    );
  }

  const stats = getStatusStats();

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
                <p className="text-sm text-gray-500">Le mie ricette</p>
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
                  {doctorInfo?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="hidden sm:inline">{doctorInfo?.name || 'Utente'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid-responsive lg:grid-cols-4 gap-6">
            <Card className="medical-surface-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="medical-caption text-slate-700">Totali</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Pill className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                <p className="medical-caption text-slate-500">richieste</p>
              </CardContent>
            </Card>

            <Card className="medical-surface-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="medical-caption text-slate-700">Approvate</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">{stats.approved}</div>
                <p className="medical-caption text-slate-500">pronte</p>
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
                <p className="medical-caption text-slate-500">da approvare</p>
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
                  <CardTitle className="medical-subtitle text-slate-800">Gestione Prescrizioni</CardTitle>
                  <CardDescription>Richiedi e gestisci le tue ricette mediche</CardDescription>
                </div>
                <Dialog open={showNewRequestModal} onOpenChange={setShowNewRequestModal}>
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
                    
                    <form onSubmit={handleSubmitRequest} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Medico
                        </label>
                        <Select 
                          value={formData.doctorId} 
                          onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
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
                          value={formData.urgency} 
                          onValueChange={(value) => setFormData({ ...formData, urgency: value })}
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
                          value={formData.patientNotes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, patientNotes: e.target.value })}
                          rows={3}
                          placeholder="Aggiungi informazioni aggiuntive..."
                        />
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewRequestModal(false)}
                          className="flex-1"
                        >
                          Annulla
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 medical-btn-success"
                        >
                          {submitting ? "Invio..." : "Invia Richiesta"}
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
                        Per richiedere ricette devi prima collegarti a un medico.{' '}
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
                {prescriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Pill className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna richiesta per ricette</h3>
                    <p className="text-gray-600 mb-4">Non hai ancora fatto richieste per ricette.</p>
                    {connectedDoctors.length > 0 && (
                      <Button
                        onClick={() => setShowNewRequestModal(true)}
                        className="medical-btn-success"
                      >
                        Crea la tua prima richiesta
                      </Button>
                    )}
                  </div>
                ) : (
                  prescriptions.map((prescription) => {
                    const statusInfo = STATUS_LABELS[prescription.status as keyof typeof STATUS_LABELS] || { label: prescription.status, color: 'bg-gray-100 text-gray-800' };
                    const urgencyInfo = URGENCY_LABELS[prescription.urgency as keyof typeof URGENCY_LABELS] || { label: prescription.urgency, color: 'bg-gray-100 text-gray-800' };

                    return (
                      <Card 
                        key={prescription.id} 
                        className="medical-surface-elevated hover:shadow-xl transition-shadow duration-200 cursor-pointer"
                        onClick={() => setSelectedPrescription(prescription)}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Pill className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    Dr. {prescription.doctors.first_name} {prescription.doctors.last_name}
                                  </h3>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                      {statusInfo.label}
                                    </span>
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${urgencyInfo.color}`}>
                                      {urgencyInfo.label}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700">Farmaci richiesti:</h4>
                                <div className="space-y-1">
                                  {prescription.prescription_items.map((item, index) => (
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
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prescription Detail Modal */}
      {selectedPrescription && (
        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dettagli Richiesta Ricetta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Dr. {selectedPrescription.doctors.first_name} {selectedPrescription.doctors.last_name}
                </h4>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[selectedPrescription.status as keyof typeof STATUS_LABELS]?.color}`}>
                    {STATUS_LABELS[selectedPrescription.status as keyof typeof STATUS_LABELS]?.label}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_LABELS[selectedPrescription.urgency as keyof typeof URGENCY_LABELS]?.color}`}>
                    {URGENCY_LABELS[selectedPrescription.urgency as keyof typeof URGENCY_LABELS]?.label}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Farmaci richiesti:</h4>
                <div className="space-y-2">
                  {selectedPrescription.prescription_items.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{item.medication_name}</div>
                      {item.dosage && <div className="text-sm text-gray-600">Dosaggio: {item.dosage}</div>}
                      {item.quantity && <div className="text-sm text-gray-600">Quantità: {item.quantity}</div>}
                      {item.patient_reason && <div className="text-sm text-gray-600">Motivo: {item.patient_reason}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {selectedPrescription.patient_notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Le tue note:</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedPrescription.patient_notes}</p>
                </div>
              )}

              {selectedPrescription.doctor_notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Risposta del medico:</h4>
                  <p className="text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">{selectedPrescription.doctor_notes}</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                <p>Richiesta inviata: {new Date(selectedPrescription.created_at).toLocaleDateString('it-IT')}</p>
                {selectedPrescription.responded_at && (
                  <p>Risposta ricevuta: {new Date(selectedPrescription.responded_at).toLocaleDateString('it-IT')}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
