export const maskTail = (value, visible = 4) => {
  if (!value) return value;
  const s = String(value);
  if (s.length <= visible) return s;
  return 'X'.repeat(s.length - visible) + s.slice(-visible);
};

export const maskAadhaar = (v) => (v ? `XXXX XXXX ${String(v).slice(-4)}` : v);
export const maskPan = (v) => (v ? `${String(v).slice(0, 2)}XXXXX${String(v).slice(-3)}` : v);
