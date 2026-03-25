const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const apiKey = "AIzaSyCfs_S5YcvkZg79UVjr-ZwkItEqhGtiVOo";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent("Hello, world!");
    console.log(result.response.text());
  } catch (err) {
    console.error(err.message);
  }
}

test();
