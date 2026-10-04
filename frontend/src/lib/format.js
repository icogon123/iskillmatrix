const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const IST = { timeZone: 'Asia/Kolkata' };

export const inr = (n) => `₹${inrFmt.format(Number(n) || 0)}`;
export const num = (n) => inrFmt.format(Number(n) || 0);

export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { ...IST, day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { ...IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const shortDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return date(d);
};

export const firstName = (name = '') => name.split(' ')[0];
export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const todayKey = () => new Date().toLocaleDateString('en-CA', IST);
