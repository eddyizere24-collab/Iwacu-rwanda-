/**
 * Admin leaders API.
 *   GET   /api/admin/leaders          list leaders the authenticated user may edit
 *   POST  /api/admin/leaders          create (status = pending)
 *   PATCH /api/admin/leaders          edit fields OR workflow action (verify|reject|archive)
 *
 * Stage1 rule: a user may only edit leaders they own / are assigned to.
 * No invented data. Optimistic lock via version.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAdminLeader, validateLeaderUpdate, toPublicFromAdmin } from "@/lib/admin/leaders";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

async function requireUser(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase, status: 401 as const };
  return { user, supabase, status: 200 as const };
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await checkRateLimit(`admin-leaders:${ip}`, 60, 60)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const { user, supabase, status } = await requireUser(req);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status });

  const { data, error } = await supabase
    .from("leaders")
    .select("id, full_name, role, role_label_kiny, role_label_eng, scope_code, status, phone_raw_masked, contacts, updated_at, version")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("admin leaders list", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }

  const leaders = (data || []).map((row) => toAdminLeader(row as Record<string, unknown>));
  return NextResponse.json({ leaders });
}

export async function POST(req: NextRequest) {
  const { user, supabase, status } = await requireUser(req);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const validation = validateLeaderUpdate({
    full_name: body.full_name,
    contacts: body.contacts,
  });
  if (!validation.ok || !validation.cleaned?.full_name) {
    return NextResponse.json({ error: validation.error || "VALIDATION_ERROR" }, { status: 400 });
  }

  const scope_code = String(body.scope_code || "").trim();
  const role = String(body.role || "").trim();
  if (!scope_code || !role) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leaders")
    .insert({
      full_name: validation.cleaned.full_name,
      role,
      scope_code,
      status: "pending",
      owner_id: user.id,
      contacts: validation.cleaned.contacts || [],
      version: 1,
    })
    .select()
    .single();

  if (error) {
    console.error("admin leaders create", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "DUPLICATE_LEADER" }, { status: 409 });
    }
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }

  return NextResponse.json({ leader: toAdminLeader(data as Record<string, unknown>) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { user, supabase, status } = await requireUser(req);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });

  // Workflow actions
  if (body.action) {
    const action = String(body.action);
    const allowed: Record<string, string> = {
      verify: "verified",
      reject: "rejected",
      archive: "archived",
    };
    const newStatus = allowed[action];
    if (!newStatus) {
      return NextResponse.json({ error: "INVALID_STATE_TRANSITION" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("leaders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ leader: toAdminLeader(data as Record<string, unknown>) });
  }

  // Field edit with optimistic lock
  const validation = validateLeaderUpdate({
    full_name: body.full_name,
    contacts: body.contacts,
    note: body.note,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error || "VALIDATION_ERROR" }, { status: 400 });
  }

  const expectedVersion = typeof body.version === "number" ? body.version : null;
  let query = supabase
    .from("leaders")
    .update({
      ...validation.cleaned,
      updated_at: new Date().toISOString(),
      version: expectedVersion != null ? expectedVersion + 1 : undefined,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (expectedVersion != null) {
    query = query.eq("version", expectedVersion);
  }

  const { data, error } = await query.select().single();

  if (error || !data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ leader: toAdminLeader(data as Record<string, unknown>) });
}
