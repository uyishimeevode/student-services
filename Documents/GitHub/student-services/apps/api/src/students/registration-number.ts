/** Registration number: intake year followed by a zero-padded sequence, e.g. 2026 and 12 give 202600012. */
export function formatRegistrationNumber(
  intakeYear: number,
  sequence: number,
): string {
  return `${intakeYear}${String(sequence).padStart(5, '0')}`;
}
