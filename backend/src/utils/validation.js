// Small, dependency-free validators shared across controllers. Each returns a string
// error message (suitable for a 400 response) or null when the value is valid — callers
// decide the field name and HTTP handling, these just express the rule.

export function cpfError(cpf) {
  if (!/^\d{11}$/.test(String(cpf))) {
    return 'cpf must be exactly 11 digits';
  }
  return null;
}

export function positiveNumberError(value, fieldName) {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) {
    return `${fieldName} must be a positive number`;
  }
  return null;
}

export function nonNegativeNumberError(value, fieldName) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) {
    return `${fieldName} must not be negative`;
  }
  return null;
}

export function dateError(value, fieldName) {
  if (Number.isNaN(new Date(value).getTime())) {
    return `${fieldName} must be a valid date`;
  }
  return null;
}

export function dateRangeError(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'start_date and end_date must be valid dates';
  }
  if (end < start) {
    return 'end_date must not be before start_date';
  }
  return null;
}

export function emailError(email) {
  // Deliberately simple — just enough to reject obvious typos, not a full RFC 5322 check.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return 'email must be a valid email address';
  }
  return null;
}

export function passwordError(password) {
  if (String(password).length < 6) {
    return 'password must be at least 6 characters';
  }
  return null;
}

export function monthError(month) {
  const n = Number(month);
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    return 'month must be an integer between 1 and 12';
  }
  return null;
}
