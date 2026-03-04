'use server';

import { createClient } from "@supabase/supabase-js";
import crypto from 'node:crypto';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// HuggingFace models to try in order (Stable Diffusion focus)
const HF_MODELS = [
  'runwayml/stable-diffusion-v1-5',
  'prompthero/openjourney',
  'stabilityai/stable-diffusion-2-1',
  'stabilityai/stable-diffusion-xl-base-1.0'
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

  // 2. STAGE 1: Hugging Face (Stable Diffusion Only)
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const enhancedPrompt = `${query}, high quality realistic detailed photography, 4k, professional`;
  let lastError = '';

  if (apiKey) {
    for (const model of HF_MODELS) {
      try {
        console.log(`[Stable Diffusion] Trying model: ${model}`);
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
          console.warn(`[Stable Diffusion] Limit hit (${response.status}) on ${model}.`);
          lastError = `Limit reached (${response.status})`;
          continue; // Try next SD model
        }

        if (response.status === 503) {
          const text = await response.text();
          if (text.includes('loading')) {
            console.warn(`[Stable Diffusion] Model ${model} is loading. Trying next...`);
            lastError = `Model is loading`;
            continue;
          }
        }

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 1000) {
            console.log(`[Stable Diffusion] Success (${model}) — ${Math.round(buffer.length / 1024)}KB`);
            const publicUrl = await uploadToSupabase(filename, buffer, contentType);
            if (publicUrl) return { success: true, imageUrl: publicUrl };
            return { success: true, imageUrl: `data:${contentType};base64,${buffer.toString('base64')}` };
          }
        } else {
          const text = await response.text();
          console.warn(`[Stable Diffusion] ${model} failed (${response.status}): ${text.substring(0, 50)}`);
          lastError = `${model}: ${response.status}`;
        }
      } catch (err: any) {
        console.warn(`[Stable Diffusion] ${model} exception:`, err?.message || err);
        lastError = err?.message || String(err);
      }
    }
  } else {
    lastError = 'No HF API Key found in environment';
  }

  return {
    success: false,
    error: `Stable Diffusion image generation failed. (HF Error: ${lastError}). Please try again later or use a different topic.`
  };
}
