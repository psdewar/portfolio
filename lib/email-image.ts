export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type EmailImage = {
  base64: string;
  type: string;
  filename: string;
  alt?: string;
};
