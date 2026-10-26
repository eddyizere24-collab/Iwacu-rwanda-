"use client";

import { LocationButton } from "@/components/LocationButton";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { LeaderCard } from "@/components/LeaderCard";
import { useLocation } from "@/hooks/useLocation";
import { MapPin } from "lucide-react";

export default function HomePage() {
  const {
    status,
    data,
    errorCode,
    errorMessageKiny,
    errorMessageEng,
    isOffline,
    locate,
    reset,
  } = useLocation();

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
            <MapPin className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            IWACU RWANDA
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Menya aho uri n&apos;abayobozi bawe mu Rwanda ukoresheje GPS.
            Nta konti isabwa. Nta amateka y&apos;aho wagiye.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {status !== "success" && status !== "error" && (
            <LocationButton status={status} onClick={locate} />
          )}

          {status === "error" && errorCode && errorMessageKiny && (
            <ErrorDisplay
              code={errorCode}
              messageKiny={errorMessageKiny}
              messageEng={errorMessageEng}
              onRetry={() => {
                reset();
                void locate();
              }}
            />
          )}

          {status === "success" && data && (
            <div className="w-full space-y-4">
              {isOffline && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-200">
                  Uri offline — dukoresha amakuru yabitswe (Gasabo).
                </p>
              )}

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Aho uri
                </h2>
                <ul className="space-y-2 text-sm">
                  {data.hierarchy.village && (
                    <li>
                      <span className="text-muted-foreground">Umudugudu: </span>
                      <strong>{data.hierarchy.village.name_kiny}</strong>
                      <span className="ml-2 text-xs text-green-600">
                        {data.hierarchy.village.confidence.toFixed(0)}%
                      </span>
                    </li>
                  )}
                  {data.hierarchy.cell && (
                    <li>
                      <span className="text-muted-foreground">Akagari: </span>
                      <strong>{data.hierarchy.cell.name_kiny}</strong>
                    </li>
                  )}
                  {data.hierarchy.sector && (
                    <li>
                      <span className="text-muted-foreground">Umurenge: </span>
                      <strong>{data.hierarchy.sector.name_kiny}</strong>
                    </li>
                  )}
                  {data.hierarchy.district && (
                    <li>
                      <span className="text-muted-foreground">Akarere: </span>
                      <strong>{data.hierarchy.district.name_kiny}</strong>
                    </li>
                  )}
                </ul>
              </div>

              {data.leaders.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Abayobozi
                  </h2>
                  {data.leaders.map((leader) => (
                    <LeaderCard key={leader.id} leader={leader} />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
                  {data.leaders_notice?.message_kiny ??
                    "Nta muyobozi wemejwe uhari kuri aha hantu ubu."}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  reset();
                }}
                className="mx-auto flex min-h-[44px] items-center justify-center text-sm font-medium text-blue-600 hover:underline"
              >
                Ongera ushakishe
              </button>
            </div>
          )}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          NCSA Law No. 058/2021 · Privacy first
        </p>
      </div>
    </main>
  );
}
