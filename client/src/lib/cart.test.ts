import { describe, expect, it } from 'vitest';
import { cartTotal, validBooking } from './cart';

describe('FOAMX cart helpers', () => {
  it('calculates a cart total from price and quantity', () => {
    expect(cartTotal([{ price: 399, quantity: 2 }, { price: 349, quantity: 1 }])).toBe(1147);
  });

  it('requires customer details and at least one item before booking', () => {
    expect(validBooking({ name: 'Asha', phone: '+91 73067 07640', address: 'Bengaluru', itemCount: 1 })).toBe(true);
    expect(validBooking({ name: 'Asha', phone: '', address: 'Bengaluru', itemCount: 1 })).toBe(false);
    expect(validBooking({ name: 'Asha', phone: '+91 73067 07640', address: 'Bengaluru', itemCount: 0 })).toBe(false);
  });
});
