// Shared types for the retailer-link extractor.

export interface ExtractedProduct {
  name: string;
  price: number | null;
  currency: string;
  categoryKey: string | null; // one of warrantyEngine CATEGORIES keys, or null
  sourceUrl: string;
}

export interface ExtractResponse {
  ok: boolean;
  error?: 'invalid_url' | 'blocked' | 'timeout' | 'too_large' | 'not_found' | 'internal';
  product?: ExtractedProduct;
  /** True when the page was fetched but no price could be found. */
  needsPrice?: boolean;
}
