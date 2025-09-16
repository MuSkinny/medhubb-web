import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// GET /api/appointments - Get appointments (for doctor or patient)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const dateRange = searchParams.get('dateRange'); // 'upcoming', 'past', 'all'

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

    // Ensure user can only access their own appointments
    const userId = user.id;
    const isDoctor = doctorId === userId;
    const isPatient = patientId === userId;

    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    console.log('Fetching appointments for user:', userId, 'as:', isDoctor ? 'doctor' : 'patient');

    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        requested_office_id,
        confirmed_office_id,
        appointment_date,
        start_time,
        end_time,
        status,
        visit_type,
        patient_notes,
        doctor_notes,
        created_at,
        updated_at,
        patients (
          id,
          first_name,
          last_name,
          email
        ),
        doctors (
          id,
          first_name,
          last_name,
          email
        ),
        requested_office:doctor_offices!requested_office_id (
          id,
          name,
          address,
          city
        ),
        confirmed_office:doctor_offices!confirmed_office_id (
          id,
          name,
          address,
          city
        )
      `);

    // Filter by user role
    if (isDoctor) {
      query = query.eq('doctor_id', userId);
    } else {
      query = query.eq('patient_id', userId);
    }

    // Apply additional filters
    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      query = query.eq('appointment_date', date);
    }

    // Apply date range filter
    const today = new Date().toISOString().split('T')[0];
    if (dateRange === 'upcoming') {
      query = query.gte('appointment_date', today);
    } else if (dateRange === 'past') {
      query = query.lt('appointment_date', today);
    }

    // Order by date and time
    query = query.order('appointment_date', { ascending: true })
                 .order('start_time', { ascending: true });

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json({
        error: 'Errore nel recupero degli appuntamenti'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      appointments: appointments || [],
      count: appointments?.length || 0
    });

  } catch (error) {
    console.error("Appointments API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// POST /api/appointments - Create new appointment request (patient only)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      doctorId,
      requestedOfficeId,
      appointmentDate,
      startTime,
      endTime,
      visitType = 'follow_up',
      patientNotes
    } = body;

    // Validate required fields
    if (!doctorId || !requestedOfficeId || !appointmentDate || !startTime || !endTime) {
      return NextResponse.json({
        error: "Doctor ID, Office ID, data, orario inizio e fine sono obbligatori"
      }, { status: 400 });
    }

    // Validate visit type
    const validVisitTypes = ['first_visit', 'follow_up', 'urgent', 'routine'];
    if (!validVisitTypes.includes(visitType)) {
      return NextResponse.json({
        error: "Tipo di visita non valido"
      }, { status: 400 });
    }

    // Validate date format and future date
    const appointmentDateObj = new Date(appointmentDate);
    if (isNaN(appointmentDateObj.getTime())) {
      return NextResponse.json({
        error: "Formato data non valido"
      }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDateObj < today) {
      return NextResponse.json({
        error: "L'appuntamento deve essere nel futuro"
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

    console.log('Creating appointment request from patient:', user.id, 'to doctor:', doctorId);

    // Use secure function to request appointment
    const { data, error } = await supabase.rpc('request_appointment', {
      p_doctor_id: doctorId,
      p_requested_office_id: requestedOfficeId,
      p_appointment_date: appointmentDate,
      p_start_time: startTime,
      p_end_time: endTime,
      p_visit_type: visitType,
      p_patient_notes: patientNotes || null
    });

    if (error) {
      console.error('Error creating appointment request:', error);
      return NextResponse.json({
        error: 'Errore nella creazione della richiesta di appuntamento'
      }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({
        error: data.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      appointment_id: data.appointment_id
    });

  } catch (error) {
    console.error("Create appointment API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// PUT /api/appointments - Update appointment status (doctor only)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      appointmentId,
      confirmedOfficeId,
      action = 'confirm', // 'confirm', 'reschedule', 'reject'
      appointmentDate,
      startTime,
      endTime,
      doctorNotes
    } = body;

    // Validate required fields
    if (!appointmentId || !confirmedOfficeId || !action) {
      return NextResponse.json({
        error: "Appointment ID, Office ID e azione sono obbligatori"
      }, { status: 400 });
    }

    // Validate action
    const validActions = ['confirm', 'reschedule', 'reject'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        error: "Azione non valida"
      }, { status: 400 });
    }

    // If rescheduling, validate new date/time
    if (action === 'reschedule') {
      if (!appointmentDate || !startTime || !endTime) {
        return NextResponse.json({
          error: "Data e orari sono richiesti per riprogrammare"
        }, { status: 400 });
      }

      const appointmentDateObj = new Date(appointmentDate);
      if (isNaN(appointmentDateObj.getTime())) {
        return NextResponse.json({
          error: "Formato data non valido"
        }, { status: 400 });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDateObj < today) {
        return NextResponse.json({
          error: "L'appuntamento deve essere nel futuro"
        }, { status: 400 });
      }
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

    console.log('Doctor', user.id, 'updating appointment', appointmentId, 'action:', action);

    // Use secure function to confirm/modify appointment
    const { data, error } = await supabase.rpc('confirm_appointment', {
      p_appointment_id: appointmentId,
      p_confirmed_office_id: confirmedOfficeId,
      p_action: action,
      p_appointment_date: appointmentDate || null,
      p_start_time: startTime || null,
      p_end_time: endTime || null,
      p_doctor_notes: doctorNotes || null
    });

    if (error) {
      console.error('Error updating appointment:', error);
      return NextResponse.json({
        error: 'Errore nell\'aggiornamento dell\'appuntamento'
      }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({
        error: data.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: data.message
    });

  } catch (error) {
    console.error("Update appointment API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// PATCH /api/appointments - Cancel appointment (patient or doctor)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { appointmentId, reason } = body;

    // Validate required fields
    if (!appointmentId) {
      return NextResponse.json({
        error: "Appointment ID è obbligatorio"
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

    // Get appointment to verify ownership
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('patient_id, doctor_id, status')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({
        error: "Appuntamento non trovato"
      }, { status: 404 });
    }

    // Check if user is authorized to cancel
    const isPatient = appointment.patient_id === user.id;
    const isDoctor = appointment.doctor_id === user.id;

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    // Check if appointment can be cancelled
    const cancellableStatuses = ['requested', 'confirmed', 'rescheduled'];
    if (!cancellableStatuses.includes(appointment.status)) {
      return NextResponse.json({
        error: "Appuntamento non può essere cancellato in questo stato"
      }, { status: 400 });
    }

    console.log('Cancelling appointment', appointmentId, 'by', isDoctor ? 'doctor' : 'patient');

    // Determine cancellation status
    const newStatus = isDoctor ? 'cancelled_by_doctor' : 'cancelled_by_patient';
    const noteField = isDoctor ? 'doctor_notes' : 'patient_notes';

    // Update appointment status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: newStatus,
        [noteField]: reason || 'Appuntamento cancellato',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error cancelling appointment:', updateError);
      return NextResponse.json({
        error: 'Errore nella cancellazione dell\'appuntamento'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Appuntamento cancellato con successo'
    });

  } catch (error) {
    console.error("Cancel appointment API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}