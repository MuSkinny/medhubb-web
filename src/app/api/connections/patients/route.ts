import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID richiesto" }, { status: 400 });
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
    if (authError || !user || user.id !== doctorId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    console.log('Fetching active patients for doctor:', doctorId);

    // Usa la view ottimizzata per pazienti attivi
    const { data: patients, error } = await supabase
      .from('doctor_active_patients')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('linked_at', { ascending: false });

    console.log('Active patients query result:', { patients, error });

    if (error) {
      console.error('Error fetching doctor patients:', error);
      return NextResponse.json({
        error: 'Errore nel recupero dei pazienti'
      }, { status: 500 });
    }

    // Mappiamo i dati per compatibilità
    const mappedPatients = (patients || []).map(patient => ({
      link_id: patient.link_id,
      patient_id: patient.patient_id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email,
      linked_at: patient.linked_at
    }));

    return NextResponse.json({
      success: true,
      patients: mappedPatients,
      count: mappedPatients.length
    });

  } catch (error) {
    console.error("My patients API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}