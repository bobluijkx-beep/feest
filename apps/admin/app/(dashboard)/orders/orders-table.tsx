"use client";

import { Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@lions/ui";
import { useBulkSelection } from "@/lib/use-bulk-selection";
import { BulkActionsBar } from "@/lib/bulk-actions-bar";
import { bulkSetOrdersVisible, bulkDeleteOrders } from "./actions";
import { OrderDetailDialog } from "./order-detail-dialog";
import { CheckInSummary } from "./checkin-summary";
import { RefundButton } from "./refund-button";
import { ReactivateOrderButton } from "./reactivate-order-button";
import { DeleteOrderButton } from "./delete-order-button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
  REFUNDED: "outline",
};

export interface OrderRow {
  id: string;
  buyerName: string;
  buyerEmail: string;
  status: string;
  totalCents: number;
  createdAt: Date;
  event: { name: string };
  items: { quantity: number }[];
  tickets: { checkIns: { scannedAt: Date }[] }[];
}

/** Gedeeld door /orders (mode="active") en /orders/inactief (mode="inactive") — zelfde
 * kolommen, alleen de rij-acties en de bulkacties in de werkbalk verschillen. Zie
 * use-bulk-selection.ts/bulk-actions-bar.tsx voor het selectievakjes-patroon, dat
 * hetzelfde is voor producten/gebruikers. */
export function OrdersTable({
  orders,
  mode,
  canDelete,
}: {
  orders: OrderRow[];
  mode: "active" | "inactive";
  canDelete: boolean;
}) {
  const { selected, toggle, toggleAll, allSelected, count, selectedIds, clear } = useBulkSelection(
    orders.map((o) => o.id),
  );

  const actions =
    mode === "active"
      ? [
          {
            label: `Op inactief zetten (${count})`,
            pendingLabel: "Bezig…",
            variant: "destructive" as const,
            confirm:
              "Geselecteerde bestellingen op inactief zetten? Ze verdwijnen dan uit dit overzicht (verplaatst naar de afdeling Inactief). Status, tickets en voorraad blijven ongewijzigd; er wordt geen e-mail naar de kopers gestuurd.",
            onRun: async () => {
              const result = await bulkSetOrdersVisible(selectedIds, false);
              if (!result.error) clear();
              return result;
            },
          },
        ]
      : [
          {
            label: `Weer actief maken (${count})`,
            pendingLabel: "Bezig…",
            onRun: async () => {
              const result = await bulkSetOrdersVisible(selectedIds, true);
              if (!result.error) clear();
              return result;
            },
          },
          ...(canDelete
            ? [
                {
                  label: `Verwijderen (${count})`,
                  pendingLabel: "Bezig…",
                  variant: "destructive" as const,
                  confirm:
                    "Geselecteerde bestellingen definitief verwijderen (incl. bijbehorende tickets)? Dit kan niet ongedaan worden gemaakt.",
                  onRun: async () => {
                    const result = await bulkDeleteOrders(selectedIds);
                    if (!result.error) clear();
                    return result;
                  },
                },
              ]
            : []),
        ];

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar count={count} allSelected={allSelected} onToggleAll={toggleAll} actions={actions} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Koper</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Tickets</TableHead>
            <TableHead>Ingecheckt</TableHead>
            <TableHead className="text-right">Totaal</TableHead>
            <TableHead>Besteld op</TableHead>
            <TableHead>Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(order.id)}
                  onChange={() => toggle(order.id)}
                  className="size-4 rounded border-input"
                  aria-label={`Selecteer bestelling van ${order.buyerName}`}
                />
              </TableCell>
              <TableCell>
                <div>{order.buyerName}</div>
                <div className="text-xs text-muted-foreground">{order.buyerEmail}</div>
              </TableCell>
              <TableCell>{order.event.name}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{order.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {order.tickets.length || order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </TableCell>
              <TableCell>
                <CheckInSummary tickets={order.tickets} />
              </TableCell>
              <TableCell className="text-right">€{(order.totalCents / 100).toFixed(2)}</TableCell>
              <TableCell>{order.createdAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <OrderDetailDialog orderId={order.id} />
                  {mode === "active" && order.status === "PAID" && <RefundButton orderId={order.id} />}
                  {mode === "inactive" && <ReactivateOrderButton orderId={order.id} />}
                  {mode === "inactive" && canDelete && <DeleteOrderButton orderId={order.id} />}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                {mode === "active" ? "Nog geen bestellingen." : "Geen inactieve bestellingen."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
