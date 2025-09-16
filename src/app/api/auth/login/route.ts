import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e password sono obbligatori" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Verifica il tipo di utente (doctor o patient)
    const userId = data.user.id;

    // Controlla se è un dottore
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("*")
      .eq("id", userId)
      .single();

    if (doctorData) {
      return NextResponse.json({
        user: data.user,
        role: "doctor",
        profile: doctorData,
        requiresApproval: doctorData.status !== "approved",
        approvalStatus: doctorData.status
      });
    }

    // Controlla se è un paziente
    const { data: patientData } = await supabase
      .from("patients")
      .select("*")
      .eq("id", userId)
      .single();

    if (patientData) {
      return NextResponse.json({
        user: data.user,
        role: "patient",
        profile: patientData,
      });
    }

    return NextResponse.json(
      { error: "Profilo utente non trovato" },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}