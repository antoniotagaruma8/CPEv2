'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
    if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    return genAI;
}

/**
 * Analyzes 2 stock photos via Gemini vision and generates a Cambridge-style
 * Speaking Part 2 comparison question that's relevant to what's actually in the photos.
 */
export async function analyzePhotosAction(
    imageUrls: string[],
    cefrLevel: string = 'B2'
): Promise<{ success: boolean; question?: string; possibleAnswers?: string[]; error?: string }> {
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

        const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a Cambridge ${cefrLevel} Speaking exam interlocutor and evaluator. Look closely at these two photographs.

Your task:
1. Identify what each photo shows (subject, setting, mood, activity).
2. Find a meaningful thematic connection between the two photos.
3. Generate ONE Cambridge-style Speaking Part 2 comparison question.
4. Generate TWO distinct, high-quality candidate 'possible answers' (3-4 sentences each) that directly describe and compare the specific visual details seen in THESE two specific photos.

REQUIREMENTS:
- The question MUST start with "Here are your photographs. They show..." and end with a comparison task (e.g., "I'd like you to compare the photographs, and say...").
- The two possible answers MUST explicitly reference the visual elements in the photos (e.g. "In the first photo, I can see a woman reading a book on a crowded train, whereas the second photo shows...").

CRITICAL: You MUST respond ONLY with a valid JSON object matching this schema exactly:
{
  "question": "string",
  "possibleAnswers": ["string", "string"]
}
Do not include markdown wrappers or any other text.`;

        const result = await model.generateContent([
            prompt,
            ...validParts,
            { text: "Output JSON only." }
        ]);
        const response = await result.response;
        const textResponse = response.text()?.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');

        if (!textResponse) {
            return { success: false, error: 'Gemini returned empty response' };
        }

        try {
            const parsed = JSON.parse(textResponse);
            console.log(`[analyzePhotos] Generated question & answers successfully.`);
            return {
                success: true,
                question: parsed.question,
                possibleAnswers: parsed.possibleAnswers
            };
        } catch (jsonErr) {
            console.error('[analyzePhotos] JSON parse failed on:', textResponse);
            return { success: false, error: 'Gemini did not return valid JSON' };
        }

    } catch (error: any) {
        console.error('[analyzePhotos] Error:', error);
        return { success: false, error: error.message || 'Photo analysis failed' };
    }
}
