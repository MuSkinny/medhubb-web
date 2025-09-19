import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../supabaseAdmin";

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
  identifier?: (req: NextRequest) => string;
}

export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      // Determina identificatore (IP di default, oppure user ID se autenticato)
      let identifier = req.headers.get("x-forwarded-for") || "unknown";

      if (config.identifier) {
        identifier = config.identifier(req);
      }

      const actionType = `${req.method}:${req.nextUrl.pathname}`;

      // Verifica rate limit usando la funzione database
      const { data: canProceed, error } = await supabaseAdmin
        .rpc("check_rate_limit", {
          p_identifier: identifier,
          p_action_type: actionType,
          p_max_requests: config.maxRequests,
          p_window_minutes: config.windowMinutes,
        });

      if (error) {
        console.error("Rate limit check error:", error);
        // In caso di errore, permetti la richiesta (fail open)
        return await handler(req);
      }

      if (!canProceed) {
        return NextResponse.json(
          {
            error: "Troppi tentativi. Riprova tra qualche minuto.",
            retryAfter: config.windowMinutes * 60,
          },
          {
            status: 429,
            headers: {
              "Retry-After": (config.windowMinutes * 60).toString(),
              "X-RateLimit-Limit": config.maxRequests.toString(),
              "X-RateLimit-Window": (config.windowMinutes * 60).toString(),
            }
          }
        );
      }

      return await handler(req);
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      // In caso di errore, permetti la richiesta
      return await handler(req);
    }
  };
}

// Configurazioni predefinite
export const registrationRateLimit = {
  maxRequests: 3, // Max 3 registrazioni
  windowMinutes: 60, // per ora
};

export const loginRateLimit = {
  maxRequests: 10, // Max 10 login
  windowMinutes: 15, // per 15 minuti
};

export const adminRateLimit = {
  maxRequests: 20, // Max 20 operazioni admin
  windowMinutes: 5, // per 5 minuti
};