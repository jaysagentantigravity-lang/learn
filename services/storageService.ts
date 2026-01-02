import { Message } from '../types';

const DB_NAME = 'LuminaDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  preview: string;
}

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
        reject('Could not open database');
      };
    });
  }

  async saveSession(session: ChatSession): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // OPTIMIZED: Uses cursor to fetch metadata ONLY. 
  // Strips the 'messages' array to prevent Memory Bloat.
  async getSessions(): Promise<ChatSession[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      
      const sessions: ChatSession[] = [];
      const request = index.openCursor(null, 'prev'); // Descending order

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const fullSession = cursor.value as ChatSession;
          // Create a lightweight summary object
          sessions.push({
            id: fullSession.id,
            title: fullSession.title,
            timestamp: fullSession.timestamp,
            preview: fullSession.preview,
            messages: [] // Explicitly empty the heavy data
          });
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Gets the FULL session including messages
  async getSession(id: string): Promise<ChatSession | undefined> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const storageService = new StorageService();