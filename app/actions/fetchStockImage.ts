'use server';

import { createClient } from "@supabase/supabase-js";
import crypto from 'node:crypto';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// HuggingFace models to try in order (Expanded Stable Diffusion list)
const HF_MODELS = [
  'runwayml/stable-diffusion-v1-5',
  'Lykon/DreamShaper',
  'prompthero/openjourney-v4',
  'stabilityai/stable-diffusion-2-1',
  'SG_161222/RealVisXL_V4.0',
  'OIG/SD-v1.5-Inference-V2'
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

  // 2. STAGE 1: Hugging Face (Stable Diffusion Rotation)
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const enhancedPrompt = `${query}, high quality realistic detailed photography, 4k, professional`;
  let lastError = '';

  if (apiKey) {
    for (const model of HF_MODELS) {
      try {
        console.log(`[Stable Diffusion] Trying model: ${model}`);
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
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
          console.warn(`[Stable Diffusion] Limit hit (${response.status}) on ${model}. Trying next model...`);
          lastError = `Limit reached (${response.status})`;
          continue;
        }

        if (response.status === 503) {
          const text = await response.text();
          if (text.includes('loading')) {
            console.warn(`[Stable Diffusion] Model ${model} is loading. Trying next...`);
            lastError = `Model ${model} is loading`;
            continue;
          }
        }

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 500) {
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
    lastError = 'No HF API Key found';
  }

  // 3. STAGE 2: Stock Photo Fallback (Last Resort)
  try {
    console.log(`[Fallback] All SD models hit limits. Trying high-quality stock photo for: ${query}`);
    // Using Unsplash Source (via keyword search)
    const stockUrl = `https://images.unsplash.com/photo-1545641203-7d072a14e3b2?auto=format&fit=crop&w=1024&q=80&q=${encodeURIComponent(query)}`;

    const response = await fetch(`https://source.unsplash.com/featured/1024x1024?${encodeURIComponent(query)}`);
    if (response.ok) {
      const ct = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > 1000) {
        console.log(`[Fallback] Stock Photo Success — ${Math.round(buffer.length / 1024)}KB`);
        const publicUrl = await uploadToSupabase(filename, buffer, ct);
        if (publicUrl) return { success: true, imageUrl: publicUrl };
        return { success: true, imageUrl: `data:${ct};base64,${buffer.toString('base64')}` };
      }
    }
  } catch (err: any) {
    console.warn(`[Fallback] Stock photo failure:`, err?.message || err);
  }

  return {
    success: false,
    error: `All image generation methods failed. (HF: ${lastError}). Please try a more general topic.`
  };
}
