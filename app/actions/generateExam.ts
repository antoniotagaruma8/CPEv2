'use server';

import Groq from 'groq-sdk';

// 1. Retrieve all API keys from environment variables.
const apiKeys = Object.keys(process.env)
  .filter(key => key.startsWith('GROQ_API_KEY_'))
  .map(key => process.env[key])
  .filter((key): key is string => !!key);

if (apiKeys.length === 0) {
  console.error('No Groq API keys found. Please set GROQ_API_KEY_1, GROQ_API_KEY_2, etc. in your .env.local file.');
}

// 2. Define models to rotate through. These are large, capable models suitable for complex generation.
const models = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

export async function generateExamAction(
  examType: string,
  prompt: string,
  cefrLevel: string,
  max_tokens: number,
  partCount: number,
  fileData?: string
) {
  if (apiKeys.length === 0) {
    return { success: false, error: 'Server is not configured with any API keys.' };
  }

  let lastError: string | null = 'Generation did not start.';
  const totalAttempts = apiKeys.length * models.length;
  let visionFailed = false;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
      let model = models[modelIndex];
      // Use vision model if image data is provided and vision hasn't failed yet
      if (fileData && fileData.startsWith('data:image') && !visionFailed) {
        model = 'llama-3.2-11b-vision-preview';
      }
      const attempt = keyIndex * models.length + modelIndex + 1;

      console.log(`--- Exam Generation Attempt ${attempt}/${totalAttempts} ---`);
      try {
        console.log(`Using API Key index: ${keyIndex}, Model: ${model}`);

        const groq = new Groq({ apiKey });

        const messages: any[] = [
          { role: 'system', content: 'You are an expert in creating Cambridge English Qualification exams. Your output must be a valid JSON object.' },
        ];

        if (fileData && fileData.startsWith('data:image') && !visionFailed) {
          messages.push({
            role: 'user',
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: fileData } }
            ]
          });
        } else {
          let textPrompt = prompt;
          if (fileData && fileData.startsWith('data:image') && visionFailed) {
            textPrompt += "\n\n(Note: An image was provided but the vision model is unavailable. Please generate the exam based on the topic and context provided in the text prompt.)";
          }
          messages.push({ role: 'user', content: textPrompt });
        }

        const chatCompletion = await groq.chat.completions.create({
          messages: messages as any,
          model: model,
          temperature: 0.7,
          max_tokens: 8192, // Increased max_tokens to reduce 'length' finish_reason
          response_format: { type: 'json_object' },
        });

        const choice = chatCompletion.choices[0];
        const content = choice?.message?.content;
        const finishReason = choice?.finish_reason;

        // Quality Check 1: Ensure generation wasn't cut off
        if (finishReason === 'length') {
          lastError = `Generation stopped because it reached the maximum token limit.`;
          console.warn(`${lastError} Retrying...`);
          continue;
        }

        // Quality Check 2: Ensure content exists
        if (!content) {
          lastError = 'No content was received from the API.';
          console.warn(`${lastError} Retrying...`);
          continue;
        }

        // Quality Check 3: Validate JSON and structure
        try {
          const rawData = JSON.parse(content);
          let partsArray = null;

          // The prompt strictly asks for a JSON array. Let's first check for that.
          if (Array.isArray(rawData)) {
            partsArray = rawData;
          } else if (rawData && typeof rawData === 'object') {
            // Check for 'parts' array (new format)
            if (Array.isArray(rawData.parts)) {
              partsArray = rawData.parts;
            } else {
              // Fallback: handle cases where the model wraps the array in an object, e.g., {"exam": [...]}
              const keys = Object.keys(rawData);
              for (const key of keys) {
                if (Array.isArray(rawData[key])) {
                  partsArray = rawData[key];
                  break;
                }
              }
            }
          }

          if (!partsArray) {
            lastError = `Generated content was not in the expected format (a JSON array of parts).`;
            console.warn(`${lastError} Retrying...`);
            continue;
          }

          // Quality Check 4: Warn if the part count doesn't match, but only fail if zero parts
          if (partsArray.length === 0) {
            lastError = `Generated exam has no parts (expected ${partCount}).`;
            console.warn(`${lastError} Retrying...`);
            continue;
          }
          if (partsArray.length !== partCount) {
            console.warn(`Generated exam has ${partsArray.length} parts, but exactly ${partCount} were requested. Accepting anyway.`);
          }

          // All checks passed, return the successful result
          console.log(`--- Generation successful on attempt ${attempt} ---`);
          console.log("DEBUG: [Server] Generated content preview:", content.substring(0, 500));
          return { success: true, content };

        } catch (jsonError) {
          lastError = 'Failed to parse the generated content as valid JSON.';
          console.warn(`${lastError} Retrying... Raw content preview:`, content.substring(0, 200));
          continue;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        lastError = `API call failed: ${errorMessage}`;
        console.error(`Error on attempt ${attempt}:`, lastError);

        if (fileData && fileData.startsWith('data:image') && !visionFailed) {
          console.warn("Vision model failed. Falling back to text-only models for subsequent attempts.");
          visionFailed = true;
        }
        // Continue to next attempt, which will use a different key/model
      }
    }
  }

  // If all retries fail
  console.error(`Failed to generate a valid exam after ${totalAttempts} attempts.`);
  return { success: false, error: `Failed to generate a high-quality exam after multiple attempts. Last known issue: ${lastError}` };
}