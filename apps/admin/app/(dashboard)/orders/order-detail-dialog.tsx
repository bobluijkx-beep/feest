"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
} from "@lions/ui";
import {
  getOrderDetail,
  setOrderVisible,
  setOrderStatus,
  setTicketCheckIn,
  sendOrderEmail,
  type OrderDetail,
  type OrderActionState,
} from "./actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
  REFUNDED: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "In afwachting",
  PAID: "Betaald",
  EXPIRED: "Verlopen",
  FAILED: "Mislukt",
  CANCELLED: "Geannuleerd",
  REFUNDED: "Terugbetaald",
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  UNUSED: "Nog niet ingecheckt",
  CANCELLED: "Geannuleerd",
};

const EMAIL_TYPE_LABELS: Record<string, string> = {
  ORDER_CONFIRMATION: "Orderbevestiging (incl. tickets opnieuw)",
  PAYMENT_FAILED: "Betaling mislukt",
  CANCELLED: "Bestelling geannuleerd",
};

const initialActionState: OrderActionState = {};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" });
}

function fmtEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/** Los component (i.p.v. inline in de map()) omdat elk ticket zijn eigen useActionState
 * nodig heeft — dat mag niet binnen een .map()-callback van de ouder. */
function TicketCheckInToggle({
  ticketId,
  orderId,
  checkedIn,
  disabled,
  onChanged,
}: {
  ticketId: string;
  orderId: string;
  checkedIn: boolean;
  disabled: boolean;
  onChanged: () => void;
}) {
  const [state, formAction, pending] = useActionState(setTicketCheckIn, initialActionState);

  useEffect(() => {
    if (state.success) onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="checkedIn" value={checkedIn ? "false" : "true"} />
      <Button type="submit" variant="outline" size="sm" disabled={disabled || pending}>
        {pending ? "Bezig…" : checkedIn ? "Inchecken ongedaan maken" : "Handmatig inchecken"}
      </Button>
      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export function OrderDetailDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await getOrderDetail(orderId);
      setDetail(result);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  const [visibilityState, visibilityAction, visibilityPending] = useActionState(setOrderVisible, initialActionState);
  const [statusState, statusAction, statusPending] = useActionState(setOrderStatus, initialActionState);
  const [emailState, emailAction, emailPending] = useActionState(sendOrderEmail, initialActionState);

  // Na een geslaagde wijziging/verzending de detailweergave verversen zodat de
  // knop/badge meteen klopt — de server actions doen zelf revalidatePath("/orders") al
  // voor de lijst erachter, maar dat ververst niet de al-open dialoog.
  useEffect(() => {
    if (visibilityState.success) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilityState]);

  useEffect(() => {
    if (statusState.success) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusState]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Details</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bestelling</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Laden…</p>}

        {!loading && !detail && <p className="text-sm text-destructive">Bestelling niet gevonden.</p>}

        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[detail.status] ?? "outline"}>{detail.status}</Badge>
                {!detail.isVisible && <Badge variant="outline">Inactief</Badge>}
              </div>
              <span className="text-sm font-medium">{fmtEuro(detail.totalCents)}</span>
            </div>

            <div>
              <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Koper</h3>
              <p className="text-sm">{detail.buyerName}</p>
              <p className="text-sm text-muted-foreground">{detail.buyerEmail}</p>
            </div>

            <div>
              <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Bestelling</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Event</dt>
                <dd>
                  {detail.event.name}
                  {detail.event.venue ? ` — ${detail.event.venue}` : ""}
                </dd>
                <dt className="text-muted-foreground">Besteld op</dt>
                <dd>{fmtDateTime(detail.createdAt)}</dd>
                <dt className="text-muted-foreground">Laatst gewijzigd</dt>
                <dd>{fmtDateTime(detail.updatedAt)}</dd>
                {detail.molliePaymentId && (
                  <>
                    <dt className="text-muted-foreground">Mollie-betaling</dt>
                    <dd className="font-mono text-xs">{detail.molliePaymentId}</dd>
                  </>
                )}
              </dl>
            </div>

            <div>
              <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Producten in deze bestelling
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {detail.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="text-muted-foreground">{fmtEuro(item.unitPriceCents * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {detail.tickets.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Tickets — incheckstatus
                </h3>
                <ul className="flex flex-col gap-2 text-sm">
                  {detail.tickets.map((ticket) => {
                    const checkedIn = ticket.status === "CHECKED_IN";
                    return (
                      <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs">{ticket.qrToken.slice(0, 12)}…</span>
                          <Badge variant={checkedIn ? "default" : "outline"}>
                            {checkedIn ? "Ingecheckt" : TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                          </Badge>
                          {ticket.checkedInAt && (
                            <span className="text-xs text-muted-foreground">{fmtDateTime(ticket.checkedInAt)}</span>
                          )}
                        </span>
                        <TicketCheckInToggle
                          ticketId={ticket.id}
                          orderId={orderId}
                          checkedIn={checkedIn}
                          disabled={ticket.status === "CANCELLED"}
                          onChanged={load}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div>
              <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Overige bestellingen van deze koper
              </h3>
              {detail.otherOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen andere bestellingen gevonden.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {detail.otherOrders.map((o) => (
                    <li key={o.id} className="rounded-md border border-border p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{o.eventName}</span>
                        <Badge variant={STATUS_VARIANT[o.status] ?? "outline"}>{o.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(o.createdAt)}</p>
                      <p className="mt-1 text-xs">
                        {o.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">E-mail versturen</h3>
              <form action={emailAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="orderId" value={orderId} />
                <Select name="emailType" defaultValue="ORDER_CONFIRMATION" className="w-64">
                  {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="outline" size="sm" disabled={emailPending}>
                  {emailPending ? "Bezig…" : "Verzenden"}
                </Button>
              </form>
              {emailState.error && <p className="text-xs text-destructive">{emailState.error}</p>}
              {emailState.success && <p className="text-xs text-primary">E-mail verstuurd.</p>}
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status wijzigen</h3>
              <form
                action={statusAction}
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  const newStatus = String(new FormData(e.currentTarget).get("status") ?? "");
                  if (newStatus === detail.status) {
                    e.preventDefault();
                    return;
                  }
                  if (
                    !window.confirm(
                      `Status wijzigen naar "${STATUS_LABELS[newStatus] ?? newStatus}"? Voorraad en eventuele tickets worden automatisch aangepast aan de nieuwe status. Er gaat geen e-mail naar de koper en er vindt geen Mollie-terugbetaling plaats (dat blijft de aparte Terugbetalen-actie).`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="orderId" value={orderId} />
                <Select key={detail.status} name="status" defaultValue={detail.status} className="w-48">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="outline" size="sm" disabled={statusPending}>
                  {statusPending ? "Bezig…" : "Status opslaan"}
                </Button>
              </form>
              {statusState.error && <p className="text-xs text-destructive">{statusState.error}</p>}
            </div>

            <form
              action={visibilityAction}
              onSubmit={(e) => {
                const message = detail.isVisible
                  ? "Deze bestelling op inactief zetten? De regel verdwijnt dan uit het standaardoverzicht (verplaatst naar de afdeling Inactief). Status, tickets en voorraad blijven ongewijzigd; er wordt geen e-mail naar de koper gestuurd."
                  : "Deze bestelling weer actief maken? De regel verschijnt dan weer in het standaardoverzicht.";
                if (!window.confirm(message)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="orderId" value={orderId} />
              <input type="hidden" name="isVisible" value={detail.isVisible ? "false" : "true"} />
              <Button
                type="submit"
                variant={detail.isVisible ? "destructive" : "outline"}
                size="sm"
                disabled={visibilityPending}
              >
                {visibilityPending ? "Bezig…" : detail.isVisible ? "Op inactief zetten" : "Weer actief maken"}
              </Button>
              {visibilityState.error && <p className="mt-1 text-xs text-destructive">{visibilityState.error}</p>}
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
