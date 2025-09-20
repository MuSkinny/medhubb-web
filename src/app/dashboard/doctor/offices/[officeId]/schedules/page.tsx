'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Plus, Edit, Trash2, Save } from 'lucide-react';

interface Office {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface OfficeSchedule {
  id: string;
  office_id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
  day_name?: string;
}

const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export default function OfficeSchedulesPage() {
  const [office, setOffice] = useState<Office | null>(null);
  const [schedules, setSchedules] = useState<OfficeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<OfficeSchedule | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration: 30
  });

  const router = useRouter();
  const params = useParams();
  const officeId = params.officeId as string;

  useEffect(() => {
    if (officeId) {
      fetchOfficeAndSchedules();
    }
  }, [officeId]);

  const fetchOfficeAndSchedules = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/offices/schedules?officeId=${officeId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setOffice(result.office);
        setSchedules(result.schedules || []);
      } else {
        console.error('Errore nel recupero orari');
      }
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = editingSchedule
        ? '/api/offices/schedules'
        : '/api/offices/schedules';

      const method = editingSchedule ? 'PUT' : 'POST';
      const payload = editingSchedule
        ? {
            schedule_id: editingSchedule.id,
            office_id: officeId,
            ...formData
          }
        : {
            office_id: officeId,
            ...formData
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setEditingSchedule(null);
        resetForm();
        await fetchOfficeAndSchedules();
      } else {
        const error = await response.json();
        alert(error.error || 'Errore nella gestione orario');
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (schedule: OfficeSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      slot_duration: schedule.slot_duration
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo orario?')) return;

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/offices/schedules?scheduleId=${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await fetchOfficeAndSchedules();
      } else {
        const error = await response.json();
        alert(error.error || 'Errore nella rimozione orario');
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nella rimozione');
    }
  };

  const resetForm = () => {
    setFormData({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      slot_duration: 30
    });
  };

  const openCreateDialog = () => {
    setEditingSchedule(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getAvailableDays = () => {
    const usedDays = schedules.filter(s => s.is_active).map(s => s.day_of_week);
    return dayNames.map((name, index) => ({
      value: index,
      label: name,
      disabled: usedDays.includes(index) && !editingSchedule
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Caricamento orari...</div>
      </div>
    );
  }

  if (!office) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Ambulatorio non trovato</h2>
          <Button onClick={() => router.push('/dashboard/doctor/offices')}>
            Torna agli Ambulatori
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/doctor/offices')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Orari di Ricevimento</h1>
          <p className="text-gray-600 mt-1">
            {office.name} - {office.address}, {office.city}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Orario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? 'Modifica Orario' : 'Nuovo Orario'}
              </DialogTitle>
              <DialogDescription>
                {editingSchedule
                  ? 'Modifica gli orari di ricevimento per questo giorno'
                  : 'Imposta gli orari di ricevimento per un nuovo giorno'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="day_of_week">Giorno della Settimana</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(value) => setFormData({...formData, day_of_week: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona giorno" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDays().map((day) => (
                      <SelectItem
                        key={day.value}
                        value={day.value.toString()}
                        disabled={day.disabled}
                      >
                        {day.label} {day.disabled && '(Già configurato)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Orario Inizio</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">Orario Fine</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="slot_duration">Durata Slot (minuti)</Label>
                <Select
                  value={formData.slot_duration.toString()}
                  onValueChange={(value) => setFormData({...formData, slot_duration: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minuti</SelectItem>
                    <SelectItem value="20">20 minuti</SelectItem>
                    <SelectItem value="30">30 minuti</SelectItem>
                    <SelectItem value="45">45 minuti</SelectItem>
                    <SelectItem value="60">60 minuti</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? 'Salvando...' : editingSchedule ? 'Aggiorna' : 'Salva Orario'}
                  <Save className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun orario configurato</h3>
            <p className="text-gray-600 mb-4">
              Configura gli orari di ricevimento per questo ambulatorio
            </p>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Configura Primo Orario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Orari Settimanali
              </CardTitle>
              <CardDescription>
                Orari di ricevimento configurati per questo ambulatorio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dayNames.map((dayName, dayIndex) => {
                  const daySchedule = schedules.find(s => s.day_of_week === dayIndex && s.is_active);

                  return (
                    <div key={dayIndex} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 font-medium text-gray-900">
                          {dayName}
                        </div>

                        {daySchedule ? (
                          <div className="flex items-center space-x-2">
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {daySchedule.start_time} - {daySchedule.end_time}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              (slot {daySchedule.slot_duration}min)
                            </span>
                          </div>
                        ) : (
                          <Badge variant="secondary">
                            Chiuso
                          </Badge>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {daySchedule ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(daySchedule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(daySchedule.id)}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({...formData, day_of_week: dayIndex});
                              openCreateDialog();
                            }}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Aggiungi
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riepilogo Settimana</CardTitle>
              <CardDescription>
                Panoramica della disponibilità settimanale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {schedules.filter(s => s.is_active).length}
                  </div>
                  <div className="text-sm text-gray-600">Giorni Attivi</div>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(schedules.reduce((acc, s) => {
                      if (!s.is_active) return acc;
                      const start = new Date(`2000-01-01T${s.start_time}`);
                      const end = new Date(`2000-01-01T${s.end_time}`);
                      return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    }, 0) / schedules.filter(s => s.is_active).length || 0)}h
                  </div>
                  <div className="text-sm text-gray-600">Ore Medie/Giorno</div>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {schedules.reduce((acc, s) => {
                      if (!s.is_active) return acc;
                      const start = new Date(`2000-01-01T${s.start_time}`);
                      const end = new Date(`2000-01-01T${s.end_time}`);
                      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      return acc + Math.floor((hours * 60) / s.slot_duration);
                    }, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Slot/Settimana</div>
                </div>

                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(schedules.reduce((acc, s) => acc + s.slot_duration, 0) / schedules.length || 0)}min
                  </div>
                  <div className="text-sm text-gray-600">Durata Media Slot</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}