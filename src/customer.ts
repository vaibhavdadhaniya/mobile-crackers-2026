// Pure helpers for matching a sale's customer to a registration (unit tested).
export type Reg = { id: string; name: string; phone: string; city?: string | null; area?: string | null };

export const PHONE_MIN_SEARCH = 3;
export const NAME_MIN_SEARCH = 2;

export function normalizeMobile(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  return d.slice(0, 10);
}

export function exactPhoneMatch(rows: Reg[], phone: string): Reg | null {
  if (phone.length !== 10) return null;
  return rows.find((r) => r.phone === phone) ?? null;
}

// What the search box should query for the field being typed in, or null for no search.
export function searchTerm(field: 'phone' | 'name', value: string): string | null {
  if (field === 'phone') {
    const d = normalizeMobile(value);
    return d.length >= PHONE_MIN_SEARCH ? d : null;
  }
  const n = value.trim();
  return n.length >= NAME_MIN_SEARCH ? n : null;
}

// Next form state after the mobile number changes.
export function onPhoneChange(
  state: { phone: string; name: string; regId: string | null },
  rawPhone: string
): { phone: string; name: string; regId: string | null } {
  const phone = normalizeMobile(rawPhone);
  // Editing the number breaks an existing link.
  if (phone !== state.phone && state.regId) return { phone, name: state.name, regId: null };
  return { ...state, phone };
}

// Apply a registration (picked from the dropdown or found by exact number).
export function applyRegistration(reg: Reg) {
  return { phone: reg.phone, name: reg.name, regId: reg.id };
}
