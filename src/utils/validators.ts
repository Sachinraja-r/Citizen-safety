export function validatePhone(phone: string): { valid: boolean; error?: string; clean?: string } {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Phone number is required.' };
  }

  // Strip whitespace, hyphens, parentheses, and dots
  let sanitized = phone.trim().replace(/[\s\-().]/g, '');

  // Normalize duplicate country prefixes (e.g. +91+91 or 9191)
  sanitized = sanitized.replace(/^(\+?91)+/g, '+91');
  sanitized = sanitized.replace(/^\++/, '+');

  // If standard 10-digit mobile number, format with +91
  if (/^[0-9]{10}$/.test(sanitized)) {
    return { valid: true, clean: `+91 ${sanitized}` };
  }

  // If 11 digits starting with 0 (e.g. 09876543210)
  if (/^0[0-9]{10}$/.test(sanitized)) {
    return { valid: true, clean: `+91 ${sanitized.slice(1)}` };
  }

  // If 10-15 digits with or without leading +
  if (/^\+?[0-9]{10,15}$/.test(sanitized)) {
    const formatted = sanitized.startsWith('+') ? sanitized : `+${sanitized}`;
    return { valid: true, clean: formatted };
  }

  return {
    valid: false,
    error: 'Please enter a valid 10-15 digit phone number (e.g. 98765 43210 or +91 98765 43210).',
  };
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
