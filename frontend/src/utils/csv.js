// Minimal CSV parser (handles quotes). Expects columns: name, phone (header optional).
export function parseContactsCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);

  let data = rows.filter((r) => r.some((x) => x.trim() !== ''));
  // Detect header row
  if (data.length && /name/i.test(data[0][0]) && /phone|number|mobile/i.test(data[0][1] || '')) data = data.slice(1);
  return data.map((r) => ({ name: (r[0] || '').trim(), phone: (r[1] || '').trim() }));
}
