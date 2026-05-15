import fs from 'fs';
import path from 'path';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: any[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  checkpoints: any[];
  updatedAt: number;
}

// Ensure .data directory exists
const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class MemorySystem {
  private getFilePath(chatId: string) {
    return path.join(DATA_DIR, `${chatId}.json`);
  }

  getChatHistory(chatId: string): ChatSession {
    const filePath = this.getFilePath(chatId);
    if (!fs.existsSync(filePath)) {
      return {
        id: chatId,
        title: 'New Build',
        messages: [],
        checkpoints: [],
        updatedAt: Date.now()
      };
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.checkpoints) parsed.checkpoints = [];
    return parsed;
  }

  saveMessage(chatId: string, role: ChatMessage['role'], content: string, title?: string, files?: any[]) {
    const chat = this.getChatHistory(chatId);
    chat.messages.push({
      role,
      content,
      files,
      timestamp: Date.now()
    });
    chat.updatedAt = Date.now();
    
    if (title && chat.title === 'New Build') {
      chat.title = title;
    }

    fs.writeFileSync(this.getFilePath(chatId), JSON.stringify(chat, null, 2));
  }

  addCheckpoint(chatId: string, summary: string) {
    const chat = this.getChatHistory(chatId);
    chat.checkpoints.push({
      id: `cp-${Date.now()}`,
      summary: summary,
      timestamp: Date.now()
    });
    fs.writeFileSync(this.getFilePath(chatId), JSON.stringify(chat, null, 2));
  }

  getAllChatsSummary() {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'globals.json' && f !== 'keys.json');
    const summaries = files.map(f => {
      const chat = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8'));
      return {
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt
      };
    });
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  deleteChat(chatId: string) {
    const filePath = this.getFilePath(chatId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Key storage logic
  getKeys() {
    const p = path.join(DATA_DIR, 'keys.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
    return {};
  }
  
  saveKeys(keys: Record<string, string>) {
    fs.writeFileSync(path.join(DATA_DIR, 'keys.json'), JSON.stringify(keys, null, 2));
  }
}

