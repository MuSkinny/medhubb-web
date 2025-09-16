import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// GET /api/doctor-patients - Get connected patients for a doctor
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID è obbligatorio" }, { status: 400 });
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

    // Ensure user can only access their own patients
    if (user.id !== doctorId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    // Step 1: Get connected patient IDs
    const { data: connections, error: connError } = await supabase
      .from('patient_doctor_connections')
      .select('patient_id')
      .eq('doctor_id', doctorId)
      .eq('status', 'connected');


    if (connError) {
      console.error('Error fetching connections:', connError);
      return NextResponse.json({ error: 'Errore nel recupero delle connessioni' }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ success: true, patients: [], count: 0 });
    }

    // Step 2: Get patient details for each connected patient
    const patientIds = connections.map(conn => conn.patient_id);

    const { data: patientsData } = await supabase
      .from('patients')
      .select('id, first_name, last_name, email')
      .in('id', patientIds);

    // Step 3: Create final list with fallback for missing data
    const patientsList = connections.map((conn, index) => {
      const patientData = patientsData?.find(p => p.id === conn.patient_id);

      if (patientData && patientData.first_name) {
        return {
          id: conn.patient_id,
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          email: patientData.email
        };
      } else {
        // Fallback if patient not found in patients table
        return {
          id: conn.patient_id,
          first_name: `Paziente ${index + 1}`,
          last_name: `(${conn.patient_id.substring(0, 8)})`,
          email: ''
        };
      }
    });

    return NextResponse.json({
      success: true,
      patients: patientsList,
      count: patientsList.length
    });

  } catch (error) {
    console.error("Doctor-patients API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}