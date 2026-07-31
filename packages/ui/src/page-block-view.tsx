// Gedeeld door apps/admin (preview vóór publiceren) en apps/web (publieke eventpagina),
// zodat beide exact dezelfde weergave per blok-type gebruiken. Puur presentationeel, geen
// hooks/browser-API's — werkt zonder "use client" in beide Next.js-apps.

export interface PageBlockData {
  id: string;
  type: string;
  content: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Rendert één blok. Onbekend/kapot `content` wordt overgeslagen (met een console.warn),
 * niet een crashende pagina — contentfouten van bestuursleden mogen de kassa nooit
 * platleggen. */
export function PageBlockView({ type, content }: { type: string; content: unknown }) {
  if (!isRecord(content)) {
    console.warn(`PageBlock van type "${type}" heeft geen geldige content, wordt overgeslagen.`);
    return null;
  }

  switch (type) {
    case "hero": {
      const title = str(content.title);
      if (!title) return null;
      const subtitle = str(content.subtitle);
      const imageUrl = str(content.imageUrl);
      return (
        <section style={{ textAlign: "center", padding: "2rem 0" }}>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" style={{ maxWidth: "100%", marginBottom: "1rem" }} />
          )}
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </section>
      );
    }

    case "programme": {
      const title = str(content.title);
      const body = str(content.body);
      if (!title && !body) return null;
      return (
        <section style={{ padding: "1rem 0" }}>
          {title && <h2>{title}</h2>}
          {body?.split("\n").map((line, i) => <p key={i}>{line}</p>)}
        </section>
      );
    }

    case "sponsor": {
      const name = str(content.name);
      if (!name) return null;
      const logoUrl = str(content.logoUrl);
      const link = str(content.link);
      const inner = (
        <>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} style={{ maxHeight: 60 }} />
          )}
          <span>{name}</span>
        </>
      );
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", margin: "0.5rem" }}>
          {link ? <a href={link}>{inner}</a> : inner}
        </div>
      );
    }

    case "faq_item": {
      const question = str(content.question);
      const answer = str(content.answer);
      if (!question || !answer) return null;
      return (
        <div style={{ marginBottom: "1rem" }}>
          <strong>{question}</strong>
          <p>{answer}</p>
        </div>
      );
    }

    case "cta": {
      const label = str(content.label);
      const href = str(content.href);
      if (!label || !href) return null;
      return (
        <p style={{ textAlign: "center" }}>
          <a href={href}>{label}</a>
        </p>
      );
    }

    default:
      console.warn(`Onbekend PageBlock-type "${type}", wordt overgeslagen.`);
      return null;
  }
}

export function PageBlocksList({ blocks }: { blocks: PageBlockData[] }) {
  return (
    <>
      {blocks.map((block) => (
        <PageBlockView key={block.id} type={block.type} content={block.content} />
      ))}
    </>
  );
}
