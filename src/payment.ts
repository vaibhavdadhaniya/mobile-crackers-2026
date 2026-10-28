// Sale payment method labels and options (dependency-free, unit tested).
// 'pending' = customer has not paid yet: no money goes to the wallet until the sale is set to Cash/UPI.
export type PaymentMethodKey = 'cash' | 'upi' | 'pending';
export const PAYMENT_OPTIONS: { key: PaymentMethodKey; label: string }[] = [
  { key: 'cash', label: 'Cash' }, // default
  { key: 'upi', label: 'UPI' },
  { key: 'pending', label: 'Pending' },
];
export const DEFAULT_PAYMENT: PaymentMethodKey = 'cash';
export const paymentLabel = (m: string | null | undefined) => (m === 'upi' ? 'UPI' : m === 'pending' ? 'Pending' : 'Cash');
