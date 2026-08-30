import "server-only";
import { createAdminSupabaseClient } from "../auth/supabase-admin";

const BUCKET = "email-assets";

/** Uploadt een afbeelding (logo, foto, …) die bestuursleden invoegen in een e-mail-
 * lay-out of -inhoud via de editor, naar de publiek-leesbare Supabase Storage-bucket
 * "email-assets" — zelfde patroon als product-images.ts/event-images.ts, los bucket omdat
 * dit vrije invoegsels zijn (geen 1-op-1 relatie met één product/event). Bestandsnaam
 * bevat een random suffix i.p.v. een entity-id (upsert is hier niet relevant — elke
 * upload is een nieuwe, losse afbeelding). */
export async function uploadEmailAsset(file: File): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const random = crypto.randomUUID();
  const path = `${random}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Uploaden van afbeelding mislukt: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
