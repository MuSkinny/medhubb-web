import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withRateLimit, registrationRateLimit } from "@/lib/middleware/rateLimit";

async function registerPatientHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { email, password, first_name, last_name, doctor_id } = body;

    // Validazione input di base
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: "Email, password, nome e cognome sono obbligatori" },
        { status: 400 }
      );
    }

    // Estrai info richiesta per audit
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // 1. Prima crea l'utente auth usando supabaseAdmin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData?.user) {
      return NextResponse.json(
        { error: "Errore nella creazione dell'utente auth" },
        { status: 500 }
      );
    }

    // 2. Usa la funzione database sicura per inserire il paziente
    const { data: result, error: dbError } = await (supabaseAdmin.rpc as any)(
      "register_patient",
      {
        p_user_id: authData.user.id,
        p_email: email,
        p_first_name: first_name,
        p_last_name: last_name,
        p_doctor_id: doctor_id || null,
        p_ip_address: ip,
        p_user_agent: userAgent,
      }
    );

    if (dbError) {
      console.error("Database function error:", dbError);

      // Rollback: elimina utente auth se funzione fallisce
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error("Rollback error:", deleteError);
      }

      return NextResponse.json(
        { error: "Errore durante la registrazione" },
        { status: 500 }
      );
    }

    // 3. Controlla risultato della funzione
    if (!result?.success) {
      // Rollback: elimina utente auth
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error("Rollback error:", deleteError);
      }

      return NextResponse.json(
        { error: result?.error || "Errore sconosciuto" },
        { status: 400 }
      );
    }

    // L'ID è già sincronizzato tramite la funzione

    return NextResponse.json(
      {
        message: result.message,
        user_id: authData.user.id,
        success: true,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

// Esporta l'handler con rate limiting
export const POST = withRateLimit(registrationRateLimit, registerPatientHandler);