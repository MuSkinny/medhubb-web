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

  const loadPrescriptions = async (currentSession: {user: {id: string}; access_token: string}) => {
    try {
      const response = await fetch(`/api/prescriptions?patientId=${currentSession.user.id}`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load prescriptions');
      }

      const data = await response.json();
      setPrescriptions(data.prescriptions || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };

  const loadConnectedDoctors = async (currentSession: {user: {id: string}; access_token: string}) => {
    try {
      const response = await fetch(`/api/connections/status?patientId=${currentSession.user.id}`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load connection status');
      }

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

        // Store doctor info for prescriptions display
        setDoctorInfo({
          id: data.connection.doctorId,
          name: `${data.connection.doctorFirstName} ${data.connection.doctorLastName}`
        });

        // Auto-select the doctor in the form since there's only one
        setFormData(prev => ({ ...prev, doctorId: data.connection.doctorId }));
      } else {
        setConnectedDoctors([]);
        setDoctorInfo(null);
      }
    } catch (error) {
      console.error('Error loading connected doctors:', error);
      setConnectedDoctors([]);
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

    if (!formData.doctorId || medications.some(m => !m.medication_name.trim())) {
      alert('Seleziona un medico e inserisci almeno un farmaco valido');
      return;
    }

    setSubmitting(true);

    try {
      const requestData = {
        doctorId: formData.doctorId,
        medications: medications.filter(m => m.medication_name.trim()),
        urgency: formData.urgency,
        patientNotes: formData.patientNotes
      };


      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create prescription request';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('API Error Response:', errorData);
        } catch {
          const errorText = await response.text();
          console.error('API Error (raw):', response.status, errorText);
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      if (session) await loadPrescriptions(session);

      // Reset form
      setFormData({ doctorId: '', urgency: 'normal', patientNotes: '' });
      setMedications([{ medication_name: '', dosage: '', quantity: '', patient_reason: '' }]);
      setShowNewRequestModal(false);

      alert('Richiesta per ricetta inviata con successo!');
    } catch (error) {
      console.error('Error creating prescription request:', error);
      alert(error instanceof Error ? error.message : 'Errore nella creazione della richiesta');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="flex">
        <Sidebar userType="patient" userName="" userEmail="" />
        <div className="flex-1 p-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">Caricamento...</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getStatusStats();

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Richieste per Ricette</h1>
          <p className="text-gray-600">Richiedi ricette ai tuoi medici e monitora lo stato delle richieste</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Totale Richieste</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">In Attesa</h3>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Approvate</h3>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Rifiutate</h3>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Richiedono Appuntamento</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.requiresAppointment}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            disabled={connectedDoctors.length === 0}
          >
            + Nuova Richiesta per Ricetta
          </button>
          {connectedDoctors.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Nessun medico connesso. Connetti un medico per richiedere prescrizioni.
            </p>
          )}
        </div>

        {/* Prescriptions List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Storico Richieste per Ricette</h2>
          </div>

          {prescriptions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 text-lg mb-2">Nessuna richiesta per ricette</div>
              <p className="text-gray-400 mb-4">Non hai ancora fatto richieste per ricette.</p>
              {connectedDoctors.length > 0 && (
                <button
                  onClick={() => setShowNewRequestModal(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crea la tua prima richiesta
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {prescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedPrescription(prescription)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          Dr. {doctorInfo?.name || 'Nome non disponibile'}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[prescription.status as keyof typeof STATUS_LABELS]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {STATUS_LABELS[prescription.status as keyof typeof STATUS_LABELS]?.label || prescription.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_LABELS[prescription.urgency as keyof typeof URGENCY_LABELS]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {URGENCY_LABELS[prescription.urgency as keyof typeof URGENCY_LABELS]?.label || prescription.urgency}
                        </span>
                      </div>

                      <div className="mb-2">
                        <p className="text-sm text-gray-600 mb-1">Farmaci richiesti:</p>
                        <div className="flex flex-wrap gap-2">
                          {prescription.prescription_items.map((item, index) => (
                            <span key={index} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">
                              {item.medication_name}
                              {item.dosage && ` - ${item.dosage}`}
                            </span>
                          ))}
                        </div>
                      </div>

                      {prescription.patient_notes && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Note:</span> {prescription.patient_notes}
                        </p>
                      )}

                      <p className="text-xs text-gray-500">
                        Richiesta il {formatDate(prescription.created_at)}
                      </p>
                    </div>

                    <div className="text-right">
                      {prescription.status !== 'pending' && prescription.responded_at && (
                        <p className="text-xs text-gray-500">
                          Risposta il {formatDate(prescription.responded_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Request Modal */}
        {showNewRequestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Nuova Richiesta per Ricetta</h2>

              <form onSubmit={handleSubmitRequest} className="space-y-6">
                {/* Doctor Info (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medico
                  </label>
                  <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-700">
                    Dr. {doctorInfo?.name || 'Medico non disponibile'}
                  </div>
                  <input
                    type="hidden"
                    value={formData.doctorId}
                    name="doctorId"
                  />
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Livello di Urgenza
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normale</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                {/* Medications */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Farmaci Richiesti * (massimo 10)
                    </label>
                    <button
                      type="button"
                      onClick={addMedication}
                      disabled={medications.length >= 10}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                    >
                      + Aggiungi Farmaco
                    </button>
                  </div>

                  <div className="space-y-4">
                    {medications.map((medication, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Farmaco {index + 1}</h4>
                          {medications.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedication(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Rimuovi
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Nome Farmaco *
                            </label>
                            <input
                              type="text"
                              value={medication.medication_name}
                              onChange={(e) => updateMedication(index, 'medication_name', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="es. Tachipirina"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Dosaggio
                            </label>
                            <input
                              type="text"
                              value={medication.dosage}
                              onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="es. 500mg"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Quantità
                            </label>
                            <input
                              type="text"
                              value={medication.quantity}
                              onChange={(e) => updateMedication(index, 'quantity', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="es. 20 compresse"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Motivo
                            </label>
                            <input
                              type="text"
                              value={medication.patient_reason}
                              onChange={(e) => updateMedication(index, 'patient_reason', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="es. mal di testa"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Patient Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Aggiuntive
                  </label>
                  <textarea
                    value={formData.patientNotes}
                    onChange={(e) => setFormData({ ...formData, patientNotes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrivi sintomi, condizioni mediche rilevanti o altre informazioni utili per il medico..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewRequestModal(false);
                      setFormData({ doctorId: '', urgency: 'normal', patientNotes: '' });
                      setMedications([{ medication_name: '', dosage: '', quantity: '', patient_reason: '' }]);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {submitting ? 'Invio...' : 'Invia Richiesta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Prescription Details Modal */}
        {selectedPrescription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Dettagli Richiesta per Ricetta</h2>
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="border-b pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium">
                      Dr. {doctorInfo?.name || 'Nome non disponibile'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[selectedPrescription.status as keyof typeof STATUS_LABELS]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[selectedPrescription.status as keyof typeof STATUS_LABELS]?.label || selectedPrescription.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_LABELS[selectedPrescription.urgency as keyof typeof URGENCY_LABELS]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {URGENCY_LABELS[selectedPrescription.urgency as keyof typeof URGENCY_LABELS]?.label || selectedPrescription.urgency}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Richiesta il {formatDate(selectedPrescription.created_at)}
                  </p>
                  {selectedPrescription.responded_at && (
                    <p className="text-sm text-gray-600">
                      Risposta il {formatDate(selectedPrescription.responded_at)}
                    </p>
                  )}
                </div>

                {/* Medications */}
                <div>
                  <h4 className="font-medium mb-3">Farmaci Richiesti</h4>
                  <div className="space-y-3">
                    {selectedPrescription.prescription_items.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="font-medium text-gray-900">{item.medication_name}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 text-sm text-gray-600">
                          {item.dosage && <div>Dosaggio: {item.dosage}</div>}
                          {item.quantity && <div>Quantità: {item.quantity}</div>}
                          {item.patient_reason && <div>Motivo: {item.patient_reason}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Patient Notes */}
                {selectedPrescription.patient_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Le Mie Note</h4>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                      {selectedPrescription.patient_notes}
                    </p>
                  </div>
                )}

                {/* Doctor Response */}
                {selectedPrescription.doctor_response && (
                  <div>
                    <h4 className="font-medium mb-2">Risposta del Medico</h4>
                    <p className="text-gray-700 bg-blue-50 rounded-lg p-3">
                      {selectedPrescription.doctor_response}
                    </p>
                  </div>
                )}

                {/* Doctor Notes */}
                {selectedPrescription.doctor_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Note del Medico</h4>
                    <p className="text-gray-700 bg-blue-50 rounded-lg p-3">
                      {selectedPrescription.doctor_notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}