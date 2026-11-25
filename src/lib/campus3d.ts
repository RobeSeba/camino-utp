import type { Classroom } from '@/types';

/**
 * El primer numero del codigo indica el piso: A-201 => 2, AR-A-305 => 3.
 * Se usa como fuente principal y el campo `floor` de la BD como respaldo.
 */
export function floorFromCode(code: string, fallback = 1): number {
  const match = code.match(/\d/);
  const floor = match ? Number(match[0]) : fallback;
  return floor > 0 ? floor : fallback;
}

export function resolveFloor(code: string, storedFloor?: number | null): number {
  return floorFromCode(code, storedFloor ?? 1);
}

/* -------------------------------------------------------------------------- */
/* Sedes dentro de Lima Centro                                                */
/* -------------------------------------------------------------------------- */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CampusSite extends LatLng {
  code: string;
  name: string;
  shortName: string;
  address: string;
}

/**
 * Cuatro sedes de Lima Centro. Torre Arequipa y Sede Central/Hernán Velarde
 * estan muy cerca; por eso antes parecian un solo punto en el mapa real.
 */
export const CAMPUS_SITES: CampusSite[] = [
  {
    code: 'CENTRAL',
    name: 'Sede Central · Hernán Velarde',
    shortName: 'Hernán Velarde',
    address: 'Jr. Hernán Velarde 289 / Av. Petit Thouars 116',
    lat: -12.065358,
    lng: -77.0368152,
  },
  {
    code: 'AREAQUIPA',
    name: 'Torre Arequipa',
    shortName: 'Torre Arequipa',
    address: 'Av. Arequipa 265',
    lat: -12.0660957,
    lng: -77.0368976,
  },
  {
    code: 'PETIT',
    name: 'Torre Petit Thouars',
    shortName: 'Petit Thouars',
    address: 'Av. Petit Thouars 385',
    lat: -12.0675274,
    lng: -77.0356446,
  },
  {
    code: 'PACIFICO',
    name: 'Torre Pacífico',
    shortName: 'Pacífico',
    address: 'Av. Arequipa 660',
    lat: -12.070772,
    lng: -77.036852,
  },
];

export const DEFAULT_SITE_CODE = 'CENTRAL';
export const CAMPUS_CENTER: LatLng = {
  lat: CAMPUS_SITES[0].lat,
  lng: CAMPUS_SITES[0].lng,
};

export function getCampusSite(code?: string | null): CampusSite {
  return CAMPUS_SITES.find((site) => site.code === code) ?? CAMPUS_SITES[0];
}

/* -------------------------------------------------------------------------- */
/* Puntos del mapa (3D y real)                                                */
/* -------------------------------------------------------------------------- */

export type MapPointKind = 'site' | 'entrance' | 'patio' | 'building' | 'classroom';

export interface MapPoint extends LatLng {
  id: string;
  label: string;
  shortLabel: string;
  /** Coordenada esquematica (0-100) dentro de la sede, usada por la vista 3D. */
  x: number;
  y: number;
  floors?: number;
  kind: MapPointKind;
  siteCode: string;
  buildingCode?: string;
}

interface BuildingLayout {
  code: string;
  name: string;
  x: number;
  y: number;
  floors: number;
}

interface SiteLayout {
  entrance: { x: number; y: number };
  patio: { x: number; y: number };
  buildings: BuildingLayout[];
}

/** Diseno esquematico por sede. No son planos oficiales. */
export const SITE_LAYOUTS: Record<string, SiteLayout> = {
  CENTRAL: {
    entrance: { x: 50, y: 95 },
    patio: { x: 44, y: 50 },
    buildings: [
      { code: 'A', name: 'Pabellón A', x: 25, y: 33, floors: 4 },
      { code: 'B', name: 'Pabellón B', x: 66, y: 35, floors: 3 },
      { code: 'C', name: 'Pabellón C', x: 29, y: 73, floors: 4 },
      { code: 'D', name: 'Pabellón D', x: 72, y: 74, floors: 5 },
    ],
  },
  AREAQUIPA: {
    entrance: { x: 50, y: 93 },
    patio: { x: 48, y: 54 },
    buildings: [
      { code: 'AR-A', name: 'Pabellón AR-A', x: 28, y: 34, floors: 12 },
      { code: 'AR-B', name: 'Pabellón AR-B', x: 70, y: 39, floors: 14 },
    ],
  },
  PETIT: {
    entrance: { x: 50, y: 93 },
    patio: { x: 48, y: 52 },
    buildings: [
      { code: 'PT-A', name: 'Pabellón PT-A', x: 29, y: 32, floors: 16 },
      { code: 'PT-B', name: 'Pabellón PT-B', x: 69, y: 66, floors: 12 },
    ],
  },
  PACIFICO: {
    entrance: { x: 48, y: 93 },
    patio: { x: 50, y: 52 },
    buildings: [
      { code: 'PC-A', name: 'Pabellón PC-A', x: 29, y: 36, floors: 10 },
      { code: 'PC-B', name: 'Pabellón PC-B', x: 70, y: 64, floors: 12 },
    ],
  },
};

/** No hay planos georreferenciados: los puntos se repartenAround la sede. */
const MAP_UNIT_TO_DEGREE = 0.000012;

export function sitePointToLatLng(site: CampusSite, x: number, y: number): LatLng {
  return {
    lat: site.lat - (y - 50) * MAP_UNIT_TO_DEGREE,
    lng: site.lng + (x - 50) * MAP_UNIT_TO_DEGREE,
  };
}

export function pointToLatLng(point: Pick<MapPoint, 'lat' | 'lng' | 'x' | 'y' | 'siteCode'>): LatLng {
  if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
    return { lat: point.lat, lng: point.lng };
  }
  return sitePointToLatLng(getCampusSite(point.siteCode), point.x, point.y);
}

function siteMarker(site: CampusSite): MapPoint {
  return {
    id: `site-${site.code}`,
    label: site.name,
    shortLabel: site.shortName,
    x: 50,
    y: 50,
    kind: 'site',
    siteCode: site.code,
    lat: site.lat,
    lng: site.lng,
  };
}

export function getAllSiteMarkers(): MapPoint[] {
  return CAMPUS_SITES.map(siteMarker);
}

/**
 * Puntos de una sede: ingreso, areas comunes, pabellones y (si corresponde)
 * el aula seleccionada. La vista 3D trabaja solo con esta sede.
 */
export function getSitePoints(siteCode = DEFAULT_SITE_CODE, classroom?: Classroom | null): MapPoint[] {
  const site = getCampusSite(siteCode);
  const layout = SITE_LAYOUTS[site.code] ?? SITE_LAYOUTS.CENTRAL;
  const at = (x: number, y: number) => sitePointToLatLng(site, x, y);

  const points: MapPoint[] = [
    siteMarker(site),
    {
      id: `entrada-${site.code}`,
      label: `Acceso a ${site.shortName}`,
      shortLabel: 'Entrada',
      x: layout.entrance.x,
      y: layout.entrance.y,
      kind: 'entrance',
      siteCode: site.code,
      ...at(layout.entrance.x, layout.entrance.y),
    },
    {
      id: `patio-${site.code}`,
      label: `Área común de ${site.shortName}`,
      shortLabel: 'Patio',
      x: layout.patio.x,
      y: layout.patio.y,
      kind: 'patio',
      siteCode: site.code,
      ...at(layout.patio.x, layout.patio.y),
    },
    ...layout.buildings.map((building) => ({
      id: building.code,
      label: `${building.name} · ${site.shortName}`,
      shortLabel: building.code,
      x: building.x,
      y: building.y,
      floors: building.floors,
      kind: 'building' as const,
      siteCode: site.code,
      buildingCode: building.code,
      ...at(building.x, building.y),
    })),
  ];

  if (classroom && (classroom.siteCode || DEFAULT_SITE_CODE) === site.code) {
    const x = Math.min(92, Math.max(8, classroom.mapX));
    const y = Math.min(92, Math.max(8, classroom.mapY));
    points.push({
      id: `room-${classroom.code}`,
      label: `Aula ${classroom.code} · ${site.shortName}`,
      shortLabel: classroom.code,
      x,
      y,
      floors: resolveFloor(classroom.code, classroom.floor),
      kind: 'classroom',
      siteCode: site.code,
      buildingCode: classroom.buildingCode,
      ...at(x, y),
    });
  }

  return points;
}

/** Puntos que se dibujan en el mapa real: las 4 sedes + detalle de la activa. */
export function getRealMapPoints(siteCode = DEFAULT_SITE_CODE, classroom?: Classroom | null): MapPoint[] {
  return [
    ...getAllSiteMarkers(),
    ...getSitePoints(siteCode, classroom).filter((point) => point.kind !== 'site'),
  ];
}

/** Compatibilidad con el visor 3D cuando solo se conoce el aula. */
export function getMapPoints(siteCode?: string | null, classroom?: Classroom | null): MapPoint[] {
  const code = siteCode ?? classroom?.siteCode ?? DEFAULT_SITE_CODE;
  return getSitePoints(code, classroom);
}

/* -------------------------------------------------------------------------- */
/* Rutas                                                                      */
/* -------------------------------------------------------------------------- */

export interface RouteInfo {
  /** Distancia aproximada del recorrido, en metros. */
  meters: number;
  /** Tiempo total estimado, en segundos. */
  seconds: number;
  /** Tiempo total estimado, redondeado hacia arriba en minutos. */
  minutes: number;
  waypoints: Array<{ x: number; y: number }>;
}

const METERS_PER_UNIT = 1.6;
const WALKING_SPEED = 1.3; // m/s, ritmo de caminata comodo
const EXTRA_SECONDS = 45; // margen para cruces y giros
const SECONDS_PER_FLOOR = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Recorrido esquematico por la via principal de la sede (y = 84). */
export function buildRoute(from: MapPoint, to: MapPoint): RouteInfo {
  const start = { x: clamp(from.x, 8, 92), y: clamp(from.y, 8, 92) };
  const end = { x: clamp(to.x, 8, 92), y: clamp(to.y, 8, 92) };
  const corridorY = 84;

  const candidates = [
    start,
    { x: start.x, y: corridorY },
    { x: end.x, y: corridorY },
    end,
  ];

  const waypoints = candidates.filter((point, index) => {
    if (index === 0) return true;
    const previous = candidates[index - 1];
    return Math.hypot(point.x - previous.x, point.y - previous.y) > 0.5;
  });

  let units = 0;
  for (let index = 1; index < waypoints.length; index += 1) {
    units += Math.hypot(
      waypoints[index].x - waypoints[index - 1].x,
      waypoints[index].y - waypoints[index - 1].y,
    );
  }

  const meters = Math.round(units * METERS_PER_UNIT);
  const seconds = estimateWalkSeconds(meters, from.floors, to.floors);

  return {
    meters,
    seconds,
    minutes: Math.max(1, Math.ceil(seconds / 60)),
    waypoints,
  };
}

/** Anade margen de giros y tiempo de subida de pisos al tiempo de caminata. */
export function estimateWalkSeconds(meters: number, fromFloors?: number, toFloors?: number): number {
  const floors = (fromFloors ?? 1) - 1 + ((toFloors ?? 1) - 1);
  return Math.round(meters / WALKING_SPEED + EXTRA_SECONDS + Math.max(0, floors) * SECONDS_PER_FLOOR);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `~${minutes} min`;
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

export function routeToLatLng(route: RouteInfo, siteCode = DEFAULT_SITE_CODE): LatLng[] {
  const site = getCampusSite(siteCode);
  return route.waypoints.map(({ x, y }) => sitePointToLatLng(site, x, y));
}

export function haversineMeters(from: LatLng, to: LatLng): number {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * radius * Math.asin(Math.sqrt(a)));
}

export interface LiveRoute {
  meters: number;
  seconds: number;
  path: LatLng[];
  source: 'osrm' | 'local';
}

export function fallbackPath(from: MapPoint, to: MapPoint): LatLng[] {
  const start = pointToLatLng(from);
  const end = pointToLatLng(to);
  return [
    start,
    { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 },
    end,
  ];
}

/**
 * Ruta peatonal real con OSRM (servicio publico de OpenStreetMap, sin clave).
 * Si falla la red o el servicio, devuelve la estimacion local del mapa 3D.
 */
export async function fetchWalkingRoute(from: MapPoint, to: MapPoint): Promise<LiveRoute> {
  const fallbackRoute = buildRoute(from, to);
  const fallback: LiveRoute = {
    meters: fallbackRoute.meters,
    seconds: fallbackRoute.seconds,
    path: fallbackPath(from, to),
    source: 'local',
  };

  const start = pointToLatLng(from);
  const end = pointToLatLng(to);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 7000);

  try {
    const url =
      'https://routing.openstreetmap.de/routed-foot/route/v1/driving/' +
      `${start.lng},${start.lat};${end.lng},${end.lat}` +
      '?overview=full&geometries=geojson&steps=false';
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return fallback;
    const data = (await response.json()) as {
      routes?: Array<{
        distance: number;
        duration: number;
        geometry?: { coordinates?: number[][] };
      }>;
    };
    const route = data.routes?.[0];
    if (!route) return fallback;

    const path = (route.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }));
    const floors = (from.floors ?? 1) - 1 + ((to.floors ?? 1) - 1);
    return {
      meters: Math.round(route.distance),
      seconds: Math.round(route.duration + Math.max(0, floors) * SECONDS_PER_FLOOR),
      path: path.length > 1 ? path : fallback.path,
      source: 'osrm',
    };
  } catch {
    return fallback;
  } finally {
    window.clearTimeout(timer);
  }
}
