export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailValid(email: string): boolean {
  return EMAIL_RE.test(email);
}
