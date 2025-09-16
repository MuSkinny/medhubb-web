import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const adminPassword = process.env.ADMIN_MASTER_PASSWORD;
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token mancante" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (token !== adminPassword) {
      return NextResponse.json({ error: "Token non valido" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID del dottore è obbligatorio" }, { status: 400 });
    }

    // Crea client Supabase direttamente con service key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Update semplice e diretto
    const { data, error } = await supabase
      .from("doctors")
      .update({ status: "rejected" })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Errore database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Medico rifiutato" });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}