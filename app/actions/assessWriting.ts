'use server';

import Groq from 'groq-sdk';

// Get API keys for rotation
const groqApiKeys = [
    process.env.GROQ_API_KEY,
    ...Array.from({ length: 10 }, (_, i) => process.env[`GROQ_API_KEY_${i + 1}`]),
].filter(Boolean) as string[];

let keyIndex = 0;
function getGroqClient(): Groq {
    if (groqApiKeys.length === 0) throw new Error("No Groq API keys available");
    const key = groqApiKeys[keyIndex % groqApiKeys.length];
    keyIndex++;
    return new Groq({ apiKey: key });
}

export async function assessWritingAction(userText: string, questionText: string, cefrLevel: string): Promise<{ success: boolean; error?: string; score?: number; feedback?: string; suggestion?: string; }> {
    if (!userText || userText.trim() === '') return { success: false, error: 'No text provided.' };
    if (!questionText) return { success: false, error: 'No question context provided.' };

    try {
        const client = getGroqClient();

        // AI Assessment (Text to Insights) using Llama-3.3-70b-versatile
        const systemPrompt = `You are a certified Cambridge/CEFR English Examiner for the ${cefrLevel} level test.
Your job is to evaluate a candidate's written response to a writing task/question. 
CRITICAL: You are writing DIRECTLY to the candidate. Address them as "you" and "your". Never use "the candidate" or "they".

You MUST output your evaluation strictly as a valid JSON object matching this schema:
{
  "score": number, // Integer from 1 to 10 grading your accuracy, vocabulary, grammar, and relevance to the ${cefrLevel} standard (10 is perfect).
  "feedback": "string", // 2-3 sentences of direct, encouraging feedback explaining the score and addressing the candidate directly as "you".
  "suggestion": "string" // 1-2 actionable tips on how they could improve this specific answer, what they omitted, or structural advice, addressing them directly as "you".
}
Do not return any markdown wrappers, ONLY the raw JSON object.`;

        const userPrompt = `
Writing Task / Prompt: "${questionText}"
Candidate's Written Answer: "${userText}"

Evaluate the candidate's response.`;

        const completion = await client.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const assessmentContent = completion.choices[0]?.message?.content;

        if (!assessmentContent) {
            throw new Error("Assessment model returned empty response.");
        }

        const assessmentJSON = JSON.parse(assessmentContent);

        return {
            success: true,
            score: typeof assessmentJSON.score === 'number' ? assessmentJSON.score : 0,
            feedback: assessmentJSON.feedback,
            suggestion: assessmentJSON.suggestion
        };

    } catch (error: any) {
        console.error('[assessWritingAction] Error:', error);
        return { success: false, error: error.message || 'An error occurred during assessment.' };
    }
}
