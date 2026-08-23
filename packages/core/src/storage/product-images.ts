import "server-only";
import { createAdminSupabaseClient } from "../auth/supabase-admin";

const BUCKET = "product-images";

/** Uploadt een productfoto naar de publiek-leesbare Supabase Storage-bucket
 * "product-images" (alleen de service-role mag schrijven — publieke lees-policy staat op
 * `storage.objects` in het Supabase-project zelf, niet in de Prisma-migraties) en geeft de
 * publieke URL terug om in `Product.imageUrl` op te slaan. `upsert: true` zodat een nieuwe
 * upload voor hetzelfde product de vorige foto gewoon overschrijft. */
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${productId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(`Uploaden van productfoto mislukt: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
