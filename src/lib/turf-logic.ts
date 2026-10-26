/**
 * Offline Geospatial Confidence Algorithm using @turf/turf.
 */

import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { BoundaryLevel, ConfidenceMatch } from "@/types/boundary";
import type { LocateError, LocateSuccess } from "@/types/location";
import { createLocateError } from "@/lib/utils/errors";

export interface OfflineBoundaryProperties {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: BoundaryLevel;
  path: string;
}

export type OfflineBoundaryFeature = Feature<
  Polygon | MultiPolygon,
  OfflineBoundaryProperties
>;

export type OfflineBoundaryCollection = FeatureCollection<
  Polygon | MultiPolygon,
  OfflineBoundaryProperties
>;

const MIN_CONFIDENCE = 5;
const MAX_ACCURACY_M = 150;
const RWANDA_BBOX: [number, number, number, number] = [28.85, -2.85, 30.9, -1.05];

function accuracyCircle(
  lng: number,
  lat: number,
  accuracyMeters: number,
  steps = 64
): Feature<Polygon> {
  const radiusKm = accuracyMeters / 1000;
  return turf.circle([lng, lat], radiusKm, {
    steps,
    units: "kilometers",
  });
}

function intersectionAreaM2(
  a: Feature<Polygon | MultiPolygon>,
  b: Feature<Polygon | MultiPolygon>
): number {
  try {
    const inter = turf.intersect(turf.featureCollection([a, b]));
    if (!inter) return 0;
    return turf.area(inter);
  } catch {
    return 0;
  }
}

export function calculateConfidenceOffline(
  latitude: number,
  longitude: number,
  accuracy: number,
  boundaries: OfflineBoundaryCollection
): LocateSuccess | LocateError {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return createLocateError("INVALID_COORDINATES");
  }

  if (accuracy > MAX_ACCURACY_M) {
    return createLocateError("GPS_ACCURACY_TOO_LOW", { accuracy });
  }

  const [minLng, minLat, maxLng, maxLat] = RWANDA_BBOX;
  if (
    longitude < minLng ||
    longitude > maxLng ||
    latitude < minLat ||
    latitude > maxLat
  ) {
    return createLocateError("OUTSIDE_RWANDA");
  }

  if (!boundaries?.features?.length) {
    return createLocateError("OFFLINE_CACHE");
  }

  const point = turf.point([longitude, latitude]);
  const circle = accuracyCircle(longitude, latitude, accuracy);
  const circleArea = turf.area(circle);

  if (circleArea <= 0) {
    return createLocateError("GPS_ACCURACY_TOO_LOW", { accuracy });
  }

  const matches: ConfidenceMatch[] = [];

  for (const feature of boundaries.features) {
    if (feature.properties.level !== "village") continue;

    const interArea = intersectionAreaM2(circle, feature);
    if (interArea <= 0) continue;

    const confidence = Math.min(100, (interArea / circleArea) * 100);

    matches.push({
      scope_code: feature.properties.scope_code,
      name_kiny: feature.properties.name_kiny,
      name_eng: feature.properties.name_eng,
      level: feature.properties.level,
      confidence: Math.round(confidence * 100) / 100,
      intersection_area_m2: interArea,
    });
  }

  if (matches.length === 0) {
    const insideAny = boundaries.features.some((f) =>
      turf.booleanPointInPolygon(point, f)
    );
    if (!insideAny) {
      return createLocateError("POINT_IN_GAP");
    }
    return createLocateError("CONFIDENCE_TOO_LOW");
  }

  matches.sort((a, b) => b.confidence - a.confidence);

  const maxConfidence = matches[0].confidence;
  if (maxConfidence < MIN_CONFIDENCE) {
    return createLocateError("CONFIDENCE_TOO_LOW", {
      max_confidence: maxConfidence,
    });
  }

  const totalConf = matches.reduce((s, m) => s + m.confidence, 0);
  if (totalConf > 100 && matches.length > 1) {
    for (const m of matches) {
      m.confidence = Math.round((m.confidence / totalConf) * 10000) / 100;
    }
  }

  const hierarchy: LocateSuccess["hierarchy"] = {};
  const top = matches[0];
  hierarchy.village = top;

  const cell = boundaries.features.find(
    (f) =>
      f.properties.level === "cell" &&
      top.scope_code.startsWith(f.properties.scope_code)
  );
  if (cell) {
    hierarchy.cell = {
      scope_code: cell.properties.scope_code,
      name_kiny: cell.properties.name_kiny,
      name_eng: cell.properties.name_eng,
      level: "cell",
      confidence: top.confidence,
      intersection_area_m2: top.intersection_area_m2,
    };
  }

  return {
    status: "success",
    matches,
    hierarchy,
    leaders: [],
    source: "offline",
  };
}
