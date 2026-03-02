/* c:\Users\Anton\Desktop\OLD FILES\GOALS\AI\GitHub 2025\CPE\app\actions\generateImageHF.ts */
'use server';

export async function generateImageAction(prompt: string) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Missing HUGGINGFACE_API_KEY in .env.local' };
  }

  try {
    // List of reliable, non-gated models to try in order.
    const HUGGINGFACE_MODELS = [
      "prompthero/openjourney", // General purpose, artistic
      "runwayml/stable-diffusion-v1-5", // Classic, might work on router for some accounts
      "dataautogpt3/OpenDalleV1.1", // DALL-E 3 replication style
    ];

    for (const modelId of HUGGINGFACE_MODELS) {
      console.log(`Attempting to generate image with model: ${modelId}`);
      try {
        const response = await fetch(
          `https://router.huggingface.co/models/${modelId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ inputs: prompt }),
          }
        );

        if (response.status === 404) {
          console.warn(`Model ${modelId} returned 404, trying next model.`);
          continue; // Try the next model
        }

        if (!response.ok) {
          const errorText = await response.text();
          // If it's a loading error, it's better to tell the user to wait and try again.
          if (errorText.includes("is currently loading")) {
              return { success: false, error: `Model ${modelId} is loading. Please wait a moment and try again.` };
          }
          throw new Error(`Hugging Face API Error: ${response.status} - ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        console.log(`Successfully generated image with model: ${modelId}`);
        return { success: true, imageUrl: dataUrl };
      } catch (error) {
        console.error(`Error with model ${modelId}:`, error);
        // Continue to the next model if there's a network error or other issue
      }
    }

    // If all models failed
    const errorMessage = 'All tried image generation models failed. This might be due to Hugging Face API issues or gated model restrictions.';
    console.error(errorMessage);
    return { success: false, error: errorMessage };
  } catch (error) {
    console.error('Image generation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate image' };
  }
}