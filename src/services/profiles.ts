import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/types';

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  student_code: string | null;
  phone: string | null;
  career: string | null;
  campus_id: string | null;
  cycle: string | null;
  role: Role;
  avatar_path: string | null;
  is_active: boolean;
  campuses: { name: string } | { name: string }[] | null;
}

function campusName(value: ProfileRow['campuses']): string {
  if (!value) return '';
  if (Array.isArray(value)) return value[0]?.name ?? '';
  return value.name ?? '';
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    studentCode: row.student_code ?? '',
    email: row.email,
    phone: row.phone ?? '',
    career: row.career ?? '',
    campus: campusName(row.campuses),
    cycle: row.cycle ?? '',
    role: row.role,
  };
}

const PROFILE_SELECT =
  'id, full_name, email, student_code, phone, career, campus_id, cycle, role, avatar_path, is_active, campuses(name)';

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data as unknown as ProfileRow) : null;
}

export async function updateMyProfile(
  userId: string,
  patch: { fullName: string; phone: string; career: string; cycle: string },
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: patch.fullName,
      phone: patch.phone || null,
      career: patch.career || null,
      cycle: patch.cycle || null,
    })
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single();
  if (error) throw error;
  return mapProfile(data as unknown as ProfileRow);
}
