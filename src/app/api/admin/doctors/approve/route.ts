import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getApprovalEmailTemplate } from '@/lib/emailService';

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

    // Prima recuperiamo i dati del medico
    const { data: doctor, error: fetchError } = await supabase
      .from("doctors")
      .select("id, email, first_name, last_name")
      .eq("id", id)
      .single();

    if (fetchError || !doctor) {
      console.error("Errore recupero medico:", fetchError);
      return NextResponse.json({ error: "Medico non trovato" }, { status: 404 });
    }

    // Update dello status
    const { error: updateError } = await supabase
      .from("doctors")
      .update({ status: "approved" })
      .eq("id", id);

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json({ error: "Errore database" }, { status: 500 });
    }

    // Inviamo l'email di conferma
    try {
      await sendEmail({
        to: doctor.email,
        subject: "🎉 La tua richiesta su MedHub è stata approvata!",
        html: getApprovalEmailTemplate(`${doctor.first_name} ${doctor.last_name}`)
      });
      console.log(`Email di approvazione inviata a ${doctor.email}`);
    } catch (emailError) {
      console.error("Errore invio email:", emailError);
      // Non blocchiamo l'operazione se l'email fallisce
    }

    return NextResponse.json({
      success: true,
      message: "Medico approvato e email inviata",
      doctor: { id: doctor.id, email: doctor.email, name: `${doctor.first_name} ${doctor.last_name}` }
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}