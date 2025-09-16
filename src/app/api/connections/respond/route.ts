import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { requestId, doctorId, response, notes } = body;

    if (!requestId || !doctorId || !response) {
      return NextResponse.json({
        error: "Request ID, Doctor ID e response sono obbligatori"
      }, { status: 400 });
    }

    if (!['accepted', 'rejected'].includes(response)) {
      return NextResponse.json({
        error: "Response deve essere 'accepted' o 'rejected'"
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

    // Verifica autenticazione (l'autorizzazione per la richiesta specifica sarà verificata dalla funzione)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    console.log('Responding to connection request:', { requestId, response });

    // Usa la funzione sicura per rispondere
    const response_status = response === 'accepted' ? 'approved' : 'rejected';
    const { data, error } = await supabase.rpc('respond_to_request_secure', {
      p_request_id: requestId,
      p_response: response_status,
      p_note: notes || null
    });

    console.log('Response function result:', { data, error });

    if (error) {
      console.error('Error responding to request:', error);
      return NextResponse.json({
        error: 'Errore nella risposta alla richiesta'
      }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({
        error: data.error
      }, { status: 400 });
    }

    // Response message
    // const message = response === 'accepted'
    //   ? "Richiesta accettata. Paziente collegato con successo."
    //   : "Richiesta rifiutata.";

    return NextResponse.json({
      success: true,
      message: data.message
    });

  } catch (error) {
    console.error("Respond request API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}