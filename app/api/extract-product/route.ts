// Server-side retailer product page fetcher.
// Protections: https-only, DNS-resolved private-range blocking (incl. redirects),
// response size cap, and a fetch timeout.

import { NextRequest } from 'next/server';
import { lookup } from 'dns/promises';
import type { ExtractResponse, ExtractedProduct } from '../../extractTypes';

const MAX_BYTES = 2_000_000; // 2 MB of HTML is plenty
const TIMEOUT_MS = 12_000;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  if (a >= 224) return true; // multicast + reserved
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function json(body: ExtractResponse, status = 200) {
  return Response.json(body, { status });
}

function errorBody(
  code: ExtractResponse['error']
): ExtractResponse {
  return { ok: false, error: code };
}

async function safeFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      redirect: 'manual',
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return json(errorBody('invalid_url'), 400);

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return json(errorBody('invalid_url'), 400);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return json(errorBody('invalid_url'), 400);
  }

  // Resolve the host and reject private/loopback targets before fetching.
  let addresses: { address: string; family: number }[];
  try {
    addresses = (await lookup(parsed.hostname, { all: true })) as {
      address: string;
      family: number;
    }[];
  } catch {
    return json(errorBody('not_found'), 404);
  }

  if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
    return json(errorBody('invalid_url'), 400);
  }

  // Follow redirects manually, re-validating each hop's host.
  let currentUrl = parsed;
  let response: Response | null = null;
  for (let hop = 0; hop < 5; hop++) {
    try {
      response = await safeFetch(currentUrl.toString());
    } catch (e) {
      const aborted = (e as { name?: string })?.name === 'AbortError';
      return json(errorBody(aborted ? 'timeout' : 'blocked'), 502);
    }

    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get('location');
      if (!loc) break;
      try {
        currentUrl = new URL(loc, currentUrl);
      } catch {
        return json(errorBody('invalid_url'), 400);
      }
      if (currentUrl.protocol !== 'https:' && currentUrl.protocol !== 'http:') {
        return json(errorBody('invalid_url'), 400);
      }
      let hopAddrs: { address: string }[];
      try {
        hopAddrs = (await lookup(currentUrl.hostname, { all: true })) as {
          address: string;
        }[];
      } catch {
        return json(errorBody('not_found'), 404);
      }
      if (!hopAddrs.length || hopAddrs.some((a) => isPrivateIp(a.address))) {
        return json(errorBody('invalid_url'), 400);
      }
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    return json(errorBody(response?.status === 404 ? 'not_found' : 'blocked'), 502);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
    return json(errorBody('blocked'), 415);
  }

  const reader = response.body?.getReader();
  let html = '';
  if (reader) {
    const decoder = new TextDecoder();
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        try { await reader.cancel(); } catch {}
        return json(errorBody('too_large'), 413);
      }
      html += decoder.decode(value, { stream: true });
    }
  }

  if (!html) return json(errorBody('blocked'), 502);

  const product = extractProduct(html, currentUrl.toString());
  return json({
    ok: true,
    product,
    needsPrice: product?.price === null,
  });
}

// ---- extraction helpers (all operating on fetched HTML, server-side) ----

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractProduct(html: string, sourceUrl: string): ExtractResponse['product'] {
  // 1) JSON-LD structured data (most reliable when present)
  const ldMatches = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (ldMatches) {
    for (const m of ldMatches) {
      const inner = m.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
      try {
        const data = JSON.parse(inner);
        const found = findProductInLd(data);
        if (found) return finalize(found, sourceUrl);
      } catch {
        // malformed JSON-LD, try next block
      }
    }
  }

  // 2) Open Graph product metadata
  const meta = (prop: string): string | null => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      'i'
    );
    const m = html.match(re) || html.match(alt);
    return m ? decodeEntities(m[1]) : null;
  };

  const ogTitle = meta('og:title');
  const ogPriceAmount = meta('product:price:amount') || meta('og:price:amount');
  const ogCurrency = meta('product:price:currency') || meta('og:price:currency');

  if (ogTitle && ogPriceAmount) {
    const price = Number(ogPriceAmount.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(price) && price > 0) {
      return finalize(
        {
          name: ogTitle,
          price,
          currency: (ogCurrency || 'AUD').toUpperCase(),
        },
        sourceUrl
      );
    }
  }

  // 3) Title + a price heuristic from itemprop="price" or visible price patterns
  const title = ogTitle || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || null;
  if (!title) return { name: 'Unknown product', price: null, currency: 'AUD', categoryKey: null, sourceUrl };

  let price: number | null = null;
  const itemprop = html.match(/itemprop=["']price["'][^>]*content=["']([\d.,]+)["']/i);
  if (itemprop) price = Number(itemprop[1].replace(/[^0-9.]/g, ''));
  if (price === null || !Number.isFinite(price)) {
    const contentPrice = html.match(/content=["']([\d.,]+)["'][^>]+itemprop=["']price["']/i);
    if (contentPrice) price = Number(contentPrice[1].replace(/[^0-9.]/g, ''));
  }

  if (price === null || !Number.isFinite(price) || price <= 0) {
    return { name: decodeEntities(title), price: null, currency: 'AUD', categoryKey: null, sourceUrl };
  }

  return finalize({ name: decodeEntities(title), price, currency: 'AUD' }, sourceUrl);
}

function findProductInLd(data: unknown): { name: string; price: number; currency?: string } | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findProductInLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;

  const type = obj['@type'];
  const isProduct =
    type === 'Product' ||
    (Array.isArray(type) && (type as unknown[]).includes('Product'));
  if (isProduct) {
    const name = typeof obj.name === 'string' ? obj.name : null;
    let price: number | null = null;
    let currency: string | undefined;
    const offers = obj.offers;
    if (typeof offers === 'object' && offers !== null) {
      const o = offers as Record<string, unknown>;
      const p = o.price ?? o.lowPrice ?? (Array.isArray(o.offers) ? (o.offers[0] as Record<string, unknown> | undefined)?.price : undefined);
      if (typeof p === 'string' || typeof p === 'number') price = Number(String(p).replace(/[^0-9.]/g, ''));
      if (typeof o.priceCurrency === 'string') currency = o.priceCurrency;
    }
    if (name && price !== null && Number.isFinite(price) && price > 0) {
      return { name, price, currency };
    }
  }

  // Recurse into common wrappers
  for (const key of ['@graph', 'mainEntity', 'itemListElement', 'itemOffered']) {
    if (key in obj) {
      const found = findProductInLd(obj[key]);
      if (found) return found;
    }
  }
  return null;
}

function finalize(
  p: { name: string; price: number; currency?: string },
  sourceUrl: string
): ExtractResponse['product'] {
  return {
    name: p.name.trim().slice(0, 140),
    price: p.price,
    currency: (p.currency || 'AUD').toUpperCase(),
    categoryKey: guessCategory(p.name),
    sourceUrl,
  };
}

function guessCategory(name: string): string | null {
  const n = name.toLowerCase();
  if (/\b(iphone|galaxy s|pixel \d|phone|smartphone)\b/.test(n)) return 'smartphones';
  if (/\b(laptop|macbook|notebook|chromebook|thinkpad)\b/.test(n)) return 'laptops';
  if (/\b(tv|television|oled|qn(ed|e|b)?\d|uhl?d)\b/.test(n)) return 'tvs';
  if (/\b(fridge|washer|dryer|dishwasher|oven|cooktop|freezer|air ?fryer|vacuum|coffee machine)\b/.test(n))
    return 'appliances';
  if (/\b(airpods|headphones|earbuds|speaker|soundbar|turntable)\b/.test(n)) return 'audio';
  return null;
}
