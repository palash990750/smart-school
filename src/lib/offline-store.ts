"use client";

const DB_NAME = "smart-school-hybrid";
const DB_VERSION = 1;
const CACHE_STORE = "api-cache";
const QUEUE_STORE = "write-queue";

type QueueItem = {
  id: string;
  url: string;
  method: "PUT";
  body: string;
  createdAt: string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage"));
  });
}

export async function cacheApiValue(key: string, value: unknown): Promise<void> {
  const db = await openDB();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      tx.objectStore(CACHE_STORE).put({ key, value, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function readCachedApiValue<T>(key: string): Promise<T | undefined> {
  const db = await openDB();

  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const request = tx.objectStore(CACHE_STORE).get(key);
      request.onsuccess = () => resolve(request.result?.value as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function enqueueAttendance(url: string, body: string): Promise<void> {
  const db = await openDB();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      const item: QueueItem = {
        id: crypto.randomUUID(),
        url,
        method: "PUT",
        body,
        createdAt: new Date().toISOString(),
      };
      tx.objectStore(QUEUE_STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getPendingAttendanceCount(): Promise<number> {
  const db = await openDB();

  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const request = tx.objectStore(QUEUE_STORE).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function syncOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, remaining: await getPendingAttendanceCount() };
  }

  const db = await openDB();

  try {
    const items = await new Promise<QueueItem[]>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const request = tx.objectStore(QUEUE_STORE).getAll();
      request.onsuccess = () => resolve(request.result as QueueItem[]);
      request.onerror = () => reject(request.error);
    });

    let synced = 0;

    for (const item of items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: item.body,
        });

        // Do not delete queued data on redirects, auth failures, or server errors.
        if (!response.ok || response.redirected) break;

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) break;

        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(QUEUE_STORE, "readwrite");
          tx.objectStore(QUEUE_STORE).delete(item.id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });

        synced++;
      } catch {
        break;
      }
    }

    const remaining = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const request = tx.objectStore(QUEUE_STORE).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return { synced, remaining };
  } finally {
    db.close();
  }
}
