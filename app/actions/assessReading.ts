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

export async function assessReadingAction(
    userAnswers: Record<string, string>,
    examData: any[],
    cefrLevel: string
): Promise<{ success: boolean; error?: string; score?: number; feedback?: string; suggestion?: string; }> {
    if (!userAnswers || Object.keys(userAnswers).length === 0) {
        return {
            success: true,
            score: 0,
            feedback: "You didn't provide any answers to the questions, which made it impossible to assess your reading comprehension. It's essential to attempt all questions to the best of your ability to demonstrate your knowledge and understanding. Don't be discouraged, as this is an opportunity to learn and improve for the next test.",
            suggestion: "Make sure to read each question carefully and provide an answer, even if you're not entirely sure. Practice active reading by underlining or highlighting key information."
        };
    }
    if (!examData || examData.length === 0) return { success: false, error: 'No exam data provided.' };

    try {
        const client = getGroqClient();

        const checkTextAnswer = (userAnswer: string, correctAnswer: string) => {
            if (!userAnswer || !correctAnswer) return false;

            const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,/#!$%^&*;:{ }=\-_`~()'"?]/g, "").replace(/\s+/g, " ");

            const u = normalize(userAnswer);
            let c = correctAnswer.trim().toLowerCase().replace(/^(answer:\s*|correct answer:\s*|correct option:\s*)/i, "");

            if (u === normalize(c)) return true;

            const possibleAnswers = c.split(/\s*(?:\/|,|\bor\b)\s*/).map(a => normalize(a)).filter(Boolean);
            if (possibleAnswers.length > 0 && possibleAnswers.includes(u)) return true;

            if (u.length > 2 && normalize(c).includes(u)) return true;
            if (normalize(c).length > 2 && u.includes(normalize(c))) return true;

            return false;
        };

        // Calculate the raw score locally first to pass into the prompt
        let correctCount = 0;
        const totalQuestions = examData.length;

        const questionDetails = examData.map((q, index) => {
            const userAnswer = userAnswers[q.id] || "No Answer";

            let isCorrect = false;
            const rawCorrectOption = q.correctOption || '';

            if (!q.options || q.options.length === 0) {
                // Text input
                isCorrect = checkTextAnswer(userAnswer, rawCorrectOption);
            } else {
                // Multiple choice
                let normalizedCorrectLetter = rawCorrectOption.trim();
                const match = rawCorrectOption.match(/^([A-Z])[\.\)]?\s/i);
                if (match) {
                    normalizedCorrectLetter = match[1].toUpperCase();
                } else if (rawCorrectOption.trim().length === 1) {
                    normalizedCorrectLetter = rawCorrectOption.trim().toUpperCase();
                }

                isCorrect = userAnswer === normalizedCorrectLetter;

                if (!isCorrect) {
                    const cleanOpt = userAnswer.trim().toLowerCase();
                    const cleanCorrectOption = rawCorrectOption.trim().toLowerCase().replace(/^(answer:\s*|correct answer:\s*|correct option:\s*)/i, "");

                    isCorrect = cleanOpt === cleanCorrectOption
                        || cleanCorrectOption === `option ${cleanOpt}`
                        || cleanCorrectOption === `letter ${cleanOpt}`
                        || (cleanOpt.length > 3 && cleanCorrectOption.includes(cleanOpt))
                        || (cleanCorrectOption.length > 3 && cleanOpt.includes(cleanCorrectOption));
                }
            }

            if (isCorrect) correctCount++;

            return `Question ${index + 1}: ${q.question}
Correct Answer: ${q.correctOption}
Candidate's Answer: ${userAnswer}
Result: ${isCorrect ? 'Correct' : 'Incorrect'}`;
        }).join('\n\n');

        // AI Assessment (Text to Insights) using Llama-3.3-70b-versatile
        const systemPrompt = `You are a certified Cambridge/CEFR English Examiner for the ${cefrLevel} level test.
Your job is to evaluate a candidate's overall performance on a Reading & Use of English exam based on their answers.
CRITICAL: You are writing DIRECTLY to the candidate. Address them as "you" and "your". Never use "the candidate" or "they".

You MUST output your evaluation strictly as a valid JSON object matching this schema:
{
  "score": number, // This MUST be exactly ${correctCount} (the total number of correct answers).
  "feedback": "string", // 2-3 sentences of direct, encouraging feedback explaining their performance based on which questions they got wrong/right, and addressing them directly as "you".
  "suggestion": "string" // 1-2 actionable tips on how they could improve their reading comprehension or vocabulary for the ${cefrLevel} level, addressing them directly as "you".
}
Do not return any markdown wrappers, ONLY the raw JSON object.`;

        const userPrompt = `
Exam Results (${correctCount} out of ${totalQuestions} correct):
${questionDetails}

Evaluate the candidate's reading performance based on these specific answers.`;

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
            score: typeof assessmentJSON.score === 'number' ? assessmentJSON.score : correctCount,
            feedback: assessmentJSON.feedback || "Good effort. Keep practicing to improve your reading comprehension.",
            suggestion: assessmentJSON.suggestion || "Review the questions you missed and read more English texts daily."
        };

    } catch (error: any) {
        console.error('[assessReadingAction] Error:', error);
        return { success: false, error: error.message || 'An error occurred during assessment.' };
    }
}
