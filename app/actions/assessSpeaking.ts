'use server';

import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

export async function assessSpeakingAction(base64Audio: string, questionText: string, cefrLevel: string): Promise<{ success: boolean; error?: string; transcript?: string; score?: number; feedback?: string; suggestion?: string; }> {
    if (!base64Audio) return { success: false, error: 'No audio provided.' };
    if (!questionText) return { success: false, error: 'No question context provided.' };

    const tempFilePath = path.join(os.tmpdir(), `speaking-recording-${Date.now()}.webm`);

    try {
        // 1. Decode generic Base64 string to a temporary WebM file for Groq Whisper
        const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
        const audioBuffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(tempFilePath, audioBuffer);

        const client = getGroqClient();

        // 2. Transcription (Audio to Text) using whisper-large-v3
        const transcription = await client.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-large-v3',
            response_format: 'json',
            language: 'en'
        });

        // @ts-ignore - The Groq SDK typings for whisper sometimes overlap text and object formats.
        const transcriptText: string = transcription?.text || String(transcription) || '';

        if (!transcriptText || transcriptText.trim() === '') {
            return { success: false, error: 'Could not transcribe any speech from the audio.' };
        }

        // 3. AI Assessment (Text to Insights) using Llama-3.3-70b-versatile
        const systemPrompt = `You are a certified Cambridge/CEFR English Examiner for the ${cefrLevel} level test.
Your job is to evaluate a candidate's spoken response to an interview question.
You MUST output your evaluation strictly as a valid JSON object matching this schema:
{
  "score": number, // Integer from 1 to 10 grading their accuracy, vocabulary, grammar, and relevance to the ${cefrLevel} standard (10 is perfect).
  "feedback": "string", // 2-3 sentences of direct, encouraging feedback explaining the score.
  "suggestion": "string" // 1-2 actionable tips on how they could improve this specific answer or what they omitted.
}
Do not return any markdown wrappers, ONLY the raw JSON object.`;

        const userPrompt = `
Question Asked: "${questionText}"
Candidate's Spoken Answer (Transcribed): "${transcriptText}"

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
            transcript: transcriptText,
            score: typeof assessmentJSON.score === 'number' ? assessmentJSON.score : 0,
            feedback: assessmentJSON.feedback,
            suggestion: assessmentJSON.suggestion
        };

    } catch (error: any) {
        console.error('[assessSpeakingAction] Error:', error);
        return { success: false, error: error.message || 'An error occurred during assessment.' };
    } finally {
        // Cleanup temporary file
        if (fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                console.warn('Failed to cleanup temp audio file:', e);
            }
        }
    }
}
