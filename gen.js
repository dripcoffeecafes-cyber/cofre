// Gerador de senhas e medidor de força. Usa apenas crypto.getRandomValues.

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%&*-_=+?.:;',
};
const AMBIGUOUS = /[Il1O0o|]/g;

// Inteiro uniforme em [0, n) sem viés de módulo.
export function randInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  let x;
  do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
  return x % n;
}

export function generate(opts) {
  const o = { length: 20, lower: true, upper: true, digits: true, symbols: true, avoidAmbiguous: true, ...opts };
  let pools = ['lower', 'upper', 'digits', 'symbols'].filter((k) => o[k]).map((k) => SETS[k]);
  if (!pools.length) pools = [SETS.lower];
  if (o.avoidAmbiguous) pools = pools.map((p) => p.replace(AMBIGUOUS, ''));
  const all = pools.join('');
  const len = Math.max(Math.min(o.length | 0, 128), pools.length, 4);
  // Garante ao menos um caractere de cada tipo escolhido.
  const chars = pools.map((p) => p[randInt(p.length)]);
  while (chars.length < len) chars.push(all[randInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const COMMON = /(123456|654321|abcdef|qwerty|asdfgh|senha|password|admin|iloveyou|brasil|1111|0000|abc123)/i;
const LABELS = ['Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Excelente'];

export function strength(pw) {
  if (!pw) return { score: 0, bits: 0, label: '' };
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  let bits = pw.length * Math.log2(Math.max(pool, 2));
  const uniqueRatio = new Set(pw).size / pw.length;
  if (uniqueRatio < 0.6) bits *= uniqueRatio / 0.6;
  if (/(.)\1\1/.test(pw)) bits *= 0.8;
  if (COMMON.test(pw)) bits = Math.min(bits, 24);
  bits = Math.round(bits);
  const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  return { score, bits, label: LABELS[score] };
}
