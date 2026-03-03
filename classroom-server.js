const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

// Student configurations
const studentPrompts = {
  teacher: `You are "Ms. Owl" - a wise teacher Pokemon character. 
Answer the student's question thoroughly but conversationally.
Keep responses moderate in length. Use a warm, teaching style.`,
  
  organizer: `You are "Pikachu" - an energetic organizer Pokemon.
Take the given content and organize it into a well-structured essay.
Use proper paragraphs, clear headings if needed, and ensure flow.
Keep it informative but not too long.`,
  
  humanizer: `You are "Jigglypuff" - a creative humanizer Pokemon.
Rewrite the text to sound more natural and human-written.
Add some personality, slight imperfections, varied sentence structures.
Make it sound like a real person wrote it, not AI. Avoid being too perfect.`,
  
  aicheck: `You are "Mewtwo" - an analytical AI checker Pokemon.
Analyze the given text and estimate the probability it was AI-generated.
Respond ONLY with a JSON object: {"aiProbability": number between 0-100, "reasoning": "brief reason"}
Example: {"aiProbability": 15, "reasoning": "Has some human-like variation"}`,
  
  reviewer: `You are "Professor Oak" - a wise reviewer Pokemon.
Review the text and suggest final improvements.
Make it polished and ready for submission.
Respond with the final improved text, plus a brief note about what you changed.`
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoints
  if (req.url.startsWith('/api/')) {
    const endpoint = req.url.slice(5);
    
    // Get all students
    if (endpoint === 'students' && req.method === 'GET') {
      const students = Object.keys(studentPrompts).map(id => ({
        id,
        prompt: studentPrompts[id].substring(0, 50) + '...'
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(students));
      return;
    }
    
    // Classroom student interaction
    if (endpoint.startsWith('classroom/') && req.method === 'POST') {
      const studentId = endpoint.slice(10);
      let body = '';
      
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { message, document, passCount } = JSON.parse(body);
          
          // Build prompt based on student role and what's being passed
          let prompt = studentPrompts[studentId] || 'You are a helpful Pokemon assistant.';
          
          if (studentId === 'teacher') {
            prompt += `\n\nThe student asks: "${message}"\n\nProvide a helpful answer.`;
          } else if (document) {
            prompt += `\n\nCurrent document:\n---\n${document}\n---\n\nProcess this document according to your role.`;
          }
          
          // Call OpenClaw via curl (using the chat completions endpoint we enabled)
          const response = await callOpenClaw(prompt, studentId);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ response, studentId }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }
  
  // Serve static files
  let filePath = req.url === '/' ? '/classroom.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + filePath);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

async function callOpenClaw(prompt, studentId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'openclaw:main',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 600,
      temperature: 0.7
    });
    
    const options = {
      hostname: '127.0.0.1',
      port: 18789,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 8d53dac731b9bb99891d08d7aef1254f3184b65e106bbe97',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0] && json.choices[0].message) {
            resolve(json.choices[0].message.content);
          } else if (json.error) {
            resolve(`Error: ${json.error.message}`);
          } else {
            resolve(data.substring(0, 500));
          }
        } catch (e) {
          resolve(data.substring(0, 500) || 'No response');
        }
      });
    });
    
    req.on('error', (e) => {
      resolve(`API Error: ${e.message}`);
    });
    
    req.write(postData);
    req.end();
    
    // Timeout after 20 seconds
    setTimeout(() => {
      req.destroy();
      resolve('Timeout - please try again');
    }, 20000);
  });
}

server.listen(PORT, () => {
  console.log(`
🏫 Classroom Server running at:
   http://localhost:${PORT}/classroom.html

   API Endpoints:
   GET  /api/students              - List all students
   POST /api/classroom/:studentId - Interact with a student
  `);
});
