import { Input, Label, Select } from "@lions/ui";

export function EventFormFields({
  defaults,
}: {
  defaults?: {
    name: string;
    slug: string;
    description: string;
    venue: string;
    startsAt: string;
    endsAt: string;
    status: string;
    isVisible: boolean;
    primaryColor: string;
    backgroundColor: string;
    accentColor: string;
    logoUrl: string;
    heroImageUrl: string;
    dark: boolean;
  };
}) {
  const d = defaults ?? {
    name: "",
    slug: "",
    description: "",
    venue: "",
    startsAt: "",
    endsAt: "",
    status: "DRAFT",
    isVisible: true,
    primaryColor: "#1d4ed8",
    backgroundColor: "#ffffff",
    accentColor: "#f59e0b",
    logoUrl: "",
    heroImageUrl: "",
    dark: false,
  };

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Naam</Label>
        <Input id="name" type="text" name="name" defaultValue={d.name} required className="w-64" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="slug">Slug (in de URL)</Label>
        <Input id="slug" type="text" name="slug" defaultValue={d.slug} required className="w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={d.status} className="w-40">
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </Select>
      </div>
      <div className="flex w-full flex-col gap-1">
        <Label htmlFor="description">Omschrijving</Label>
        <Input id="description" type="text" name="description" defaultValue={d.description} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="venue">Locatie</Label>
        <Input id="venue" type="text" name="venue" defaultValue={d.venue} className="w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="startsAt">Start (datum/tijd)</Label>
        <Input id="startsAt" type="datetime-local" name="startsAt" defaultValue={d.startsAt} required className="w-56" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="endsAt">Einde (optioneel)</Label>
        <Input id="endsAt" type="datetime-local" name="endsAt" defaultValue={d.endsAt} className="w-56" />
      </div>
      <div className="flex items-end">
        <label htmlFor="isVisible" className="flex items-center gap-2 text-sm">
          <input
            id="isVisible"
            type="checkbox"
            name="isVisible"
            value="true"
            defaultChecked={d.isVisible}
            className="h-4 w-4 rounded border-input"
          />
          Zichtbaar in admin
        </label>
      </div>
      <fieldset className="flex w-full flex-col gap-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">Huisstijl</legend>
        <label htmlFor="dark" className="flex items-center gap-2 text-sm">
          <input
            id="dark"
            type="checkbox"
            name="dark"
            value="true"
            defaultChecked={d.dark}
            className="h-4 w-4 rounded border-input"
          />
          Donker thema (donkere achtergrond, lichte tekst)
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="primaryColor">Hoofdkleur</Label>
            <input
              id="primaryColor"
              type="color"
              name="primaryColor"
              defaultValue={d.primaryColor || "#1d4ed8"}
              className="h-8 w-10 rounded-md border border-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="backgroundColor">Achtergrondkleur</Label>
            <input
              id="backgroundColor"
              type="color"
              name="backgroundColor"
              defaultValue={d.backgroundColor || "#ffffff"}
              className="h-8 w-10 rounded-md border border-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="accentColor">Accentkleur</Label>
            <input
              id="accentColor"
              type="color"
              name="accentColor"
              defaultValue={d.accentColor || "#f59e0b"}
              className="h-8 w-10 rounded-md border border-input"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="logo">Logo (optioneel)</Label>
          {d.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.logoUrl} alt="" className="mb-1 h-16 w-auto rounded-md border border-input bg-black/20 p-1" />
          )}
          <input id="logo" type="file" name="logo" accept="image/*" className="w-full max-w-md text-sm" />
          <p className="text-xs text-muted-foreground">Verschijnt gecentreerd onderaan de hero.</p>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="heroImage">Hero-afbeelding (optioneel)</Label>
          {d.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.heroImageUrl}
              alt=""
              className="mb-1 h-20 w-full max-w-md rounded-md border border-input object-cover"
            />
          )}
          <input id="heroImage" type="file" name="heroImage" accept="image/*" className="w-full max-w-md text-sm" />
          <p className="text-xs text-muted-foreground">
            Verschijnt uitdovend op de achtergrond van de hero op de landingspagina van dit event.
          </p>
        </div>
      </fieldset>
    </div>
  );
}
