// Kept for backward compat (modale), but now the Reports page is the primary entry
export function showSalesReport() {
  nav('reports', sbItem('reports'));
}

/**
 * Ventilation TVA par taux pour un document (cohérente avec remise et tvaByRate persisté).
 * Anciens docs sans tvaByRate : reconstitution depuis les lignes × facteur remise.
 */
export function accumulateDocTvaByRateForReport(d, sign, byTva) {
  const remise = parseFloat(d.remise) || 0;
  const factor = remise > 0 ? 1 - remise / 100 : 1;
  const useByRate = d.tvaByRate && Object.keys(d.tvaByRate).length > 0;
  const aeDoc = typeof docIsAutoEntrepreneurExempt === 'function' && docIsAutoEntrepreneurExempt(d);
  if (useByRate) {
    Object.entries(d.tvaByRate).forEach(([rateStr, vals]) => {
      const r = Number(rateStr);
      if (!byTva[r]) byTva[r] = { base: 0, tva: 0 };
      byTva[r].base += sign * (vals.ht || 0);
      byTva[r].tva += sign * (vals.tva || 0);
    });
    return;
  }
  (d.lines || []).forEach(l => {
    const r = Number(l.tva ?? 20);
    const base = (l.qty || 0) * (l.price || 0) * sign * factor;
    if (!byTva[r]) byTva[r] = { base: 0, tva: 0 };
    byTva[r].base += base;
    if (!aeDoc) byTva[r].tva += base * (r / 100);
  });
}

// ── Rapports / Fiscal ──
// ═══════════════════════════════════════════
let _repPeriodMonths = 1;
export function _setReportsSkeletonLoading(loading) {
  ['rep-by-type', 'rep-top-clients', 'rep-tva-breakdown'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('skeleton-block', !!loading);
    el.setAttribute('aria-busy', loading ? 'true' : 'false');
  });
}
export function _repDocYmd(d) {
  const s = d && d.date;
  if (!s || typeof s !== 'string') return '';
  const m = String(s)
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}
export function _repCutoffYmd(months) {
  const now = new Date();
  const cut = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return `${cut.getFullYear()}-${String(cut.getMonth() + 1).padStart(2, '0')}-${String(cut.getDate()).padStart(2, '0')}`;
}
export function setRepPeriod(months, btn) {
  const n = parseInt(months, 10);
  _repPeriodMonths = Number.isFinite(n) && n > 0 ? n : 1;
  document.querySelectorAll('[id^="rep-btn-"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderReports();
}
export function renderReports(_deferred) {
  if (!document.getElementById('rep-ca')) return;
  if (!_deferred) {
    _setReportsSkeletonLoading(true);
    if (APP._repRenderRAF) cancelAnimationFrame(APP._repRenderRAF);
    APP._repRenderRAF = requestAnimationFrame(() => renderReports(true));
    return;
  }
  document.querySelectorAll('[id^="rep-btn-"]').forEach(b => {
    b.classList.toggle('active', String(b.dataset.repPeriod || '') === String(_repPeriodMonths));
  });
  const cutoffStr = _repCutoffYmd(_repPeriodMonths);
  const docs = DB.docs.filter(d => {
    const ymd = _repDocYmd(d);
    if (!ymd || ymd < cutoffStr) return false;
    if (d.type === 'F') return d.status === 'Payé';
    if (d.type === 'AV') return d.status === 'Validé' || d.status === 'Payé'; // compat anciens états
    return false;
  });
  const sign = d => (d.type === 'AV' ? -1 : 1);
  const ca = docs.reduce((a, d) => a + sign(d) * (d.ttc || 0), 0);
  const ht = docs.reduce((a, d) => a + sign(d) * (d.ht || 0), 0);
  const tva = docs.reduce((a, d) => a + sign(d) * (d.tva || 0), 0);
  const setEl = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setEl('rep-ca', fmt(ca));
  setEl('rep-ht', fmt(ht));
  setEl('rep-tva', fmt(tva));

  // Par type
  const byType = {};
  docs.forEach(d => {
    byType[d.type] = (byType[d.type] || 0) + sign(d) * (d.ttc || 0);
  });
  const typeLabels = { F: 'Facture', D: 'Devis', BL: 'Bon de Livraison', AV: 'Avoir' };
  const byTypeEl = document.getElementById('rep-by-type');
  if (byTypeEl) {
    clearChildren(byTypeEl);
    if (!Object.keys(byType).length) {
      const em = document.createElement('div');
      em.style.cssText = 'color:var(--text2);font-size:13px';
      em.textContent = 'Aucune facture payée ni avoir validé sur cette période.';
      byTypeEl.appendChild(em);
    } else {
      Object.entries(byType).forEach(([t, v]) => {
        const row = document.createElement('div');
        row.style.cssText =
          'display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px';
        const a = document.createElement('span');
        a.style.fontWeight = '600';
        a.textContent = typeLabels[t] || t;
        const b = document.createElement('span');
        b.style.cssText = 'font-family:Arial, sans-serif;font-weight:700;color:var(--brand)';
        b.textContent = fmt(v);
        row.appendChild(a);
        row.appendChild(b);
        byTypeEl.appendChild(row);
      });
    }
  }

  // Top clients
  const byClient = {};
  docs.forEach(d => {
    if (d.clientName)
      byClient[d.clientName] = (byClient[d.clientName] || 0) + sign(d) * (d.ttc || 0);
  });
  const top = Object.entries(byClient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topEl = document.getElementById('rep-top-clients');
  if (topEl) {
    clearChildren(topEl);
    if (!top.length) {
      const em = document.createElement('div');
      em.style.cssText = 'color:var(--text2);font-size:13px';
      em.textContent = 'Aucun client.';
      topEl.appendChild(em);
    } else {
      top.forEach(([n, v], i) => {
        const row = document.createElement('div');
        row.style.cssText =
          'display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px';
        const rk = document.createElement('span');
        rk.style.cssText =
          'width:20px;height:20px;border-radius:50%;background:var(--brand-light);color:var(--brand);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0';
        rk.textContent = String(i + 1);
        const nm = document.createElement('span');
        nm.style.cssText = 'flex:1;font-weight:600';
        nm.textContent = n;
        const amt = document.createElement('span');
        amt.style.cssText = 'font-family:Arial, sans-serif;font-weight:700';
        amt.textContent = fmt(v);
        row.appendChild(rk);
        row.appendChild(nm);
        row.appendChild(amt);
        topEl.appendChild(row);
      });
    }
  }

  // TVA par taux (tvaByRate après remise, ou lignes × remise pour anciens exports)
  const byTva = {};
  docs.forEach(d => {
    accumulateDocTvaByRateForReport(d, sign(d), byTva);
  });
  const tvaEl = document.getElementById('rep-tva-breakdown');
  if (tvaEl) {
    clearChildren(tvaEl);
    if (!Object.keys(byTva).length) {
      const em = document.createElement('div');
      em.style.cssText = 'color:var(--text2);font-size:13px';
      em.textContent = 'Aucune donnée.';
      tvaEl.appendChild(em);
    } else {
      const tbl = document.createElement('table');
      tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px';
      const thead = document.createElement('thead');
      const hr = document.createElement('tr');
      const thR =
        'text-align:right;padding:8px 10px;background:var(--surface2);font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase';
      const h1 = document.createElement('th');
      h1.style.cssText =
        'text-align:left;padding:8px 10px;background:var(--surface2);border-radius:6px 0 0 0;font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase';
      h1.textContent = 'Taux';
      const h2 = document.createElement('th');
      h2.style.cssText = thR;
      h2.textContent = 'Base HT';
      const h3 = document.createElement('th');
      h3.style.cssText = thR;
      h3.textContent = 'TVA';
      const h4 = document.createElement('th');
      h4.style.cssText = thR + ';border-radius:0 6px 0 0';
      h4.textContent = 'Total TTC';
      hr.appendChild(h1);
      hr.appendChild(h2);
      hr.appendChild(h3);
      hr.appendChild(h4);
      thead.appendChild(hr);
      tbl.appendChild(thead);
      const tb = document.createElement('tbody');
      Object.entries(byTva)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .forEach(([r, v]) => {
          const tr = document.createElement('tr');
          const c0 = document.createElement('td');
          c0.style.cssText =
            'padding:9px 10px;border-bottom:1px solid var(--border);font-weight:600';
          c0.textContent = `${r}%`;
          const c1 = document.createElement('td');
          c1.style.cssText =
            'padding:9px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:Arial, sans-serif';
          c1.textContent = fmt(v.base);
          const c2 = document.createElement('td');
          c2.style.cssText =
            'padding:9px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:Arial, sans-serif;color:var(--accent);font-weight:600';
          c2.textContent = fmt(v.tva);
          const c3 = document.createElement('td');
          c3.style.cssText =
            'padding:9px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:Arial, sans-serif;font-weight:700;color:var(--brand)';
          c3.textContent = fmt(v.base + v.tva);
          tr.appendChild(c0);
          tr.appendChild(c1);
          tr.appendChild(c2);
          tr.appendChild(c3);
          tb.appendChild(tr);
        });
      tbl.appendChild(tb);
      tvaEl.appendChild(tbl);
    }
  }
  _setReportsSkeletonLoading(false);
}
