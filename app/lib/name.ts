export const MAX_NAME_LENGTH = 100;

export const isNameTooLong = (name: unknown) =>
  typeof name === "string" && name.trim().length > MAX_NAME_LENGTH;
