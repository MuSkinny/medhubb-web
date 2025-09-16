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

    console.log('Fetching pending requests for doctor:', doctorId);

    // Usa la view ottimizzata per richieste pending
    const { data: requests, error } = await supabase
      .from('doctor_pending_requests')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('requested_at', { ascending: false });

    console.log('Pending requests query result:', { requests, error });

    if (error) {
      console.error('Error fetching pending requests:', error);
      return NextResponse.json({
        error: 'Errore nel recupero delle richieste'
      }, { status: 500 });
    }

    // Mappiamo i dati per compatibilità
    const mappedRequests = (requests || []).map(request => ({
      id: request.id,
      patient_id: request.patient_id,
      patient_first_name: request.patient_first_name,
      patient_last_name: request.patient_last_name,
      patient_email: request.patient_email,
      message: request.message,
      created_at: request.requested_at
    }));

    return NextResponse.json({
      success: true,
      requests: mappedRequests,
      count: mappedRequests.length
    });

  } catch (error) {
    console.error("Pending requests API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}