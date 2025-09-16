import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('Fetching approved doctors...');

    console.log("Fetching doctors from doctors table...");

    // Ottieni tutti i medici approvati dalla tabella doctors
    const { data: doctors, error } = await supabase
      .from("doctors")
      .select(`
        id,
        first_name,
        last_name,
        email,
        order_number,
        status,
        created_at
      `)
      .eq("status", "approved")
      .order("last_name", { ascending: true });

    console.log("Approved doctors found:", doctors);
    console.log("Doctors query error:", error);

    if (error) {
      console.error("Error fetching approved doctors:", error);
      return NextResponse.json({ error: "Errore nel recupero medici" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      doctors: doctors || [],
      count: doctors?.length || 0
    });

  } catch (error) {
    console.error("Available doctors API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}