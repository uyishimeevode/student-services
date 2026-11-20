import { formatRegistrationNumber } from './registration-number.js';

describe('formatRegistrationNumber', () => {
  it('pads the sequence to five digits after the intake year', () => {
    expect(formatRegistrationNumber(2026, 12)).toBe('202600012');
    expect(formatRegistrationNumber(2027, 1)).toBe('202700001');
  });

  it('keeps sequences longer than five digits whole', () => {
    expect(formatRegistrationNumber(2026, 123456)).toBe('2026123456');
  });
});
