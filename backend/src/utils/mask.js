export const maskTail = (value, visible = 4) => {
  if (!value) return value;
  const s = String(value);
  if (s.length <= visible) return s;
  return 'X'.repeat(s.length - visible) + s.slice(-visible);
};

export const maskAadhaar = (v) => (v ? `XXXX XXXX ${String(v).slice(-4)}` : v);
export const maskPan = (v) => (v ? `${String(v).slice(0, 2)}XXXXX${String(v).slice(-3)}` : v);

/** `jo****@gmail.com` — enough for the member to recognise their address. */
export const maskEmail = (v) => {
  if (!v) return v;
  const [name, domain] = String(v).split('@');
  return `${name.slice(0, 2)}${'*'.repeat(Math.min(6, Math.max(2, name.length - 2)))}@${domain}`;
};
