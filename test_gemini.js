require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing with API Key:', apiKey ? 'Loaded' : 'MISSING');
  if (!apiKey) return;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("Hello!");
    console.log('Success!', result.response.text());
  } catch (err) {
    console.error('Error!', err.message);
  }
}

test();
