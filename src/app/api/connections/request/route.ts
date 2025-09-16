import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, doctorId, message } = body;

    console.log("Request data:", { patientId, doctorId, message });

    if (!patientId || !doctorId) {
      return NextResponse.json({
        error: "Patient ID e Doctor ID sono obbligatori"
      }, { status: 400 });
    }

    // Usa autenticazione sicura
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

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== patientId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    console.log('Creating connection request:', { patientId, doctorId });

    // Usa la funzione sicura del database
    const { data, error } = await supabase.rpc('create_patient_request_secure', {
      p_patient_id: patientId,
      p_doctor_id: doctorId,
      p_message: message || null
    });

    console.log('Function result:', { data, error });

    if (error) {
      console.error('Error creating request:', error);
      return NextResponse.json({
        error: 'Errore nella creazione della richiesta',
        debug: error
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
    console.error("Request doctor API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}