// Statuts autorisés par type de document.

export const DOC_STATUS_MAP = {
  F: [
    { value: 'Brouillon', label: 'Brouillon' },
    { value: 'Envoyé', label: 'Envoyé' },
    { value: 'Payé', label: 'Payé' },
    { value: 'Annulé', label: 'Annulé' },
  ],
  D: [
    { value: 'Brouillon', label: 'Brouillon' },
    { value: 'Envoyé', label: 'Envoyé' },
    { value: 'Accepté', label: 'Accepté' },
    { value: 'Refusé', label: 'Refusé' },
    { value: 'Expiré', label: 'Expiré' },
  ],
  BL: [
    { value: 'Brouillon', label: 'Brouillon' },
    { value: 'Envoyé', label: 'Envoyé' },
    { value: 'Livré', label: 'Livré' },
    { value: 'Annulé', label: 'Annulé' },
  ],
  AV: [
    { value: 'Brouillon', label: 'Brouillon' },
    { value: 'Envoyé', label: 'Envoyé' },
    { value: 'Validé', label: 'Validé' },
    { value: 'Annulé', label: 'Annulé' },
  ],
};

export function updateDocStatus(preserveValue) {
  const typeEl = document.getElementById('doc-type');
  const statusEl = document.getElementById('doc-status');
  if (!typeEl || !statusEl) return;
  const type = typeEl.value;
  const statuses = DOC_STATUS_MAP[type] || DOC_STATUS_MAP['F'];
  const current = preserveValue || statusEl.value;
  clearChildren(statusEl);
  statuses.forEach(s => {
    const o = document.createElement('option');
    o.value = s.value;
    o.textContent = s.label;
    statusEl.appendChild(o);
  });
  // Restore previously selected value if it's still valid for the new type
  const still = statuses.find(s => s.value === current);
  statusEl.value = still ? current : statuses[0].value;
  if (typeof refreshThemedSelect === 'function') refreshThemedSelect('doc-status');
}
