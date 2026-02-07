/**
 * Activates patron status on the client side.
 * Sets both localStorage (for client reads) and a cookie (for server-side verification).
 */
export function activatePatronStatus(): void {
  localStorage.setItem("patronStatus", "active");
  document.cookie = "patronToken=active; path=/; max-age=31536000; secure; samesite=strict";
}
