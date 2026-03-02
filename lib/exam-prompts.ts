import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

export function getExamPrompt(examType: string, cefrLevel: string, topicPrompt: string) {
    let enhancedTopic = '';
    let partCount = 0;

    let themePrompt = '';
    // Determine typical themes and complexity by level
    if (cefrLevel === 'A1') {
        themePrompt = 'Focus on highly visual, purely literal, and extremely basic situations (e.g., street signs, short notices, one-line text messages, basic personal info).';
    } else if (cefrLevel === 'A2' || cefrLevel === 'B1') {
        themePrompt = 'Focus on concrete, everyday situations (e.g., hobbies, daily routines, travel, shopping, ordering food, basic school/work life, simple personal opinions).';
    } else if (cefrLevel === 'B2' || cefrLevel === 'C1') {
        themePrompt = 'Focus on abstract and professional themes (e.g., environment, technology, societal changes, psychology, complex workplace scenarios, global culture).';
    } else if (cefrLevel === 'C2') {
        themePrompt = 'Focus on highly academic, nuanced, and abstract themes (e.g., philosophy, ethics, advanced science, literature, linguistics, complex socio-economic issues).';
    }

    // ... (Constants for Cambridge Standards)
    const cambridgeStandards = `
CRITICAL ${cefrLevel} CAMBRIDGE STANDARDS:
- Vocabulary: Use ${cefrLevel} relevant vocabulary (refer to English Vocabulary Profile).
- Grammar: Employ complex grammar structures expected at ${cefrLevel} (e.g., conditionals, passive voice, inversion for C1/C2).
- Theme & Complexity: ${themePrompt}
- Tone & Register: Match the required register (formal/informal) perfectly to the task.
- Distractors: For multiple choice, distractors MUST be plausible and test specific ${cefrLevel} reading/listening skills (e.g., understanding implication, attitude, text organization).
`;

    switch (examType) {
        case 'Reading':
            // Reading logic...
            let readingFormatStr = '';
            let totalReadingQuestions = 0;
            if (cefrLevel === 'A1') {
                partCount = 5;
                totalReadingQuestions = 30;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice for short texts/signs.\\nPart 2: Matching.\\nPart 3: Multiple-choice for longer texts.\\nPart 4: Multiple-choice gap-fill.\\nPart 5: Open gap-fill.";
            } else if (cefrLevel === 'A2') {
                partCount = 5; // A2 Key Reading (30 questions total)
                totalReadingQuestions = 30;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice for short texts/signs.\\nPart 2: Matching.\\nPart 3: Multiple-choice for longer texts.\\nPart 4: Multiple-choice gap-fill.\\nPart 5: Open gap-fill.";
            } else if (cefrLevel === 'B1') {
                partCount = 6; // B1 Reading (32 questions total)
                totalReadingQuestions = 32;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (short texts).\\nPart 2: Matching profiles to texts.\\nPart 3: Multiple-choice (long text).\\nPart 4: Gapped text (inserting sentences).\\nPart 5: Multiple-choice gap-fill.\\nPart 6: Open gap-fill.";
            } else if (cefrLevel === 'B2') {
                partCount = 7; // B2 Reading (52 questions total)
                totalReadingQuestions = 52;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice cloze.\\nPart 2: Open cloze.\\nPart 3: Word formation.\\nPart 4: Key word transformations (grammar/vocabulary).\\nPart 5: Multiple-choice reading.\\nPart 6: Gapped text (inserting paragraphs).\\nPart 7: Multiple matching.";
            } else if (cefrLevel === 'C1') {
                partCount = 8; // C1 Reading (56 questions total)
                totalReadingQuestions = 56;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice cloze.\\nPart 2: Open cloze.\\nPart 3: Word formation.\\nPart 4: Key word transformations.\\nPart 5: Cross-text multiple matching (comparing 4 short texts).\\nPart 6: Multiple-choice reading.\\nPart 7: Gapped text.\\nPart 8: Multiple matching.";
            } else {
                partCount = 7; // C2 Reading (53 questions total)
                totalReadingQuestions = 53;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice cloze.\\nPart 2: Open cloze.\\nPart 3: Word formation.\\nPart 4: Key word transformations (up to 8 words).\\nPart 5: Multiple-choice reading.\\nPart 6: Gapped text.\\nPart 7: Multiple matching.";
            }

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete Cambridge ${cefrLevel} Reading and Use of English exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
1. "examTitle": A short, descriptive title for the exam based on the content (max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for Cambridge ${cefrLevel}.

The "parts" array should follow standard Cambridge formats for ${cefrLevel}. 
CRITICAL STRUCTURE REQUIREMENT: The exam MUST have EXACTLY ${totalReadingQuestions} questions in total, appropriately distributed across the ${partCount} parts.
FORMAT REQUIREMENT: ${readingFormatStr}
Crucially, every single part MUST include a 'content' field with a MINIMUM of 150 words of reading text.
If it is a multiple-choice section, provide 'options' and a 'correctOption'. 
If it is an open cloze or word formation, 'options' can be empty, but provide the 'correctOption'.
For each question, provide an 'explanation' (2-3 sentences) detailing why the answer is correct and why distractors are wrong based on Cambridge grading.
Include 'tips' for approaching this specific part type.
${cambridgeStandards}
`;
            break;

        case 'Writing':
            partCount = 2; // Writing is always 2 parts

            let wordCountPart1 = "";
            let wordCountPart2 = "";
            let taskTypesPart1 = "";
            let taskTypesPart2 = "";

            if (cefrLevel === 'A1') {
                wordCountPart1 = "20-30 words";
                wordCountPart2 = "20-30 words";
                taskTypesPart1 = "very short email/note";
                taskTypesPart2 = "simple description based on pictures";
            } else if (cefrLevel === 'A2') {
                wordCountPart1 = "25+ words";
                wordCountPart2 = "35+ words";
                taskTypesPart1 = "short email/note";
                taskTypesPart2 = "short story based on 3 pictures";
            } else if (cefrLevel === 'B1') {
                wordCountPart1 = "~100 words";
                wordCountPart2 = "~100 words";
                taskTypesPart1 = "email responding to notes";
                taskTypesPart2 = "article or a story";
            } else if (cefrLevel === 'B2') {
                wordCountPart1 = "140-190 words";
                wordCountPart2 = "140-190 words";
                taskTypesPart1 = "compulsory essay";
                taskTypesPart2 = "article, email/letter, report, or review";
            } else if (cefrLevel === 'C1') {
                wordCountPart1 = "220-260 words";
                wordCountPart2 = "220-260 words";
                taskTypesPart1 = "compulsory academic essay";
                taskTypesPart2 = "formal/informal letter, proposal, report, or review";
            } else { // C2
                wordCountPart1 = "240-280 words";
                wordCountPart2 = "280-320 words";
                taskTypesPart1 = "compulsory essay summarizing and evaluating two texts";
                taskTypesPart2 = "article, letter, report, or review";
            }

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete Cambridge ${cefrLevel} Writing exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
1. "examTitle": A short, descriptive title for the exam based on the content (max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for Cambridge ${cefrLevel}.

The "parts" array should follow the format of:
- Part 1 (${taskTypesPart1}): Provide 'title', 'instructions' (MUST explicitly state the task type and required word count: ${wordCountPart1}), 'content' (the prompt/notes/texts to respond to). The 'questions' array should have ONE object with 'question' (e.g., "Write your response"), an empty 'options' array. Include 'howToApproach' (a detailed 4-step numbered guide on planning and structure), 'modelAnswer' (an extensive example answer matching the word count and demonstrating ${cefrLevel} grammar/vocab; MUST be clearly formatted with correct styling and multiple paragraphs explicitly separated using \\n\\n), and 'tips' (multi-sentence strategy on register).
- Part 2 (Choice of task: ${taskTypesPart2}): Provide 'title', 'instructions' (MUST explicitly state the required word count: ${wordCountPart2}), 'content' (the scenario). The 'questions' array has ONE object with empty 'options'. Include highly detailed 'howToApproach', 'modelAnswer' (MUST be clearly formatted with multiple paragraphs explicitly separated using \\n\\n), and 'tips' properties just like Part 1.
${cambridgeStandards}
`;
            break;

        case 'Listening':
            let totalListeningQuestions = 0;
            let listeningFormatStr = '';

            if (cefrLevel === 'A1') {
                partCount = 5;
                totalListeningQuestions = 25;
                listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (pictures).\\nPart 2: Very simple gap-fill from a monologue.\\nPart 3: Multiple-choice (short conversation).\\nPart 4: Multiple-choice for main idea.\\nPart 5: Basic matching.";
            } else if (cefrLevel === 'A2') {
                partCount = 5;
                totalListeningQuestions = 25;
                listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (pictures).\\nPart 2: Gap-fill from a monologue.\\nPart 3: Multiple-choice (conversation).\\nPart 4: Multiple-choice for main idea.\\nPart 5: Matching.";
            } else if (cefrLevel === 'B1') {
                partCount = 4;
                totalListeningQuestions = 25;
                listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (pictures).\\nPart 2: Multiple-choice (short recordings).\\nPart 3: Gap-fill (notes).\\nPart 4: Multiple-choice (long interview).";
            } else if (cefrLevel === 'B2' || cefrLevel === 'C1' || cefrLevel === 'C2') {
                partCount = 4;
                totalListeningQuestions = 30;
                if (cefrLevel === 'B2') {
                    listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (short extracts).\\nPart 2: Sentence completion (monologue).\\nPart 3: Multiple matching (5 speakers).\\nPart 4: Multiple-choice (long interview).";
                } else if (cefrLevel === 'C1') {
                    listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (3 short extracts).\\nPart 2: Sentence completion.\\nPart 3: Multiple-choice (long interview).\\nPart 4: Multiple matching (2 tasks simultaneously based on 5 speakers).";
                } else { // C2
                    listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (short extracts).\\nPart 2: Sentence completion.\\nPart 3: Multiple-choice (long interview).\\nPart 4: Multiple matching (complex).";
                }
            }

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete Cambridge ${cefrLevel} Listening exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
1. "examTitle": A short, descriptive title for the exam based on the content (max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for Cambridge ${cefrLevel}.

The "parts" array should follow standard Cambridge formats for ${cefrLevel}.
CRITICAL STRUCTURE REQUIREMENT: The exam MUST have EXACTLY ${totalListeningQuestions} questions in total, distributed across the ${partCount} parts according to the standard specs.
FORMAT REQUIREMENT: ${listeningFormatStr}

The "parts" array should follow the format of:
Provide 'title', 'instructions', 'content' (a highly detailed transcript of the audio).
IMPORTANT TRANSCRIPT FORMAT: The 'content' field MUST be a labeled dialogue with speakers on separate lines, e.g.:
"Interviewer: Welcome to the show, Sarah.\\nSarah: Thank you for having me.\\nInterviewer: So tell us about your work."
Each speaker's line MUST start with their name followed by a colon. Use realistic, natural-sounding dialogue appropriate for ${cefrLevel}.
The 'questions' array MUST contain the correct number of questions for this part — either multiple-choice or gap-fill format.
For multiple-choice questions, provide 'options' (array of 3-4 choices A-C/D) and 'correctOption'.
For each question, provide a 2-3 sentence 'explanation' explaining why the selected answer is correct AND interpreting speaker intent/distractors.
Include 'tips' for approaching the specific listening format.
${cambridgeStandards}
`;
            break;

        case 'Speaking':
            if (cefrLevel === 'A1' || cefrLevel === 'A2') partCount = 2;
            else if (cefrLevel === 'B1' || cefrLevel === 'B2' || cefrLevel === 'C1') partCount = 4;
            else partCount = 3; // C2

            let speakingFormatStr = '';
            if (cefrLevel === 'A1' || cefrLevel === 'A2') {
                speakingFormatStr = `
- Part 1 (Examiner interview - personal questions): Provide 'title', 'instructions', 'content' (interlocutor script). The 'questions' array MUST contain EXACTLY ONE object with: 'question': "Interview Questions", 'options': [], 'tips': "A strategy guide.", 'part1Questions': An array of 5-8 objects (Q1-3 personal, the rest topic-related). Each has 'question', a detailed 'answer' (2-3 sentences), and 'tip'.
- Part 2 (Collaborative task with a partner): Provide 'title', 'instructions', 'content'. Let 'questions' array have ONE object with: 'question': The task prompt, 'options': [], 'imagePrompts': 2 distinct strings for AI image generation depicting contrasting visual scenarios related to the topic, 'possibleAnswers': 3-4 example phrases.
`;
            } else if (cefrLevel === 'B1') {
                speakingFormatStr = `
- Part 1 (Interview): Provide 'title', 'instructions', 'content'. The 'questions' array MUST contain EXACTLY ONE object with 'part1Questions' (5-8 questions/answers).
- Part 2 (Extended turn - describing a photograph for 1 minute): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'imagePrompts' (2 distinct strings depicting contrasting scenarios) and 'possibleAnswers'.
- Part 3 (Collaborative task - discussing options with a partner): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question' (the prompt followed by 5 discussion topics separated by \\n and prefixed with "- "), 'possibleAnswers', and 'tips'.
- Part 4 (General discussion based on the collaborative task): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'part1Questions' (5-6 deep discussion questions/answers).
`;
            } else if (cefrLevel === 'B2') {
                speakingFormatStr = `
- Part 1 (Interview): Provide 'title', 'instructions', 'content'. The 'questions' array MUST contain EXACTLY ONE object with 'part1Questions' (5-8 questions/answers).
- Part 2 (Long turn - comparing 2 photos): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'imagePrompts' (4 distinct strings depicting contrasting scenarios) and 'possibleAnswers'.
- Part 3 (Collaborative task): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question' (the prompt followed by 5 discussion topics separated by \\n and prefixed with "- "), 'possibleAnswers', and 'tips'.
- Part 4 (Deeper discussion of the collaborative topic): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'part1Questions' (5-6 deep discussion questions/answers).
`;
            } else if (cefrLevel === 'C1') {
                speakingFormatStr = `
- Part 1 (Interview): Provide 'title', 'instructions', 'content'. The 'questions' array MUST contain EXACTLY ONE object with 'part1Questions' (5-8 questions/answers).
- Part 2 (Long turn - comparing 2 of 3 photos): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'imagePrompts' (4 distinct strings depicting contrasting scenarios) and 'possibleAnswers'.
- Part 3 (Collaborative task): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question' (the prompt followed by 5 discussion topics separated by \\n and prefixed with "- "), 'possibleAnswers', and 'tips'.
- Part 4 (Advanced abstract discussion): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'part1Questions' (5-6 deep discussion questions/answers).
`;
            } else { // C2
                speakingFormatStr = `
- Part 1 (Interview): Provide 'title', 'instructions', 'content'. The 'questions' array MUST contain EXACTLY ONE object with 'part1Questions' (5-8 questions/answers).
- Part 2 (Collaborative task): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question' (the prompt followed by 5 discussion topics separated by \\n and prefixed with "- "), 'possibleAnswers', and 'tips'.
- Part 3 (Long turn - 2 minutes based on a prompt card, followed by deeply analytical discussion): Provide 'title', 'instructions', 'content'. The 'questions' array has ZERO 'imagePrompts'. Instead, it has EXACTLY ONE object with 'question': The task prompt text card content, and 'part1Questions' containing extensive analytical discussion questions.
`;
            }

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete Cambridge ${cefrLevel} Speaking exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
1. "examTitle": A short, descriptive title for the exam based on the content (max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for Cambridge ${cefrLevel}.

The "parts" array should follow the format of:
${speakingFormatStr}
${cambridgeStandards}
`;
            break;
    }

    return { enhancedTopic, partCount };
}

// ... helper functions
let groq: Groq | null = null;
let genAI: GoogleGenerativeAI | null = null;

export async function generateContentWithFallback(prompt: string): Promise<string> {
    if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
    if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    const aiProvider = process.env.AI_PROVIDER || 'groq';

    if (aiProvider === 'groq') {
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                response_format: { type: "json_object" },
            });
            return completion.choices[0]?.message?.content || "";
        } catch (error) {
            console.error("Groq failed, falling back to Gemini:", error);
            // Fallback to Gemini
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            return result.response.text();
        }
    } else {
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error("Gemini failed, falling back to Groq:", error);
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                response_format: { type: "json_object" },
            });
            return completion.choices[0]?.message?.content || "";
        }
    }
}
