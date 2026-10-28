import { Vault } from './vault.js';
import { generate, strength } from './gen.js';

const APP_VERSION = '1.0.0';
const HIDDEN_LOCK_MS = 60 * 1000; // em segundo plano por mais de 1 min → bloqueia
const CLIP_CLEAR_MS = 30 * 1000;

const vault = new Vault();
const app = document.getElementById('app');
const state = { tab: 'list', q: '', cat: '__all', bioTried: false };
let installPrompt = null;

// ---------------------------------------------------------------- utilidades

const ICONS = {
  lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/>',
  key: '<circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 9-9M16 7l2.5 2.5M18.5 4.5 21 7"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15h-.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.4M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  back: '<path d="M15 18 9 12l6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  open: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  finger: '<path d="M12 11v3a8 8 0 0 1-1.5 4.7"/><path d="M8.5 10a3.5 3.5 0 0 1 7 0v2.5a13 13 0 0 1-.7 4.2"/><path d="M5.3 15.5A13 13 0 0 0 5.5 12v-2a6.5 6.5 0 0 1 11.6-4"/><path d="M18.5 9.5V12a17 17 0 0 1-.4 3.5"/><path d="M8.6 20.5a10 10 0 0 0 1.3-3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.9L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.9 3.9L21 15"/><path d="M21 20v-5h-5"/>',
};

function icon(name, cls = '') {
  const s = document.createElement('span');
  s.className = 'ic ' + cls;
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name]}</svg>`; // conteúdo fixo, não vem do usuário
  return s;
}

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

const norm = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const fmtDate = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateTime = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(16).padStart(2, '0')).join('');

function safeUrl(u) {
  if (!u) return null;
  let s = u.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
  try {
    const x = new URL(s);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null;
  } catch { return null; }
}
function hostOf(u) {
  const s = safeUrl(u);
  try { return s ? new URL(s).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}

function avatar(title) {
  const t = (title || '?').trim() || '?';
  let hash = 0;
  for (const c of t.toLowerCase()) hash = (hash * 31 + c.codePointAt(0)) | 0;
  const el = h('div', { class: 'avatar', text: [...t][0].toUpperCase() });
  el.style.background = `hsl(${Math.abs(hash) % 360} 40% 44%)`;
  return el;
}

function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = h('div', { class: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function busy(button, label) {
  const old = [...button.childNodes];
  button.disabled = true;
  button.replaceChildren(h('span', { class: 'spin' }), label);
  return () => { button.disabled = false; button.replaceChildren(...old); };
}

function meterEl() {
  return h('div', { class: 'meter', 'data-s': '-1' },
    h('div', { class: 'bars' }, h('i'), h('i'), h('i'), h('i'), h('i')),
    h('div', { class: 'lbl' }));
}
function updateMeter(m, pw) {
  const s = strength(pw);
  m.dataset.s = pw ? String(s.score) : '-1';
  m.querySelector('.lbl').textContent = pw ? `${s.label} · ~${s.bits} bits` : '';
}

function passInput(placeholder, { mono = true, id } = {}) {
  const input = h('input', {
    class: 'input' + (mono ? ' mono' : ''), type: 'password', placeholder, id,
    autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
  });
  const eye = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Mostrar senha' }, icon('eye'));
  eye.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.replaceChildren(icon(show ? 'eyeOff' : 'eye'));
    eye.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });
  const actions = h('div', { class: 'actions' }, eye);
  return { wrap: h('div', { class: 'input-wrap' }, input, actions), input, actions };
}

// ---------------------------------------------------------------- área de transferência

let clipPending = false;
let clipDeadline = 0;
async function clearClip() {
  if (!clipPending || !document.hasFocus()) return;
  try { await navigator.clipboard.writeText(''); } catch { /* sem permissão */ }
  clipPending = false;
}
window.addEventListener('focus', () => { if (clipPending && Date.now() >= clipDeadline) clearClip(); });

function legacyCopy(text) {
  const ta = h('textarea', { value: text, readonly: true });
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

async function copy(text, msg) {
  if (!text) { toast('Campo vazio'); return; }
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = legacyCopy(text); }
  if (!ok) { toast('Não foi possível copiar'); return; }
  toast(`${msg} · será apagado em 30 s`);
  clipPending = true;
  clipDeadline = Date.now() + CLIP_CLEAR_MS;
  clearTimeout(copy._t);
  copy._t = setTimeout(clearClip, CLIP_CLEAR_MS);
}

// ---------------------------------------------------------------- diálogos

const stack = [];
window.addEventListener('popstate', () => { const top = stack.pop(); if (top) top.finish(); });

function modal(build, cls = 'modal') {
  return new Promise((resolve) => {
    const d = h('dialog', { class: cls });
    let result = null;
    let done = false;
    const entry = {
      finish() {
        if (done) return;
        done = true;
        try { d.close(); } catch { /* já fechado */ }
        d.remove();
        resolve(result);
      },
    };
    const close = (v) => {
      result = v;
      if (stack[stack.length - 1] === entry) history.back();
      else { const i = stack.indexOf(entry); if (i >= 0) stack.splice(i, 1); entry.finish(); }
    };
    d.addEventListener('cancel', (e) => { e.preventDefault(); close(null); });
    d.append(build(close));
    document.body.append(d);
    d.showModal();
    stack.push(entry);
    history.pushState({ m: stack.length }, '');
  });
}

function closeAllModals() {
  while (stack.length) stack.pop().finish();
}

function confirmBox(title, text, okLabel = 'Confirmar', danger = false) {
  return modal((close) => h('div', { class: 'box' },
    h('h3', { text: title }),
    text && h('p', { text }),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancelar'),
      h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => close(true) }, okLabel))));
}

function alertBox(title, text) {
  return modal((close) => h('div', { class: 'box' },
    h('h3', { text: title }),
    text && h('p', { text }),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => close(true) }, 'Entendi'))));
}

function promptBox(title, text, { password = false, value = '', placeholder = '', okLabel = 'Continuar', validate } = {}) {
  return modal((close) => {
    let field;
    let input;
    if (password) { const p = passInput(placeholder || 'Senha'); field = p.wrap; input = p.input; }
    else {
      input = h('input', { class: 'input', type: 'text', value, placeholder, autocomplete: 'off', maxlength: '60' });
      field = input;
    }
    const msg = h('div', { class: 'msg' });
    const ok = h('button', { class: 'btn primary', type: 'submit' }, okLabel);
    const form = h('form', {
      class: 'box',
      onsubmit: async (e) => {
        e.preventDefault();
        const v = password ? input.value : input.value.trim();
        if (!v) { input.focus(); return; }
        if (validate) {
          const restore = busy(ok, 'Verificando…');
          let err = null;
          try { err = await validate(v); } catch (er) { err = er.message || 'Erro'; }
          restore();
          if (err) { msg.textContent = err; input.select(); return; }
        }
        close(v);
      },
    },
    h('h3', { text: title }),
    text && h('p', { text }),
    field, msg,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => close(null) }, 'Cancelar'),
      ok));
    setTimeout(() => input.focus(), 60);
    return form;
  });
}

function pickFile() {
  return new Promise((resolve) => {
    const i = h('input', { type: 'file', accept: '.json,application/json,text/plain' });
    i.addEventListener('change', () => resolve(i.files[0] || null));
    i.addEventListener('cancel', () => resolve(null));
    i.click();
  });
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

// ---------------------------------------------------------------- bloqueio automático

let lastActivity = Date.now();
let hiddenAt = null;
let lockTimer = null;
for (const ev of ['pointerdown', 'keydown', 'input', 'scroll', 'touchstart']) {
  document.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true, capture: true });
}
function checkAutoLock() {
  if (!vault.unlocked) return;
  const min = vault.meta?.settings?.autoLockMin || 5;
  if (Date.now() - lastActivity > min * 60000) lockNow();
}
function startAutoLock() {
  clearInterval(lockTimer);
  lastActivity = Date.now();
  lockTimer = setInterval(checkAutoLock, 10000);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    if (vault.unlocked) document.body.classList.add('obscured');
  } else {
    document.body.classList.remove('obscured');
    if (vault.unlocked && hiddenAt && Date.now() - hiddenAt > HIDDEN_LOCK_MS) lockNow();
    else checkAutoLock();
    hiddenAt = null;
    if (clipPending && Date.now() >= clipDeadline) clearClip();
  }
});

function lockNow() {
  closeAllModals();
  clearInterval(lockTimer);
  vault.lock();
  state.q = '';
  state.bioTried = false;
  renderLock();
}

// ---------------------------------------------------------------- tentativas erradas

const FAIL_KEY = 'cofre.fails';
function getFails() {
  try { return JSON.parse(localStorage.getItem(FAIL_KEY)) || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; }
}
function setFails(f) { try { localStorage.setItem(FAIL_KEY, JSON.stringify(f)); } catch { /* ignore */ } }
function registerFail() {
  const f = getFails();
  f.n += 1;
  if (f.n >= 5) f.until = Date.now() + Math.min(30000 * 2 ** (f.n - 5), 15 * 60000);
  setFails(f);
  return f;
}
const resetFails = () => setFails({ n: 0, until: 0 });

// ---------------------------------------------------------------- telas de entrada

function gate(...kids) {
  return h('div', { class: 'gate' }, h('div', { class: 'logo' }, icon('shield')), ...kids);
}

function renderSetup() {
  closeAllModals();
  const p1 = passInput('Crie a senha mestra');
  const p2 = passInput('Repita a senha mestra');
  const meter = meterEl();
  p1.input.addEventListener('input', () => updateMeter(meter, p1.input.value));
  const ack = h('input', { type: 'checkbox', id: 'ack' });
  const msg = h('div', { class: 'msg' });
  const submit = h('button', { class: 'btn primary block', type: 'submit' }, 'Criar cofre');
  const say = (t) => { msg.textContent = t; };

  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const a = p1.input.value;
      const b = p2.input.value;
      if (a.length < 10) return say('Use pelo menos 10 caracteres.');
      if (strength(a).score < 2) return say('Senha mestra fraca. Use uma frase com palavras, números e símbolos.');
      if (a !== b) return say('As duas senhas não são iguais.');
      if (!ack.checked) return say('Marque a caixa confirmando que entendeu o aviso.');
      say('');
      const restore = busy(submit, 'Criando cofre…');
      try {
        await vault.create(a);
        afterUnlock();
        toast('Cofre criado');
      } catch (err) {
        restore();
        say('Não foi possível criar o cofre: ' + err.message);
      }
    },
  },
  h('div', { class: 'field' }, h('label', { text: 'Senha mestra' }), p1.wrap, meter),
  h('div', { class: 'field' }, h('label', { text: 'Confirmar' }), p2.wrap),
  h('label', { class: 'check', for: 'ack' }, ack,
    h('span', { text: 'Entendo que a senha mestra não fica salva em lugar nenhum. Se eu esquecer, não há como recuperar as senhas.' })),
  msg, submit);

  app.replaceChildren(gate(
    h('h1', { text: 'Seu cofre de senhas' }),
    h('p', { class: 'lead', text: 'Tudo fica criptografado só neste celular. Escolha uma senha mestra forte e fácil de lembrar, como uma frase.' }),
    form,
    h('div', { class: 'alt' }, h('button', { class: 'linkish', type: 'button', onclick: () => restoreFlow() }, 'Já tenho um backup — restaurar')),
  ));
  setTimeout(() => p1.input.focus(), 100);
}

function renderLock() {
  const p = passInput('Senha mestra');
  const msg = h('div', { class: 'msg' });
  const submit = h('button', { class: 'btn primary block', type: 'submit' }, 'Desbloquear');
  const g = gate();

  async function tryBio(silent) {
    try {
      msg.textContent = '';
      await vault.unlockBio();
      resetFails();
      afterUnlock();
    } catch (e) {
      if (silent) return;
      msg.textContent = e.name === 'NotAllowedError' ? 'Biometria cancelada.' : 'Não deu para usar a biometria. Use a senha mestra.';
    }
  }

  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const f = getFails();
      if (f.until > Date.now()) {
        msg.textContent = `Muitas tentativas. Aguarde ${Math.ceil((f.until - Date.now()) / 1000)} s.`;
        return;
      }
      if (!p.input.value) { p.input.focus(); return; }
      msg.textContent = '';
      const restore = busy(submit, 'Abrindo…');
      try {
        await vault.unlock(p.input.value);
        resetFails();
        afterUnlock();
      } catch (err) {
        restore();
        if (err.message === 'WRONG_PASSWORD') {
          const nf = registerFail();
          msg.textContent = nf.until > Date.now()
            ? `Senha incorreta. Aguarde ${Math.ceil((nf.until - Date.now()) / 1000)} s para tentar de novo.`
            : 'Senha incorreta.';
          g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
          p.input.select();
        } else {
          msg.textContent = 'Erro ao abrir o cofre: ' + err.message;
        }
      }
    },
  },
  p.wrap, msg, submit,
  vault.meta?.bio && h('button', { class: 'btn ghost block', type: 'button', onclick: () => tryBio(false) }, icon('finger'), 'Usar biometria'));

  g.append(
    h('h1', { text: 'Cofre bloqueado' }),
    h('p', { class: 'lead', text: 'Digite sua senha mestra para abrir.' }),
    form,
  );
  app.replaceChildren(g);

  setTimeout(() => {
    if (vault.meta?.bio && !state.bioTried && !document.hidden) { state.bioTried = true; tryBio(true); }
    else p.input.focus();
  }, 250);
}

function afterUnlock() {
  resetFails();
  state.tab = 'list';
  state.q = '';
  state.cat = '__all';
  startAutoLock();
  navigator.storage?.persist?.().catch(() => {});
  renderMain();
}

// ---------------------------------------------------------------- tela principal

const TITLES = { list: 'Senhas', gen: 'Gerador', settings: 'Ajustes' };

function rerender() {
  if (!vault.unlocked) return;
  const y = window.scrollY;
  renderMain();
  window.scrollTo(0, y);
}

function renderMain() {
  const content = h('main', { class: 'content' });
  const navBtn = (tab, ic, label) => h('button', {
    class: state.tab === tab ? 'on' : '',
    'aria-current': state.tab === tab ? 'page' : null,
    onclick: () => { if (state.tab !== tab) { state.tab = tab; renderMain(); window.scrollTo(0, 0); } },
  }, h('span', { class: 'pill' }, icon(ic)), label);

  const shell = h('div', { class: 'shell' },
    h('header', { class: 'topbar' },
      h('h1', { text: TITLES[state.tab] }),
      h('button', { class: 'icon-btn', 'aria-label': 'Bloquear agora', title: 'Bloquear', onclick: lockNow }, icon('lock'))),
    content);
  const nav = h('nav', { class: 'nav' }, h('div', { class: 'inner' },
    navBtn('list', 'key', 'Senhas'), navBtn('gen', 'dice', 'Gerador'), navBtn('settings', 'gear', 'Ajustes')));

  const nodes = [shell, nav];
  if (state.tab === 'list') {
    renderList(content);
    nodes.push(h('button', { class: 'fab', 'aria-label': 'Adicionar senha', onclick: () => openEditor(null) }, icon('plus')));
  } else if (state.tab === 'gen') renderGen(content);
  else renderSettings(content);
  app.replaceChildren(...nodes);
}

// ----- lista

function reusedMap() {
  const m = new Map();
  for (const e of vault.data.entries) if (e.password) m.set(e.password, (m.get(e.password) || 0) + 1);
  return m;
}

function renderList(content) {
  const data = vault.data;
  const listWrap = h('div');
  const chips = h('div', { class: 'chips', role: 'tablist' });

  const search = h('div', { class: 'search' }, icon('search'),
    h('input', {
      class: 'input', type: 'search', placeholder: 'Buscar por nome, usuário ou site', value: state.q,
      autocomplete: 'off', 'aria-label': 'Buscar',
      oninput: (e) => { state.q = e.target.value; drawList(); },
    }));

  const banners = [];
  if (installPrompt && !matchMedia('(display-mode: standalone)').matches) {
    banners.push(h('div', { class: 'banner' }, icon('phone'),
      h('div', { text: 'Instale o Cofre na tela inicial para abrir como app e usar offline.' }),
      h('button', { onclick: async () => { installPrompt.prompt(); await installPrompt.userChoice.catch(() => {}); installPrompt = null; rerender(); } }, 'Instalar')));
  }
  const last = vault.meta.settings.lastBackupAt;
  if (data.entries.length && (!last || Date.now() - last > 30 * 86400000)) {
    banners.push(h('div', { class: 'banner' }, icon('download'),
      h('div', { text: last ? `Último backup em ${fmtDate(last)}. Faça um novo.` : 'Você ainda não fez backup. Se perder o celular, perde as senhas.' }),
      h('button', { onclick: exportFlow }, 'Fazer')));
  }

  function drawChips() {
    const counts = new Map();
    let fav = 0;
    let none = 0;
    for (const e of data.entries) {
      if (e.favorite) fav++;
      if (e.category && data.categories.includes(e.category)) counts.set(e.category, (counts.get(e.category) || 0) + 1);
      else none++;
    }
    const chip = (key, label, n, ic) => h('button', {
      class: 'chip' + (state.cat === key ? ' on' : ''), role: 'tab', 'aria-selected': state.cat === key ? 'true' : 'false',
      onclick: () => { state.cat = key; drawChips(); drawList(); },
    }, ic && icon(ic, 'fill'), label, h('small', { text: String(n) }));
    const list = [chip('__all', 'Todas', data.entries.length)];
    if (fav || state.cat === '__fav') list.push(chip('__fav', 'Favoritas', fav, 'star'));
    for (const c of data.categories) if (counts.get(c) || state.cat === c) list.push(chip(c, c, counts.get(c) || 0));
    if (none && data.entries.length !== none) list.push(chip('__none', 'Sem categoria', none));
    chips.replaceChildren(...list);
  }

  function filtered() {
    const q = norm(state.q.trim());
    return data.entries.filter((e) => {
      if (state.cat === '__fav' && !e.favorite) return false;
      if (state.cat === '__none' && e.category && data.categories.includes(e.category)) return false;
      if (!state.cat.startsWith('__') && e.category !== state.cat) return false;
      if (q && !norm(`${e.title} ${e.username} ${e.url} ${e.category} ${e.notes}`).includes(q)) return false;
      return true;
    }).sort((a, b) => (b.favorite - a.favorite) || a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));
  }

  function drawList() {
    if (!data.entries.length) {
      listWrap.replaceChildren(h('div', { class: 'empty' }, icon('key'),
        h('h2', { text: 'Nenhuma senha ainda' }),
        h('p', { text: 'Toque no + para guardar a primeira.' })));
      return;
    }
    const items = filtered();
    if (!items.length) {
      listWrap.replaceChildren(h('div', { class: 'empty' }, icon('search'),
        h('h2', { text: 'Nada encontrado' }),
        h('p', { text: 'Tente outra palavra ou outra categoria.' })));
      return;
    }
    const reused = reusedMap();
    listWrap.replaceChildren(h('div', { class: 'list' }, items.map((e) => h('div', {
      class: 'row', role: 'button', tabindex: '0',
      onclick: () => openDetail(e.id),
      onkeydown: (ev) => { if (ev.key === 'Enter') openDetail(e.id); },
    },
    avatar(e.title),
    h('div', { class: 'txt' },
      h('div', { class: 't' },
        h('span', { text: e.title || '(sem nome)' }),
        e.favorite && icon('star', 'fill star'),
        reused.get(e.password) > 1 && h('span', { class: 'tag', text: 'Repetida' })),
      h('div', { class: 's', text: e.username || hostOf(e.url) || e.category || '—' })),
    h('button', {
      class: 'icon-btn', 'aria-label': `Copiar senha de ${e.title}`,
      onclick: (ev) => { ev.stopPropagation(); copy(e.password, 'Senha copiada'); },
    }, icon('copy'))))));
  }

  if (state.cat !== '__all' && !state.cat.startsWith('__') && !data.categories.includes(state.cat)) state.cat = '__all';
  drawChips();
  drawList();
  content.append(search, ...banners, chips, listWrap);
}

// ----- detalhe

const findEntry = (id) => vault.data?.entries.find((e) => e.id === id);

function openDetail(id) {
  modal((close) => {
    const body = h('div', { class: 'sheet-body' });
    const barTitle = h('h2');
    const starBtn = h('button', { class: 'icon-btn accent', 'aria-label': 'Favorita' });
    const bar = h('div', { class: 'sheet-bar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Voltar', onclick: () => close(null) }, icon('back')),
      barTitle, starBtn,
      h('button', { class: 'icon-btn', 'aria-label': 'Editar', onclick: async () => { if (await openEditor(id)) { draw(); rerender(); } } }, icon('edit')));

    starBtn.addEventListener('click', async () => {
      const e = findEntry(id);
      if (!e) return;
      e.favorite = !e.favorite;
      await vault.save();
      toast(e.favorite ? 'Adicionada às favoritas' : 'Removida das favoritas');
      draw(); rerender();
    });

    function kv(label, valueNode, ...actions) {
      return h('div', { class: 'kv' }, h('div', { class: 'grow' }, h('div', { class: 'k', text: label }), valueNode), ...actions);
    }

    function draw() {
      const e = findEntry(id);
      if (!e) { close(null); return; }
      starBtn.replaceChildren(icon('star', e.favorite ? 'fill' : ''));
      let shown = false;
      const pwVal = h('div', { class: 'v mono' });
      const showPw = () => { pwVal.textContent = shown ? e.password : '•'.repeat(Math.min(e.password.length || 8, 16)); };
      showPw();
      const eye = h('button', { class: 'icon-btn', 'aria-label': 'Mostrar senha' }, icon('eye'));
      eye.addEventListener('click', () => { shown = !shown; showPw(); eye.replaceChildren(icon(shown ? 'eyeOff' : 'eye')); });
      const meter = meterEl();
      updateMeter(meter, e.password);
      const url = safeUrl(e.url);
      const reused = e.password && (reusedMap().get(e.password) || 0) > 1;

      const fields = [];
      if (e.username) fields.push(kv('Usuário', h('div', { class: 'v', text: e.username }),
        h('button', { class: 'icon-btn', 'aria-label': 'Copiar usuário', onclick: () => copy(e.username, 'Usuário copiado') }, icon('copy'))));
      fields.push(kv('Senha', pwVal, eye,
        h('button', { class: 'icon-btn', 'aria-label': 'Copiar senha', onclick: () => copy(e.password, 'Senha copiada') }, icon('copy'))));
      if (e.url) fields.push(kv('Site', url ? h('a', { class: 'v', href: url, target: '_blank', rel: 'noopener noreferrer', text: e.url }) : h('div', { class: 'v', text: e.url }),
        url && h('a', { class: 'icon-btn', href: url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Abrir site' }, icon('open'))));
      if (e.notes) fields.push(kv('Notas', h('div', { class: 'v notes', text: e.notes })));

      const hist = e.history?.length ? h('details', { class: 'hist group' },
        h('summary', { text: `Senhas anteriores (${e.history.length})` }),
        e.history.map((hh) => kv(fmtDateTime(hh.changedAt), h('div', { class: 'v mono', text: hh.password }),
          h('button', { class: 'icon-btn', 'aria-label': 'Copiar senha anterior', onclick: () => copy(hh.password, 'Senha anterior copiada') }, icon('copy'))))) : null;

      barTitle.textContent = '';
      body.replaceChildren(...[
        h('div', { class: 'hero' }, avatar(e.title),
          h('div', {}, h('h2', { text: e.title || '(sem nome)' }), h('div', { class: 'sub', text: e.category || 'Sem categoria' }))),
        h('div', { class: 'group' }, fields),
        e.password && meter,
        reused && h('div', { class: 'warn-box' }, icon('alert'), h('div', { text: 'Esta senha também é usada em outra entrada. O ideal é ter uma senha diferente para cada site.' })),
        hist,
        h('div', { class: 'meta-line', text: `Criada em ${fmtDate(e.createdAt)} · Alterada em ${fmtDateTime(e.updatedAt)}` }),
        h('button', {
          class: 'btn danger-ghost block',
          onclick: async () => {
            if (!(await confirmBox('Excluir esta senha?', `“${e.title}” será apagada deste celular. Isso não pode ser desfeito.`, 'Excluir', true))) return;
            vault.data.entries = vault.data.entries.filter((x) => x.id !== id);
            await vault.save();
            toast('Senha excluída');
            close(null);
            rerender();
          },
        }, icon('trash'), 'Excluir'),
      ].filter(Boolean));
    }

    draw();
    return h('div', { class: 'sheet-inner' }, bar, body);
  }, 'sheet');
}

// ----- editor

function categorySelect(current) {
  const sel = h('select', { class: 'input', id: 'f-cat' },
    h('option', { value: '', text: 'Sem categoria' }),
    vault.data.categories.map((c) => h('option', { value: c, text: c })),
    h('option', { value: '__new', text: '+ Nova categoria…' }));
  sel.value = vault.data.categories.includes(current) ? current : '';
  let prev = sel.value;
  sel.addEventListener('change', async () => {
    if (sel.value !== '__new') { prev = sel.value; return; }
    const name = await promptBox('Nova categoria', null, { placeholder: 'Ex.: Fornecedores', okLabel: 'Criar' });
    if (!name) { sel.value = prev; return; }
    if (!vault.data.categories.includes(name)) {
      vault.data.categories.push(name);
      sel.insertBefore(h('option', { value: name, text: name }), sel.lastElementChild);
    }
    sel.value = name;
    prev = name;
  });
  return sel;
}

function switchEl(checked, label) {
  const input = h('input', { type: 'checkbox', checked, 'aria-label': label });
  return { el: h('label', { class: 'switch' }, input, h('span')), input };
}

function openEditor(id, preset = {}) {
  const existing = id ? findEntry(id) : null;
  const cat = state.cat.startsWith('__') ? '' : state.cat;
  const d = existing ? { ...existing } : {
    title: '', username: '', url: '', notes: '', favorite: state.cat === '__fav',
    password: preset.password || generate(loadGenOpts()), category: cat,
  };

  return modal((close) => {
    let dirty = false;
    const mark = () => { dirty = true; };
    const textIn = (id2, value, placeholder, extra = {}) => h('input', {
      class: 'input', id: id2, type: 'text', value, placeholder, autocomplete: 'off', oninput: mark, ...extra,
    });
    const fTitle = textIn('f-title', d.title, 'Ex.: Instagram Blooming', { maxlength: '120' });
    const fUser = textIn('f-user', d.username, 'E-mail ou usuário', { autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', inputmode: 'email' });
    const pw = passInput('Senha');
    pw.input.value = d.password;
    const meter = meterEl();
    updateMeter(meter, d.password);
    pw.input.addEventListener('input', () => { mark(); updateMeter(meter, pw.input.value); });
    pw.actions.prepend(h('button', {
      class: 'icon-btn accent', type: 'button', 'aria-label': 'Gerar senha forte',
      onclick: () => {
        pw.input.value = generate(loadGenOpts());
        pw.input.type = 'text';
        pw.actions.lastElementChild.replaceChildren(icon('eyeOff'));
        updateMeter(meter, pw.input.value);
        mark();
      },
    }, icon('dice')));
    const fUrl = textIn('f-url', d.url, 'exemplo.com.br', { inputmode: 'url', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' });
    const fCat = categorySelect(d.category);
    fCat.addEventListener('change', mark);
    const fNotes = h('textarea', { class: 'input', id: 'f-notes', value: d.notes, placeholder: 'Códigos de recuperação, PIN, observações…', oninput: mark });
    const fav = switchEl(d.favorite, 'Favorita');
    fav.input.addEventListener('change', mark);
    const msg = h('div', { class: 'msg' });

    const save = h('button', { class: 'btn primary', type: 'button' }, 'Salvar');
    save.addEventListener('click', async () => {
      let title = fTitle.value.trim();
      const url = fUrl.value.trim();
      if (!title && url) title = hostOf(url) || url;
      if (!title) { msg.textContent = 'Dê um nome para esta senha.'; fTitle.focus(); return; }
      if (!pw.input.value) { msg.textContent = 'A senha está vazia.'; pw.input.focus(); return; }
      const now = Date.now();
      const entry = {
        id: existing?.id || newId(),
        title,
        username: fUser.value.trim(),
        password: pw.input.value,
        url,
        notes: fNotes.value,
        category: fCat.value === '__new' ? '' : fCat.value,
        favorite: fav.input.checked,
        history: existing?.history ? [...existing.history] : [],
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      if (existing && existing.password && existing.password !== entry.password) {
        entry.history.unshift({ password: existing.password, changedAt: now });
        entry.history = entry.history.slice(0, 5);
      }
      const restore = busy(save, 'Salvando');
      try {
        if (existing) vault.data.entries[vault.data.entries.findIndex((x) => x.id === existing.id)] = entry;
        else vault.data.entries.push(entry);
        await vault.save();
        toast('Salvo');
        close(true);
        rerender();
      } catch (err) {
        restore();
        msg.textContent = 'Erro ao salvar: ' + err.message;
      }
    });

    const cancel = async () => {
      if (dirty && !(await confirmBox('Descartar alterações?', null, 'Descartar', true))) return;
      close(false);
    };

    const field = (label, forId, node) => h('div', { class: 'field' }, h('label', { for: forId, text: label }), node);
    setTimeout(() => { if (!existing) fTitle.focus(); }, 120);

    return h('div', { class: 'sheet-inner' },
      h('div', { class: 'sheet-bar' },
        h('button', { class: 'icon-btn', 'aria-label': 'Cancelar', onclick: cancel }, icon('x')),
        h('h2', { text: existing ? 'Editar senha' : 'Nova senha' }),
        save),
      h('div', { class: 'sheet-body' },
        field('Nome', 'f-title', fTitle),
        field('Usuário', 'f-user', fUser),
        h('div', { class: 'field' }, h('label', { text: 'Senha' }), pw.wrap, meter),
        field('Site', 'f-url', fUrl),
        field('Categoria', 'f-cat', fCat),
        field('Notas', 'f-notes', fNotes),
        h('div', { class: 'group' }, h('div', { class: 'item' }, icon('star'), h('div', { class: 'grow', text: 'Favorita' }), fav.el)),
        msg));
  }, 'sheet');
}

// ----- gerador

const GEN_KEY = 'cofre.gen';
function loadGenOpts() {
  const def = { length: 20, lower: true, upper: true, digits: true, symbols: true, avoidAmbiguous: true };
  try { return { ...def, ...JSON.parse(localStorage.getItem(GEN_KEY) || '{}') }; } catch { return def; }
}
function saveGenOpts(o) { try { localStorage.setItem(GEN_KEY, JSON.stringify(o)); } catch { /* ignore */ } }

function renderGen(content) {
  const opts = loadGenOpts();
  let current = generate(opts);
  const out = h('div', { class: 'gen-out', 'aria-live': 'polite' });
  const meter = meterEl();

  function paint() {
    out.replaceChildren(h('span', { class: 'pw' }, [...current].map((ch) => (
      /[0-9]/.test(ch) ? h('span', { class: 'd', text: ch }) : /[^a-zA-Z0-9]/.test(ch) ? h('span', { class: 'y', text: ch }) : ch))));
    updateMeter(meter, current);
  }
  const regen = () => { current = generate(opts); paint(); };

  const lenOut = h('output', { text: String(opts.length) });
  const slider = h('input', {
    type: 'range', min: '8', max: '64', value: String(opts.length), 'aria-label': 'Tamanho',
    oninput: (e) => { opts.length = Number(e.target.value); lenOut.textContent = String(opts.length); saveGenOpts(opts); regen(); },
  });

  const toggles = [['upper', 'Maiúsculas', 'A–Z'], ['lower', 'Minúsculas', 'a–z'], ['digits', 'Números', '0–9'], ['symbols', 'Símbolos', '! @ # $ % & *']];
  const classItems = toggles.map(([k, label, sub]) => {
    const sw = switchEl(opts[k], label);
    sw.input.addEventListener('change', () => {
      opts[k] = sw.input.checked;
      if (!toggles.some(([kk]) => opts[kk])) { opts[k] = true; sw.input.checked = true; toast('Deixe ao menos um tipo ligado'); return; }
      saveGenOpts(opts); regen();
    });
    return h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { text: label }), h('div', { class: 'sub', text: sub })), sw.el);
  });
  const amb = switchEl(opts.avoidAmbiguous, 'Evitar caracteres parecidos');
  amb.input.addEventListener('change', () => { opts.avoidAmbiguous = amb.input.checked; saveGenOpts(opts); regen(); });

  paint();
  content.append(
    h('div', { class: 'card' }, out, meter,
      h('div', { class: 'gen-actions' },
        h('button', { class: 'btn ghost', onclick: regen }, icon('refresh'), 'Gerar outra'),
        h('button', { class: 'btn primary', onclick: () => copy(current, 'Senha copiada') }, icon('copy'), 'Copiar'))),
    h('div', { class: 'section-title', text: 'Opções' }),
    h('div', { class: 'group' },
      h('div', { class: 'slider-row' }, h('span', { text: 'Tamanho' }), slider, lenOut),
      classItems,
      h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { text: 'Evitar caracteres parecidos' }), h('div', { class: 'sub', text: 'Sem I, l, 1, O, 0, o' })), amb.el)),
    h('div', { class: 'section-title', text: ' ' }),
    h('button', { class: 'btn ghost block', onclick: () => openEditor(null, { password: current }) }, icon('plus'), 'Salvar como nova senha'),
  );
}

// ----- ajustes

async function exportFlow() {
  const ok = await confirmBox('Fazer backup',
    'O arquivo sai criptografado com a sua senha mestra atual. Guarde-o em um lugar seguro (Google Drive, e-mail para você mesmo). Para restaurar, vai precisar dessa mesma senha.',
    'Gerar arquivo');
  if (!ok) return;
  try {
    const json = await vault.exportBackup();
    const dt = new Date();
    const ymd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const name = `cofre-backup-${ymd}.json`;
    const file = new File([json], name, { type: 'application/json' });
    let shared = false;
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Backup do Cofre' }); shared = true; } catch (e) {
        if (e.name === 'AbortError') { toast('Backup cancelado'); return; }
      }
    }
    if (!shared) downloadFile(file);
    await vault.markBackupDone();
    toast(shared ? 'Backup compartilhado' : 'Backup salvo em Downloads');
    rerender();
  } catch (err) {
    alertBox('Não foi possível gerar o backup', err.message);
  }
}

async function restoreFlow() {
  const hasVault = !!vault.meta;
  if (hasVault && !(await confirmBox('Restaurar backup?',
    'As senhas deste celular serão substituídas pelas do backup. A biometria precisará ser ativada de novo.', 'Escolher arquivo', true))) return;
  const file = await pickFile();
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { alertBox('Arquivo grande demais', 'Esse arquivo não parece ser um backup do Cofre.'); return; }
  const text = await file.text();
  try { Vault.parseBackup(text); } catch {
    alertBox('Arquivo inválido', 'Esse arquivo não é um backup do Cofre.');
    return;
  }
  const pw = await promptBox('Senha do backup',
    'Digite a senha mestra que estava em uso quando o backup foi feito. Ela passa a ser a senha mestra deste celular.',
    {
      password: true, okLabel: 'Restaurar',
      validate: async (v) => {
        try { await vault.restoreBackup(text, v); return null; } catch (e) {
          return e.message === 'WRONG_PASSWORD' ? 'Senha incorreta.' : 'O arquivo está corrompido ou incompleto.';
        }
      },
    });
  if (pw == null) return;
  afterUnlock();
  toast(`Backup restaurado: ${vault.data.entries.length} senha(s)`);
}

function strongEnough(a, b) {
  if (a.length < 10) return 'Use pelo menos 10 caracteres.';
  if (strength(a).score < 2) return 'Senha fraca. Use uma frase com palavras, números e símbolos.';
  if (a !== b) return 'As duas senhas não são iguais.';
  return null;
}

function changePasswordFlow() {
  return modal((close) => {
    const cur = passInput('Senha mestra atual');
    const n1 = passInput('Nova senha mestra');
    const n2 = passInput('Repita a nova senha');
    const meter = meterEl();
    n1.input.addEventListener('input', () => updateMeter(meter, n1.input.value));
    const msg = h('div', { class: 'msg' });
    const ok = h('button', { class: 'btn primary', type: 'submit' }, 'Alterar');
    return h('form', {
      class: 'box',
      onsubmit: async (e) => {
        e.preventDefault();
        const err = strongEnough(n1.input.value, n2.input.value);
        if (err) { msg.textContent = err; return; }
        const restore = busy(ok, 'Alterando…');
        try {
          await vault.changePassword(cur.input.value, n1.input.value);
          close(true);
          toast('Senha mestra alterada');
        } catch (er) {
          restore();
          msg.textContent = er.message === 'WRONG_PASSWORD' ? 'A senha atual está incorreta.' : 'Erro: ' + er.message;
        }
      },
    },
    h('h3', { text: 'Alterar senha mestra' }),
    h('p', { text: 'Backups feitos antes continuam abrindo só com a senha antiga. Faça um novo backup depois.' }),
    cur.wrap, n1.wrap, meter, n2.wrap, msg,
    h('div', { class: 'btn-row' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => close(false) }, 'Cancelar'), ok));
  });
}

async function toggleBio(sw) {
  const want = sw.input.checked;
  sw.input.checked = !want; // só muda de verdade se der certo
  if (!want) {
    if (!(await confirmBox('Desativar biometria?', 'Você vai precisar da senha mestra para abrir o cofre.', 'Desativar'))) return;
    await vault.disableBio();
    toast('Biometria desativada');
    rerender();
    return;
  }
  const pw = await promptBox('Confirme a senha mestra', 'Para ativar a biometria, confirme que é você.', {
    password: true, okLabel: 'Confirmar',
    validate: async (v) => ((await vault.verifyPassword(v)) ? null : 'Senha incorreta.'),
  });
  if (pw == null) return;
  try {
    await vault.enableBio();
    toast('Biometria ativada');
    rerender();
  } catch (e) {
    if (e.name === 'NotAllowedError') { toast('Cancelado'); return; }
    if (e.message === 'PRF_UNSUPPORTED') {
      alertBox('Biometria indisponível', 'Este celular ou navegador ainda não oferece o recurso de biometria que o Cofre usa. Atualize o Chrome e o Google Play Services e tente de novo. Enquanto isso, use a senha mestra.');
      return;
    }
    alertBox('Não foi possível ativar', e.message || String(e));
  }
}

function renderSettings(content) {
  const data = vault.data;
  const settings = vault.meta.settings;

  const lockSel = h('select', {
    'aria-label': 'Tempo de bloqueio automático',
    onchange: async (e) => { settings.autoLockMin = Number(e.target.value); await vault.saveMeta(); toast('Salvo'); rerender(); },
  }, [1, 2, 5, 10, 15].map((m) => h('option', { value: String(m), text: `${m} min` })));
  lockSel.value = String(settings.autoLockMin || 5);

  const bioSw = switchEl(!!vault.meta.bio, 'Biometria');
  bioSw.input.disabled = true;
  bioSw.input.addEventListener('change', () => toggleBio(bioSw));
  const bioSub = h('div', { class: 'sub', text: vault.meta.bio ? 'Ativada' : 'Digital ou rosto, além da senha mestra' });
  Vault.bioSupported().then((ok) => {
    if (ok || vault.meta.bio) bioSw.input.disabled = false;
    else bioSub.textContent = 'Não disponível neste aparelho/navegador';
  });

  const catItems = data.categories.map((c) => {
    const n = data.entries.filter((e) => e.category === c).length;
    return h('div', { class: 'item' }, icon('tag'),
      h('div', { class: 'grow' }, h('div', { text: c }), h('div', { class: 'sub', text: `${n} senha(s)` })),
      h('button', {
        class: 'icon-btn', 'aria-label': `Renomear ${c}`,
        onclick: async () => {
          const name = await promptBox('Renomear categoria', null, { value: c, okLabel: 'Salvar' });
          if (!name || name === c) return;
          if (data.categories.includes(name)) { toast('Já existe uma categoria com esse nome'); return; }
          data.categories[data.categories.indexOf(c)] = name;
          for (const e of data.entries) if (e.category === c) e.category = name;
          if (state.cat === c) state.cat = name;
          await vault.save();
          rerender();
        },
      }, icon('edit')),
      h('button', {
        class: 'icon-btn', 'aria-label': `Excluir ${c}`,
        onclick: async () => {
          if (!(await confirmBox(`Excluir “${c}”?`, n ? `As ${n} senha(s) dessa categoria continuam salvas, só ficam sem categoria.` : null, 'Excluir', true))) return;
          data.categories = data.categories.filter((x) => x !== c);
          for (const e of data.entries) if (e.category === c) e.category = '';
          await vault.save();
          rerender();
        },
      }, icon('trash')));
  });

  const last = settings.lastBackupAt;

  content.append(
    h('div', { class: 'section-title', text: 'Segurança' }),
    h('div', { class: 'group' },
      h('div', { class: 'item' }, icon('clock'),
        h('div', { class: 'grow' }, h('div', { text: 'Bloqueio automático' }), h('div', { class: 'sub', text: 'Sem uso por esse tempo, ou 1 min fora do app' })),
        lockSel),
      h('div', { class: 'item' }, icon('finger'),
        h('div', { class: 'grow' }, h('div', { text: 'Desbloquear com biometria' }), bioSub),
        bioSw.el),
      h('button', { class: 'item', onclick: changePasswordFlow }, icon('key'), h('div', { class: 'grow', text: 'Alterar senha mestra' })),
      h('button', { class: 'item', onclick: lockNow }, icon('lock'), h('div', { class: 'grow', text: 'Bloquear agora' }))),

    h('div', { class: 'section-title', text: 'Backup' }),
    h('div', { class: 'group' },
      h('button', { class: 'item', onclick: exportFlow }, icon('download'),
        h('div', { class: 'grow' }, h('div', { text: 'Fazer backup' }),
          h('div', { class: 'sub', text: last ? `Último: ${fmtDateTime(last)}` : 'Nenhum backup feito ainda' }))),
      h('button', { class: 'item', onclick: restoreFlow }, icon('upload'),
        h('div', { class: 'grow' }, h('div', { text: 'Restaurar backup' }), h('div', { class: 'sub', text: 'Substitui as senhas deste celular' })))),

    h('div', { class: 'section-title', text: 'Categorias' }),
    h('div', { class: 'group' },
      catItems,
      h('button', {
        class: 'item',
        onclick: async () => {
          const name = await promptBox('Nova categoria', null, { placeholder: 'Ex.: Fornecedores', okLabel: 'Criar' });
          if (!name) return;
          if (data.categories.includes(name)) { toast('Essa categoria já existe'); return; }
          data.categories.push(name);
          await vault.save();
          rerender();
        },
      }, icon('plus'), h('div', { class: 'grow', text: 'Nova categoria' }))),

    h('div', { class: 'section-title', text: 'Zona de perigo' }),
    h('div', { class: 'group' },
      h('button', {
        class: 'item danger',
        onclick: async () => {
          const typed = await promptBox('Apagar o cofre deste celular?',
            'Todas as senhas serão apagadas. Só um backup permite recuperá-las. Para confirmar, digite APAGAR.',
            { placeholder: 'APAGAR', okLabel: 'Apagar tudo' });
          if (typed == null) return;
          if (typed.toUpperCase() !== 'APAGAR') { toast('Texto não confere. Nada foi apagado.'); return; }
          clearInterval(lockTimer);
          await vault.destroy();
          renderSetup();
          toast('Cofre apagado');
        },
      }, icon('trash'), h('div', { class: 'grow', text: 'Apagar cofre deste celular' }))),

    h('div', { class: 'foot' },
      h('div', { text: `${data.entries.length} senha(s) guardada(s)` }),
      h('div', { text: `Cofre v${APP_VERSION} · AES-256 · funciona offline · nada sai deste celular` })),
  );
}

// ---------------------------------------------------------------- início

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  if (vault.unlocked && state.tab === 'list') rerender();
});

async function boot() {
  if (window.top !== window.self) {
    app.replaceChildren(gate(h('h1', { text: 'Abra o Cofre diretamente' }),
      h('p', { class: 'lead', text: 'Por segurança, o Cofre não funciona dentro de outra página.' })));
    return;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  try {
    await vault.load();
  } catch {
    app.replaceChildren(gate(
      h('h1', { text: 'Não foi possível abrir o armazenamento' }),
      h('p', { class: 'lead', text: 'Verifique se o navegador não está em modo anônimo e tente de novo.' })));
    return;
  }
  if (!window.isSecureContext || !crypto.subtle) {
    app.replaceChildren(gate(
      h('h1', { text: 'Abra pelo endereço https' }),
      h('p', { class: 'lead', text: 'A criptografia só funciona em uma conexão segura (https).' })));
    return;
  }
  if (vault.meta) renderLock(); else renderSetup();
}

boot();
