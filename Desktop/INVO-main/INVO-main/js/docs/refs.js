// Références document et compteurs de séquence.

export function maxSeqFromExistingRefs(type, year) {
  const re = new RegExp('^' + type + '-' + year + '-(\\d+)$');
  let max = 0;
  for (const d of DB.docs || []) {
    if (d.type !== type) continue;
    const m = String(d.ref || '').match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return max;
}

export function parseDocRefNum(type, ref) {
  const yr = yyyy();
  const re = new RegExp('^' + type + '-' + yr + '-(\\d+)$');
  const m = String(ref || '')
    .trim()
    .match(re);
  return m ? parseInt(m[1], 10) : null;
}

export function docRefExistsGlobally(ref) {
  const r = String(ref || '').trim();
  if (!r) return false;
  return DB.docs.some(d => d.ref === r);
}

export function getNextRef(type) {
  const s = DB.settings;
  const yr = yyyy();
  const seqKey = { F: 'seqF', D: 'seqD', BL: 'seqBL', AV: 'seqAV' }[type];
  const seqNext = (seqKey && (s[seqKey] || 1)) || 1;
  const maxE = maxSeqFromExistingRefs(type, yr);
  const n = Math.max(maxE + 1, seqNext);
  return `${type}-${yr}-${pad(n)}`;
}

export function syncSeqCounterFromDocs(type) {
  const s = DB.settings;
  const yr = yyyy();
  const seqKey = { F: 'seqF', D: 'seqD', BL: 'seqBL', AV: 'seqAV' }[type];
  if (!seqKey) return;
  const maxE = maxSeqFromExistingRefs(type, yr);
  const cur = s[seqKey] || 1;
  s[seqKey] = Math.max(maxE + 1, cur);
  save('settings');
}

// Nouveau document : numéro ≥ max existant + 1 (tous statuts) et pas de doublon de ref.
export function applyUniqueSequentialRef(type) {
  const refEl = document.getElementById('doc-ref');
  const ref = (refEl?.value || '').trim();
  const yr = yyyy();
  const maxE = maxSeqFromExistingRefs(type, yr);
  const exists = docRefExistsGlobally(ref);
  const parsed = parseDocRefNum(type, ref);
  const seqKey = { F: 'seqF', D: 'seqD', BL: 'seqBL', AV: 'seqAV' }[type];
  const seqNext = (seqKey && DB.settings[seqKey]) || 1;
  const minRequired = Math.max(maxE + 1, seqNext);

  // Ref vide → générer automatiquement
  if (!ref) {
    const nextRef = getNextRef(type);
    if (refEl) refEl.value = nextRef;
    hideDocRefHint();
    return;
  }

  // Ref déjà utilisée dans les docs → refuser, générer une nouvelle
  if (exists) {
    const nextRef = getNextRef(type);
    if (refEl) refEl.value = nextRef;
    showDocRefHint(`Référence déjà utilisée → ajustée en ${nextRef}`, true);
    toast(`Référence ajustée : ${nextRef} (doublon détecté)`, '');
    return;
  }

  // Ref au format standard mais numéro trop petit → avertir, conserver la saisie
  if (parsed !== null && parsed < minRequired) {
    showDocRefHint(`⚠️ Numéro inférieur au minimum conseillé (${minRequired}). Référence conservée.`, true);
    return;
  }

  // Ref personnalisée valide (format libre ou numéro correct) → accepter
  if (parsed === null && ref) {
    showDocRefHint('Référence personnalisée acceptée ✓', false);
  } else {
    hideDocRefHint();
  }
}

export function updateDocRef() {
  const type = document.getElementById('doc-type')?.value;
  if (type) {
    document.getElementById('doc-ref').value = getNextRef(type);
    hideDocRefHint();
  }
}

export function hideDocRefHint() {
  const h = document.getElementById('doc-ref-hint');
  if (!h) return;
  h.textContent = '';
  h.style.display = 'none';
}

export function showDocRefHint(msg, isError) {
  const h = document.getElementById('doc-ref-hint');
  if (!h) return;
  h.textContent = msg;
  h.style.color = isError ? 'var(--danger,#e53935)' : 'var(--success,#2e7d32)';
  h.style.display = 'block';
}

export function bumpSeq(type) {
  syncSeqCounterFromDocs(type);
}
