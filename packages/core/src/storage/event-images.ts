import "server-only";
import { createAdminSupabaseClient } from "../auth/supabase-admin";

const BUCKET = "event-images";

/** Uploadt een hero-illustratie/foto voor een event naar de publiek-leesbare Supabase
 * Storage-bucket "event-images" (zelfde patroon als
 * packages/core/src/storage/product-images.ts, los bucket omdat het een ander soort
 * beeld is — sfeerbeeld voor de hele hero, geen productfoto). */
export async function uploadEventHeroImage(eventId: string, file: File): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${eventId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(`Uploaden van hero-afbeelding mislukt: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
