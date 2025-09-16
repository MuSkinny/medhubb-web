import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// GET /api/offices/availability - Check doctor/office availability
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');
    const officeId = searchParams.get('officeId');
    const date = searchParams.get('date');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    // Validate required parameters
    if (!doctorId || !officeId || !date || !startTime || !endTime) {
      return NextResponse.json({
        error: "Doctor ID, Office ID, date, startTime e endTime sono obbligatori"
      }, { status: 400 });
    }

    // Validate date format
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return NextResponse.json({
        error: "Formato data non valido"
      }, { status: 400 });
    }

    // Ensure appointment is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return NextResponse.json({
        error: "La data deve essere nel futuro"
      }, { status: 400 });
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Token di autorizzazione richiesto" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    console.log('Checking availability for doctor:', doctorId, 'office:', officeId, 'date:', date);

    // Use secure function to check availability
    const { data, error } = await supabase.rpc('check_doctor_availability', {
      p_doctor_id: doctorId,
      p_office_id: officeId,
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime
    });

    if (error) {
      console.error('Error checking availability:', error);
      return NextResponse.json({
        error: 'Errore nel controllo della disponibilità'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      availability: data
    });

  } catch (error) {
    console.error("Availability check API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// POST /api/offices/availability - Get available slots for a date/office
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctorId, officeId, date, visitType = 'follow_up' } = body;

    // Validate required fields
    if (!doctorId || !officeId || !date) {
      return NextResponse.json({
        error: "Doctor ID, Office ID e date sono obbligatori"
      }, { status: 400 });
    }

    // Validate date format and ensure it's in the future
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return NextResponse.json({
        error: "Formato data non valido"
      }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return NextResponse.json({
        error: "La data deve essere nel futuro"
      }, { status: 400 });
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Token di autorizzazione richiesto" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    console.log('Getting available slots for doctor:', doctorId, 'office:', officeId, 'date:', date);

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = appointmentDate.getDay();

    // Get office schedule for the day
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_office_schedules')
      .select('start_time, end_time, slot_duration')
      .eq('doctor_id', doctorId)
      .eq('office_id', officeId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json({
        success: true,
        availableSlots: [],
        message: "Nessun orario disponibile per questo giorno"
      });
    }

    // Get existing appointments for the date
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['requested', 'confirmed', 'rescheduled']);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json({
        error: 'Errore nel recupero degli appuntamenti esistenti'
      }, { status: 500 });
    }

    // Check for doctor unavailability
    const startDateTime = `${date} ${schedule.start_time}`;
    const endDateTime = `${date} ${schedule.end_time}`;

    const { data: unavailability, error: unavailabilityError } = await supabase
      .from('doctor_unavailability')
      .select('start_datetime, end_datetime')
      .eq('doctor_id', doctorId)
      .or(`office_id.eq.${officeId},office_id.is.null`)
      .lte('start_datetime', endDateTime)
      .gte('end_datetime', startDateTime);

    if (unavailabilityError) {
      console.error('Error checking unavailability:', unavailabilityError);
    }

    // Calculate available slots
    const availableSlots = calculateAvailableSlots(
      schedule,
      appointments || [],
      unavailability || [],
      visitType,
      date
    );

    return NextResponse.json({
      success: true,
      availableSlots,
      officeSchedule: schedule,
      totalSlots: availableSlots.length
    });

  } catch (error) {
    console.error("Available slots API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// Helper function to calculate available time slots
function calculateAvailableSlots(
  schedule: any,
  existingAppointments: any[],
  unavailablePeriods: any[],
  visitType: string,
  date: string
) {
  const slots = [];
  const slotDuration = schedule.slot_duration;

  // Determine appointment duration based on visit type
  const visitDurations = {
    'first_visit': 60, // First visits are longer
    'follow_up': 30,
    'urgent': 20,
    'routine': 30
  };
  const appointmentDuration = visitDurations[visitType as keyof typeof visitDurations] || 30;

  // Convert time strings to minutes since midnight for easier calculation
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const startMinutes = timeToMinutes(schedule.start_time);
  const endMinutes = timeToMinutes(schedule.end_time);

  // Generate all possible slots
  for (let current = startMinutes; current + appointmentDuration <= endMinutes; current += slotDuration) {
    const slotStart = minutesToTime(current);
    const slotEnd = minutesToTime(current + appointmentDuration);

    // Check if slot conflicts with existing appointments
    const hasConflict = existingAppointments.some(apt => {
      const aptStart = timeToMinutes(apt.start_time);
      const aptEnd = timeToMinutes(apt.end_time);
      const slotStartMin = timeToMinutes(slotStart);
      const slotEndMin = timeToMinutes(slotEnd);

      return (
        (slotStartMin >= aptStart && slotStartMin < aptEnd) ||
        (slotEndMin > aptStart && slotEndMin <= aptEnd) ||
        (slotStartMin <= aptStart && slotEndMin >= aptEnd)
      );
    });

    // Check if slot conflicts with unavailable periods
    const hasUnavailability = unavailablePeriods.some(period => {
      const periodStart = new Date(period.start_datetime);
      const periodEnd = new Date(period.end_datetime);
      const slotDateTime = new Date(`${date} ${slotStart}`);
      const slotEndDateTime = new Date(`${date} ${slotEnd}`);

      return (
        (slotDateTime >= periodStart && slotDateTime < periodEnd) ||
        (slotEndDateTime > periodStart && slotEndDateTime <= periodEnd) ||
        (slotDateTime <= periodStart && slotEndDateTime >= periodEnd)
      );
    });

    // If current time is today, ensure slot is in the future
    const isToday = date === new Date().toISOString().split('T')[0];
    let isInFuture = true;

    if (isToday) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      isInFuture = current > currentMinutes + 60; // At least 1 hour from now
    }

    if (!hasConflict && !hasUnavailability && isInFuture) {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        duration: appointmentDuration,
        available: true
      });
    }
  }

  return slots;
}