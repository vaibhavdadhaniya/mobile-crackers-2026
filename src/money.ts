// Pure money helpers (unit tested).

// Returns an error message, or null when the amount can be sent.
export function validAmount(input: string, available: number): string | null {
  const s = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return 'Enter a valid amount (up to 2 decimals)';
  const n = Number(s);
  if (n <= 0) return 'Amount must be greater than 0';
  if (n > available + 1e-9) return 'Amount is more than your available balance';
  return null;
}
