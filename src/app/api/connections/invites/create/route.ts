import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctorId, patientEmail, message } = body;

    if (!doctorId) {
      return NextResponse.json({
        error: "Doctor ID richiesto"
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Usa la funzione database per creare l'invito
    const { data, error } = await supabase.rpc('create_doctor_invite', {
      p_doctor_id: doctorId,
      p_patient_email: patientEmail || null,
      p_message: message || null
    });

    if (error) {
      console.error("Error creating invite:", error);
      return NextResponse.json({
        error: "Errore nella creazione dell'invito"
      }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({
        error: data.error
      }, { status: 400 });
    }

    // Genera il link di invito
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${data.invite_token}`;

    return NextResponse.json({
      success: true,
      inviteToken: data.invite_token,
      inviteLink: inviteLink,
      message: "Invito creato con successo"
    });

  } catch (error) {
    console.error("Create invite API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}