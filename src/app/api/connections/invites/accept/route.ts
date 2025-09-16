import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inviteToken, patientId } = body;

    if (!inviteToken || !patientId) {
      return NextResponse.json({
        error: "Token di invito e Patient ID richiesti"
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verifica che l'invito sia valido e non scaduto
    const { data: invite, error: inviteError } = await supabase
      .from('doctor_invites')
      .select('*, doctors:doctor_id(first_name, last_name, specialization)')
      .eq('invite_token', inviteToken)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({
        error: "Invito non valido o scaduto"
      }, { status: 400 });
    }

    // Verifica che il paziente non sia già collegato a questo medico
    const { data: existingLink } = await supabase
      .from('patient_doctor_links')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', invite.doctor_id)
      .eq('status', 'active')
      .single();

    if (existingLink) {
      return NextResponse.json({
        error: "Sei già collegato a questo medico"
      }, { status: 400 });
    }

    // Controlla se il paziente ha già un medico attivo
    const { data: activeConnection } = await supabase
      .from('patient_doctor_links')
      .select('id')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .single();

    if (activeConnection) {
      return NextResponse.json({
        error: "Hai già un medico collegato. Un paziente può essere collegato a un solo medico alla volta."
      }, { status: 400 });
    }

    // Crea il collegamento diretto
    const { data: newLink, error: linkError } = await supabase
      .from('patient_doctor_links')
      .insert([{
        patient_id: patientId,
        doctor_id: invite.doctor_id,
        status: 'active',
        linked_at: new Date().toISOString(),
        initiated_by: 'doctor',
        notes: 'Collegamento tramite invito diretto del medico'
      }])
      .select()
      .single();

    if (linkError) {
      console.error("Error creating link:", linkError);
      return NextResponse.json({
        error: "Errore nella creazione del collegamento"
      }, { status: 500 });
    }

    // Marca l'invito come utilizzato
    const { error: updateError } = await supabase
      .from('doctor_invites')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        patient_id: patientId
      })
      .eq('invite_token', inviteToken);

    if (updateError) {
      console.error("Error updating invite:", updateError);
    }

    return NextResponse.json({
      success: true,
      linkId: newLink.id,
      doctor: invite.doctors,
      message: "Collegamento creato con successo!"
    });

  } catch (error) {
    console.error("Accept invite API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const inviteToken = searchParams.get('token');

    if (!inviteToken) {
      return NextResponse.json({
        error: "Token di invito richiesto"
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Recupera i dettagli dell'invito
    const { data: invite, error } = await supabase
      .from('doctor_invites')
      .select('*, doctors:doctor_id(first_name, last_name, specialization, bio)')
      .eq('invite_token', inviteToken)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !invite) {
      return NextResponse.json({
        error: "Invito non valido o scaduto"
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      invite: {
        token: invite.invite_token,
        doctor: invite.doctors,
        message: invite.message,
        patientEmail: invite.patient_email,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at
      }
    });

  } catch (error) {
    console.error("Get invite API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}