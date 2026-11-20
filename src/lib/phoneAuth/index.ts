export function normalizePhone(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.startsWith('251') && digitsOnly.length === 12) {
    return `0${digitsOnly.slice(3)}`;
  }
  return digitsOnly;
}

export function phoneToAuthEmail(rawPhone: string): string {
  const normalized = normalizePhone(rawPhone);
  return `phone_${normalized}@fgg.local`;
}