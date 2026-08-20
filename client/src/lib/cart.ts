export type CartLine = { price: number; quantity: number };

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((total, line) => total + line.price * line.quantity, 0);
}

export function validBooking(input: { name?: string; phone?: string; address?: string; itemCount?: number }) {
  return Boolean(input.name?.trim() && input.phone?.trim() && input.address?.trim() && (input.itemCount ?? 0) > 0);
}
