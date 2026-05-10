// Filtres de l'historique documents.

export function populateHistClientFilter() {
  const sel = document.getElementById('hist-client');
  if (!sel) return;
  const cur = sel.value;
  clearChildren(sel);
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = 'Tous les clients';
  sel.appendChild(ph);
  const names = [...new Set(DB.docs.map(d => d.clientName).filter(Boolean))];
  names.forEach(n => {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    if (n === cur) o.selected = true;
    sel.appendChild(o);
  });
}

export function getHistFiltered() {
  const search = (document.getElementById('hist-search') || {}).value || '';
  const type = (document.getElementById('hist-type') || {}).value || '';
  const status = (document.getElementById('hist-status') || {}).value || '';
  const client = (document.getElementById('hist-client') || {}).value || '';
  const fromEl = document.getElementById('hist-date-from');
  const toEl = document.getElementById('hist-date-to');
  const from = (fromEl?._filterValue ?? fromEl?.value) || '';
  const to = (toEl?._filterValue ?? toEl?.value) || '';
  return DB.docs.filter(d => {
    const refLc = (d.ref || '').toLowerCase();
    const cliLc = (d.clientName || '').toLowerCase();
    const q = search.toLowerCase();
    if (search && !refLc.includes(q) && !cliLc.includes(q)) return false;
    if (type && d.type !== type) return false;
    if (status && d.status !== status) return false;
    if (client && d.clientName !== client) return false;
    if (from && d.date < from) return false;
    if (to && d.date > to) return false;
    return true;
  });
}

export function resetHistFilters() {
  [
    'hist-search',
    'hist-type',
    'hist-status',
    'hist-client',
    'hist-date-from',
    'hist-date-to',
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el._fp && typeof el._fp.clear === 'function') {
      el._fp.clear();
      return;
    }
    el.value = '';
  });
  APP.histPage = 1;
  renderHistory();
}
