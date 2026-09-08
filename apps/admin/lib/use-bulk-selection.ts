"use client";

import { useMemo, useState } from "react";

/** Gedeelde selectie-state voor een tabel met selectievakjes per rij + "alles
 * selecteren/deselecteren" (orders, producten, gebruikers — overal hetzelfde patroon).
 * `ids` is de huidige, server-gerenderde rijenlijst van de pagina; na een bulkactie
 * (revalidatePath) verandert die lijst en filtert `selected` zichzelf automatisch mee, dus
 * een rij die verdwenen is (verwijderd, of verplaatst naar de andere lijst) blijft nooit
 * als "geselecteerd" hangen. */
export function useBulkSelection(ids: string[]) {
  const [rawSelected, setRawSelected] = useState<Set<string>>(new Set());

  const idSet = useMemo(() => new Set(ids), [ids]);
  const selected = useMemo(() => new Set([...rawSelected].filter((id) => idSet.has(id))), [rawSelected, idSet]);

  function toggle(id: string) {
    setRawSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setRawSelected((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }

  function clear() {
    setRawSelected(new Set());
  }

  const selectedIds = useMemo(() => [...selected], [selected]);

  return {
    selected,
    selectedIds,
    toggle,
    toggleAll,
    clear,
    allSelected: ids.length > 0 && selected.size === ids.length,
    count: selected.size,
  };
}
