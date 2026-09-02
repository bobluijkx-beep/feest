export interface EventThemeStyle {
  /** CSS-vars om als inline style op de themawrapper te zetten (zie theme.css). */
  style: Record<string, string>;
  isDark: boolean;
  logoUrl?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/** Leidt de per-event huisstijl (Event.theme, vrije-vorm JSON) af tot toepasbare
 * CSS-vars — gedeeld door [eventSlug]/layout.tsx en (site)/layout.tsx (de laatste past
 * 'm toe op HOME_EVENT_SLUG, zie lib/site-config.ts, zodat de niet-event-gebonden
 * pagina's — /contact, / — er precies zo uitzien als "de" homepage-event-pagina). */
export function getEventThemeStyle(theme: unknown): EventThemeStyle {
  const themeRaw = isRecord(theme) ? theme : {};
  const style: Record<string, string> = {};
  const primaryColor = str(themeRaw.primaryColor);
  const backgroundColor = str(themeRaw.backgroundColor);
  const accentColor = str(themeRaw.accentColor);
  if (primaryColor) style["--primary"] = primaryColor;
  if (backgroundColor) style["--background"] = backgroundColor;
  if (accentColor) style["--accent"] = accentColor;

  return {
    style,
    isDark: themeRaw.dark === "true",
    logoUrl: str(themeRaw.logoUrl),
  };
}
