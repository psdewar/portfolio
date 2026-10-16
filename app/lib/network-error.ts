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
