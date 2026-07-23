export interface RenderableTemplate {
  subject: string;
  bodyHtml: string;
}

/** Vervangt {{placeholder}}-tokens. Gedeeld door het fase-1-fallbacktemplate en het
 * (fase 2) door bestuursleden bewerkbare EmailTemplate uit de database. */
export function renderTemplate(template: RenderableTemplate, vars: Record<string, string>): RenderableTemplate {
  const replace = (input: string) =>
    input.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => vars[key] ?? match);

  return { subject: replace(template.subject), bodyHtml: replace(template.bodyHtml) };
}
