/**
 * Product Configuration
 *
 * Central configuration for all purchasable products.
 * To add a new product:
 * 1. Add entry to PRODUCTS with unique key
 * 2. Set type: "digital" | "physical" | "bundle" | "subscription" | "donation"
 * 3. Configure type-specific options
 * 4. If digital, specify downloadableAssets (file prefixes in Vercel Blob)
 *
 * Stripe will use these settings to create checkout sessions.
 */

// =============================================================================
// TEST MODE DETECTION
// =============================================================================

/** Returns true if using Stripe test mode keys */
export function isTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || "";
  return key.startsWith("sk_test_");
}

// =============================================================================
// PRODUCT TYPES
// =============================================================================

export type ProductType =
  | "digital" // Downloadable files (music, PDFs, etc.)
  | "physical" // Requires shipping (merch, vinyl, etc.)
  | "bundle" // Combination of digital + physical
  | "subscription" // Recurring payment
  | "donation" // Variable amount, no fulfillment
  | "funding"; // Crowdfunding/project backing

// =============================================================================
// SELLABLE TYPES
// =============================================================================

export type SellableType = "merch" | "digital" | "bundle" | "donation" | "funding";

/**
 * Maps product type to sellable type for analytics.
 * This is the bridge between internal product types and analytics categories.
 */
export function getSellableType(product: { type: ProductType }): SellableType {
  switch (product.type) {
    case "physical":
      return "merch";
    case "digital":
      return "digital";
    case "bundle":
      return "bundle";
    case "donation":
      return "donation";
    case "funding":
      return "funding";
    default:
      return "digital";
  }
}

export interface BaseProduct {
  id: string; // Canonical sellable ID (e.g., "everything-bundle-2025")
  stripePriceId?: string; // Phase 2: link to preconfigured Stripe Price
  sku?: string; // Optional SKU for inventory/fulfillment
  name: string; // Display name
  description: string; // Checkout description
  type: ProductType;
  basePriceCents: number; // Price in cents (before fees)
  currency?: string; // Default: "usd"
  images?: string[]; // Product images (full HTTPS URLs)
  successPath: string; // Redirect path after purchase
  cancelPath: string; // Redirect path on cancel
  maxDownloadsPerSession?: number; // Default: 5 for digital
  downloadExpiryHours?: number; // Default: 24 for digital
}

export interface DigitalProduct extends BaseProduct {
  type: "digital";
  downloadableAssets: string[]; // File prefixes in blob storage
  fileFormat: string; // e.g., "mp3", "pdf", "zip"
}

// Inline shipping config (matches Tiger's ShippingOption)
export interface ShippingConfig {
  amountCents: number;
  displayName: string;
  deliveryEstimate?: {
    minimum: { unit: "business_day" | "day" | "week"; value: number };
    maximum: { unit: "business_day" | "day" | "week"; value: number };
  };
}

export interface PhysicalProduct extends BaseProduct {
  type: "physical";
  requiresShipping?: boolean; // Default true, false for pickup products
  shippingRateId?: string; // Preconfigured Stripe shipping rate ID
  shipping?: ShippingConfig; // OR inline shipping config (no dashboard setup)
  allowedCountries: string[];
  collectPhone?: boolean; // Default: true (always collect for shipping)
  variants?: {
    sizes?: string[];
    colors?: string[];
  };
}

export interface BundleProduct extends BaseProduct {
  type: "bundle";
  includesDigital: string[]; // Digital asset IDs
  includesPhysical: boolean;
  requiresShipping: boolean;
  shippingRateId?: string; // Preconfigured Stripe shipping rate ID
  shipping?: ShippingConfig; // OR inline shipping config (no dashboard setup)
  allowedCountries?: string[];
  collectPhone?: boolean;
  variants?: {
    sizes?: string[];
    colors?: string[];
  };
}

export interface DonationProduct extends BaseProduct {
  type: "donation";
  minAmountCents: number;
  suggestedAmounts: number[]; // In cents
}

export interface FundingProduct extends BaseProduct {
  type: "funding";
  projectId: string;
  tiers: {
    id: string;
    name: string;
    amountCents: number;
    description: string;
    includesDigital?: string[];
  }[];
}

export type Product =
  | DigitalProduct
  | PhysicalProduct
  | BundleProduct
  | DonationProduct
  | FundingProduct;

// =============================================================================
// DOWNLOADABLE ASSETS
// =============================================================================

/**
 * All downloadable digital assets.
 * Key = asset ID used in products and download URLs
 * Value = blob storage prefix (without extension)
 *
 * TEST ASSETS: Prefixed with "test-" - use local files or mock data
 */
export const DIGITAL_ASSETS: Record<string, { blobPrefix: string; displayName: string }> = {
  // Production assets (Vercel Blob)
  patience: { blobPrefix: "audio/patience", displayName: "Patience" },
  safe: { blobPrefix: "audio/safe", displayName: "Safe" },
  "right-one": { blobPrefix: "audio/right-one", displayName: "Right One" },
  "where-i-wanna-be": {
    blobPrefix: "audio/where-i-wanna-be",
    displayName: "Where I Wanna Be",
  },
  "critical-race-theory": {
    blobPrefix: "audio/critical-race-theory",
    displayName: "Critical Race Theory",
  },
  "better-days": {
    blobPrefix: "audio/better-days",
    displayName: "Better Days",
  },
  bahai: { blobPrefix: "audio/bahai", displayName: "Bahai" },
  "mula-freestyle": {
    blobPrefix: "audio/mula-freestyle",
    displayName: "Mula Freestyle",
  },
  "pretty-girls-freestyle": {
    blobPrefix: "audio/pretty-girls-freestyle",
    displayName: "Pretty Girls Freestyle",
  },
  "chains-and-whips-freestyle": {
    blobPrefix: "audio/chains-and-whips-freestyle",
    displayName: "Chains & Whips Freestyle",
  },

  // Bundles (zip files)
  "singles-and-16s-2025": {
    blobPrefix: "audio/peyt-spencer-singles-and-16s-2025",
    displayName: "Singles & 16s (2025)",
  },

  // Test assets (use mock/local files - no Vercel Blob dependency)
  "test-track": { blobPrefix: "test/test-track", displayName: "Test Track" },
  "test-bundle": { blobPrefix: "test/test-bundle", displayName: "Test Bundle" },
};

// =============================================================================
// SINGLE TRACK DEFAULTS
// =============================================================================

/** Default price for individual single downloads in cents ($1.99) */
export const DEFAULT_SINGLE_PRICE_CENTS = 199;

/** Custom pricing overrides for specific singles */
export const SINGLE_PRICE_OVERRIDES: Record<string, number> = {
  "mula-freestyle": 100, // $1.00 fixed
};

/** Helper to create a single track product with sensible defaults */
function createSingleProduct(
  id: string,
  name: string,
  priceCents: number = DEFAULT_SINGLE_PRICE_CENTS
): DigitalProduct {
  return {
    id,
    name,
    description: "High-quality MP3 download",
    type: "digital",
    basePriceCents: priceCents,
    successPath: "/listen?success=true",
    cancelPath: "/listen?canceled=true",
    downloadableAssets: [id],
    fileFormat: "mp3",
  };
}

// =============================================================================
// PRODUCT CATALOG
// =============================================================================

export const PRODUCTS: Record<string, Product> = {
  // T-Shirt only
  "tee-exhibit-psd": {
    id: "tee-exhibit-psd",
    name: "From The Archives: Exhibit PSD",
    description: "100% cotton t-shirt with original PSD logo",
    type: "physical",
    basePriceCents: 2500,
    images: ["https://peytspencer.com/images/merch/exhibit-psd-merch.JPG"],
    successPath: "/shop/success",
    cancelPath: "/shop?canceled=true",
    requiresShipping: true,
    shipping: {
      amountCents: 700,
      displayName: "Standard US Shipping",
      deliveryEstimate: {
        minimum: { unit: "business_day", value: 5 },
        maximum: { unit: "business_day", value: 7 },
      },
    },
    allowedCountries: ["US"],
    variants: {
      sizes: ["S", "M", "L"],
      colors: ["black", "white"],
    },
  },

  // Digital download bundle (zip file)
  "singles-16s-pack-2025": {
    id: "singles-16s-pack-2025",
    name: "Singles & 16s (2025)",
    description:
      "Right One • Safe • Patience • Pretty Girls Freestyle • Chains & Whips Freestyle • Mula Freestyle + Lyricbook",
    type: "digital",
    basePriceCents: 1000,
    images: ["https://peytspencer.com/images/merch/thank-you-download.jpg"],
    successPath: "/shop/success",
    cancelPath: "/shop?canceled=true",
    downloadableAssets: ["singles-and-16s-2025"], // Single zip file
    fileFormat: "zip",
  },

  // Then & Now bundle (T-shirt + downloads)
  "then-and-now-bundle-2025": {
    id: "then-and-now-bundle-2025",
    name: "Then & Now Bundle",
    description: "T-Shirt + 6 track downloads + Lyricbook",
    type: "bundle",
    basePriceCents: 3000,
    images: [
      "https://peytspencer.com/images/merch/exhibit-psd-merch.JPG",
      "https://peytspencer.com/images/merch/thank-you-download.jpg",
    ],
    successPath: "/shop/success",
    cancelPath: "/shop?canceled=true",
    includesDigital: ["singles-and-16s-2025"], // Same zip as download-only bundle
    includesPhysical: true,
    requiresShipping: true,
    shipping: {
      amountCents: 700,
      displayName: "Standard US Shipping",
      deliveryEstimate: {
        minimum: { unit: "business_day", value: 5 },
        maximum: { unit: "business_day", value: 7 },
      },
    },
    allowedCountries: ["US"],
    variants: {
      sizes: ["S", "M", "L"],
      colors: ["black", "white"],
    },
  },

  // =============================================================================
  // INDIVIDUAL SINGLES - Each track as its own purchasable product
  // Uses createSingleProduct helper with DEFAULT_SINGLE_PRICE_CENTS
  // Custom prices in SINGLE_PRICE_OVERRIDES
  // =============================================================================

  patience: createSingleProduct("patience", "Patience"),
  safe: createSingleProduct("safe", "Safe"),
  "right-one": createSingleProduct("right-one", "Right One"),
  "where-i-wanna-be": createSingleProduct("where-i-wanna-be", "Where I Wanna Be"),
  "critical-race-theory": createSingleProduct("critical-race-theory", "Critical Race Theory"),
  "better-days": createSingleProduct("better-days", "Better Days"),
  bahai: createSingleProduct("bahai", "Baha'i"),
  "mula-freestyle": createSingleProduct(
    "mula-freestyle",
    "Mula Freestyle",
    SINGLE_PRICE_OVERRIDES["mula-freestyle"]
  ),

  // Donation/tip (variable amount)
  "tip-jar": {
    id: "tip-jar",
    name: "Support the Artist",
    description: "Thank you for your support!",
    type: "donation",
    basePriceCents: 100,
    successPath: "/listen?success=true",
    cancelPath: "/listen?canceled=true",
    minAmountCents: 100,
    suggestedAmounts: [300, 500, 1000, 2000],
  },

  // =============================================================================
  // TEST PRODUCTS - Use these in development/staging with Stripe test mode
  // These don't require Vercel Blob - returns mock data for download testing
  // =============================================================================

  // Test digital download (no blob dependency)
  "test-digital": {
    id: "test-digital",
    name: "[TEST] Digital Download",
    description: "Test product for digital download flow",
    type: "digital",
    basePriceCents: 100,
    successPath: "/listen?success=true&test=1",
    cancelPath: "/listen?canceled=true",
    downloadableAssets: ["test-track"],
    fileFormat: "mp3",
  },

  // Test physical product (shipping flow)
  "test-physical": {
    id: "test-physical",
    name: "[TEST] Physical Product",
    description: "Test product for shipping flow",
    type: "physical",
    basePriceCents: 500,
    successPath: "/shop/success",
    cancelPath: "/shop?canceled=true",
    requiresShipping: true,
    shipping: {
      amountCents: 500,
      displayName: "Test Shipping",
    },
    allowedCountries: ["US"],
    variants: {
      sizes: ["S", "M", "L"],
      colors: ["black"],
    },
  },

  // Test bundle (physical + digital)
  "test-bundle": {
    id: "test-bundle",
    name: "[TEST] Bundle Product",
    description: "Test product for bundle flow (physical + digital)",
    type: "bundle",
    basePriceCents: 800,
    successPath: "/shop/success",
    cancelPath: "/shop?canceled=true",
    includesDigital: ["test-track"],
    includesPhysical: true,
    requiresShipping: true,
    shipping: {
      amountCents: 500,
      displayName: "Test Shipping",
    },
    allowedCountries: ["US"],
  },

  // Test donation (variable amount)
  "test-donation": {
    id: "test-donation",
    name: "[TEST] Donation",
    description: "Test product for donation/tip flow",
    type: "donation",
    basePriceCents: 100,
    successPath: "/listen?success=true&test=1",
    cancelPath: "/listen?canceled=true",
    minAmountCents: 50,
    suggestedAmounts: [100, 500, 1000],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get product by ID
 */
export function getProduct(productId: string): Product | undefined {
  return PRODUCTS[productId];
}

/**
 * Check if a product grants access to a specific digital asset
 */
export function canAccessAsset(product: Product, assetId: string): boolean {
  if (product.type === "digital") {
    return product.downloadableAssets.includes(assetId);
  }
  if (product.type === "bundle") {
    return product.includesDigital.includes(assetId);
  }
  return false;
}

/**
 * Get all downloadable assets for a product
 */
export function getDownloadableAssets(product: Product): string[] {
  if (product.type === "digital") {
    return product.downloadableAssets;
  }
  if (product.type === "bundle") {
    return product.includesDigital;
  }
  return [];
}

/**
 * Get file format for a digital product (default: mp3)
 */
export function getFileFormat(product: Product): string {
  if (product.type === "digital") {
    return product.fileFormat || "mp3";
  }
  // Bundles: check if first digital asset is a zip
  if (product.type === "bundle" && product.includesDigital.length > 0) {
    const firstAsset = product.includesDigital[0];
    // If asset ID contains "singles-and-16s" or similar bundle identifiers, it's a zip
    if (firstAsset.includes("singles-and-16s") || firstAsset.includes("-bundle")) {
      return "zip";
    }
  }
  return "mp3";
}

/**
 * Check if product requires shipping
 */
export function requiresShipping(product: Product): boolean {
  // Explicit requiresShipping flag takes precedence (for pickup products)
  if ("requiresShipping" in product && product.requiresShipping === false) {
    return false;
  }
  if (product.type === "physical") return true;
  if (product.type === "bundle") return product.requiresShipping ?? true;
  return false;
}

// =============================================================================
// DERIVED DEFAULTS
// =============================================================================

const DEFAULTS = {
  currency: "usd",
  maxDownloadsPerSession: 5,
  downloadExpiryHours: 24,
} as const;

/** Get currency (default: usd) */
export function getCurrency(product: Product): string {
  return product.currency ?? DEFAULTS.currency;
}

/** Get max downloads per session (default: 5) */
export function getMaxDownloads(product: Product): number {
  return product.maxDownloadsPerSession ?? DEFAULTS.maxDownloadsPerSession;
}

/** Get download expiry hours (default: 24) */
export function getDownloadExpiry(product: Product): number {
  return product.downloadExpiryHours ?? DEFAULTS.downloadExpiryHours;
}

/** Should collect phone? (default: true when shipping required) */
export function shouldCollectPhone(product: Product): boolean {
  if (product.type === "physical") return product.collectPhone ?? true;
  if (product.type === "bundle") return product.collectPhone ?? product.requiresShipping;
  return false;
}

/**
 * Check if asset ID is valid
 */
export function isValidAsset(assetId: string): boolean {
  return assetId in DIGITAL_ASSETS;
}

/**
 * Check if asset is a test asset (for mock blob handling)
 */
export function isTestAsset(assetId: string): boolean {
  return assetId.startsWith("test-");
}

/**
 * Check if product is a test product
 */
export function isTestProduct(productId: string): boolean {
  return productId.startsWith("test-");
}

/**
 * Get all test product IDs (for listing in dev UI)
 */
export function getTestProductIds(): string[] {
  return Object.keys(PRODUCTS).filter((id) => id.startsWith("test-"));
}

/**
 * Get blob storage prefix for an asset
 */
export function getAssetBlobPrefix(assetId: string): string | undefined {
  return DIGITAL_ASSETS[assetId]?.blobPrefix;
}

/**
 * Calculate Stripe processing fee (2.9% + $0.30)
 */
export function calculateStripeFee(baseCents: number): number {
  return Math.ceil(((baseCents / 100 + 0.3) / 0.971) * 100);
}

/**
 * Get product with fees included
 */
export function getProductPriceWithFees(productId: string): number {
  const product = getProduct(productId);
  if (!product) return 0;
  return calculateStripeFee(product.basePriceCents);
}

/**
 * Check if a product has any digital assets
 */
export function hasDigitalAssets(productId: string): boolean {
  const product = getProduct(productId);
  if (!product) return false;
  return getDownloadableAssets(product).length > 0;
}

/**
 * Get success URL for a product
 */
export function getSuccessUrl(productId: string, baseUrl: string): string {
  const product = getProduct(productId);
  if (!product) return `${baseUrl}/shop?success=true`;
  const separator = product.successPath.includes("?") ? "&" : "?";
  return `${baseUrl}${product.successPath}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

/**
 * Get cancel URL for a product
 */
export function getCancelUrl(productId: string, baseUrl: string): string {
  const product = getProduct(productId);
  if (!product) return `${baseUrl}/shop?canceled=true`;
  return `${baseUrl}${product.cancelPath}`;
}

/**
 * Get shipping configuration for a product
 * Returns inline ShippingConfig, preconfigured rate ID, or undefined
 */
export function getShippingConfig(product: Product): ShippingConfig | string | undefined {
  if (product.type === "physical") {
    return product.shipping || product.shippingRateId;
  }
  if (product.type === "bundle" && product.requiresShipping) {
    return product.shipping || product.shippingRateId;
  }
  return undefined;
}

/**
 * Get allowed shipping countries for a product
 */
export function getAllowedCountries(product: Product): string[] {
  if (product.type === "physical") return product.allowedCountries;
  if (product.type === "bundle" && product.allowedCountries) return product.allowedCountries;
  return ["US"];
}

// Export type alias for convenience
export type ProductConfig = Product;
