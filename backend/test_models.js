const { GoogleGenerativeAI } = require("@google/generative-ai");
const https = require('https');

async function test() {
  const apiKey = "AIzaSyCfs_S5YcvkZg79UVjr-ZwkItEqhGtiV0o";
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models?key=' + apiKey,
    method: 'GET'
  };

  const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const models = JSON.parse(data).models;
        models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
      } catch(e) { console.log(data); }
    });
  });

  req.on('error', error => {
    console.error(error);
  });

  req.end();
}

test();
