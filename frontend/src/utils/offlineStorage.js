const DB_NAME = 'bcabuddy_offline_db';
const DB_VERSION = 1;
const RESPONSES_STORE = 'responses';
const TOPICS_STORE = 'topics';

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(RESPONSES_STORE)) {
        const responseStore = db.createObjectStore(RESPONSES_STORE, { keyPath: 'id' });
        responseStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(TOPICS_STORE)) {
        db.createObjectStore(TOPICS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });

  return dbPromise;
}

function txDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
  });
}

export async function cacheAiResponse(entry) {
  const db = await openDatabase();
  const tx = db.transaction(RESPONSES_STORE, 'readwrite');
  const store = tx.objectStore(RESPONSES_STORE);

  const payload = {
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: String(entry.prompt || '').trim(),
    answer: String(entry.answer || '').trim(),
    subject: String(entry.subject || '').trim(),
    mode: String(entry.mode || '').trim(),
    createdAt: entry.createdAt || Date.now(),
  };

  store.put(payload);

  const allRecords = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error || new Error('Failed to read cached responses.'));
  });

  const sorted = allRecords
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  const stale = sorted.slice(10);
  stale.forEach((item) => {
    if (item && item.id) store.delete(item.id);
  });

  await txDone(tx);
  return payload;
}

export async function getLatestAiResponses(limit = 10) {
  const db = await openDatabase();
  const tx = db.transaction(RESPONSES_STORE, 'readonly');
  const store = tx.objectStore(RESPONSES_STORE);

  const allRecords = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error || new Error('Failed to fetch cached responses.'));
  });

  await txDone(tx);

  return allRecords
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, Math.max(1, Number(limit) || 10));
}

export async function cacheSubjectTopics({ semester, subject, topics }) {
  if (!semester || !subject) return;

  const db = await openDatabase();
  const tx = db.transaction(TOPICS_STORE, 'readwrite');
  const store = tx.objectStore(TOPICS_STORE);

  const record = {
    id: `${semester}::${subject}`,
    semester,
    subject,
    topics: Array.isArray(topics) ? topics : [],
    updatedAt: Date.now(),
  };

  store.put(record);
  await txDone(tx);
}

export async function getCachedSubjectTopics({ semester, subject }) {
  if (!semester || !subject) return null;

  const db = await openDatabase();
  const tx = db.transaction(TOPICS_STORE, 'readonly');
  const store = tx.objectStore(TOPICS_STORE);

  const record = await new Promise((resolve, reject) => {
    const req = store.get(`${semester}::${subject}`);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('Failed to fetch cached topics.'));
  });

  await txDone(tx);
  return record;
}
