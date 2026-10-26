export const NO_CONNECTION = "No connection.";

export class NetworkError extends Error {
  constructor(message = NO_CONNECTION) {
    super(message);
    this.name = "NetworkError";
  }
}

export const isNetworkError = (e: unknown) => e instanceof NetworkError;

export async function networkFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (e) {
    if (e instanceof TypeError) throw new NetworkError();
    throw e;
  }
}

export const errorMessage = (e: unknown, fallback = "Something went wrong. Try again.") =>
  isNetworkError(e) ? `${NO_CONNECTION} Try again.` : e instanceof Error && e.message ? e.message : fallback;

export const postJson = (url: string, body: unknown) =>
  networkFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export async function postJsonField<T = string>(url: string, body: unknown, key: string): Promise<T> {
  const res = await postJson(url, body);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data[key]) throw new Error(data.error);
  return data[key] as T;
}

export const CHECKOUT_OPEN_ERROR = "Checkout couldn't open. Try again.";
