import { runDGICheck } from './dgi-checker.js';
import { updateDocRef } from './refs.js';

export function populateDocClient() {
  const sel = document.getElementById('doc-client');
  if (!sel) return;
  const cur = sel.value;
  clearChildren(sel);
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = DB.clients.length
    ? 'Sélectionner un client...'
    : 'Aucun client enregistré';
  sel.appendChild(placeholder);
  const addOpt = document.createElement('option');
  addOpt.value = '__new__';
  addOpt.textContent = '➕ Ajouter un nouveau client';
  sel.appendChild(addOpt);
  if (DB.clients.length) {
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '──────────────────';
    sel.appendChild(sep);
    DB.clients.forEach(c => {
      const o = document.createElement('option');
      const iceOk = (c.ice || '').replace(/\D/g, '').length === 15;
      o.value = c.id;
      o.textContent = c.name + (c.ice ? ` — ICE ${c.ice}` : '  ⚠ sans ICE');
      if (c.id === cur) o.selected = true;
      sel.appendChild(o);
    });
  }
  syncGenerateFromSettings();
  if (typeof refreshThemedSelect === 'function') refreshThemedSelect('doc-client');
}

export function onClientChange() {
  const sel = document.getElementById('doc-client');
  const val = sel.value;
  if (val === '__new__') {
    sel.value = '';
    openNewClientModal();
    return;
  }
  const pill = document.getElementById('client-ice-pill');
  if (!val) {
    pill.style.display = 'none';
    runDGICheck();
    return;
  }
  const client = DB.clients.find(c => c.id === val);
  if (!client) {
    pill.style.display = 'none';
    runDGICheck();
    return;
  }
  const hasICE = (client.ice || '').replace(/\D/g, '').length === 15;
  pill.style.display = 'inline-flex';
  pill.className = 'client-ice-pill ' + (hasICE ? 'ok' : 'miss');
  pill.textContent = hasICE ? '✓ ICE OK' : '⚠ ICE manquant';
  runDGICheck();
}

export function syncGenerateFromSettings() {
  const s = DB.settings;
  const notesEl = document.getElementById('doc-notes');
  if (notesEl && !notesEl.value && s.footer) notesEl.placeholder = `Footer par défaut: ${s.footer}`;
  updateDocRef();
  runDGICheck();
}
