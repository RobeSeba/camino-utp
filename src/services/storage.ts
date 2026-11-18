import { supabase } from '@/lib/supabase';

const BUCKET = 'ticket-attachments';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadTicketAttachment(ticketId: string, file: File): Promise<string> {
  const path = `${ticketId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}
