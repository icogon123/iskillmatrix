export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const pct = (amount, percent) => round2((Number(amount) * Number(percent)) / 100);
