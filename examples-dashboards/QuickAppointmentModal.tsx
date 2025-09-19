'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, User, Calendar, MapPin } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { MedicalOffice, OfficeSchedule } from '@/types';

interface QuickAppointmentModalProps {
  selectedDate: Date;
  selectedTime?: string; // Format: "HH:MM"
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function QuickAppointmentModal({ 
  selectedDate, 
  selectedTime, 
  trigger,
  onSuccess 
}: QuickAppointmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('none');
  const [appointmentTime, setAppointmentTime] = useState(selectedTime || '');
  const [notes, setNotes] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Reset appointment time when office changes
  const handleOfficeChange = (officeId: string) => {
    setSelectedOffice(officeId);
    setAppointmentTime(''); // Reset time when office changes
  };
  const queryClient = useQueryClient();

  // Get patients list
  const { data: patients = [] } = useQuery({
    queryKey: ['patient-doctors', 'medico'],
    queryFn: () => api.getPatientDoctorRelationships('medico'),
  });

  // Get current user for offices query
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.getCurrentUser(),
  });

  // Get offices list with schedules
  const { data: officesData, isLoading: officesLoading, error: officesError } = useQuery({
    queryKey: ['medical-offices-with-schedules', currentUser?.id],
    queryFn: () => {
      console.log('Loading offices with schedules for user:', currentUser?.id);
      return currentUser?.id ? api.getMedicalOfficesWithSchedules(currentUser.id) : Promise.resolve({ offices: [], schedules: {} });
    },
    enabled: !!currentUser?.id,
  });

  const offices = officesData?.offices || [];
  const officeSchedules = officesData?.schedules || {};

  // Debug logs
  console.log('Current user:', currentUser);
  console.log('Offices data:', officesData);
  console.log('Offices:', offices);
  console.log('Office schedules:', officeSchedules);
  console.log('Offices loading:', officesLoading);
  console.log('Offices error:', officesError);

  const createAppointmentMutation = useMutation({
    mutationFn: async ({ patientId, officeId, dataOra, note }: { patientId: string; officeId?: string; dataOra: string; note?: string }) => {
      console.log('Creating appointment with:', { patientId, officeId, dataOra, note });
      
      try {
        console.log('Calling createAppointmentByDoctor directly...');
        const result = await api.createAppointmentByDoctor(patientId, dataOra, note, officeId);
        console.log('API result:', result);
        return result;
      } catch (error) {
        console.error('Error in mutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Appointment created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsOpen(false);
      resetForm();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Failed to create appointment:', error);
    },
  });

  const resetForm = () => {
    setSelectedPatient('');
    setSelectedOffice('none');
    setAppointmentTime(''); // Reset to empty when resetting form
    setNotes('');
    setPatientSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient || !appointmentTime) {
      return;
    }

    // Combine date and time
    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    createAppointmentMutation.mutate({
      patientId: selectedPatient,
      officeId: selectedOffice && selectedOffice !== 'none' ? selectedOffice : undefined,
      dataOra: appointmentDateTime.toISOString(),
      note: notes.trim() || undefined
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get available time slots for selected office and date
  const getAvailableTimeSlots = () => {
    if (selectedOffice === 'none' || !selectedOffice) {
      // Default time slots if no office selected
      return Array.from({ length: 49 }, (_, i) => {
        const hours = Math.floor(i / 4) + 8; // Start from 8:00
        const minutes = (i % 4) * 15; // 0, 15, 30, 45
        if (hours > 20) return null; // End at 20:00
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        return { value: timeString, label: timeString };
      }).filter((slot): slot is { value: string; label: string } => slot !== null);
    }

    // Get schedule for selected office on the selected day
    const dayOfWeek = selectedDate.getDay(); // 0=Sunday, 1=Monday, etc.
    const schedules = officeSchedules[selectedOffice] || [];
    const daySchedule = schedules.find(s => s.giorno_settimana === dayOfWeek && s.attivo);

    if (!daySchedule) {
      return []; // No schedule for this day
    }

    // Generate time slots based on office schedule
    const startTime = daySchedule.ora_inizio; // "09:00"
    const endTime = daySchedule.ora_fine; // "17:00" 
    const slotDuration = daySchedule.durata_slot; // 30 minutes

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const slots = [];
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push({ value: timeString, label: timeString });
    }

    return slots;
  };

  const availableTimeSlots = getAvailableTimeSlots();

  // Filter patients based on search
  const approvedPatients = patients.filter(p => p.stato === 'approved');
  
  const filteredPatients = approvedPatients.filter(relation => {
    if (!patientSearch.trim()) return true;
    
    const patient = relation.patient;
    if (!patient) return false;
    
    const searchTerm = patientSearch.toLowerCase().trim();
    const fullName = `${patient.nome} ${patient.cognome}`.toLowerCase();
    const reverseName = `${patient.cognome} ${patient.nome}`.toLowerCase();
    
    return fullName.includes(searchTerm) || 
           reverseName.includes(searchTerm) ||
           patient.nome.toLowerCase().includes(searchTerm) ||
           patient.cognome.toLowerCase().includes(searchTerm) ||
           patient.email?.toLowerCase().includes(searchTerm);
  });

  const defaultTrigger = (
    <Button
      size="sm"
      className="medical-btn-primary"
      title="Aggiungi nuovo appuntamento"
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuovo Appuntamento
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Nuovo Appuntamento</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date and Time Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {formatDate(selectedDate)}
              </span>
            </div>
            {selectedTime && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Orario preselezionato: {selectedTime}
                </span>
              </div>
            )}
          </div>

          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Paziente *
            </label>
            
            {/* Search Input */}
            <div className="mb-2">
              <Input
                type="text"
                placeholder="Cerca per nome, cognome o email..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="text-sm"
              />
            </div>

            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un paziente" />
              </SelectTrigger>
              <SelectContent>
                {filteredPatients.length === 0 ? (
                  <SelectItem value="" disabled>
                    {patientSearch.trim() ? 'Nessun paziente trovato' : 'Nessun paziente approvato'}
                  </SelectItem>
                ) : (
                  filteredPatients.map((relation) => (
                    <SelectItem key={relation.id} value={relation.patient?.id || ''}>
                      <div className="flex flex-col">
                        <span>{relation.patient?.nome} {relation.patient?.cognome}</span>
                        <span className="text-xs text-gray-500">{relation.patient?.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {patientSearch.trim() && (
              <div className="mt-1 text-xs text-gray-500">
                {filteredPatients.length} paziente{filteredPatients.length !== 1 ? 'i' : ''} trovato{filteredPatients.length !== 1 ? 'i' : ''}
              </div>
            )}
          </div>

          {/* Office Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Ambulatorio (opzionale)
            </label>
            <Select value={selectedOffice} onValueChange={handleOfficeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un ambulatorio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun ambulatorio specifico</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    <div className="flex flex-col">
                      <span>{office.nome}</span>
                      <span className="text-xs text-gray-500">{office.indirizzo}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Orario *
            </label>
            <Select value={appointmentTime} onValueChange={setAppointmentTime}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un orario" />
              </SelectTrigger>
              <SelectContent>
                {availableTimeSlots.length === 0 ? (
                  <SelectItem value="" disabled>
                    {selectedOffice && selectedOffice !== 'none' 
                      ? `Ambulatorio chiuso ${formatDate(selectedDate).split(',')[0].toLowerCase()}`
                      : 'Nessun orario disponibile'
                    }
                  </SelectItem>
                ) : (
                  availableTimeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedOffice && selectedOffice !== 'none' && officeSchedules[selectedOffice] && (
              <div className="mt-2 text-xs text-gray-500">
                Orari ambulatorio: {(() => {
                  const dayOfWeek = selectedDate.getDay();
                  const schedules = officeSchedules[selectedOffice] || [];
                  const daySchedule = schedules.find(s => s.giorno_settimana === dayOfWeek && s.attivo);
                  if (daySchedule) {
                    return `${daySchedule.ora_inizio} - ${daySchedule.ora_fine} (slot da ${daySchedule.durata_slot} min)`;
                  }
                  return 'Chiuso';
                })()}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (opzionale)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo della visita, note particolari..."
              className="min-h-[80px]"
              maxLength={500}
            />
            {notes.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/500 caratteri
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={!selectedPatient || !appointmentTime || createAppointmentMutation.isPending}
              className="flex-1 medical-btn-success"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Appuntamento
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              className="flex-1"
            >
              Annulla
            </Button>
          </div>

          {/* Error handling */}
          {createAppointmentMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                Errore nella creazione dell'appuntamento. Riprova.
              </p>
            </div>
          )}
        </form>

        {/* Quick Tips */}
        <div className="bg-slate-50 p-3 rounded-lg mt-4">
          <p className="text-xs text-slate-600 mb-2">
            <strong>💡 Suggerimento:</strong>
          </p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• L'appuntamento sarà automaticamente confermato</li>
            <li>• Verifica la disponibilità nell'agenda prima di creare</li>
            <li>• Puoi modificare l'appuntamento dalla sezione "Appuntamenti"</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}