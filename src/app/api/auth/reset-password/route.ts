import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail, getPasswordResetEmailTemplate } from "@/lib/emailService";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { email, userType } = body;

    // Validazione input
    if (!email || !userType) {
      return NextResponse.json(
        { error: "Email e tipo utente sono obbligatori" },
        { status: 400 }
      );
    }

    if (!['doctor', 'patient'].includes(userType)) {
      return NextResponse.json(
        { error: "Tipo utente non valido" },
        { status: 400 }
      );
    }

    // Controlla se l'utente esiste nella tabella appropriata
    const tableName = userType === 'doctor' ? 'doctors' : 'patients';
    const { data: user, error: userError } = await supabaseAdmin
      .from(tableName)
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Per sicurezza, non rivelare se l'email esiste o no
      return NextResponse.json({
        success: true,
        message: "Se l'email esiste nel nostro sistema, riceverai un link per reimpostare la password."
      });
    }

    // Genera il reset token usando Supabase Auth
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: {
        redirectTo: `https://medhubb.app/reset-password?type=${userType}`
      }
    });

    if (resetError) {
      console.error('Errore generazione link reset:', resetError);
      return NextResponse.json(
        { error: "Errore durante la generazione del link di reset" },
        { status: 500 }
      );
    }

    // Invia email di reset
    try {
      const userName = `${user.first_name} ${user.last_name}`;
      await sendEmail({
        to: user.email,
        subject: "🔐 Reset Password - MedHubb",
        html: getPasswordResetEmailTemplate(
          userName,
          resetData.properties?.action_link || '',
          userType as 'doctor' | 'patient'
        )
      });

      console.log(`Email di reset password inviata a ${user.email}`);
    } catch (emailError) {
      console.error('Errore invio email reset:', emailError);
      return NextResponse.json(
        { error: "Errore durante l'invio dell'email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email di reset password inviata con successo. Controlla la tua casella di posta."
    });

  } catch (error) {
    console.error('Errore API reset password:', error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}