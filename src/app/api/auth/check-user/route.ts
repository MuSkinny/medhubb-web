import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID è obbligatorio" },
        { status: 400 }
      );
    }

    // Controlla se è un dottore usando supabaseAdmin
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from("doctors")
      .select("*")
      .eq("id", userId)
      .single();

    if (doctorData && !doctorError) {
      return NextResponse.json({
        role: "doctor",
        profile: doctorData,
      });
    }

    // Controlla se è un paziente usando supabaseAdmin
    const { data: patientData, error: patientError } = await supabaseAdmin
      .from("patients")
      .select("*")
      .eq("id", userId)
      .single();

    if (patientData && !patientError) {
      return NextResponse.json({
        role: "patient",
        profile: patientData,
      });
    }

    return NextResponse.json(
      { error: "Profilo utente non trovato" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}