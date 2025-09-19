import { NextResponse } from "next/server";
import { sendEmail, getApprovalEmailTemplate, getRejectionEmailTemplate } from '@/lib/emailService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, email, doctorName, reason } = body;

    if (!email || !doctorName) {
      return NextResponse.json({
        error: "Email e nome del dottore sono obbligatori"
      }, { status: 400 });
    }

    let subject: string;
    let html: string;

    if (type === 'approval') {
      subject = "🎉 Test - La tua richiesta su MedHub è stata approvata!";
      html = getApprovalEmailTemplate(doctorName);
    } else if (type === 'rejection') {
      subject = "Test - Aggiornamento sulla tua richiesta MedHub";
      html = getRejectionEmailTemplate(doctorName, reason);
    } else {
      return NextResponse.json({
        error: "Tipo email non valido. Usa 'approval' o 'rejection'"
      }, { status: 400 });
    }

    await sendEmail({
      to: email,
      subject,
      html
    });

    return NextResponse.json({
      success: true,
      message: `Email di ${type} di test inviata a ${email}`,
      data: { type, email, doctorName, reason }
    });

  } catch (error) {
    console.error("Errore invio email di test:", error);
    return NextResponse.json({
      error: "Errore durante l'invio dell'email di test",
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}