type StoredKeyPair = {
  algorithm: "ECDH-P256";
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
};

const DB_NAME = "imperiu_chat";
const DB_VERSION = 1;
const STORE = "e2e";
const KEY_ID = "identity";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

function b64FromBytes(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function bytesFromB64(b64: string) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hkdfSalt() {
  const data = new TextEncoder().encode("imperiu-chat-e2e-v1");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function hkdfInfo(myUserId: string, otherUserId: string) {
  const [a, b] = [myUserId, otherUserId].sort();
  return new TextEncoder().encode(`imperiu-chat:${a}:${b}`);
}

export async function loadOrCreateIdentityKeyPair(): Promise<StoredKeyPair> {
  const existing = await idbGet<StoredKeyPair>(KEY_ID);
  if (existing?.algorithm === "ECDH-P256" && existing.publicJwk && existing.privateJwk) return existing;
  return createAndStoreIdentityKeyPair();
}

export async function loadIdentityKeyPairIfExists(): Promise<StoredKeyPair | null> {
  const existing = await idbGet<StoredKeyPair>(KEY_ID);
  if (existing?.algorithm === "ECDH-P256" && existing.publicJwk && existing.privateJwk) return existing;
  return null;
}

export async function createAndStoreIdentityKeyPair(): Promise<StoredKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const publicJwk = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JsonWebKey;
  const privateJwk = (await crypto.subtle.exportKey("jwk", keyPair.privateKey)) as JsonWebKey;
  const stored: StoredKeyPair = { algorithm: "ECDH-P256", publicJwk, privateJwk };
  await idbPut(KEY_ID, stored);
  return stored;
}

export async function importPrivateKey(privateJwk: JsonWebKey) {
  return crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"]
  );
}

export async function importPublicKey(publicJwk: JsonWebKey) {
  return crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}

async function deriveAesKey(params: {
  myPrivateKey: CryptoKey;
  otherPublicKey: CryptoKey;
  myUserId: string;
  otherUserId: string;
}) {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: params.otherPublicKey },
    params.myPrivateKey,
    256
  );

  const hkdfKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);
  const salt = await hkdfSalt();
  const info = hkdfInfo(params.myUserId, params.otherUserId);

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPrivateMessage(params: {
  myPrivateJwk: JsonWebKey;
  otherPublicJwk: JsonWebKey;
  myUserId: string;
  otherUserId: string;
  payload: unknown;
}) {
  const myPrivateKey = await importPrivateKey(params.myPrivateJwk);
  const otherPublicKey = await importPublicKey(params.otherPublicJwk);
  const aesKey = await deriveAesKey({
    myPrivateKey,
    otherPublicKey,
    myUserId: params.myUserId,
    otherUserId: params.otherUserId,
  });

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(params.payload ?? {}));
  const ciphertextBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, data);

  return {
    v: 1 as const,
    algorithm: "AES-GCM" as const,
    iv: b64FromBytes(iv),
    ciphertext: b64FromBytes(new Uint8Array(ciphertextBuf)),
  };
}

export async function decryptPrivateMessage(params: {
  myPrivateJwk: JsonWebKey;
  otherPublicJwk: JsonWebKey;
  myUserId: string;
  otherUserId: string;
  encrypted: { v: 1; algorithm: "AES-GCM"; iv: string; ciphertext: string };
}) {
  const myPrivateKey = await importPrivateKey(params.myPrivateJwk);
  const otherPublicKey = await importPublicKey(params.otherPublicJwk);
  const aesKey = await deriveAesKey({
    myPrivateKey,
    otherPublicKey,
    myUserId: params.myUserId,
    otherUserId: params.otherUserId,
  });

  const iv = bytesFromB64(params.encrypted.iv);
  const ciphertext = bytesFromB64(params.encrypted.ciphertext);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
  const text = new TextDecoder().decode(plainBuf);
  return JSON.parse(text);
}
