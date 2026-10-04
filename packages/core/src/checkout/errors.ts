export class InsufficientStockError extends Error {
  constructor(public ticketTypeId: string) {
    super("Niet genoeg voorraad meer voor deze ticketsoort.");
    this.name = "InsufficientStockError";
  }
}

export class EventCancelledError extends Error {
  constructor() {
    super("Dit evenement is geannuleerd.");
    this.name = "EventCancelledError";
  }
}

export class InvalidDonationAmountError extends Error {
  constructor(public productId: string) {
    super("Ongeldig donatiebedrag (moet minimaal €2,50 zijn).");
    this.name = "InvalidDonationAmountError";
  }
}
