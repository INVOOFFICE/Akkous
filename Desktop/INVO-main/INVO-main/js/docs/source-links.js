// Métadonnées de liaison entre documents source et avoirs.

export function syncAvoirSourceMetaFromContext() {
  const type = document.getElementById('doc-type')?.value || 'F';
  if (type !== 'AV') return;
  const sourceRefEl = document.getElementById('doc-source-ref');
  const sourceIdEl = document.getElementById('doc-source-id');
  const sourceTypeEl = document.getElementById('doc-source-type');
  if (!sourceRefEl || !sourceIdEl || !sourceTypeEl) return;
  if (sourceRefEl.value) return;

  const originType = (document.getElementById('doc-origin-type')?.value || '').trim();
  const originStatus = (document.getElementById('doc-origin-status')?.value || '').trim();
  const originRef = (document.getElementById('doc-origin-ref')?.value || '').trim();
  const docId = (document.getElementById('doc-id')?.value || '').trim();

  // Règle métier : si facture annulée -> transformée en avoir, on conserve le lien.
  if (originType === 'F' && originStatus === 'Annulé' && originRef) {
    sourceRefEl.value = originRef;
    sourceIdEl.value = docId;
    sourceTypeEl.value = 'F';
  }
}

export function refreshDocSourceHint() {
  const wrap = document.getElementById('doc-source-hint-wrap');
  const txt = document.getElementById('doc-source-hint-text');
  if (!wrap || !txt) return;

  syncAvoirSourceMetaFromContext();

  const type = document.getElementById('doc-type')?.value || '';
  const srcRef = (document.getElementById('doc-source-ref')?.value || '').trim();
  const srcType = (document.getElementById('doc-source-type')?.value || '').trim();
  if (type !== 'AV' || !srcRef) {
    wrap.style.display = 'none';
    return;
  }
  const label =
    srcType === 'F' ? 'Facture d’origine' : srcType === 'D' ? 'Devis source' : 'Document source';
  txt.textContent = `${label} : ${srcRef}`;
  wrap.style.display = 'block';
}
