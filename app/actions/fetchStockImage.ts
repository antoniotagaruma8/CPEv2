'use server';

import { createClient } from "@supabase/supabase-js";
import crypto from 'node:crypto';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// HuggingFace models to try in order
const HF_MODELS = [
  'stabilityai/stable-diffusion-3.5-large',
  'black-forest-labs/FLUX.1-schnell',
  'stabilityai/stable-diffusion-xl-base-1.0',
  'prompthero/openjourney',
];

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

export async function fetchStockImageAction(query: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const hash = crypto.createHash('sha256').update(query).digest('hex');
  const filename = `${hash}.jpeg`;

  // 1. Check Supabase cache
  try {
    const { data: fileList, error: listError } = await supabase.storage.from('images').list('', {
      search: filename
    });

    if (!listError && fileList && fileList.length > 0 && fileList.some(f => f.name === filename)) {
      console.log(`Image cache hit for hash: ${hash}`);
      const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filename);
      return { success: true, imageUrl: publicUrlData.publicUrl };
    }
  } catch (error) {
    console.error("Error checking Supabase cache:", error);
  }

  // 2. Generate with Stable Diffusion via HuggingFace (free)
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const enhancedPrompt = `${query}, high quality realistic detailed photography, 4k, professional`;
  let lastError = '';

  if (apiKey) {
    for (const model of HF_MODELS) {
      try {
        console.log(`Generating image via HuggingFace (${model}) for hash: ${hash}`);

        const response = await fetch(
          `https://router.huggingface.co/hf-inference/models/${model}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: enhancedPrompt }),
          }
        );

        if (response.status === 503) {
          const text = await response.text();
          if (text.includes('loading')) {
            console.warn(`Model ${model} is loading. Trying next...`);
            lastError = `Model ${model} is loading`;
            continue;
          }
        }

        // Detect 402 (Payment Required/Limit) or 429 (Too Many Requests)
        if (response.status === 402 || response.status === 429) {
          console.warn(`HuggingFace limit reached (${response.status}) for ${model}. Fast-tracking Pollinations fallback.`);
          lastError = `HF Limit (${response.status})`;
          break; // Exit loop to trigger Pollinations immediately
        }

        if (!response.ok) {
          const text = await response.text();
          console.warn(`HuggingFace ${model} returned ${response.status}: ${text.substring(0, 100)}`);
          lastError = `${model}: ${response.status}`;
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          console.warn(`HuggingFace ${model} returned ${contentType}, not an image`);
          lastError = `${model} returned non-image content`;
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 1000) {
          console.warn(`HuggingFace ${model} returned too-small image (${buffer.length} bytes)`);
          lastError = `${model} returned tiny image`;
          continue;
        }

        console.log(`HuggingFace (${model}) success — ${Math.round(buffer.length / 1024)}KB`);

        // 3. Upload to Supabase
        const publicUrl = await uploadToSupabase(filename, buffer, contentType);
        if (publicUrl) return { success: true, imageUrl: publicUrl };

        const base64 = buffer.toString('base64');
        return { success: true, imageUrl: `data:${contentType};base64,${base64}` };

      } catch (error: any) {
        const msg = error?.message || String(error);
        console.warn(`HuggingFace (${model}) failed:`, msg.substring(0, 150));
        lastError = msg;
        continue;
      }
    }
  } else {
    lastError = 'Missing HUGGINGFACE_API_KEY';
  }

  // 4. Fallback to Pollinations AI (More robust logic)
  try {
    console.log(`HF failed (Last error: ${lastError}). Trying Pollinations AI fallback...`);
    const encodedPrompt = encodeURIComponent(enhancedPrompt);

    // Try up to 2 seeds if needed
    for (const attempt of [1, 2]) {
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'image/*', 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow',
          next: { revalidate: 0 } // Bypass Next.js cache for this attempt
        });

        if (response.ok) {
          const ct = response.headers.get('content-type') || 'image/jpeg';
          const ab = await response.arrayBuffer();
          const buf = Buffer.from(ab);

          if (buf.length > 2000) { // Slightly stricter min size for quality
            console.log(`Pollinations success (attempt ${attempt}) — ${Math.round(buf.length / 1024)}KB`);
            const publicUrl = await uploadToSupabase(filename, buf, ct);
            if (publicUrl) return { success: true, imageUrl: publicUrl };
            return { success: true, imageUrl: `data:${ct};base64,${buf.toString('base64')}` };
          }
        }
      } catch (e) {
        console.warn(`Pollinations attempt ${attempt} failed:`, e);
      }
    }
  } catch (e) {
    console.error('Critical failure in Pollinations fallback logic:', e);
  }

  return { success: false, error: `Image generation failed. (HF: ${lastError} -> Pollinations: Failed)` };
}
