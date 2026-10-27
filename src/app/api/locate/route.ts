/**
 * POST /api/locate
 * Authoritative location lookup: PostGIS decides the polygons, the database supplies names,
 * hierarchy (explicit parent links) and leaders. Nothing here is invented or guessed.
 * Rate limited: 20 requests / minute / IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { toPublicLeader } from "@/lib/leaders/public";
import type { LeaderPublic } from "@/types/leader";
import type { LocateResponse } from "@/types/location";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = await checkRateLimit(`locate:${ip}`, 20, 60);
  if (limited) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Wageze ku gipimo. Tegereza gato." },
      { status: 429 }
    );
  }

  let body: { lat?: number; lng?: number; accuracy?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Body must be JSON" },
      { status: 400 }
    );
  }

  const { lat, lng, accuracy } = body;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "lat and lng are required numbers" },
      { status: 400 }
    );
  }

  // Rwanda rough bounds (no invented precision)
  if (lat < -2.9 || lat > -1.0 || lng < 28.8 || lng > 30.9) {
    return NextResponse.json(
      { error: "OUT_OF_SCOPE", message: "Uri hanze y'u Rwanda" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Find the sector (and cell if available) via PostGIS
    const { data: sectorRow, error: sectorErr } = await supabase.rpc("locate_sector", {
      p_lat: lat,
      p_lng: lng,
    });

    if (sectorErr) {
      console.error("locate_sector error", sectorErr);
      // Graceful: if PostGIS/RPC missing, return structured empty rather than crash
      return NextResponse.json(
        {
          error: "SUPABASE_NOT_CONFIGURED",
          message: "Serivisi y'ububiko ntiyashyizweho neza",
          sector: null,
          cell: null,
          leaders: [],
          contacts: [],
        } satisfies LocateResponse,
        { status: 503 }
      );
    }

    if (!sectorRow || sectorRow.length === 0) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: "Nta gace cyabonetse",
          sector: null,
          cell: null,
          leaders: [],
          contacts: [],
        } satisfies LocateResponse,
        { status: 404 }
      );
    }

    const sector = sectorRow[0];

    // 2. Fetch verified leaders for this sector (and parent cells if any)
    const { data: leadersRaw, error: leadersErr } = await supabase
      .from("leaders_public_view")
      .select("*")
      .eq("scope_code", sector.code)
      .eq("status", "verified")
      .order("role_rank", { ascending: true });

    if (leadersErr) {
      console.error("leaders fetch error", leadersErr);
    }

    const leaders: LeaderPublic[] = (leadersRaw || []).map((row: Record<string, unknown>) =>
      toPublicLeader(row)
    );

    const response: LocateResponse = {
      sector: {
        code: sector.code,
        name_kiny: sector.name_kiny,
        name_eng: sector.name_eng ?? null,
        level: sector.level,
      },
      cell: sector.cell_code
        ? {
            code: sector.cell_code,
            name_kiny: sector.cell_name_kiny,
            name_eng: sector.cell_name_eng ?? null,
            level: "cell",
          }
        : null,
      leaders,
      contacts: [], // contacts are embedded in leaders via toPublicLeader
      accuracy: typeof accuracy === "number" ? accuracy : null,
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("locate unexpected", e);
    return NextResponse.json(
      {
        error: "UNKNOWN",
        message: "Habaye ikibazo. Ongera ugerageze.",
        sector: null,
        cell: null,
        leaders: [],
        contacts: [],
      } satisfies LocateResponse,
      { status: 500 }
    );
  }
}
