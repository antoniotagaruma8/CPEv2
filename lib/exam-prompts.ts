import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

export function getExamPrompt(examType: string, cefrLevel: string, topicPrompt: string) {
    let enhancedTopic = '';
    let partCount = 0;

    let difficultyPrompt = '';
    let themePrompt = '';
    // Determine typical themes and complexity by level
    if (cefrLevel === 'A1') {
        difficultyPrompt = 'DIFFICULTY LEVEL: 1/6 (Absolute Beginner).';
        themePrompt = 'Focus on highly visual, purely literal, and extremely basic situations (e.g., street signs, short notices, one-line text messages, basic personal info).';
    } else if (cefrLevel === 'A2') {
        difficultyPrompt = 'DIFFICULTY LEVEL: 2/6 (Elementary).';
        themePrompt = 'Focus on concrete, everyday situations (e.g., hobbies, daily routines, travel, shopping, ordering food, basic school/work life, simple personal opinions).';
    } else if (cefrLevel === 'B1') {
        difficultyPrompt = 'DIFFICULTY LEVEL: 3/6 (Intermediate).';
        themePrompt = 'Focus on concrete, everyday situations (e.g., hobbies, daily routines, travel, shopping, ordering food, basic school/work life, simple personal opinions).';
    } else if (cefrLevel === 'B2') {
        difficultyPrompt = 'DIFFICULTY LEVEL: 4/6 (Upper Intermediate).';
        themePrompt = 'Focus on abstract and professional themes (e.g., environment, technology, societal changes, psychology, complex workplace scenarios, global culture).';
    } else if (cefrLevel === 'C1') {
        difficultyPrompt = 'DIFFICULTY LEVEL: 5/6 (Advanced).';
        themePrompt = 'Focus on abstract and professional themes (e.g., environment, technology, societal changes, psychology, complex workplace scenarios, global culture).';
    } else if (cefrLevel === 'C2') {
        difficultyPrompt = 'DIFFICULTY LEVEL: 6/6 (Mastery).';
        themePrompt = 'Focus on highly academic, nuanced, and abstract themes (e.g., philosophy, ethics, advanced science, literature, linguistics, complex socio-economic issues).';
    }

    // ... (Constants for Cambridge Standards)
    const cambridgeStandards = `CRITICAL ${cefrLevel} CEFR MOCK EXAM STANDARDS:
    - ${difficultyPrompt} Strictly adhere to this difficulty scale.
- Vocabulary: Use ${cefrLevel} relevant vocabulary(refer to English Vocabulary Profile).
- Grammar: Employ complex grammar structures expected at ${cefrLevel} (e.g., conditionals, passive voice, inversion for C1 / C2).
- Theme & Complexity: ${themePrompt}
    - Tone & Register: Match the required register(formal / informal) perfectly to the task.
- Distractors/Options: Options MUST NOT be structurally repetitive or use the exact same phrasing (e.g., avoid "a practice that harms", "a practice that helps"). Options must be distinctly phrased, sound natural, and genuinely test ${cefrLevel} skills rather than relying on cheap structural repetition.
- Gap - Fills: For cloze or gap-fill tasks, you MUST number the gaps sequentially within the text, e.g., "(1) _____". In the 'questions' array, DO NOT repeat the sentence. Instead, set the 'question' field simply to "Gap 1", etc.
- Multiple Matching: If a task is labelled "Multiple Matching" (common in Reading Part 7/8), you MUST NOT use a single continuous gapped text. Instead, provide 4-6 distinct short labeled paragraphs (e.g., A, B, C, D) in the 'content'. For the questions, ask "Which text states...", and the 'options' MUST strictly be just the letters "A", "B", "C", "D".
`;

    switch (examType) {
        case 'Reading':
            // Reading logic...
            let readingFormatStr = '';
            let totalReadingQuestions = 0;
            if (cefrLevel === 'A1') {
                partCount = 5;
                totalReadingQuestions = 30;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice reading (standard comprehension of a longer text).\\nPart 2: Matching.\\nPart 3: Multiple-choice for short texts/signs.\\nPart 4: Multiple-choice gap-fill.\\nPart 5: Open gap-fill.";
            } else if (cefrLevel === 'A2') {
                partCount = 5; // A2 Key Reading
                totalReadingQuestions = 30; // 6 questions per part
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice reading (standard comprehension of a longer text) (exactly 6 qs).\\nPart 2: Matching (exactly 6 qs).\\nPart 3: Multiple-choice for short texts/signs (exactly 6 qs).\\nPart 4: Multiple-choice gap-fill (exactly 6 qs).\\nPart 5: Open gap-fill (exactly 6 qs).";
            } else if (cefrLevel === 'B1') {
                partCount = 6; // B1 Reading
                totalReadingQuestions = 30; // 5 questions per part
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice reading (standard comprehension of a long text) (exactly 5 qs).\\nPart 2: Matching profiles to texts (exactly 5 qs).\\nPart 3: Multiple-choice (short texts) (exactly 5 qs).\\nPart 4: Gapped text (inserting sentences) (exactly 5 qs).\\nPart 5: Multiple-choice gap-fill (exactly 5 qs).\\nPart 6: Open gap-fill (exactly 5 qs).";
            } else if (cefrLevel === 'B2') {
                partCount = 7; // B2 Reading
                totalReadingQuestions = 52;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice reading (standard reading comprehension of a long text - NOT a gap fill, MUST use full question sentences) (exactly 6 qs).\\nPart 2: Multiple-choice cloze (gap-fill with options) (exactly 8 qs).\\nPart 3: Open cloze (exactly 8 qs).\\nPart 4: Word formation (exactly 8 qs).\\nPart 5: Key word transformations (grammar/vocabulary) (exactly 6 qs).\\nPart 6: Gapped text (inserting paragraphs) (exactly 6 qs).\\nPart 7: Multiple matching (exactly 10 qs).";
            } else if (cefrLevel === 'C1') {
                partCount = 8; // C1 Reading
                totalReadingQuestions = 56;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice reading (standard comprehension of a long text) (exactly 6 qs).\\nPart 2: Multiple-choice cloze (gap-fill with options) (exactly 8 qs).\\nPart 3: Open cloze (exactly 8 qs).\\nPart 4: Word formation (exactly 8 qs).\\nPart 5: Key word transformations (exactly 6 qs).\\nPart 6: Cross-text multiple matching (comparing 4 short texts) (exactly 6 qs).\\nPart 7: Gapped text (exactly 6 qs).\\nPart 8: Multiple matching (exactly 8 qs).";
            } else {
                partCount = 7; // C2 Reading
                totalReadingQuestions = 53;
                readingFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice reading (standard comprehension of a long text) (exactly 6 qs).\\nPart 2: Multiple-choice cloze (gap-fill with options) (exactly 8 qs).\\nPart 3: Open cloze (exactly 8 qs).\\nPart 4: Word formation (exactly 8 qs).\\nPart 5: Key word transformations (up to 8 words) (exactly 6 qs).\\nPart 6: Gapped text (exactly 7 qs).\\nPart 7: Multiple matching (exactly 10 qs).";
            }

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete CEFR ${cefrLevel} Mock Reading and Use of English exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
    1. "examTitle": A short, descriptive title for the exam based on the content(max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for CEFR ${cefrLevel}.

        The "parts" array should follow standard CEFR formats for ${cefrLevel}. 
CRITICAL STRUCTURE REQUIREMENT: The exam MUST have EXACTLY ${totalReadingQuestions} questions in total, appropriately distributed across the ${partCount} parts.
FORMAT REQUIREMENT: ${readingFormatStr}
WARNING ON TITLES: The 'title' field for each part MUST be heavily descriptive(e.g., "Part 1: Multiple-Choice Cloze on Environmental Issues").Do NOT simply name it "Part 1" or "Part 2".
        Crucially, every single part MUST include a 'content' field with a MINIMUM of 150 words of reading text.

CRITICAL MULTIPLE-CHOICE FORMAT INSTRUCTION: 
Whenever a part specifies "Multiple-choice" (e.g. Multiple-choice cloze, Multiple-choice reading), you MUST provide an 'options' array containing EXACTLY 4 distinct choices (e.g., ["A. Word1", "B. Word2", "C. Word3", "D. Word4"]). DO NOT leave 'options' empty for Multiple-choice questions.
ABSOLUTE STRICT RULE FOR "Multiple-choice reading" (Standard Comprehension): You MUST write full, explicit reading comprehension questions (e.g. "What does the writer suggest about the event in the first paragraph?"). NEVER use "Gap 1" or blank underlines. This is a conventional reading test, NOT a cloze test.
IF the part is explicitly a "cloze" or "gap-fill" (e.g. "Multiple-choice cloze"), you may use "Gap 1", "Gap 2". BUT NEVER DO THIS FOR "Multiple-choice reading".
If it is an open cloze or word formation part designed specifically as a gap-fill without choices, 'options' MUST be an empty array [], but you MUST provide the 'correctOption'.

For each question, provide an 'explanation'(2 - 3 sentences) detailing why the answer is correct and why distractors are wrong based on CEFR grading.
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

            if (cefrLevel === 'A2') {
                enhancedTopic = `Based on the ${topicPrompt}, generate a complete CEFR ${cefrLevel} Mock Writing exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
    1. "examTitle": A short, descriptive title for the exam based on the content(max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for CEFR ${cefrLevel}.

        The "parts" array should follow the format of:
WARNING ON TITLES: The 'title' field for each part MUST be heavily descriptive(e.g., "Part 1: Writing an Email to a Friend").Do NOT simply name it "Part 1" or "Part 2".
- Part 1(${taskTypesPart1}): Provide 'title', 'instructions'(MUST explicitly state the task type and required word count: ${wordCountPart1}), 'content'(the prompt / notes / texts to respond to).The 'questions' array should have ONE object with 'question'(e.g., "Write your response"), an empty 'options' array.Include 'howToApproach'(a detailed 4 - step numbered guide on planning and structure), 'modelAnswer'(MUST absolutely meet the strict exact word count of ${wordCountPart1}, NEVER shorter. MUST vividly demonstrate ${cefrLevel} grammar, sophisticated vocabulary, and fully developed ideas appropriate for a high-scoring candidate; MUST be clearly formatted with correct styling, including greetings/sign-offs if it is an email or letter, and multiple paragraphs explicitly separated using \\n\\n), and 'tips'(multi - sentence strategy on register).
- Part 2(Choice of task: ${taskTypesPart2}): Provide 'title', 'instructions'(MUST explicitly state the required word count: ${wordCountPart2}), 'content'(the scenario).The 'questions' array MUST have ONE object with empty 'options', and it MUST include an 'imagePrompts' array containing EXACTLY 3 distinct, highly descriptive prompts for generating 3 sequential images that tell a story based on the exam topic.Include highly detailed 'howToApproach', 'modelAnswer'(MUST strictly meet the ${wordCountPart2} requirement and showcase high-level ${cefrLevel} complexity, avoiding brief summaries), and 'tips' properties just like Part 1.
${cambridgeStandards}
    `;
            } else {
                enhancedTopic = `Based on the ${topicPrompt}, generate a complete CEFR ${cefrLevel} Mock Writing exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
    1. "examTitle": A short, descriptive title for the exam based on the content(max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for CEFR ${cefrLevel}.

        The "parts" array should follow the format of:
WARNING ON TITLES: The 'title' field for each part MUST be heavily descriptive(e.g., "Part 1: Writing an Email to a Friend").Do NOT simply name it "Part 1" or "Part 2".
- Part 1(${taskTypesPart1}): Provide 'title', 'instructions'(MUST explicitly state the task type and required word count: ${wordCountPart1}), 'content'(the prompt / notes / texts to respond to).The 'questions' array should have ONE object with 'question'(e.g., "Write your response"), an empty 'options' array.Include 'howToApproach'(a detailed 4 - step numbered guide on planning and structure), 'modelAnswer'(MUST absolutely meet the strict exact word count of ${wordCountPart1}, NEVER shorter. MUST vividly demonstrate ${cefrLevel} grammar, sophisticated vocabulary, and fully developed ideas appropriate for a high-scoring candidate; MUST be clearly formatted with correct styling, including greetings/sign-offs if an email or letter, and multiple paragraphs explicitly separated using \\n\\n), and 'tips'(multi - sentence strategy on register).
- Part 2(Choice of task: ${taskTypesPart2}): Provide 'title', 'instructions'(MUST explicitly state the required word count: ${wordCountPart2}), 'content'(the scenario).The 'questions' array has ONE object with empty 'options'.Include highly detailed 'howToApproach', 'modelAnswer'(MUST strictly meet the ${wordCountPart2} requirement and showcase high-level ${cefrLevel} complexity with explicitly separated \\n\\n paragraphs and proper formatting), and 'tips' properties just like Part 1.
${cambridgeStandards}
    `;
            }
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
                    listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (short extracts) (exactly 8 qs).\\nPart 2: Sentence completion (monologue) (exactly 10 qs).\\nPart 3: Multiple matching (5 speakers) (exactly 5 qs).\\nPart 4: Multiple-choice (long interview) (exactly 7 qs).";
                } else if (cefrLevel === 'C1') {
                    listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (3 short extracts) (exactly 6 qs).\\nPart 2: Sentence completion (exactly 8 qs).\\nPart 3: Multiple-choice (long interview) (exactly 6 qs).\\nPart 4: Multiple matching (2 tasks simultaneously based on 5 speakers) (exactly 10 qs).";
                } else { // C2
                    listeningFormatStr = "MANDATORY PART STRUCTURE:\\nPart 1: Multiple-choice (short extracts) (exactly 6 qs).\\nPart 2: Sentence completion (exactly 9 qs).\\nPart 3: Multiple-choice (long interview) (exactly 5 qs).\\nPart 4: Multiple matching (complex) (exactly 10 qs).";
                }
            }

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete CEFR ${cefrLevel} Mock Listening exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
    1. "examTitle": A short, descriptive title for the exam based on the content(max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for CEFR ${cefrLevel}.

        The "parts" array should follow standard CEFR formats for ${cefrLevel}.
CRITICAL STRUCTURE REQUIREMENT: The exam MUST have EXACTLY ${totalListeningQuestions} questions in total, distributed across the ${partCount} parts according to the standard specs.
FORMAT REQUIREMENT: ${listeningFormatStr}

The "parts" array should follow the format of:
WARNING ON TITLES: The 'title' field for each part MUST be heavily descriptive and indicate the task type and topic (e.g., "Part 1: Multiple-Choice Short Interviews on Daily Life").Do NOT simply name it "Part 1" or "Part 2".
        Provide 'title', 'instructions', 'content'(a highly detailed transcript of the audio).
IMPORTANT TRANSCRIPT FORMAT: The 'content' field MUST be a labeled dialogue with speakers on separate lines, e.g.:
    "Interviewer: Welcome to the show, Sarah.\\nSarah: Thank you for having me.\\nInterviewer: So tell us about your work."
Each speaker's line MUST start with their name followed by a colon. Use realistic, natural-sounding dialogue appropriate for ${cefrLevel}.
The 'questions' array MUST contain the correct number of questions for this part — either multiple - choice or gap - fill format.
CRITICAL FORMATTING INSTRUCTION FOR LISTENING GAP-FILLS (e.g. Sentence Completion): For any gap-fill questions in the Listening section, the 'question' field MUST contain the full, logical sentence with the gap explicitly numbered (e.g., "The main problem is related to (1) _____ in the city center."). NEVER output just "Gap 1" or similar abstract pointers, because the candidate must logically read this sentence context while listening to the audio track. CRITICALLY IMPORTANT: DO NOT place the numbered gaps (e.g., "(1) _____") inside the 'content' field (the audio transcript)! The audio transcript MUST be the complete, unbroken, naturally-spoken sentences without any blank placeholders.
CRITICAL FORMATTING INSTRUCTION FOR LISTENING MULTIPLE MATCHING: If the task is Multiple Matching (e.g. Matching speakers to statements), the 'content' field MUST consist ONLY of the spoken audio dialogue (e.g. "Speaker 1: ... Speaker 2: ..."). You MUST place the FULL TEXT of the statements to match into the 'options' array (e.g. ["A. Sustainable practices...", "B. Renewable energy..."]). DO NOT place the statement options inside the 'content' string, and DO NOT leave the 'options' array empty or populated only with letters. Provide highly specific, actionable guidance within the 'tips' property for Multiple Matching.
For multiple - choice questions, provide 'options'(array of 3 - 4 choices A - C / D) and 'correctOption'.
        ${cefrLevel === 'A1' || cefrLevel === 'A2' || cefrLevel === 'B1' ? `CRITICAL CUE: If the part is "Multiple-choice (pictures)", the questions array MUST include an 'imagePrompts' array containing exactly 3 distinct, highly descriptive prompts per question for generating the visual options.` : ''}
For each question, provide a 2 - 3 sentence 'explanation' explaining why the selected answer is correct AND interpreting speaker intent / distractors.
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
        - Part 1(Examiner interview - personal questions): Provide 'title', 'instructions', 'content'(interlocutor script).The 'questions' array MUST contain EXACTLY ONE object with: 'question': "Interview Questions", 'options': [], 'tips': "A strategy guide.", 'part1Questions': An array of EXACTLY 6 objects all strictly about the examinee's personal profile, daily life, hobbies, and background. Each object MUST have 'question', a detailed 'answer', and actionable 'tips' (1-2 sentences of strategic answering advice).
- Part 2(Collaborative task with a partner): Provide 'title', 'instructions', 'content'.Let 'questions' array have ONE object with: 'question': The task prompt, 'options': [], 'imagePrompts': 2 distinct strings for AI image generation depicting contrasting visual scenarios related to the topic, 'possibleAnswers': 3 - 4 example phrases.
`;
            } else if (cefrLevel === 'B1') {
                speakingFormatStr = `
        - Part 1(Interview): Provide 'title', 'instructions', 'content'(interlocutor script). The 'questions' array MUST contain EXACTLY ONE object with: 'question': "Interview", 'part1Questions' containing an array of EXACTLY 6 objects all strictly about the examinee's personal profile, daily life, hobbies, and background. Each object MUST have 'question', a detailed 'answer', and actionable 'tips' (1-2 sentences of strategic answering advice).
- Part 2(Extended turn - describing a photograph for 1 minute): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question': The task prompt, 'imagePrompts'(4 distinct strings depicting two sets of contrasting scenarios), 'howToApproach', 'tips', 'modelAnswer', and 'possibleAnswers'.
- Part 3(Collaborative task - discussing options with a partner): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question'(the prompt followed by 5 discussion topics separated by \\n and prefixed with "- "), 'possibleAnswers', and 'tips'.
- Part 4(General discussion based on the collaborative task): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question': "General Discussion", and 'part1Questions'(5 - 6 deep discussion questions / answers, with actionable 'tips' for each).
`;
            } else if (cefrLevel === 'B2') {
                speakingFormatStr = `
    - Part 1(Interview): Provide 'title', 'instructions', 'content'(interlocutor script). The 'questions' array MUST contain EXACTLY ONE object with: 'question': "Interview", 'part1Questions' containing an array of EXACTLY 6 objects all strictly about the examinee's personal profile, daily life, hobbies, and background. Each object MUST have 'question', a detailed 'answer', and actionable 'tips' (1-2 sentences of strategic answering advice).
- Part 2(Long turn - comparing 2 photos): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question': The task prompt, 'imagePrompts'(4 distinct strings depicting contrasting scenarios), and 'possibleAnswers' (an array of 3-4 highly comprehensive, multi-sentence B2-level responses demonstrating varied grammar like relative clauses, conditionals, and complex vocabulary).
- Part 3(Collaborative task): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question'(the prompt followed by 5 discussion topics separated by \\n and prefixed with "- "), 'possibleAnswers' (an array of 3-4 highly comprehensive, multi-sentence B2-level responses demonstrating varied grammar like relative clauses, conditionals, and complex vocabulary), and 'tips'.
- Part 4(Deeper discussion of the collaborative topic): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question': "General Discussion", and 'part1Questions'(5 - 6 deep discussion questions / answers, with actionable 'tips' for each).
`;
            } else if (cefrLevel === 'C1') {
                speakingFormatStr = `
    - Part 1(Interview): Provide 'title', 'instructions', 'content'(interlocutor script). The 'questions' array MUST contain EXACTLY ONE object with: 'question': "Interview", 'part1Questions' containing an array of EXACTLY 6 objects all strictly about the examinee's personal profile, daily life, hobbies, and background. Each object MUST have 'question', a detailed 'answer', and actionable 'tips' (1-2 sentences of strategic answering advice).
- Part 2(Long turn - comparing 2 of 3 photos): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question': The task prompt, 'imagePrompts'(4 distinct strings depicting contrasting scenarios), and 'possibleAnswers'.
- Part 3(Collaborative task): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question'(the prompt followed by 5 discussion topics separated by \\n and prefixed with "- "), 'possibleAnswers', and 'tips'.
- Part 4(Advanced abstract discussion): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question': "General Discussion", and 'part1Questions'(5 - 6 deep discussion questions / answers, with actionable 'tips' for each).
`;
            } else { // C2
                speakingFormatStr = `
    - Part 1(Interview): Provide 'title', 'instructions', 'content'(interlocutor script). The 'questions' array MUST contain EXACTLY ONE object with: 'question': "Interview", 'part1Questions' containing an array of EXACTLY 6 objects all strictly about the examinee's personal profile, daily life, hobbies, and background. Each object MUST have 'question', a detailed 'answer', and actionable 'tips' (1-2 sentences of strategic answering advice).
- Part 2(Collaborative task): Provide 'title', 'instructions', 'content'. The 'questions' array has ONE object with 'question'(the prompt followed by 5 discussion topics separated by \\n and prefixed with "- "), 'possibleAnswers', and 'tips'.
- Part 3(Long turn - 2 minutes based on a prompt card, followed by deeply analytical discussion): Provide 'title', 'instructions', 'content'. The 'questions' array has ZERO 'imagePrompts'. Instead, it has EXACTLY ONE object with 'question': The task prompt text card content, and 'part1Questions' containing an array of 4 - 6 objects representing extensive analytical discussion questions (each with 'question', 'answer', and actionable 'tips').
`;
            }

            enhancedTopic = `Based on the ${topicPrompt}, generate a complete CEFR ${cefrLevel} Mock Speaking exam.
CRITICAL REQUIREMENT: The output MUST be a JSON object containing:
    1. "examTitle": A short, descriptive title for the exam based on the content(max 10 words).
2. "parts": An array containing EXACTLY ${partCount} part objects formatted for CEFR ${cefrLevel}.

        The "parts" array should follow the format of:
WARNING ON TITLES: The 'title' field for each part MUST be heavily descriptive and indicate the task type(e.g., "Part 1: Examiner Interview" or "Part 3: Collaborative Discussion on the Environment").Do NOT simply name it "Part 1" or "Part 2".
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
