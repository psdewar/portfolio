export function serverFieldError(status: number, message?: string, fallback = "Something went wrong") {
  const text = message || fallback;
  return status === 400 && /name/i.test(text) ? { name: text } : { email: text };
}

export function routeFormError(status: number, message?: string, fallback = "Something went wrong") {
  const text = message || fallback;
  if (status === 400 && /name/i.test(text)) return { name: text };
  if (status === 400 && /email/i.test(text)) return { email: text };
  return { form: text };
}
