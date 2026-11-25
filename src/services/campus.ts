import { supabase } from '@/lib/supabase';
import { CAMPUS_CENTER, resolveFloor } from '@/lib/campus3d';
import type { Building, Classroom, Site } from '@/types';

interface DirectionRow {
  step_order: number;
  instruction: string;
}

interface CampusRow {
  name: string;
}

interface SiteRow {
  id: string;
  code: string;
  name: string;
  short_name: string;
  address: string | null;
  lat: number | string;
  lng: number | string;
}

interface BuildingRow {
  id: string;
  code: string;
  name: string;
  floors: number;
  site_id: string | null;
  campuses: CampusRow | CampusRow[] | null;
  sites: SiteRow | SiteRow[] | null;
}

interface ClassroomRow {
  id: string;
  code: string;
  name: string;
  floor: number;
  reference: string | null;
  capacity: number | null;
  map_x: number | string | null;
  map_y: number | string | null;
  equipment: string[] | null;
  buildings: BuildingRow | BuildingRow[] | null;
  classroom_directions?: DirectionRow[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toNum(value: number | string | null | undefined, fallback = 50): number {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * La BD guarda los pasos del interior del pabellón. Si no incluyen la sede, se
 * anaden dos pasos iniciales para que la ruta tenga sentido con la jerarquia
 * Lima Centro -> sede -> pabellon -> piso -> aula.
 */
function withSiteContext(
  directions: string[],
  siteName: string,
  siteAddress: string,
  buildingName: string,
): string[] {
  if (directions.length === 0 || !siteName) return directions;
  const firstStep = directions[0].toLowerCase();
  const siteHint = siteName.split('·')[0].trim().toLowerCase();
  if (firstStep.includes(siteHint)) return directions;

  const steps: string[] = [
    `Llega a ${siteName}${siteAddress ? ` (${siteAddress})` : ''}.`,
  ];
  if (buildingName && !firstStep.includes(buildingName.toLowerCase())) {
    steps.push(`Dentro de ${siteName}, dirígete al ${buildingName} y usa el acceso principal.`);
  }
  return [...steps, ...directions];
}

function mapSite(row: SiteRow | null, campusName: string): Site {
  return {
    id: row?.id ?? '',
    code: row?.code ?? '',
    name: row?.name ?? campusName,
    shortName: row?.short_name ?? row?.name ?? campusName,
    address: row?.address ?? '',
    lat: toNum(row?.lat, CAMPUS_CENTER.lat),
    lng: toNum(row?.lng, CAMPUS_CENTER.lng),
    campus: campusName,
  };
}

function mapClassroom(row: ClassroomRow): Classroom {
  const building = first(row.buildings);
  const siteRow = first(building?.sites ?? null);
  const campus = first(building?.campuses ?? null);
  const campusName = campus?.name ?? 'UTP Lima Centro';
  const site = mapSite(siteRow, campusName);
  const buildingName = building?.name ?? '';

  const directions = [...(row.classroom_directions ?? [])]
    .sort((a, b) => a.step_order - b.step_order)
    .map((entry) => entry.instruction);

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    buildingId: building?.id ?? '',
    buildingCode: building?.code ?? '',
    buildingName,
    floor: resolveFloor(row.code, row.floor),
    campus: campusName,
    siteId: site.id,
    siteCode: site.code,
    siteName: site.name,
    siteAddress: site.address,
    siteLat: site.lat,
    siteLng: site.lng,
    reference: row.reference ?? '',
    directions: withSiteContext(directions, site.name, site.address, buildingName),
    mapX: toNum(row.map_x),
    mapY: toNum(row.map_y),
    capacity: row.capacity ?? 0,
    equipment: row.equipment ?? [],
  };
}

const CLASSROOM_SELECT =
  'id, code, name, floor, reference, capacity, map_x, map_y, equipment, ' +
  'buildings(id, code, name, campuses(name), sites(id, code, name, short_name, address, lat, lng)), ' +
  'classroom_directions(step_order, instruction)';

export async function fetchSites(): Promise<Site[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('id, code, name, short_name, address, lat, lng, campuses(name)')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const campus = first((row as { campuses: CampusRow | CampusRow[] | null }).campuses);
    return mapSite(row as unknown as SiteRow, campus?.name ?? 'UTP Lima Centro');
  });
}

export async function fetchBuildings(): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, code, name, floors, site_id, sites(id, code)')
    .order('code');
  if (error) throw error;
  return ((data ?? []) as unknown as BuildingRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    floors: row.floors,
    siteId: row.site_id ?? first(row.sites)?.id ?? '',
    siteCode: first(row.sites)?.code ?? '',
  }));
}

export async function fetchClassrooms(): Promise<Classroom[]> {
  const { data, error } = await supabase
    .from('classrooms')
    .select(CLASSROOM_SELECT)
    .eq('is_active', true)
    .order('code');
  if (error) throw error;
  return ((data ?? []) as unknown as ClassroomRow[]).map(mapClassroom);
}

export async function fetchClassroomByIdOrCode(idOrCode: string): Promise<Classroom | null> {
  // Intento por UUID y, si no aplica, por código (la app usa ambos en rutas/búsquedas).
  const byId = await supabase
    .from('classrooms')
    .select(CLASSROOM_SELECT)
    .eq('id', idOrCode)
    .maybeSingle();
  if (!byId.error && byId.data) {
    return mapClassroom(byId.data as unknown as ClassroomRow);
  }
  // Si el valor no es UUID válido, PostgREST puede devolver error de tipo: se ignora y se busca por código.
  const byCode = await supabase
    .from('classrooms')
    .select(CLASSROOM_SELECT)
    .ilike('code', idOrCode)
    .maybeSingle();
  if (byCode.error) throw byCode.error;
  return byCode.data ? mapClassroom(byCode.data as unknown as ClassroomRow) : null;
}
