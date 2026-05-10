// Post-save action bar UI.

export function showPostSaveActions(doc, stockDeductedCount = 0) {
  const old = document.getElementById('post-save-bar');
  if (old) {
    clearTimeout(old._timer);
    old.remove();
  }
  const typeLabel =
    { F: 'Facture', D: 'Devis', BL: 'Bon de Livraison', AV: 'Avoir' }[doc.type] || doc.type;
  const statusColor =
    { Payé: 'var(--brand)', Envoyé: '#2563eb', Brouillon: 'var(--text2)', Annulé: 'var(--danger)' }[
      doc.status
    ] || 'var(--text2)';
  const bar = document.createElement('div');
  bar.id = 'post-save-bar';
  const _isMob = window.innerWidth <= 768;
  bar.style.cssText = `position:fixed;bottom:${_isMob ? '60px' : '0'};left:${_isMob ? '0' : 'var(--sidebar-w)'};right:0;z-index:800;background:var(--surface);border-top:2px solid var(--brand);padding:${_isMob ? '10px 12px' : '12px 24px'};display:flex;align-items:center;gap:14px;flex-wrap:wrap;box-shadow:0 -4px 20px rgba(0,0,0,.1)`;
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;min-width:200px';
  const ic = document.createElement('span');
  ic.style.fontSize = '22px';
  ic.textContent = { F: '📄', D: '📝', BL: '📦', AV: '↩️' }[doc.type] || '📄';
  const col = document.createElement('div');
  const t1 = document.createElement('div');
  t1.style.cssText = 'font-weight:700;font-size:14px';
  t1.textContent = `${doc.ref || ''} — ${typeLabel}`;
  const t2 = document.createElement('div');
  t2.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px';
  const sub = document.createElement('span');
  sub.style.cssText = 'font-size:12px;color:var(--text2)';
  sub.appendChild(document.createTextNode(`${doc.clientName || ''} · `));
  const st = document.createElement('span');
  st.style.color = statusColor;
  st.style.fontWeight = '600';
  st.textContent = doc.status || '';
  sub.appendChild(st);
  sub.appendChild(document.createTextNode(` · ${fmt(doc.ttc)}`));
  t2.appendChild(sub);
  if (stockDeductedCount > 0) {
    const bd = document.createElement('span');
    bd.style.cssText =
      'display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(9,188,138,0.12);color:var(--brand);border:1px solid rgba(9,188,138,0.25)';
    bd.textContent = `📦 Stock mis à jour — ${stockDeductedCount} article${stockDeductedCount > 1 ? 's' : ''} déduit${stockDeductedCount > 1 ? 's' : ''}`;
    t2.appendChild(bd);
  }
  col.appendChild(t1);
  col.appendChild(t2);
  left.appendChild(ic);
  left.appendChild(col);
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
  const bHist = document.createElement('button');
  bHist.className = 'btn btn-secondary btn-sm';
  bHist.setAttribute('data-action', 'ps-open-history');
  bHist.textContent = '📋 Historique';
  const bEd = document.createElement('button');
  bEd.className = 'btn btn-secondary btn-sm';
  bEd.setAttribute('data-action', 'ps-edit-doc');
  bEd.setAttribute('data-id', encodeURIComponent(String(doc.id || '')));
  bEd.textContent = '✏️ Modifier';
  const bCl = document.createElement('button');
  bCl.setAttribute('data-action', 'ps-close');
  bCl.style.cssText =
    'background:none;border:none;cursor:pointer;font-size:18px;color:var(--text2);padding:4px 8px';
  bCl.textContent = '✕';
  actions.appendChild(bHist);
  actions.appendChild(bEd);
  actions.appendChild(bCl);
  bar.appendChild(left);
  bar.appendChild(actions);
  bar
    .querySelector('[data-action="ps-open-history"]')
    ?.addEventListener('click', () => nav('history', sbItem('history')));
  bar.querySelector('[data-action="ps-edit-doc"]')?.addEventListener('click', e => {
    const id = decodeURIComponent(e.currentTarget.getAttribute('data-id') || '');
    window.editDocFromHistory(id);
  });
  bar.querySelector('[data-action="ps-close"]')?.addEventListener('click', closePostSaveBar);
  document.getElementById('main').appendChild(bar);
  bar._timer = setTimeout(closePostSaveBar, 12000);
}

export function closePostSaveBar() {
  const bar = document.getElementById('post-save-bar');
  if (!bar) return;
  clearTimeout(bar._timer);
  bar.style.transform = 'translateY(100%)';
  setTimeout(() => bar.remove(), 300);
}

export function showConvertSuccessBar(invoice, sourceDevis) {
  const old = document.getElementById('post-save-bar');
  if (old) {
    clearTimeout(old._timer);
    old.remove();
  }
  const bar = document.createElement('div');
  bar.id = 'post-save-bar';
  const _isMob2 = window.innerWidth <= 768;
  const invoiceIdJson = JSON.stringify(String(invoice.id || ''));
  bar.style.cssText = `position:fixed;bottom:${_isMob2 ? '60px' : '0'};left:${_isMob2 ? '0' : 'var(--sidebar-w)'};right:0;z-index:800;background:var(--surface);border-top:2px solid var(--brand);padding:${_isMob2 ? '10px 12px' : '12px 24px'};display:flex;align-items:center;gap:14px;flex-wrap:wrap;box-shadow:0 -4px 20px rgba(0,0,0,.1)`;
  const cLeft = document.createElement('div');
  cLeft.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;min-width:200px';
  const cIc = document.createElement('span');
  cIc.style.fontSize = '22px';
  cIc.textContent = '⚡';
  const cCol = document.createElement('div');
  const cT1 = document.createElement('div');
  cT1.style.cssText = 'font-weight:700;font-size:14px';
  cT1.textContent = `Conversion réussie — ${invoice.ref || ''}`;
  const cT2 = document.createElement('div');
  cT2.style.cssText = 'font-size:12px;color:var(--text2)';
  cT2.textContent = `Créée depuis ${sourceDevis.ref || ''} · ${invoice.clientName || ''} · ${fmt(invoice.ttc)}`;
  cCol.appendChild(cT1);
  cCol.appendChild(cT2);
  cLeft.appendChild(cIc);
  cLeft.appendChild(cCol);
  const cAct = document.createElement('div');
  cAct.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
  const bInv = document.createElement('button');
  bInv.className = 'btn btn-primary btn-sm';
  bInv.setAttribute('data-action', 'ps-open-invoice');
  bInv.setAttribute('data-id', encodeURIComponent(String(invoice.id || '')));
  bInv.textContent = '✏️ Ouvrir la facture';
  const bH2 = document.createElement('button');
  bH2.className = 'btn btn-secondary btn-sm';
  bH2.setAttribute('data-action', 'ps-open-history');
  bH2.textContent = '📋 Historique';
  const bX = document.createElement('button');
  bX.setAttribute('data-action', 'ps-close');
  bX.style.cssText =
    'background:none;border:none;cursor:pointer;font-size:18px;color:var(--text2);padding:4px 8px';
  bX.textContent = '✕';
  cAct.appendChild(bInv);
  cAct.appendChild(bH2);
  cAct.appendChild(bX);
  bar.appendChild(cLeft);
  bar.appendChild(cAct);
  bar.querySelector('[data-action="ps-open-invoice"]')?.addEventListener('click', e => {
    const id = decodeURIComponent(e.currentTarget.getAttribute('data-id') || '');
    window.editDocFromHistory(id);
    closePostSaveBar();
  });
  bar.querySelector('[data-action="ps-open-history"]')?.addEventListener('click', () => {
    nav('history', sbItem('history'));
    closePostSaveBar();
  });
  bar.querySelector('[data-action="ps-close"]')?.addEventListener('click', closePostSaveBar);
  document.getElementById('main').appendChild(bar);
  bar._timer = setTimeout(closePostSaveBar, 15000);
}
