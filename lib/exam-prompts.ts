import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

export function getExamPrompt(examType: string, cefrLevel: string, topicPrompt: string) {
    let enhancedTopic = '';
    let partCount = 0;

    // ... (Constants for Cambridge Standards)
    const cambridgeStandards = `
CRITICAL ${cefrLevel} CAMBRIDGE STANDARDS:
- Vocabulary: Use ${cefrLevel} relevant vocabulary (refer to English Vocabulary Profile).
- Grammar: Employ complex grammar structures expected at ${cefrLevel} (e.g., conditionals, passive voice, inversion for C1/C2).
- Tone & Register: Match the required register (formal/informal) perfectly to the task.
- Distractors: For multiple choice, distractors MUST be plausible and test specific ${cefrLevel} reading/listening skills (e.g., understanding implication, attitude, text organization).
`;

    switch (examType) {
        case 'Reading':
            // Reading logic...
            if (cefrLevel === 'A1' || cefrLevel === 'A2') partCount = 5;
            else if (cefrLevel === 'B1') partCount = 6;
            else if (cefrLevel === 'B2') partCount = 7;
            else partCount = 8; // C1/C2 Have 8 parts in Reading and UoE

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete Cambridge ${cefrLevel} Reading and Use of English exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
1. "examTitle": A short, descriptive title for the exam based on the content (max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for Cambridge ${cefrLevel}.

The "parts" array should follow standard Cambridge formats for ${cefrLevel}. 
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

            let wordCountRange = "";
            if (cefrLevel === 'A1') wordCountRange = "20-30 words";
            else if (cefrLevel === 'A2') wordCountRange = "35-45 words";
            else if (cefrLevel === 'B1') wordCountRange = "100-130 words";
            else if (cefrLevel === 'B2') wordCountRange = "140-190 words";
            else if (cefrLevel === 'C1') wordCountRange = "220-260 words";
            else wordCountRange = "280-320 words"; // C2

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete Cambridge ${cefrLevel} Writing exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
1. "examTitle": A short, descriptive title for the exam based on the content (max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for Cambridge ${cefrLevel}.

The "parts" array should follow the format of:
- Part 1 (Compulsory Essay/Email): Provide 'title', 'instructions' (MUST explicitly state the required word count: ${wordCountRange}), 'content' (the prompt/notes to respond to). The 'questions' array should have ONE object with 'question' (e.g., "Write your essay/email"), an empty 'options' array. Include 'howToApproach' (a detailed 4-step numbered guide on planning and structure), 'modelAnswer' (an extensive, multi-paragraph example answer matching the word count and demonstrating ${cefrLevel} grammar/vocab), and 'tips' (multi-sentence strategy on register).
- Part 2 (Choice of task): MUST be an Email or Letter writing task. Provide 'title', 'instructions' (MUST state word count: ${wordCountRange}), 'content' (the scenario). The 'questions' array has ONE object with empty 'options'. Include highly detailed 'howToApproach', 'modelAnswer', and 'tips' properties just like Part 1.
${cambridgeStandards}
`;
            break;

        case 'Listening':
            if (cefrLevel === 'A1' || cefrLevel === 'A2') partCount = 5;
            else partCount = 4; // B1-C2

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete Cambridge ${cefrLevel} Listening exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
1. "examTitle": A short, descriptive title for the exam based on the content (max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for Cambridge ${cefrLevel}.

The "parts" array should follow the format of:
Provide 'title', 'instructions', 'content' (a highly detailed transcript of the audio).
IMPORTANT TRANSCRIPT FORMAT: The 'content' field MUST be a labeled dialogue with speakers on separate lines, e.g.:
"Interviewer: Welcome to the show, Sarah.\\nSarah: Thank you for having me.\\nInterviewer: So tell us about your work."
Each speaker's line MUST start with their name followed by a colon. Use realistic, natural-sounding dialogue appropriate for ${cefrLevel}.
The 'questions' array MUST contain EXACTLY 5 questions per part — either multiple-choice or gap-fill format.
For multiple-choice questions, provide 'options' (array of 4 choices A-D) and 'correctOption'.
For each question, provide a 2-3 sentence 'explanation' explaining why the selected answer is correct AND interpreting speaker intent/distractors.
Include 'tips' for approaching the specific listening format.
${cambridgeStandards}
`;
            break;

        case 'Speaking':
            if (cefrLevel === 'A1' || cefrLevel === 'A2') partCount = 2;
            else if (cefrLevel === 'B1' || cefrLevel === 'B2' || cefrLevel === 'C1') partCount = 4;
            else partCount = 3; // C2
            const speakingParts = partCount;

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete Cambridge ${cefrLevel} Speaking exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
1. "examTitle": A short, descriptive title for the exam based on the content (max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for Cambridge ${cefrLevel}.

The "parts" array should follow the format of:
- Part 1 (Interview): Provide 'title', 'instructions', 'content' (interlocutor script). The 'questions' array MUST contain EXACTLY ONE object with:
  - 'question': "Interview Questions".
  - 'options': [].
  - 'tips': A comprehensive strategy guide for Part 1. Include advice on expanding answers beyond a simple 'yes' or 'no', using linking words, and sounding natural.
  - 'part1Questions': An array of 5-8 objects. Questions 1-3 should be personal ("Where are you from?"). The rest related to ${topicPrompt}. Each object has 'question', a detailed, high-scoring 'answer' (2-3 sentences long) at ${cefrLevel} level demonstrating good vocabulary, and 'tip' (specific advice on grammar/vocab for that question).
`;

            if (speakingParts >= 2) {
                enhancedTopic += `- Part 2 (Long turn / Collaborative task depending on level): Provide 'title', 'instructions', 'content'. Let the 'questions' array have ONE object with:
  - 'question': The task prompt.
  - 'options': [].
  - 'imagePrompts': For B1-C2, provide 4 distinct strings for AI image generation. For A1/A2, provide just 2 strings. CRITICAL CAMBRIDGE STANDARD: These prompts MUST depict contrasting visual scenarios related to the same topic (e.g., "A stressful, crowded office environment" vs. "A peaceful, remote work setting" or "An extreme outdoor sport" vs. "A relaxing indoor hobby"). This is essential so candidates can "compare and contrast" the different situations as required by Cambridge exams.
  - 'possibleAnswers': 3-4 example sentences or phrases demonstrating how a ${cefrLevel} candidate should compare, contrast, or speculate about the images.
  - 'tips': Extensive advice for ${cefrLevel} candidates. Focus on time management (e.g., "Don't spend too long describing"), discourse management, and interactive communication.
`;
            }

            if (speakingParts >= 3) {
                enhancedTopic += `- Part 3 (Collaborative Task / Discussion): Provide 'title', 'instructions', 'content' (context). Let 'questions' array have ONE object with:
  - 'question': The discussion prompt followed by a list of 5 discussion topics. CRITICAL FORMATTING: Use plain newline characters (\\n) to separate lines. Use "- " (dash space) to prefix each bullet topic. Do NOT use HTML tags like <br/>, do NOT use asterisks (*) for bullets. Example format: "Discuss the following topics:\\n- Topic one\\n- Topic two\\n- Topic three"
  - 'options': [].
  - 'possibleAnswers': 3-4 complex example sentences demonstrating how a ${cefrLevel} candidate should initiate discussion, express opinions, agree/disagree politely, and move the conversation forward.
  - 'tips': Comprehensive advice for ${cefrLevel} candidate interaction. Emphasize that this is a collaborative task, not a monologue. Focus on active listening, turn-taking, and referencing the partner's points.
`;
            }

            if (speakingParts >= 4) {
                enhancedTopic += `- Part 4 (Discussion): Provide 'title', 'instructions', 'content' (context). Let 'questions' array have ONE object with:
  - 'question': "Discussion on topics related to Part 3".
  - 'options': [].
  - 'part1Questions': An array of 5-6 deep, abstract discussion questions. Each with 'question', an extensive 3-4 sentence 'answer' modeling ${cefrLevel} discourse, and 'tip'.
`;
            }
            enhancedTopic += `${cambridgeStandards}\n`;
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
