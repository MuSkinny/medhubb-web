import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../supabaseAdmin";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "doctor" | "patient" | "admin";
  profile: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    status?: string;
    role?: string;
    [key: string]: unknown;
  } | null;
}

export interface AuthContext {
  user: AuthenticatedUser;
  ip: string;
  userAgent: string;
}

// Verifica se il token è una sessione admin valida
function isValidAdminSession(token: string): boolean {
  try {
    // Per sessioni admin, il token è nel formato base64
    const decoded = atob(token);
    if (decoded.startsWith('admin:')) {
      // Verifica che sia relativamente recente (2 ore)
      const parts = decoded.split(':');
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[1]);
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        return timestamp > twoHoursAgo;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const authHeader = req.headers.get("authorization");

      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Token di autenticazione mancante" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      // Controlla se è una sessione admin
      if (isValidAdminSession(token)) {
        const context: AuthContext = {
          user: {
            id: "admin",
            email: "admin@system",
            role: "admin",
            profile: { role: "admin" },
          },
          ip: req.headers.get("x-forwarded-for") || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
        };

        return await handler(req, context);
      }

      // Altrimenti verifica token normale con Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return NextResponse.json(
          { error: "Token non valido" },
          { status: 401 }
        );
      }

      // Determina ruolo utente
      let role: "doctor" | "patient" | "admin" = "patient";
      let profile: {
        id?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        status?: string;
        role?: string;
        [key: string]: unknown;
      } | null = null;

      // Controlla se è un dottore
      const { data: doctorData } = await supabaseAdmin
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (doctorData) {
        role = "doctor";
        profile = doctorData;
      } else {
        // Controlla se è un paziente
        const { data: patientData } = await supabaseAdmin
          .from("patients")
          .select("*")
          .eq("id", user.id)
          .single();

        if (patientData) {
          role = "patient";
          profile = patientData;
        }
      }

      const context: AuthContext = {
        user: {
          id: user.id,
          email: user.email || "",
          role,
          profile,
        },
        ip: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      };

      return await handler(req, context);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Errore di autenticazione" },
        { status: 500 }
      );
    }
  };
}

export function withAdminAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return withAuth(async (req, context) => {
    if (context.user.role !== "admin") {
      return NextResponse.json(
        { error: "Accesso negato: privilegi amministratore richiesti" },
        { status: 403 }
      );
    }

    return await handler(req, context);
  });
}

export function withDoctorAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return withAuth(async (req, context) => {
    if (context.user.role !== "doctor") {
      return NextResponse.json(
        { error: "Accesso negato: solo per dottori" },
        { status: 403 }
      );
    }

    if (context.user.profile?.status !== "approved") {
      return NextResponse.json(
        { error: "Account in attesa di approvazione" },
        { status: 403 }
      );
    }

    return await handler(req, context);
  });
}