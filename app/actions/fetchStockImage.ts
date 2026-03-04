'use server';

import { createClient } from "@supabase/supabase-js";
import crypto from 'node:crypto';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Unsplash (via direct source endpoint)
async function fetchUnsplash(query: string): Promise<string | null> {
  try {
    const response = await fetch(`https://source.unsplash.com/featured/1024x1024?${encodeURIComponent(query)}`);
    if (response.ok) return response.url;
  } catch (e) { console.warn("Unsplash fetch failed", e); }
  return null;
}

// 2. Lorem Flickr (keyword based)
async function fetchLoremFlickr(query: string): Promise<string | null> {
  try {
    const response = await fetch(`https://loremflickr.com/1024/1024/${encodeURIComponent(query)}`);
    if (response.ok) return response.url;
  } catch (e) { console.warn("Lorem Flickr fetch failed", e); }
  return null;
}

// 3. Wikimedia Commons
async function fetchWikimedia(query: string): Promise<string | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&piprop=original&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&origin=*`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const pages = data.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      return pages[pageId].original?.source || null;
    }
  } catch (e) { console.warn("Wikimedia fetch failed", e); }
  return null;
}

// 4. Openverse (via public API)
async function fetchOpenverse(query: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=1`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.results?.[0]?.url || null;
  } catch (e) { console.warn("Openverse fetch failed", e); }
  return null;
}

async function uploadToSupabase(filename: string, buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    const { error: uploadError } = await supabase.storage.from('images').upload(filename, buffer, {
      contentType: mimeType,
      upsert: true
    });

    if (uploadError) {
      console.error("Error uploading image to Supabase:", uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filename);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Supabase upload exception:", error);
    return null;
  }
}

export async function fetchStockImageAction(query: string, providerIndex?: number): Promise<{ success: boolean; imageOptions?: string[]; error?: string }> {
  // We'll try to get images from all 4 providers to give the user options
  console.log(`Searching stock photos for: ${query}${providerIndex !== undefined ? ` (Reloading provider ${providerIndex + 1})` : ''}`);

  // Add a random component to the query for providers that support redirect-based randomness
  const randomSig = crypto.randomBytes(4).toString('hex');
  const randomizedQuery = `${query}&sig=${randomSig}`;

  const fetchers = [
    () => fetchUnsplash(randomizedQuery),
    () => fetchLoremFlickr(randomizedQuery),
    () => fetchWikimedia(query), // Wikimedia handles its own randomization/search logic
    () => fetchOpenverse(query)  // Openverse handles its own randomization/search logic
  ];

  if (providerIndex !== undefined && providerIndex >= 0 && providerIndex < fetchers.length) {
    const url = await fetchers[providerIndex]();
    if (url) {
      return { success: true, imageOptions: [url] };
    }
    return { success: false, error: `Failed to refresh provider ${providerIndex + 1}` };
  }

  // Fetch all providers in parallel
  const initialResults = await Promise.all(fetchers.map(f => f()));

  // Create a final array of 4 slots
  const finalResults: (string | null)[] = [...initialResults];

  // Reliability Check: If any slot is empty, try to fill it with a simpler query or a duplicate (if needed as last resort)
  for (let i = 0; i < finalResults.length; i++) {
    if (!finalResults[i]) {
      console.log(`Slot ${i + 1} empty, attempting fallback...`);
      // Fallback 1: Simpler query (take first two words)
      const simplerQuery = query.split(' ').slice(0, 2).join(' ');
      if (simplerQuery !== query) {
        finalResults[i] = await fetchers[i](); // Retry same provider with same randomized query
      }

      // Fallback 2: If still empty, steal from a successful provider but with different randomization if possible
      if (!finalResults[i]) {
        const anyValid = finalResults.find(url => url !== null);
        if (anyValid) {
          // We'll just use the successful one for now to ensure visibility, 
          // but randomized query params already ensure some variety where supported.
          finalResults[i] = anyValid;
        }
      }
    }
  }

  const totalFound = finalResults.filter(url => url !== null).length;

  if (totalFound > 0) {
    console.log(`Stock search complete: Found ${totalFound}/4 images`);
    return { success: true, imageOptions: finalResults as string[] };
  }

  return {
    success: false,
    error: `No stock images found for "${query}". Please try a more general description.`
  };
}
