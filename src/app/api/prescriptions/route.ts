import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// GET /api/prescriptions - Get prescription requests (for doctor or patient)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');

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

    // Ensure user can only access their own prescriptions
    const userId = user.id;
    const isDoctor = doctorId === userId;
    const isPatient = patientId === userId;

    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    console.log('Fetching prescriptions for user:', userId, 'as:', isDoctor ? 'doctor' : 'patient');

    // Build query
    let query = supabase
      .from('prescription_requests')
      .select(`
        id,
        patient_id,
        doctor_id,
        status,
        urgency,
        patient_notes,
        doctor_response,
        doctor_notes,
        related_appointment_id,
        created_at,
        responded_at,
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
        prescription_items (
          id,
          medication_name,
          dosage,
          quantity,
          patient_reason
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

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    // Order by creation date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data: prescriptions, error } = await query;

    if (error) {
      console.error('Error fetching prescriptions:', error);
      return NextResponse.json({
        error: 'Errore nel recupero delle prescrizioni'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      prescriptions: prescriptions || [],
      count: prescriptions?.length || 0
    });

  } catch (error) {
    console.error("Prescriptions API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// POST /api/prescriptions - Create new prescription request (patient only)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      doctorId,
      medications,
      urgency = 'normal',
      patientNotes
    } = body;

    // Validate required fields
    if (!doctorId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json({
        error: "Doctor ID e lista farmaci sono obbligatori"
      }, { status: 400 });
    }

    // Validate medications array
    if (medications.length > 10) {
      return NextResponse.json({
        error: "Massimo 10 farmaci per richiesta"
      }, { status: 400 });
    }

    // Validate each medication
    for (const med of medications) {
      if (!med.medication_name || med.medication_name.trim() === '') {
        return NextResponse.json({
          error: "Nome farmaco è obbligatorio per tutti i farmaci"
        }, { status: 400 });
      }
    }

    // Validate urgency
    const validUrgencyLevels = ['normal', 'urgent'];
    if (!validUrgencyLevels.includes(urgency)) {
      return NextResponse.json({
        error: "Livello di urgenza non valido"
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

    console.log('Creating prescription request from patient:', user.id, 'to doctor:', doctorId);

    // Format medications for JSONB
    const medicationsJsonb = medications.map(med => ({
      medication_name: med.medication_name.trim(),
      dosage: med.dosage?.trim() || null,
      quantity: med.quantity?.trim() || null,
      patient_reason: med.patient_reason?.trim() || null
    }));

    // Use secure function to create prescription request
    const { data, error } = await supabase.rpc('create_prescription_request', {
      p_doctor_id: doctorId,
      p_medications: medicationsJsonb,
      p_urgency: urgency,
      p_patient_notes: patientNotes?.trim() || null
    });

    if (error) {
      console.error('Error creating prescription request:', error);
      return NextResponse.json({
        error: 'Errore nella creazione della richiesta di prescrizione'
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
      request_id: data.request_id
    });

  } catch (error) {
    console.error("Create prescription API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// PUT /api/prescriptions - Respond to prescription request (doctor only)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      requestId,
      response, // 'approved', 'rejected', 'requires_appointment'
      doctorResponse,
      doctorNotes
    } = body;

    // Validate required fields
    if (!requestId || !response || !doctorResponse) {
      return NextResponse.json({
        error: "Request ID, risposta e messaggio del dottore sono obbligatori"
      }, { status: 400 });
    }

    // Validate response type
    const validResponses = ['approved', 'rejected', 'requires_appointment'];
    if (!validResponses.includes(response)) {
      return NextResponse.json({
        error: "Tipo di risposta non valido"
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

    console.log('Doctor', user.id, 'responding to prescription', requestId, 'with:', response);

    // Use secure function to respond to prescription
    const { data, error } = await supabase.rpc('respond_to_prescription', {
      p_request_id: requestId,
      p_response: response,
      p_doctor_response: doctorResponse.trim(),
      p_doctor_notes: doctorNotes?.trim() || null,
      p_create_appointment: false // Not implemented in this phase
    });

    if (error) {
      console.error('Error responding to prescription:', error);
      return NextResponse.json({
        error: 'Errore nella risposta alla prescrizione'
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
      response_type: data.response_type
    });

  } catch (error) {
    console.error("Respond prescription API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}