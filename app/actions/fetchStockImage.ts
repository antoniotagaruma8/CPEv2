'use server';

import { createClient } from "@supabase/supabase-js";
import crypto from 'node:crypto';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Individual Provider Fetchers ---

// 1. Unsplash (redirect-based, random by default with unique sig)
async function fetchUnsplash(query: string, seed: string): Promise<string | null> {
  try {
    const response = await fetch(`https://source.unsplash.com/featured/800x800?${encodeURIComponent(query)}&sig=${seed}`, { redirect: 'follow' });
    if (response.ok && !response.url.includes('source-404')) return response.url;
  } catch (e) { console.warn("Unsplash fetch failed", e); }
  return null;
}

// 2. Lorem Flickr (redirect-based, random per request)
async function fetchLoremFlickr(query: string, seed: string): Promise<string | null> {
  try {
    const response = await fetch(`https://loremflickr.com/800/800/${encodeURIComponent(query)}?lock=${seed}`, { redirect: 'follow' });
    if (response.ok) return response.url;
  } catch (e) { console.warn("Lorem Flickr fetch failed", e); }
  return null;
}

// 3. Wikimedia Commons (search API, can return multiple)
async function fetchWikimediaMultiple(query: string, limit: number = 4): Promise<string[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&piprop=original&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&origin=*`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const pages = data.query?.pages;
    if (pages) {
      return Object.values(pages)
        .map((p: any) => p.original?.source)
        .filter((url): url is string => !!url);
    }
  } catch (e) { console.warn("Wikimedia fetch failed", e); }
  return [];
}

// 4. Openverse (search API, can return multiple)
async function fetchOpenverseMultiple(query: string, limit: number = 4): Promise<string[]> {
  try {
    const response = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map((r: any) => r.url).filter((url: string | undefined) => !!url);
  } catch (e) { console.warn("Openverse fetch failed", e); }
  return [];
}

// --- Supabase Upload (retained for future use) ---
async function uploadToSupabase(filename: string, buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    const { error: uploadError } = await supabase.storage.from('images').upload(filename, buffer, {
      contentType: mimeType,
      upsert: true
    });
    if (uploadError) { console.error("Error uploading image to Supabase:", uploadError); return null; }
    const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filename);
    return publicUrlData.publicUrl;
  } catch (error) { console.error("Supabase upload exception:", error); return null; }
}

// --- Main Fetch Action ---
export async function fetchStockImageAction(query: string, providerIndex?: number): Promise<{ success: boolean; imageOptions?: string[]; error?: string }> {
  console.log(`Searching stock photos for: "${query}"${providerIndex !== undefined ? ` (Reloading slot ${providerIndex + 1})` : ''}`);

  // Generate 4 unique random seeds
  const seeds = Array.from({ length: 4 }, () => crypto.randomBytes(4).toString('hex'));

  // --- Single Slot Reload ---
  if (providerIndex !== undefined && providerIndex >= 0 && providerIndex < 4) {
    const seed = seeds[0];
    // Round-robin through providers for reloads
    const singleFetchers = [
      () => fetchUnsplash(query, seed),
      () => fetchLoremFlickr(query, seed),
      async () => { const r = await fetchWikimediaMultiple(query, 5); return r[Math.floor(Math.random() * r.length)] || null; },
      async () => { const r = await fetchOpenverseMultiple(query, 5); return r[Math.floor(Math.random() * r.length)] || null; },
    ];
    const url = await singleFetchers[providerIndex % singleFetchers.length]();
    if (url) return { success: true, imageOptions: [url] };
    // Try another provider as fallback
    for (let i = 0; i < singleFetchers.length; i++) {
      if (i === providerIndex % singleFetchers.length) continue;
      const fallback = await singleFetchers[i]();
      if (fallback) return { success: true, imageOptions: [fallback] };
    }
    return { success: false, error: `Failed to refresh slot ${providerIndex + 1}` };
  }

  // --- Full Fetch: Get 4 unique images ---
  // Strategy: Fetch from all providers in parallel, collect as many unique URLs as possible,
  // then distribute into 4 slots ensuring uniqueness.

  const [unsplash1, unsplash2, loremFlickr1, loremFlickr2, wikimediaResults, openverseResults] = await Promise.all([
    fetchUnsplash(query, seeds[0]),
    fetchUnsplash(query, seeds[1]),
    fetchLoremFlickr(query, seeds[2]),
    fetchLoremFlickr(query, seeds[3]),
    fetchWikimediaMultiple(query, 6),
    fetchOpenverseMultiple(query, 6),
  ]);

  // Collect all unique URLs into a pool
  const pool: string[] = [];
  const seen = new Set<string>();
  const addToPool = (url: string | null) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      pool.push(url);
    }
  };

  addToPool(unsplash1);
  addToPool(loremFlickr1);
  wikimediaResults.forEach(addToPool);
  openverseResults.forEach(addToPool);
  addToPool(unsplash2);
  addToPool(loremFlickr2);

  console.log(`Image pool has ${pool.length} unique URLs`);

  if (pool.length === 0) {
    return { success: false, error: `No stock images found for "${query}". Please try a more general description.` };
  }

  // Fill 4 slots from the pool
  const finalImages: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (i < pool.length) {
      finalImages.push(pool[i]);
    } else {
      // If we didn't get 4 unique images, cycle through what we have
      finalImages.push(pool[i % pool.length]);
    }
  }

  console.log(`Returning ${finalImages.length} images (${new Set(finalImages).size} unique)`);
  return { success: true, imageOptions: finalImages };
}
