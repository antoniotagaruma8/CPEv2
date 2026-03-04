'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Analyzes 2 stock photos via Gemini vision and generates a Cambridge-style
 * Speaking Part 2 comparison question that's relevant to what's actually in the photos.
 */
export async function analyzePhotosAction(
    imageUrls: string[],
    cefrLevel: string = 'B2'
): Promise<{ success: boolean; question?: string; error?: string }> {
    if (!imageUrls || imageUrls.length < 2) {
        return { success: false, error: 'Need at least 2 image URLs' };
    }

    try {
        // Download images as base64
        const imageparts = await Promise.all(
            imageUrls.slice(0, 2).map(async (url) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) return null;
                    const buffer = await response.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString('base64');
                    const mimeType = response.headers.get('content-type') || 'image/jpeg';
                    return {
                        inlineData: {
                            data: base64,
                            mimeType,
                        },
                    };
                } catch (e) {
                    console.warn(`[analyzePhotos] Failed to download: ${url}`, e);
                    return null;
                }
            })
        );

        const validParts = imageparts.filter((p): p is { inlineData: { data: string; mimeType: string } } => p !== null);
        if (validParts.length < 2) {
            return { success: false, error: 'Could not download enough images for analysis' };
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a Cambridge ${cefrLevel} Speaking exam interlocutor. Look at these two photographs carefully.

Your task:
1. Identify what each photo shows (subject, setting, mood, activity)
2. Find a meaningful thematic connection between the two photos
3. Generate ONE Cambridge-style Speaking Part 2 comparison question

The question MUST:
- Start with "Here are your photographs. They show..."
- Include a brief thematic link (e.g., "They show different ways people spend their free time")
- End with a comparison task (e.g., "I'd like you to compare the photographs, and say which situation looks more enjoyable and why.")
- Be natural and relevant to what's actually visible in the photos
- Be 1-3 sentences maximum

Respond with ONLY the question text, nothing else. No quotes, no labels, no explanation.`;

        const result = await model.generateContent([prompt, ...validParts]);
        const response = await result.response;
        const question = response.text()?.trim();

        if (!question) {
            return { success: false, error: 'Gemini returned empty response' };
        }

        console.log(`[analyzePhotos] Generated question: "${question.substring(0, 100)}..."`);
        return { success: true, question };

    } catch (error: any) {
        console.error('[analyzePhotos] Error:', error);
        return { success: false, error: error.message || 'Photo analysis failed' };
    }
}
