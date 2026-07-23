export class InsufficientStockError extends Error {
  constructor(public ticketTypeId: string) {
    super("Niet genoeg voorraad meer voor deze ticketsoort.");
    this.name = "InsufficientStockError";
  }
}
