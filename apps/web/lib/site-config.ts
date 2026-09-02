/** Het event dat op dit moment als "startpagina" van de site fungeert — waar bv. het
 * contactformulier na verzenden naar terugstuurt (apps/web/app/(site)/contact/actions.ts).
 * Er is geen database-vlag voor "dit is hét hoofdevent"; dit is bewust één simpele,
 * makkelijk aan te passen constante. Bijwerken zodra een ander event de rol van
 * flaggschip-/homepagina overneemt. */
export const HOME_EVENT_SLUG = "feest";
