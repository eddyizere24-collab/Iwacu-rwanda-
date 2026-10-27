"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ErrorDisplay } from "@/components/ErrorDisplay";

interface LeaderRow {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  role_label_kiny?: string | null;
  scope_code?: string;
  status?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      setUserEmail(user.email ?? null);

      try {
        const res = await fetch("/api/admin/leaders", { credentials: "include" });
        if (res.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError((body as { error?: string }).error || "UNKNOWN");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setLeaders(data.leaders || []);
      } catch {
        setError("NETWORK_ERROR");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [router, supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Turimo gutangiza...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <ErrorDisplay code={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">Dashboard y'abayobozi</h1>
          {userEmail && (
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Sohoka
        </button>
      </header>

      <div className="space-y-3">
        <h2 className="font-semibold">Abayobozi bawe ({leaders.length})</h2>
        {leaders.length === 0 ? (
          <p className="text-muted-foreground">
            Nta bayobozi bahari kuri konti yawe. (Form y'guhindura izagaruka nyuma y'uko types zihuye.)
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {leaders.map((l) => {
              const name =
                l.full_name ||
                [l.first_name, l.last_name].filter(Boolean).join(" ") ||
                "—";
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{name}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.role_label_kiny || l.role || "—"} · {l.scope_code || "—"} ·{" "}
                      {l.status || ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
