import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BuilderAgent } from './agent.js';
import { MemorySystem } from './memory.js';

export const apiRouter = Router();

const memory = new MemorySystem();
const agent = new BuilderAgent(memory);

// Configure multer
const uploadDir = path.join(process.cwd(), '.data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

apiRouter.post('/upload', upload.array('files'), (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[])?.map(f => ({
      name: f.originalname,
      path: f.path,
      mime: f.mimetype
    })) || [];
    res.json({ files });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/chat', async (req, res) => {
  try {
    const { message, files, chatId: explicitChatId } = req.body;
    const chatId = explicitChatId || uuidv4();
    
    // 1. Process message via Agent
    const response = await agent.processMessage(chatId, message, files || []);

    res.json({
      chatId,
      response
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Internal error' });
  }
});

apiRouter.get('/history', (req, res) => {
  const history = memory.getAllChatsSummary();
  res.json(history);
});

apiRouter.get('/chat/:id', (req, res) => {
  const chat = memory.getChatHistory(req.params.id);
  res.json(chat);
});

apiRouter.delete('/chat/:id', (req, res) => {
  memory.deleteChat(req.params.id);
  res.json({ success: true });
});

// Settings / Keys
apiRouter.get('/keys', (req, res) => {
  res.json(memory.getKeys());
});

apiRouter.post('/keys', (req, res) => {
  memory.saveKeys(req.body);
  res.json({ success: true });
});

apiRouter.get('/tasks', async (req, res) => {
  try {
    const { GlobalQueue } = await import('./queue.js');
    res.json({ tasks: GlobalQueue.getAllTasks() });
  } catch (e) {
    res.json({ tasks: [] });
  }
});

