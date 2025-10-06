export function validateEnvironment() {
  const requiredVars = ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }

  // Validate Stripe keys format
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_")) {
    throw new Error("Invalid STRIPE_SECRET_KEY format - must start with sk_");
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_")) {
    throw new Error("Invalid NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format - must start with pk_");
  }

  // Warn about missing optional variables
  const optionalVars = ["NEXT_PUBLIC_BASE_URL", "BLOB_READ_WRITE_TOKEN", "STRIPE_WEBHOOK_SECRET"];

  optionalVars.forEach((varName) => {
    if (!process.env[varName]) {
      console.warn(`Optional environment variable missing: ${varName}`);
    }
  });
}

// Secure environment getter with validation
export function getSecureEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }

  // Don't log sensitive keys
  const sensitiveKeys = ["STRIPE_SECRET_KEY", "BLOB_READ_WRITE_TOKEN", "STRIPE_WEBHOOK_SECRET"];
  if (process.env.NODE_ENV === "development" && !sensitiveKeys.includes(key)) {
    console.debug(`Environment variable ${key} loaded successfully`);
  }

  return value;
}
