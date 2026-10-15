const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const path = require('path');

const DOMAIN = 'movie.eoghanmcgough.com';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add.html'));
});

let movies = [];

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

app.get('/api/movies', (req, res) => {
  res.json(movies);
});

app.post('/api/movies', (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title required' });
  if (movies.length >= 10) return res.status(400).json({ error: 'Max 10 movies reached' });
  if (movies.includes(title)) return res.status(400).json({ error: 'Already added' });
  movies.push(title);
  broadcast({ type: 'movies', movies });
  res.json({ ok: true, movies });
});

app.delete('/api/movies', (req, res) => {
  movies = [];
  broadcast({ type: 'movies', movies });
  res.json({ ok: true });
});

app.get('/api/qr', async (req, res) => {
  const url = `https://${DOMAIN}/add`;
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    res.json({ dataUrl, url });
  } catch (e) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'movies', movies }));
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at https://${DOMAIN}`);
  console.log(`TV app:    https://${DOMAIN}/`);
  console.log(`Guest add: https://${DOMAIN}/add`);
});
