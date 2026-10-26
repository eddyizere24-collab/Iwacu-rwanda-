export type EmergencyKind = "police" | "fire" | "ambulance" | "other";

export interface EmergencyPublic {
  id: string;
  name_kiny: string;
  name_eng: string | null;
  phone: string;
  kind: EmergencyKind;
}
