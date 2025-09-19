import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withRateLimit, registrationRateLimit } from "@/lib/middleware/rateLimit";

async function registerDoctorHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { email, password, first_name, last_name, order_number } = body;

    // Validazione input di base
    if (!email || !password || !first_name || !last_name || !order_number) {
      return NextResponse.json(
        { error: "Tutti i campi sono obbligatori" },
        { status: 400 }
      );
    }

    // Estrai info richiesta per audit
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // 1. Prima crea l'utente auth usando supabaseAdmin (ancora necessario)
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

    // 2. Inserisci il dottore nella tabella doctors
    try {
      const { error: insertError } = await supabaseAdmin
        .from("doctors")
        .insert({
          id: authData.user.id,
          email: email,
          first_name: first_name,
          last_name: last_name,
          order_number: order_number,
          status: "pending",
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Database insert error:", insertError);

        // Rollback: elimina utente auth se inserimento fallisce
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        } catch (deleteError) {
          console.error("Rollback error:", deleteError);
        }

        // Gestisci errori specifici
        if (insertError.code === '23505') { // Unique constraint violation
          return NextResponse.json(
            { error: "Email o numero d'ordine già registrati" },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: "Errore durante la registrazione nel database" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message: "Registrazione completata. In attesa di approvazione.",
          user_id: authData.user.id,
          success: true,
        },
        { status: 201 }
      );

    } catch (insertError) {
      console.error("Database insert error:", insertError);

      // Rollback: elimina utente auth
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error("Rollback error:", deleteError);
      }

      return NextResponse.json(
        { error: "Errore durante l'inserimento nel database" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

// Esporta l'handler con rate limiting
export const POST = withRateLimit(registrationRateLimit, registerDoctorHandler);