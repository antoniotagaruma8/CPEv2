const Groq = require('groq-sdk');
require('dotenv').config();

async function test() {
  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await client.chat.completions.create({
        messages: [{ role: 'user', content: 'hello' }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10
    });
    console.log('Groq OK:', completion.choices[0].message.content);
  } catch(e) { console.error('GROQ ERROR:', e); }
}
test();
