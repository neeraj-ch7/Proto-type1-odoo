const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const add = (...v) => round2(v.reduce((a, b) => a + Math.round(Number(b) * 100), 0) / 100);
const sub = (a, b) => round2((Math.round(a * 100) - Math.round(b * 100)) / 100);
const mul = (a, b) => round2(a * b);
module.exports = { round2, add, sub, mul };
