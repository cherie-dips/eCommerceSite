// Keeps an unsaved design (including the uploaded images) in this browser, so it
// survives a page refresh or a trip to the login page. One draft per product.
const DB_NAME = "flagzen-drafts";
const STORE = "drafts";

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("No IndexedDB"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "productId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// draft: { productId, design, uploads: [{ assetId, file, name, width, height, analysis }], brandText }
export async function saveDraft(draft) {
  try {
    await withStore("readwrite", (store) => store.put({ ...draft, updatedAt: Date.now() }));
  } catch {
    // Private browsing or storage full: the design just isn't kept.
  }
}

export async function loadDraft(productId) {
  try {
    const draft = await withStore("readonly", (store) => store.get(productId));
    // Drafts older than 30 days are ignored
    if (!draft || Date.now() - draft.updatedAt > 30 * 24 * 60 * 60 * 1000) return null;
    return draft;
  } catch {
    return null;
  }
}

export async function clearDraft(productId) {
  try {
    await withStore("readwrite", (store) => store.delete(productId));
  } catch {
    // nothing to clear
  }
}
