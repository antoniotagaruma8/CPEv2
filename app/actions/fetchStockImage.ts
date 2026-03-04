'use server';

import crypto from 'node:crypto';

/**
 * Fetches 4 DIFFERENT stock images for a given topic.
 * 
 * Strategy: Use keyword variations + multiple providers + offset pagination
 * to guarantee genuinely distinct photos for Cambridge-style comparison tasks.
 */

// --- Provider Fetchers ---

// Pexels-style via Lorem Flickr with unique lock IDs
async function fetchLoremFlickr(query: string, lockId: number): Promise<string | null> {
  try {
    const response = await fetch(`https://loremflickr.com/800/800/${encodeURIComponent(query)}?lock=${lockId}`, { redirect: 'follow' });
    if (response.ok) return response.url;
  } catch (e) { console.warn("LoremFlickr failed", e); }
  return null;
}

// Wikimedia Commons - returns multiple results from search
async function fetchWikimediaResults(query: string, limit: number = 8): Promise<string[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&piprop=original&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&origin=*`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const pages = data.query?.pages;
    if (pages) {
      return Object.values(pages)
        .map((p: any) => p.original?.source)
        .filter((u): u is string => !!u);
    }
  } catch (e) { console.warn("Wikimedia failed", e); }
  return [];
}

// Openverse - returns multiple results from search
async function fetchOpenverseResults(query: string, limit: number = 8): Promise<string[]> {
  try {
    const response = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map((r: any) => r.url).filter((u: string | undefined) => !!u);
  } catch (e) { console.warn("Openverse failed", e); }
  return [];
}

// Picsum (always returns a random photo, ignores query but guarantees uniqueness)
function getPicsumUrl(seed: string): string {
  return `https://picsum.photos/seed/${seed}/800/800`;
}

// --- Keyword Variation Engine ---
// Creates 4 different search angles from a single topic to ensure diverse results
function generateQueryVariations(baseQuery: string): string[] {
  const words = baseQuery.trim().split(/\s+/);
  const variations: string[] = [baseQuery]; // Original query

  if (words.length >= 2) {
    // Variation 2: First word + "people"
    variations.push(`${words[0]} people`);
    // Variation 3: Last word + "outdoors"  
    variations.push(`${words[words.length - 1]} outdoors`);
    // Variation 4: First word + "close up"
    variations.push(`${words[0]} close up`);
  } else {
    // Single word topic - add contextual modifiers
    variations.push(`${baseQuery} people`);
    variations.push(`${baseQuery} nature`);
    variations.push(`${baseQuery} city`);
  }

  return variations.slice(0, 4);
}

// --- Main Action ---
export async function fetchStockImageAction(query: string, providerIndex?: number): Promise<{ success: boolean; imageOptions?: string[]; error?: string }> {
  console.log(`[StockImage] Searching for: "${query}"${providerIndex !== undefined ? ` (reload slot ${providerIndex})` : ''}`);

  // --- Single Slot Reload ---
  if (providerIndex !== undefined && providerIndex >= 0 && providerIndex < 4) {
    const variations = generateQueryVariations(query);
    const variation = variations[providerIndex] || query;
    const seed = crypto.randomBytes(6).toString('hex');

    // Try multiple providers for the reload
    const attempts = [
      () => fetchLoremFlickr(variation, Math.floor(Math.random() * 99999)),
      async () => { const r = await fetchWikimediaResults(variation, 8); return r[Math.floor(Math.random() * r.length)] || null; },
      async () => { const r = await fetchOpenverseResults(variation, 8); return r[Math.floor(Math.random() * r.length)] || null; },
      () => Promise.resolve(getPicsumUrl(seed)),
    ];

    for (const attempt of attempts) {
      const url = await attempt();
      if (url) return { success: true, imageOptions: [url] };
    }

    return { success: false, error: `Failed to reload slot ${providerIndex + 1}` };
  }

  // --- Full Fetch: Get 4 DIFFERENT images ---
  const variations = generateQueryVariations(query);
  console.log(`[StockImage] Query variations:`, variations);

  // Fetch from multiple sources in parallel using DIFFERENT keywords
  const [
    flickr1, flickr2, flickr3, flickr4,
    wikimediaResults,
    openverseResults,
  ] = await Promise.all([
    fetchLoremFlickr(variations[0], 1),
    fetchLoremFlickr(variations[1] || query, 2),
    fetchLoremFlickr(variations[2] || query, 3),
    fetchLoremFlickr(variations[3] || query, 4),
    fetchWikimediaResults(query, 10),
    fetchOpenverseResults(query, 10),
  ]);

  // Build a pool of ALL unique URLs, maintaining source diversity
  const seen = new Set<string>();
  const pool: string[] = [];
  const addUnique = (url: string | null) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      pool.push(url);
    }
  };

  // Interleave results from different providers for maximum diversity
  const maxLen = Math.max(wikimediaResults.length, openverseResults.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < wikimediaResults.length) addUnique(wikimediaResults[i]);
    if (i < openverseResults.length) addUnique(openverseResults[i]);
  }
  addUnique(flickr1);
  addUnique(flickr2);
  addUnique(flickr3);
  addUnique(flickr4);

  console.log(`[StockImage] Pool has ${pool.length} unique images`);

  // Fill 4 slots - pick images that are spread across the pool for maximum visual diversity
  const finalImages: string[] = [];

  if (pool.length >= 4) {
    // Spread picks across the pool (e.g., from indices 0, 25%, 50%, 75%)
    const step = Math.floor(pool.length / 4);
    for (let i = 0; i < 4; i++) {
      finalImages.push(pool[Math.min(i * step, pool.length - 1)]);
    }
  } else if (pool.length > 0) {
    // Use what we have, pad with picsum randoms
    for (let i = 0; i < 4; i++) {
      if (i < pool.length) {
        finalImages.push(pool[i]);
      } else {
        // Use Picsum as guaranteed-unique fallback (each seed = different photo)
        const seed = `${query.replace(/\s+/g, '-')}-${i}-${Date.now()}`;
        finalImages.push(getPicsumUrl(seed));
      }
    }
  } else {
    // Complete fallback: use Picsum for all 4 slots with unique seeds
    for (let i = 0; i < 4; i++) {
      const seed = `${query.replace(/\s+/g, '-')}-${i}-${Date.now()}`;
      finalImages.push(getPicsumUrl(seed));
    }
  }

  // Final uniqueness check - replace any duplicates with picsum
  const finalSeen = new Set<string>();
  for (let i = 0; i < finalImages.length; i++) {
    if (finalSeen.has(finalImages[i])) {
      const seed = `dedup-${i}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      finalImages[i] = getPicsumUrl(seed);
    }
    finalSeen.add(finalImages[i]);
  }

  console.log(`[StockImage] Returning ${finalImages.length} images (${new Set(finalImages).size} unique)`);
  return { success: true, imageOptions: finalImages };
}
