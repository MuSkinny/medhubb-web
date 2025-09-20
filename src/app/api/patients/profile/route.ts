import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');

    console.log('Patient Profile API called with:', { patientId, doctorId });

    // Verifica autorizzazione
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing authorization header');
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== doctorId) {
      console.log('Authentication failed:', { authError, userId: user?.id, doctorId });
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    if (!patientId || !doctorId) {
      console.log('Missing required parameters');
      return NextResponse.json(
        { error: 'Patient ID and Doctor ID are required' },
        { status: 400 }
      );
    }

    // Verifica che il dottore sia collegato al paziente usando la stessa vista dell'altra API
    const { data: connection, error: connectionError } = await supabase
      .from('doctor_active_patients')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('patient_id', patientId)
      .single();

    console.log('Connection query result:', { connection, connectionError });

    if (connectionError || !connection) {
      console.log('Connection not found or unauthorized');
      return NextResponse.json(
        { error: 'Connection not found or unauthorized' },
        { status: 403 }
      );
    }

    // I dati del paziente sono già nella vista doctor_active_patients
    // Usiamo quelli invece di fare una query separata
    const patientProfile = {
      id: connection.patient_id,
      first_name: connection.first_name,
      last_name: connection.last_name,
      email: connection.email,
      phone: connection.phone || null,
      date_of_birth: connection.date_of_birth || null,
      created_at: connection.linked_at
    };

    console.log('Using patient profile from connection:', patientProfile);

    // Ottieni gli appuntamenti del paziente con questo dottore
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: false });

    if (appointmentsError) {
      console.error('Appointments error:', appointmentsError);
    }

    // Ottieni le prescrizioni del paziente da questo dottore
    const { data: prescriptions, error: prescriptionsError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (prescriptionsError) {
      console.error('Prescriptions error:', prescriptionsError);
    }

    return NextResponse.json({
      success: true,
      patient: patientProfile,
      appointments: appointments || [],
      prescriptions: prescriptions || [],
      connectionDate: connection.linked_at
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}