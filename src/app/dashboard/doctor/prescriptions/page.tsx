"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

interface PrescriptionRequest {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  urgency: string;
  patient_notes?: string;
  doctor_response?: string;
  doctor_notes?: string;
  related_appointment_id?: string;
  created_at: string;
  responded_at?: string;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  prescription_items: PrescriptionItem[];
}

interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage?: string;
  quantity?: string;
  patient_reason?: string;
}

const STATUS_LABELS = {
  'pending': { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  'approved': { label: 'Approvata', color: 'bg-green-100 text-green-800', icon: '✅' },
  'rejected': { label: 'Rifiutata', color: 'bg-red-100 text-red-800', icon: '❌' },
  'requires_appointment': { label: 'Serve Appuntamento', color: 'bg-purple-100 text-purple-800', icon: '📅' }
};

const URGENCY_LABELS = {
  'normal': { label: 'Normale', color: 'bg-gray-100 text-gray-800' },
  'urgent': { label: 'Urgente', color: 'bg-red-100 text-red-800' }
};

const RESPONSE_TEMPLATES = {
  approved: "La prescrizione è stata approvata. Puoi recarti in farmacia con la tua tessera sanitaria per ritirare i farmaci prescritti.",
  rejected: "La richiesta di prescrizione non può essere accolta per le seguenti ragioni:",
  requires_appointment: "Per valutare correttamente la tua richiesta di prescrizione, è necessario fissare un appuntamento. Contattami per concordare una visita."
};

export default function DoctorPrescriptionsPage() {
  const [doctorData, setDoctorData] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [patientNames, setPatientNames] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRequest | null>(null);
  const [processingPrescription, setProcessingPrescription] = useState<string | null>(null);
  const router = useRouter();

  const [responseForm, setResponseForm] = useState({
    response: 'approved' as 'approved' | 'rejected' | 'requires_appointment',
    doctorResponse: '',
    doctorNotes: ''
  });

  useEffect(() => {
    checkDoctorAuth();
  }, []);

  useEffect(() => {
    if (doctorData) {
      loadPrescriptions();
      loadPatientNames();
    }
  }, [doctorData, statusFilter, urgencyFilter]);

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

      setDoctorData({ ...user, profile: userData.profile });
    } catch (error) {
      console.error("Errore autenticazione dottore:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadPatientNames = async () => {
    if (!doctorData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch connected patients
      const response = await fetch(`/api/doctor-patients?doctorId=${doctorData.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const namesMap: {[key: string]: string} = {};

        if (data.patients) {
          data.patients.forEach((patient: any) => {
            namesMap[patient.id] = `${patient.first_name} ${patient.last_name}`;
          });
        }

        setPatientNames(namesMap);
      } else {
        console.error('Failed to load patient names:', response.status);
      }
    } catch (error) {
      console.error("Errore caricamento nomi pazienti:", error);
    }
  };

  const loadPrescriptions = async () => {
    if (!doctorData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      let url = `/api/prescriptions?doctorId=${doctorData.id}`;

      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      if (urgencyFilter !== 'all') {
        url += `&urgency=${urgencyFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.prescriptions || []);
      } else {
        console.error('Failed to load prescriptions:', response.status);
      }
    } catch (error) {
      console.error("Errore caricamento prescrizioni:", error);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrescription || !doctorData) return;

    setProcessingPrescription(selectedPrescription.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessione scaduta, effettua di nuovo il login');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/prescriptions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requestId: selectedPrescription.id,
          response: responseForm.response,
          doctorResponse: responseForm.doctorResponse,
          doctorNotes: responseForm.doctorNotes
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message);
        setShowResponseModal(false);
        setSelectedPrescription(null);
        resetResponseForm();
        await loadPrescriptions();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore risposta prescrizione:", error);
      alert("Errore nell'elaborazione della risposta");
    } finally {
      setProcessingPrescription(null);
    }
  };

  const openResponseModal = (prescription: PrescriptionRequest) => {
    setSelectedPrescription(prescription);
    setResponseForm({
      response: 'approved',
      doctorResponse: RESPONSE_TEMPLATES.approved,
      doctorNotes: ''
    });
    setShowResponseModal(true);
  };

  const resetResponseForm = () => {
    setResponseForm({
      response: 'approved',
      doctorResponse: '',
      doctorNotes: ''
    });
  };

  const handleResponseTypeChange = (responseType: 'approved' | 'rejected' | 'requires_appointment') => {
    setResponseForm({
      ...responseForm,
      response: responseType,
      doctorResponse: RESPONSE_TEMPLATES[responseType]
    });
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

  const getStats = () => {
    const total = prescriptions.length;
    const pending = prescriptions.filter(p => p.status === 'pending').length;
    const approved = prescriptions.filter(p => p.status === 'approved').length;
    const urgent = prescriptions.filter(p => p.urgency === 'urgent' && p.status === 'pending').length;

    return { total, pending, approved, urgent };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Caricamento prescrizioni...</p>
        </div>
      </div>
    );
  }

  if (!doctorData) {
    return null;
  }

  const userName = `${doctorData.profile?.first_name || ''} ${doctorData.profile?.last_name || ''}`.trim();
  const stats = getStats();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        userType="doctor"
        userName={userName}
        userEmail={doctorData.email}
      />

      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Prescrizioni</h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Richieste per Ricette</h1>
                <p className="text-gray-600">Gestisci le richieste per ricette dai tuoi pazienti</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
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
                  <h2 className="text-2xl font-bold text-gray-900">{stats.approved}</h2>
                  <p className="text-gray-600">Approvate</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{stats.urgent}</h2>
                  <p className="text-gray-600">Urgenti</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
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
                  <option value="pending">In Attesa</option>
                  <option value="approved">Approvate</option>
                  <option value="rejected">Rifiutate</option>
                  <option value="requires_appointment">Servono Appuntamenti</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgenza
                </label>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tutte le urgenze</option>
                  <option value="normal">Normali</option>
                  <option value="urgent">Urgenti</option>
                </select>
              </div>

              <div className="flex-1">
                <div className="text-sm text-gray-600">
                  Mostrando {prescriptions.length} prescrizion{prescriptions.length === 1 ? 'e' : 'i'}
                </div>
              </div>
            </div>
          </div>

          {/* Prescriptions List */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Prescrizioni ({prescriptions.length})
              </h3>
            </div>

            {prescriptions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna prescrizione trovata</h3>
                <p className="text-gray-600">Non ci sono prescrizioni per i filtri selezionati.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {patientNames[prescription.patient_id] || 'Caricamento...'}
                            </h4>
                            <p className="text-sm text-gray-600">ID: {prescription.patient_id.substring(0, 8)}...</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[prescription.status as keyof typeof STATUS_LABELS]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {STATUS_LABELS[prescription.status as keyof typeof STATUS_LABELS]?.icon} {STATUS_LABELS[prescription.status as keyof typeof STATUS_LABELS]?.label || prescription.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_LABELS[prescription.urgency as keyof typeof URGENCY_LABELS]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {URGENCY_LABELS[prescription.urgency as keyof typeof URGENCY_LABELS]?.label || prescription.urgency}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(prescription.created_at)}
                          </span>
                        </div>

                        {/* Medications List */}
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 mb-2">
                            Farmaci Richiesti ({prescription.prescription_items.length}):
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {prescription.prescription_items.map((item) => (
                              <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                                <div className="font-medium text-gray-900">{item.medication_name}</div>
                                {item.dosage && (
                                  <div className="text-sm text-gray-600">Dosaggio: {item.dosage}</div>
                                )}
                                {item.quantity && (
                                  <div className="text-sm text-gray-600">Quantità: {item.quantity}</div>
                                )}
                                {item.patient_reason && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Motivo:</span> {item.patient_reason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {prescription.patient_notes && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                              <span className="font-medium">Note paziente:</span> {prescription.patient_notes}
                            </p>
                          </div>
                        )}

                        {prescription.doctor_response && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                              <span className="font-medium">Risposta medico:</span> {prescription.doctor_response}
                            </p>
                          </div>
                        )}

                        {prescription.doctor_notes && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                              <span className="font-medium">Note private:</span> {prescription.doctor_notes}
                            </p>
                          </div>
                        )}

                        {prescription.responded_at && (
                          <div className="text-xs text-gray-500">
                            Risposta inviata il {formatDate(prescription.responded_at)}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2 ml-6">
                        {prescription.status === 'pending' && (
                          <button
                            onClick={() => openResponseModal(prescription)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                            </svg>
                            Rispondi
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

      {/* Response Modal */}
      {showResponseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Rispondi alla Richiesta di Prescrizione
                </h3>
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedPrescription(null);
                    resetResponseForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Patient and Request Info */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Informazioni Richiesta</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-700">
                      <span className="font-medium">Paziente:</span> {patientNames[selectedPrescription.patient_id] || 'Caricamento...'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">ID Paziente:</span> {selectedPrescription.patient_id.substring(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700">
                      <span className="font-medium">Urgenza:</span> {URGENCY_LABELS[selectedPrescription.urgency as keyof typeof URGENCY_LABELS]?.label}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Data richiesta:</span> {formatDate(selectedPrescription.created_at)}
                    </p>
                  </div>
                </div>

                {selectedPrescription.patient_notes && (
                  <div className="mb-4">
                    <p className="text-gray-700">
                      <span className="font-medium">Note paziente:</span> {selectedPrescription.patient_notes}
                    </p>
                  </div>
                )}

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Farmaci Richiesti:</h5>
                  <div className="space-y-2">
                    {selectedPrescription.prescription_items.map((item) => (
                      <div key={item.id} className="bg-white p-3 rounded border">
                        <div className="font-medium">{item.medication_name}</div>
                        {item.dosage && <div className="text-sm text-gray-600">Dosaggio: {item.dosage}</div>}
                        {item.quantity && <div className="text-sm text-gray-600">Quantità: {item.quantity}</div>}
                        {item.patient_reason && <div className="text-sm text-gray-600">Motivo: {item.patient_reason}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitResponse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo di Risposta
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleResponseTypeChange('approved')}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        responseForm.response === 'approved'
                          ? 'border-green-500 bg-green-50 text-green-900'
                          : 'border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <div className="font-medium">✅ Approva</div>
                      <div className="text-sm text-gray-600">Autorizza la prescrizione</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResponseTypeChange('rejected')}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        responseForm.response === 'rejected'
                          ? 'border-red-500 bg-red-50 text-red-900'
                          : 'border-gray-300 hover:border-red-300'
                      }`}
                    >
                      <div className="font-medium">❌ Rifiuta</div>
                      <div className="text-sm text-gray-600">Non autorizzare</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResponseTypeChange('requires_appointment')}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        responseForm.response === 'requires_appointment'
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-medium">📅 Serve Visita</div>
                      <div className="text-sm text-gray-600">Richiedi appuntamento</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Messaggio per il Paziente *
                  </label>
                  <textarea
                    value={responseForm.doctorResponse}
                    onChange={(e) => setResponseForm({ ...responseForm, doctorResponse: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    required
                    placeholder="Scrivi il messaggio che il paziente riceverà..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Private (non visibili al paziente)
                  </label>
                  <textarea
                    value={responseForm.doctorNotes}
                    onChange={(e) => setResponseForm({ ...responseForm, doctorNotes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Note personali per il tuo archivio..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResponseModal(false);
                      setSelectedPrescription(null);
                      resetResponseForm();
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={processingPrescription === selectedPrescription.id}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {processingPrescription === selectedPrescription.id ? "Invio..." : "Invia Risposta"}
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