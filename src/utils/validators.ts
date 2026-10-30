export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Phone number is required.' };
  }
  const clean = phone.replace(/[\s\-()]/g, '');
  if (!/^\+?[0-9]{10,15}$/.test(clean)) {
    return { valid: false, error: 'Please enter a valid 10-15 digit phone number (e.g. +91 98765 43210).' };
  }
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email address is required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true };
}

export function validateRequired(val: string | undefined | null, fieldName: string): { valid: boolean; error?: string } {
  if (!val || !val.trim()) {
    return { valid: false, error: `${fieldName} cannot be empty.` };
  }
  return { valid: true };
}
