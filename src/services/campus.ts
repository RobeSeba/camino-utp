import { supabase } from '@/lib/supabase';
import type { Building, Classroom } from '@/types';

interface DirectionRow {
  step_order: number;
  instruction: string;
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
  buildings:
    | { id: string; name: string; campuses: { name: string } | { name: string }[] | null }
    | { id: string; name: string; campuses: { name: string } | { name: string }[] | null }[]
    | null;
  classroom_directions?: DirectionRow[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toNum(value: number | string | null | undefined, fallback = 50): number {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : fallback;
}

function mapClassroom(row: ClassroomRow): Classroom {
  const building = first(row.buildings);
  const campus = first(building?.campuses ?? null);
  const directions = [...(row.classroom_directions ?? [])]
    .sort((a, b) => a.step_order - b.step_order)
    .map((d) => d.instruction);

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    buildingId: building?.id ?? '',
    buildingName: building?.name ?? '',
    floor: row.floor,
    campus: campus?.name ?? '',
    reference: row.reference ?? '',
    directions,
    mapX: toNum(row.map_x),
    mapY: toNum(row.map_y),
    capacity: row.capacity ?? 0,
    equipment: row.equipment ?? [],
  };
}

const CLASSROOM_SELECT =
  'id, code, name, floor, reference, capacity, map_x, map_y, equipment, buildings(id, name, campuses(name)), classroom_directions(step_order, instruction)';

export async function fetchBuildings(): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, code, name, floors')
    .order('code');
  if (error) throw error;
  return (data ?? []) as Building[];
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
