export function getFreeImageUrl(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  return `https://pollinations.ai/p/${encoded}?width=1024&height=768&model=flux&seed=${Math.floor(Math.random()*1000)}`;
}