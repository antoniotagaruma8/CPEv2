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

  // 2. STAGE 1: Hugging Face
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const enhancedPrompt = `${query}, high quality realistic detailed photography, 4k, professional`;
  let lastError = '';

  if (apiKey) {
    for (const model of HF_MODELS) {
      try {
        console.log(`[STAGE 1] Trying HF (${model}) for hash: ${hash}`);
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

        if (response.status === 402 || response.status === 429) {
          console.warn(`[STAGE 1] HF Limit hit (${response.status}) on ${model}. Switching to fallbacks.`);
          lastError = `HF Limit (${response.status})`;
          break; // Stop trying HF
        }

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 1000) {
            console.log(`[STAGE 1] HF Success (${model}) — ${Math.round(buffer.length / 1024)}KB`);
            const publicUrl = await uploadToSupabase(filename, buffer, contentType);
            if (publicUrl) return { success: true, imageUrl: publicUrl };
            return { success: true, imageUrl: `data:${contentType};base64,${buffer.toString('base64')}` };
          }
        } else {
          const text = await response.text();
          console.warn(`[STAGE 1] HF ${model} failed (${response.status}): ${text.substring(0, 50)}`);
          lastError = `${model}: ${response.status}`;
        }
      } catch (err: any) {
        console.warn(`[STAGE 1] HF ${model} exception:`, err?.message || err);
        lastError = err?.message || String(err);
      }
    }
  } else {
    lastError = 'No HF API Key';
  }

  // 3. STAGE 2: Pollinations (Complex Prompt)
  try {
    console.log(`[STAGE 2] Trying Pollinations (Complex) for: ${hash}`);
    const encodedComplex = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://pollinations.ai/p/${encodedComplex}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    const response = await fetch(url);
    if (response.ok) {
      const ct = response.headers.get('content-type') || 'image/jpeg';
      const ab = await response.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > 500) { // Lower threshold for safety
        console.log(`[STAGE 2] Pollinations Success — ${Math.round(buf.length / 1024)}KB`);
        const publicUrl = await uploadToSupabase(filename, buf, ct);
        if (publicUrl) return { success: true, imageUrl: publicUrl };
        return { success: true, imageUrl: `data:${ct};base64,${buf.toString('base64')}` };
      }
    }
    console.warn(`[STAGE 2] Pollinations complex failed with status: ${response.status}`);
  } catch (err: any) {
    console.warn(`[STAGE 2] Pollinations complex exception:`, err?.message || err);
  }

  // 4. STAGE 3: Pollinations (Simple Prompt)
  try {
    console.log(`[STAGE 3] Trying Pollinations (Simple) for: ${hash}`);
    const encodedSimple = encodeURIComponent(query);
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://pollinations.ai/p/${encodedSimple}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    const response = await fetch(url);
    if (response.ok) {
      const ct = response.headers.get('content-type') || 'image/jpeg';
      const ab = await response.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > 500) {
        console.log(`[STAGE 3] Pollinations Simple Success — ${Math.round(buf.length / 1024)}KB`);
        const publicUrl = await uploadToSupabase(filename, buf, ct);
        if (publicUrl) return { success: true, imageUrl: publicUrl };
        return { success: true, imageUrl: `data:${ct};base64,${buf.toString('base64')}` };
      }
    }
  } catch (err: any) {
    console.error(`[STAGE 3] Critical failure:`, err?.message || err);
  }

  return {
    success: false,
    error: `Image generation failed at all stages. Last HF Error: ${lastError}. Please try a different topic or try again later.`
  };
}
