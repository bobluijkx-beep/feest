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
    primaryColor: string;
    backgroundColor: string;
    accentColor: string;
    logoUrl: string;
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
    primaryColor: "#1d4ed8",
    backgroundColor: "#ffffff",
    accentColor: "#f59e0b",
    logoUrl: "",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
      <label>
        Naam
        <br />
        <input type="text" name="name" defaultValue={d.name} required style={{ width: "16rem" }} />
      </label>
      <label>
        Slug (in de URL)
        <br />
        <input type="text" name="slug" defaultValue={d.slug} required style={{ width: "12rem" }} />
      </label>
      <label>
        Status
        <br />
        <select name="status" defaultValue={d.status}>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </label>
      <label style={{ width: "100%" }}>
        Omschrijving
        <br />
        <input type="text" name="description" defaultValue={d.description} style={{ width: "100%" }} />
      </label>
      <label>
        Locatie
        <br />
        <input type="text" name="venue" defaultValue={d.venue} style={{ width: "12rem" }} />
      </label>
      <label>
        Start (datum/tijd)
        <br />
        <input type="datetime-local" name="startsAt" defaultValue={d.startsAt} required />
      </label>
      <label>
        Einde (optioneel)
        <br />
        <input type="datetime-local" name="endsAt" defaultValue={d.endsAt} />
      </label>
      <fieldset style={{ width: "100%" }}>
        <legend>Huisstijl</legend>
        <label>
          Hoofdkleur <input type="color" name="primaryColor" defaultValue={d.primaryColor || "#1d4ed8"} />
        </label>{" "}
        <label>
          Achtergrondkleur <input type="color" name="backgroundColor" defaultValue={d.backgroundColor || "#ffffff"} />
        </label>{" "}
        <label>
          Accentkleur <input type="color" name="accentColor" defaultValue={d.accentColor || "#f59e0b"} />
        </label>
        <br />
        <label>
          Logo-URL{" "}
          <input type="text" name="logoUrl" defaultValue={d.logoUrl} placeholder="https://…" style={{ width: "20rem" }} />
        </label>
      </fieldset>
    </div>
  );
}
