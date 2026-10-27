"use client";

import {
  AlertTriangle,
  MapPinOff,
  WifiOff,
  ShieldOff,
  SearchX,
  Clock,
  RefreshCw,
  Smartphone,
  Ban,
  Users,
  HelpCircle,
} from "lucide-react";
import type { LocationErrorCode } from "@/types/location";

const ICON_MAP: Record<LocationErrorCode | string, React.ComponentType<{ className?: string }>> = {
  PERMISSION_DENIED: ShieldOff,
  POSITION_UNAVAILABLE: MapPinOff,
  TIMEOUT: Clock,
  NETWORK_ERROR: WifiOff,
  NOT_FOUND: SearchX,
  OUT_OF_SCOPE: Ban,
  RATE_LIMITED: Clock,
  VALIDATION_ERROR: AlertTriangle,
  DUPLICATE_LEADER: Users,
  INVALID_STATE_TRANSITION: RefreshCw,
  UNKNOWN: HelpCircle,
  SUPABASE_NOT_CONFIGURED: AlertTriangle,
};

const TITLE_KINY: Record<LocationErrorCode | string, string> = {
  PERMISSION_DENIED: "Uruhushya rwa GPS ntirwahabwe",
  POSITION_UNAVAILABLE: "Ahantu ntibashoboye kuboneka",
  TIMEOUT: "Igihe cyarangiye",
  NETWORK_ERROR: "Nta murongo wa internet",
  NOT_FOUND: "Nta byabonetse",
  OUT_OF_SCOPE: "Uri hanze y'u Rwanda",
  RATE_LIMITED: "Wageze ku gipimo",
  VALIDATION_ERROR: "Amakuru atari yo",
  DUPLICATE_LEADER: "Uyu muyobozi asanzwe ahari",
  INVALID_STATE_TRANSITION: "Icyiciro nticyemewe",
  UNKNOWN: "Ikibazo kitazwi",
  SUPABASE_NOT_CONFIGURED: "Serivisi ntiyateguwe",
};

const MESSAGE_KINY: Record<LocationErrorCode | string, string> = {
  PERMISSION_DENIED: "Fungura amagenzura ya telefoni yawe uhitemo GPS / Location, hanyuma ongera ugerageze.",
  POSITION_UNAVAILABLE: "Telefone yawe ntabwo yabashije kumenya aho uri. Gerageza hanze cyangwa hafi y'idirishya.",
  TIMEOUT: "Byatwaye igihe kinini. Ongera ugerageze mu gice gito.",
  NETWORK_ERROR: "Ntabwo ushobora kugera kuri serivisi. Reba internet yawe.",
  NOT_FOUND: "Nta bayobozi cyangwa serivisi zabonetse muri ako gace.",
  OUT_OF_SCOPE: "Uyu murimo ukoreshwa gusa mu Rwanda.",
  RATE_LIMITED: "Wageze ku gipimo cy'ibyo ushobora gusaba. Tegereza gato ongera ugerageze.",
  VALIDATION_ERROR: "Amakuru wohereje ntabwo yemewe. Ongera usuzume.",
  DUPLICATE_LEADER: "Uyu muyobozi asanzwe yanditswe. Hindura amakuru cyangwa hitamo undi.",
  INVALID_STATE_TRANSITION: "Icyiciro ushaka nticyemewe ku muyobozi.",
  UNKNOWN: "Habaye ikibazo. Ongera ugerageze nyuma y'akanya.",
  SUPABASE_NOT_CONFIGURED: "Serivisi y'ububiko ntiyashyizweho. Vugisha umuyobozi w'urubuga.",
};

interface ErrorDisplayProps {
  code: LocationErrorCode | string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ code, message, onRetry, className = "" }: ErrorDisplayProps) {
  const Icon = ICON_MAP[code] ?? HelpCircle;
  const title = TITLE_KINY[code] ?? TITLE_KINY.UNKNOWN;
  const body = message || MESSAGE_KINY[code] || MESSAGE_KINY.UNKNOWN;

  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-red-100 p-2 dark:bg-red-900/40">
          <Icon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-900 dark:text-red-100">{title}</h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{body}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Ongera ugerageze
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
