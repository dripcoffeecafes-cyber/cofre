// Cofre criptografado.
//
// Esquema:
//   - Uma chave do cofre (VK) aleatória de 256 bits cifra os dados (AES-256-GCM).
//   - A senha mestra passa por PBKDF2-SHA256 (600.000 iterações, sal aleatório)
//     e gera a chave que "embrulha" a VK. A senha mestra nunca é salva.
//   - Biometria (opcional): uma passkey do aparelho com a extensão WebAuthn PRF
//     gera um segredo que embrulha uma segunda cópia da VK.
//   - Tudo fica no IndexedDB deste aparelho. Nada é enviado para a internet.

const te = new TextEncoder();
const td = new TextDecoder();
const AAD = te.encode('cofre:v1');

export const KDF_ITERATIONS = 600000;
export const DEFAULT_CATEGORIES = ['Pessoal', 'Blooming Club', 'Drip Coffee Label', 'Financeiro', 'Redes sociais'];

export const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
export function b64e(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
export const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function kdf(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', te.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function seal(key, bytes) {
  const iv = rand(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, bytes));
  return { iv: b64e(iv), ct: b64e(ct) };
}

async function unseal(key, box) {
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(box.iv), additionalData: AAD }, key, b64d(box.ct)),
  );
}

const importVK = (raw) => crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

async function bioKek(prfOutput) {
  const ikm = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: te.encode('cofre:bio:v1') },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function getPrf(credId, prfSalt) {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: rand(32),
      allowCredentials: [{ type: 'public-key', id: credId }],
      userVerification: 'required',
      timeout: 60000,
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  });
  const out = assertion.getClientExtensionResults().prf?.results?.first;
  if (!out) throw new Error('PRF_UNSUPPORTED');
  return new Uint8Array(out);
}

// ---------- Armazenamento (IndexedDB) ----------

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('cofre', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction('kv', mode);
        const store = t.objectStore('kv');
        let result;
        const r = fn(store);
        if (r) r.onsuccess = () => { result = r.result; };
        t.oncomplete = () => { db.close(); resolve(result); };
        t.onerror = () => { db.close(); reject(t.error); };
        t.onabort = () => { db.close(); reject(t.error || new Error('ABORTED')); };
      }),
  );
}

export const idbStore = {
  get: (k) => tx('readonly', (s) => s.get(k)),
  put: (k, v) => tx('readwrite', (s) => s.put(v, k)),
  clear: () => tx('readwrite', (s) => s.clear()),
};

// ---------- Dados ----------

function normalizeData(d) {
  const data = d && typeof d === 'object' ? d : {};
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const str = (v) => (typeof v === 'string' ? v : '');
  const cats = Array.isArray(data.categories) ? data.categories.filter((c) => typeof c === 'string' && c.trim()) : [...DEFAULT_CATEGORIES];
  for (const e of entries) {
    if (e && typeof e.category === 'string' && e.category.trim() && !cats.includes(e.category)) cats.push(e.category);
  }
  return {
    categories: cats,
    entries: entries
      .filter((e) => e && typeof e === 'object')
      .map((e) => ({
        id: str(e.id) || b64e(rand(9)),
        title: str(e.title),
        username: str(e.username),
        password: str(e.password),
        url: str(e.url),
        notes: str(e.notes),
        category: str(e.category),
        favorite: !!e.favorite,
        history: Array.isArray(e.history) ? e.history.filter((h) => h && typeof h.password === 'string').slice(0, 5) : [],
        createdAt: Number(e.createdAt) || Date.now(),
        updatedAt: Number(e.updatedAt) || Date.now(),
      })),
  };
}

function checkKdf(k) {
  if (!k || k.alg !== 'PBKDF2-SHA256' || typeof k.salt !== 'string') throw new Error('BAD_FILE');
  if (!(k.iterations >= 100000 && k.iterations <= 10000000)) throw new Error('BAD_FILE');
}

// ---------- Cofre ----------

export class Vault {
  constructor(store = idbStore) {
    this.store = store;
    this.meta = null;
    this.data = null;
    this._key = null;
    this._raw = null;
  }

  get unlocked() { return !!this._key; }

  async load() {
    this.meta = (await this.store.get('vault')) || null;
    return this.meta;
  }

  async create(password) {
    const salt = rand(16);
    const raw = rand(32);
    const kek = await kdf(password, salt, KDF_ITERATIONS);
    this.meta = {
      format: 'cofre',
      v: 1,
      kdf: { alg: 'PBKDF2-SHA256', iterations: KDF_ITERATIONS, salt: b64e(salt) },
      wrapPw: await seal(kek, raw),
      bio: null,
      settings: { autoLockMin: 5, lastBackupAt: null },
      data: null,
      createdAt: Date.now(),
    };
    await this._setKey(raw);
    this.data = normalizeData({ entries: [], categories: [...DEFAULT_CATEGORIES] });
    await this.save();
  }

  async _setKey(raw) {
    if (this._raw && this._raw !== raw) this._raw.fill(0);
    this._raw = raw;
    this._key = await importVK(raw);
  }

  async _finishUnlock(raw) {
    const key = await importVK(raw);
    const data = JSON.parse(td.decode(await unseal(key, this.meta.data)));
    this._raw = raw;
    this._key = key;
    this.data = normalizeData(data);
  }

  async unlock(password) {
    const m = this.meta || (await this.load());
    if (!m) throw new Error('NO_VAULT');
    const kek = await kdf(password, b64d(m.kdf.salt), m.kdf.iterations);
    let raw;
    try { raw = await unseal(kek, m.wrapPw); } catch { throw new Error('WRONG_PASSWORD'); }
    await this._finishUnlock(raw);
  }

  async verifyPassword(password) {
    const m = this.meta;
    const kek = await kdf(password, b64d(m.kdf.salt), m.kdf.iterations);
    try { (await unseal(kek, m.wrapPw)).fill(0); return true; } catch { return false; }
  }

  async save() {
    if (!this._key) throw new Error('LOCKED');
    this.meta.data = await seal(this._key, te.encode(JSON.stringify(this.data)));
    this.meta.updatedAt = Date.now();
    await this.store.put('vault', this.meta);
  }

  // Salva só as configurações (não sensíveis); os dados continuam como estão.
  async saveMeta() { await this.store.put('vault', this.meta); }

  lock() {
    if (this._raw) this._raw.fill(0);
    this._raw = null;
    this._key = null;
    this.data = null;
  }

  async changePassword(oldPw, newPw) {
    if (!(await this.verifyPassword(oldPw))) throw new Error('WRONG_PASSWORD');
    const salt = rand(16);
    const kek = await kdf(newPw, salt, KDF_ITERATIONS);
    this.meta.kdf = { alg: 'PBKDF2-SHA256', iterations: KDF_ITERATIONS, salt: b64e(salt) };
    this.meta.wrapPw = await seal(kek, this._raw);
    await this.save();
  }

  // ----- Biometria (WebAuthn PRF) -----

  static async bioSupported() {
    try {
      return !!(window.PublicKeyCredential && navigator.credentials &&
        (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()));
    } catch { return false; }
  }

  async enableBio() {
    if (!this._raw) throw new Error('LOCKED');
    const prfSalt = rand(32);
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: rand(32),
        rp: { name: 'Cofre de Senhas' },
        user: { id: rand(16), name: 'Cofre de Senhas', displayName: 'Cofre de Senhas' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
        attestation: 'none',
        timeout: 60000,
        extensions: { prf: { eval: { first: prfSalt } } },
      },
    });
    const ext = cred.getClientExtensionResults?.() || {};
    if (!ext.prf || ext.prf.enabled === false) throw new Error('PRF_UNSUPPORTED');
    const credId = new Uint8Array(cred.rawId);
    let out = ext.prf.results?.first ? new Uint8Array(ext.prf.results.first) : null;
    if (!out) out = await getPrf(credId, prfSalt);
    const kek = await bioKek(out);
    out.fill(0);
    this.meta.bio = { credId: b64e(credId), prfSalt: b64e(prfSalt), wrap: await seal(kek, this._raw) };
    await this.saveMeta();
  }

  async unlockBio() {
    const m = this.meta || (await this.load());
    if (!m?.bio) throw new Error('NO_BIO');
    const out = await getPrf(b64d(m.bio.credId), b64d(m.bio.prfSalt));
    const kek = await bioKek(out);
    out.fill(0);
    let raw;
    try { raw = await unseal(kek, m.bio.wrap); } catch { throw new Error('BIO_FAILED'); }
    await this._finishUnlock(raw);
  }

  async disableBio() {
    this.meta.bio = null;
    await this.saveMeta();
  }

  // ----- Backup -----

  async exportBackup() {
    await this.save();
    const backup = {
      format: 'cofre-backup',
      v: 1,
      exportedAt: new Date().toISOString(),
      count: this.data.entries.length,
      kdf: this.meta.kdf,
      wrapPw: this.meta.wrapPw,
      data: this.meta.data,
    };
    return JSON.stringify(backup);
  }

  async markBackupDone() {
    this.meta.settings.lastBackupAt = Date.now();
    await this.saveMeta();
  }

  static parseBackup(text) {
    let b;
    try { b = JSON.parse(text); } catch { throw new Error('BAD_FILE'); }
    if (!b || b.format !== 'cofre-backup' || !b.wrapPw || !b.data) throw new Error('BAD_FILE');
    checkKdf(b.kdf);
    return b;
  }

  async restoreBackup(text, password) {
    const b = Vault.parseBackup(text);
    const kek = await kdf(password, b64d(b.kdf.salt), b.kdf.iterations);
    let raw;
    try { raw = await unseal(kek, b.wrapPw); } catch { throw new Error('WRONG_PASSWORD'); }
    const key = await importVK(raw);
    let data;
    try { data = normalizeData(JSON.parse(td.decode(await unseal(key, b.data)))); } catch { throw new Error('BAD_FILE'); }
    const prev = this.meta;
    this.meta = {
      format: 'cofre',
      v: 1,
      kdf: b.kdf,
      wrapPw: b.wrapPw,
      bio: null,
      settings: { autoLockMin: prev?.settings?.autoLockMin || 5, lastBackupAt: Date.parse(b.exportedAt) || Date.now() },
      data: b.data,
      createdAt: prev?.createdAt || Date.now(),
    };
    if (this._raw) this._raw.fill(0);
    this._raw = raw;
    this._key = key;
    this.data = data;
    await this.save();
  }

  async destroy() {
    this.lock();
    await this.store.clear();
    this.meta = null;
  }
}
