import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const adminPassword = process.env.ADMIN_MASTER_PASSWORD;
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token mancante" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verifica se il token corrisponde alla password admin
    if (token !== adminPassword) {
      return NextResponse.json({ error: "Token non valido" }, { status: 401 });
    }

    // Recupera tutti i dottori con ordinamento per data di creazione
    const { data: doctors, error } = await supabaseAdmin
      .from("doctors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all doctors:", error);
      return NextResponse.json(
        { error: "Errore nel recupero dei dottori" },
        { status: 500 }
      );
    }

    // Raggruppa per status
    const grouped = {
      pending: doctors.filter(d => d.status === "pending"),
      approved: doctors.filter(d => d.status === "approved"),
      rejected: doctors.filter(d => d.status === "rejected"),
    };

    return NextResponse.json({
      success: true,
      data: doctors,
      grouped: grouped,
      stats: {
        total: doctors.length,
        pending: grouped.pending.length,
        approved: grouped.approved.length,
        rejected: grouped.rejected.length,
      }
    });
  } catch (error) {
    console.error("Error in all doctors API:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}