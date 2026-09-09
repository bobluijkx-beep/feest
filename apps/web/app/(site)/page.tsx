import { redirect } from "next/navigation";
import { HOME_EVENT_SLUG } from "@/lib/site-config";

// "/" (dus ook het kale domein, lionsfeest.nl) had tot nu toe een losse, statische
// "ga naar een eventlink"-pagina — maar in de praktijk fungeert HOME_EVENT_SLUG
// (lib/site-config.ts) al overal elders als dé startpagina (contactformulier stuurt er
// bv. al naartoe). Simpelst en consistent: "/" stuurt gewoon meteen door.
export default function HomePage() {
  redirect(`/${HOME_EVENT_SLUG}`);
}
