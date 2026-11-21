import { invoiceTotals } from './finance.service.js';

describe('invoiceTotals', () => {
  it('counts only verified payments as paid and keeps pending ones apart', () => {
    const totals = invoiceTotals({
      amount: 650_000,
      waiverAmount: 50_000,
      payments: [
        { amount: 300_000, status: 'VERIFIED' },
        { amount: 100_000, status: 'PENDING' },
        { amount: 999_000, status: 'REJECTED' },
      ],
    });
    expect(totals).toEqual({
      due: 600_000,
      paid: 300_000,
      pending: 100_000,
      balance: 300_000,
      status: 'PARTIAL',
    });
  });

  it('is paid when the waiver and payments cover the amount', () => {
    expect(
      invoiceTotals({
        amount: 100,
        waiverAmount: 40,
        payments: [{ amount: 60, status: 'VERIFIED' }],
      }).status,
    ).toBe('PAID');
    expect(
      invoiceTotals({ amount: 100, waiverAmount: 0, payments: [] }).status,
    ).toBe('UNPAID');
  });
});
