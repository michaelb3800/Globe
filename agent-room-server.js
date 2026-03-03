const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3000;
const GATEWAY_TOKEN = '8d53dac731b9bb99891d08d7aef1254f3184b65e106bbe97';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

// Simple in-memory session store
let sessions = {
  'main': { id: 'main', name: 'MAIN', emoji: '🤖', status: 'idle', task: 'General assistant', messages: [] }
};

const server = http.createServer(async (req, res) => {
  // CORS headers for local development
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
    
    // Get all agents/sessions
    if (endpoint === 'agents' && req.method === 'GET') {
      const agents = Object.values(sessions).map(s => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        status: s.status,
        task: s.task,
        health: 100
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(agents));
      return;
    }
    
    // Get messages for an agent
    if (endpoint.startsWith('messages/') && req.method === 'GET') {
      const agentId = endpoint.slice(9);
      const session = sessions[agentId];
      if (session) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(session.messages));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Agent not found' }));
      }
      return;
    }
    
    // Send message to an agent
    if (endpoint === 'send' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { agentId, message } = JSON.parse(body);
          const session = sessions[agentId];
          
          if (!session) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Agent not found' }));
            return;
          }
          
          // Add user message
          session.messages.push({ role: 'user', content: message, timestamp: Date.now() });
          session.status = 'thinking';
          
          // Send to main session via gateway WebSocket or direct CLI
          const response = await sendToOpenClaw(message);
          
          // Add agent response
          session.messages.push({ role: 'agent', content: response, timestamp: Date.now() });
          session.status = 'idle';
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ response, agentId }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    
    // Spawn new agent
    if (endpoint === 'spawn' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { name, model, task } = JSON.parse(body);
          const id = 'agent_' + Date.now();
          
          sessions[id] = {
            id,
            name: name.substring(0, 8).toUpperCase(),
            emoji: '🎯',
            status: 'idle',
            task: task || 'Custom agent',
            messages: []
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id, name }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }
  
  // Serve static files
  let filePath = req.url === '/' ? '/agent-room.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

function sendToOpenClaw(message, agentId) {
  return new Promise((resolve, reject) => {
    // Store message in a queue file for the agent to pick up
    const queueFile = path.join(__dirname, 'message-queue.json');
    let queue = [];
    
    try {
      if (fs.existsSync(queueFile)) {
        queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
      }
    } catch (e) {}
    
    queue.push({ agentId, message, timestamp: Date.now() });
    fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
    
    // For now, return a placeholder - the agent will respond via the queue
    // The UI will poll for responses
    resolve("Message sent! Waiting for response...");
  });
}

server.listen(PORT, () => {
  console.log(`
🎮 Agent Room Server running at:
   http://localhost:${PORT}

   API Endpoints:
   GET  /api/agents        - List all agents
   GET  /api/messages/:id  - Get agent messages
   POST /api/send         - Send message to agent
   POST /api/spawn        - Spawn new agent
  `);
});
