// scripts/generateLibrary.ts
import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getExamPrompt } from '../lib/exam-prompts';
import { generateExamAction } from '../app/actions/generateExam';

const SKILLS = ['Reading', 'Writing', 'Listening', 'Speaking'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const TOPICS = [
    "Travel & Tourism", "Work & Career", "Education & Learning", "Environment & Climate",
    "Technology & Innovation", "Health & Lifestyle", "Hobbies & Leisure", "Social Media",
    "Arts & Culture", "Science & Research", "Shopping & Fashion", "Relationships & Family",
    "Food & Nutrition", "Sport & Fitness"
];

// Helper to sanitize filenames
function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function run() {
    const baseDir = path.join(process.cwd(), 'public', 'library');

    // Create base directory if it doesn't exist
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    let total = SKILLS.length * LEVELS.length * TOPICS.length;
    let current = 0;

    for (const skill of SKILLS) {
        for (const level of LEVELS) {
            const dirPath = path.join(baseDir, skill.toLowerCase(), level.toLowerCase());
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            for (const topic of TOPICS) {
                current++;
                const filename = `${slugify(topic)}.json`;
                const filePath = path.join(dirPath, filename);

                if (fs.existsSync(filePath)) {
                    console.log(`[${current}/${total}] Skipping ${skill}/${level}/${topic} (Already exists)`);
                    continue;
                }

                console.log(`\n[${current}/${total}] Generating ${skill} - ${level} - ${topic}...`);

                try {
                    const topicPrompt = `topic "${topic}"`;
                    const { enhancedTopic, partCount } = getExamPrompt(skill, level, topicPrompt);

                    const result = await generateExamAction(skill, enhancedTopic, level, 300, partCount);

                    if (result.success && result.content) {
                        fs.writeFileSync(filePath, result.content, 'utf-8');
                        console.log(`   -> Successfully saved to ${filePath}`);
                    } else {
                        console.error(`   -> Failed to generate: ${result.error}`);
                    }
                } catch (error) {
                    console.error(`   -> Unexpected error generating exam:`, error);
                }

                // Add a respectful delay to avoid API rate limits
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }

    console.log('\n✅ Library Generation Complete!');
}

run();
