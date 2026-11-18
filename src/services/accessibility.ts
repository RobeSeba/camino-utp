import { supabase } from '@/lib/supabase';
import type { AccessibilityPreferences } from '@/types';

export async function fetchAccessibilityPreferences(
  userId: string,
): Promise<AccessibilityPreferences | null> {
  const { data, error } = await supabase
    .from('accessibility_preferences')
    .select('font_scale, theme, high_contrast, reduce_motion')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    fontScale: Number(data.font_scale ?? 1),
    theme: (data.theme as AccessibilityPreferences['theme']) ?? 'system',
    highContrast: Boolean(data.high_contrast),
    reduceMotion: Boolean(data.reduce_motion),
  };
}

export async function saveAccessibilityPreferences(
  userId: string,
  prefs: AccessibilityPreferences,
): Promise<void> {
  const { error } = await supabase.from('accessibility_preferences').upsert(
    {
      user_id: userId,
      font_scale: prefs.fontScale,
      theme: prefs.theme,
      high_contrast: prefs.highContrast,
      reduce_motion: prefs.reduceMotion,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

export async function deleteAccessibilityPreferences(userId: string): Promise<void> {
  const { error } = await supabase
    .from('accessibility_preferences')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}
