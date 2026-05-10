// Totaux document, ventilation TVA et montant en lettres.

export function nombreEnLettres(montant, devise) {
  const u = [
    '',
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
    'dix-sept',
    'dix-huit',
    'dix-neuf',
  ];
  const d = [
    '',
    '',
    'vingt',
    'trente',
    'quarante',
    'cinquante',
    'soixante',
    'soixante',
    'quatre-vingt',
    'quatre-vingt',
  ];
  function dizaine(n) {
    if (n < 20) return u[n];
    const di = Math.floor(n / 10),
      un = n % 10;
    if (di === 7) {
      if (un === 0) return 'soixante-dix';
      if (un === 1) return 'soixante et onze';
      return 'soixante-' + u[10 + un];
    }
    if (di === 8) {
      return un === 0 ? 'quatre-vingts' : 'quatre-vingt-' + u[un];
    }
    if (di === 9) {
      return 'quatre-vingt-' + u[10 + un];
    }
    if (un === 0) return d[di];
    if (un === 1 && di !== 8) return d[di] + ' et un';
    return d[di] + '-' + u[un];
  }
  function centaine(n) {
    if (n < 100) return dizaine(n);
    const c = Math.floor(n / 100),
      r = n % 100;
    if (c === 1) return r === 0 ? 'cent' : 'cent ' + dizaine(r);
    return dizaine(c) + ' cent' + (r === 0 && c > 1 ? 's' : r > 0 ? ' ' + dizaine(r) : '');
  }
  function millier(n) {
    if (n === 0) return '';
    if (n < 1000) return centaine(n);
    if (n < 1000000) {
      const m = Math.floor(n / 1000),
        r = n % 1000;
      const ms = m === 1 ? 'mille' : centaine(m) + ' mille';
      return r === 0 ? ms : ms + ' ' + centaine(r);
    }
    const m = Math.floor(n / 1000000),
      r = n % 1000000;
    const ms = m === 1 ? 'un million' : centaine(m) + ' millions';
    return r === 0 ? ms : ms + ' ' + millier(r);
  }
  const total = Math.round(montant * 100);
  const entier = Math.floor(total / 100);
  const cents = total % 100;
  const devs = devise || 'DH';
  // Unité monétaire
  const unitePrincipale = devs === 'EUR' ? 'euro' : 'dirham';
  const uniteSecondaire = devs === 'EUR' ? 'centime' : 'centime';
  let res = entier === 0 ? 'zéro' : millier(entier) || 'zéro';
  res = res.charAt(0).toUpperCase() + res.slice(1);
  res += ' ' + unitePrincipale + (entier > 1 ? 's' : '');
  if (cents > 0)
    res += ' et ' + (millier(cents) || 'zéro') + ' ' + uniteSecondaire + (cents > 1 ? 's' : '');
  return res;
}

export function calcTotals() {
  const remise = parseFloat(document.getElementById('doc-remise')?.value) || 0;
  const ae = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
  let globalHT = 0,
    globalTVA = 0;
  const byRate = {};

  APP.docLines.forEach(l => {
    const lineHT = l.qty * l.price;
    const ratePct = ae ? 0 : l.tva || 0;
    const lineTVA = lineHT * (ratePct / 100);
    globalHT += lineHT;
    globalTVA += lineTVA;
    const r = ratePct;
    if (!byRate[r]) byRate[r] = { ht: 0, tva: 0, ttc: 0 };
    byRate[r].ht += lineHT;
    byRate[r].tva += lineTVA;
    byRate[r].ttc += lineHT + lineTVA;
  });

  // Apply global discount proportionally
  if (remise > 0) {
    const factor = 1 - remise / 100;
    globalHT *= factor;
    globalTVA *= factor;
    Object.keys(byRate).forEach(r => {
      byRate[r].ht *= factor;
      byRate[r].tva *= factor;
      byRate[r].ttc *= factor;
    });
  }

  const ttc = globalHT + globalTVA;
  const acompte = parseFloat(document.getElementById('doc-acompte')?.value) || 0;
  const reste = ttc - acompte;

  document.getElementById('sum-ht').textContent = fmt(globalHT);
  document.getElementById('sum-tva').textContent = fmt(globalTVA);
  document.getElementById('sum-ttc').textContent = fmt(ttc);

  // Adapter le bloc "Reste à payer" selon le type de document
  const type = document.getElementById('doc-type')?.value || 'F';
  const resteBlock = document.getElementById('sum-reste-block');
  const resteLabel = document.getElementById('sum-reste-label');
  const resteVal = document.getElementById('sum-reste');
  if (type === 'F') {
    // Facture : afficher "Reste à payer" avec l'acompte déduit
    if (resteBlock) resteBlock.style.display = '';
    if (resteLabel) resteLabel.textContent = 'Reste à payer';
    if (resteVal) resteVal.textContent = fmt(Math.max(reste, 0));
  } else if (type === 'AV') {
    // Avoir : afficher "Montant à rembourser"
    if (resteBlock) resteBlock.style.display = '';
    if (resteLabel) resteLabel.textContent = 'Montant à rembourser';
    if (resteVal) resteVal.textContent = fmt(ttc);
  } else {
    // Devis, BL : masquer le bloc, sans sens métier
    if (resteBlock) resteBlock.style.display = 'none';
  }
  // Arrêté en toutes lettres
  const arrEl = document.getElementById('sum-arrete');
  const arrTxt = document.getElementById('sum-arrete-text');
  if (arrEl && arrTxt) {
    if (ttc > 0) {
      const currency = typeof CUR === 'function' ? CUR() : 'DH';
      arrTxt.textContent = nombreEnLettres(ttc, currency);
      arrEl.style.display = '';
    } else {
      arrEl.style.display = 'none';
    }
  }
  // TVA breakdown
  renderTVABreakdown(byRate, globalHT, globalTVA, ttc);
}

export function renderTVABreakdown(byRate, globalHT, globalTVA, ttc) {
  const w = document.getElementById('tva-by-rate-wrap');
  if (!w) return;

  // Masquer si aucune ligne ou TVA = 0
  const rates = Object.keys(byRate || {})
    .map(Number)
    .sort((a, b) => a - b);
  if (!rates.length || globalTVA === 0) {
    w.style.display = 'none';
    return;
  }

  // N'afficher que s'il y a plusieurs taux OU au moins un taux > 0
  const hasTVA = rates.some(r => r > 0);
  if (!hasTVA) {
    w.style.display = 'none';
    return;
  }

  const tbody = document.getElementById('tva-by-rate-body');
  const tfoot = document.getElementById('tva-by-rate-foot');
  if (!tbody || !tfoot) return;

  // Couleurs par taux
  const tvaColors = { 0: '#64748b', 7: '#3b82f6', 10: '#8b5cf6', 14: '#f59e0b', 20: '#09BC8A' };

  clearChildren(tbody);
  rates.forEach(r => {
    const v = byRate[r];
    const color = tvaColors[r] || '#94a3b8';
    const tr = document.createElement('tr');
    const tdBadge = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'tva-rate-badge';
    badge.style.background = `${color}22`;
    badge.style.color = color;
    badge.style.border = `1px solid ${color}44`;
    badge.textContent = `${r}%`;
    tdBadge.appendChild(badge);
    const tdHt = document.createElement('td');
    tdHt.textContent = fmt(v.ht);
    const tdTva = document.createElement('td');
    tdTva.style.color = color;
    tdTva.style.fontWeight = '600';
    tdTva.textContent = fmt(v.tva);
    const tdTtc = document.createElement('td');
    tdTtc.style.fontWeight = '700';
    tdTtc.textContent = fmt(v.ttc);
    tr.appendChild(tdBadge);
    tr.appendChild(tdHt);
    tr.appendChild(tdTva);
    tr.appendChild(tdTtc);
    tbody.appendChild(tr);
  });

  clearChildren(tfoot);
  const sumRow = document.createElement('tr');
  sumRow.className = 'tva-sum-row';
  const s1 = document.createElement('td');
  s1.textContent = 'Total';
  const s2 = document.createElement('td');
  s2.textContent = fmt(globalHT);
  const s3 = document.createElement('td');
  s3.style.color = 'var(--accent)';
  s3.style.fontWeight = '700';
  s3.textContent = fmt(globalTVA);
  const s4 = document.createElement('td');
  s4.style.color = 'var(--brand)';
  s4.style.fontWeight = '800';
  s4.textContent = fmt(ttc);
  sumRow.appendChild(s1);
  sumRow.appendChild(s2);
  sumRow.appendChild(s3);
  sumRow.appendChild(s4);
  tfoot.appendChild(sumRow);

  w.style.display = 'block';
}

export function refreshAutoEntrepreneurDocUI() {
  const ae = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
  const ban = document.getElementById('doc-ae-vat-banner');
  if (ban) ban.style.display = ae ? 'block' : 'none';
  const artCard = document.getElementById('doc-articles-card');
  if (artCard) artCard.classList.toggle('ae-vat-mode', ae);
  const sumRow = document.getElementById('sum-financial-totals-row');
  if (sumRow) sumRow.classList.toggle('ae-vat-mode', ae);
  ['sum-ht-wrap', 'sum-tva-wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = ae ? 'none' : '';
  });
  const ttcl = document.getElementById('sum-ttc-label');
  if (ttcl) ttcl.textContent = ae ? 'Total à payer' : 'Total TTC';
  document.querySelectorAll('#doc-lines .inv-line select[data-line-tva-select]').forEach(sel => {
    const row = sel.closest('.inv-line');
    const lid = row && row.dataset ? row.dataset.lid : '';
    const line = lid ? APP.docLines.find(x => x.id === lid) : null;
    sel.disabled = !!ae;
    if (ae) sel.value = '0';
    else if (line && ['0', '7', '10', '14', '20'].includes(String(line.tva)))
      sel.value = String(line.tva);
  });
}

export function getTotals() {
  const remise = parseFloat(document.getElementById('doc-remise')?.value) || 0;
  const ae = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
  let ht = 0,
    tva = 0;
  APP.docLines.forEach(l => {
    const lht = l.qty * l.price;
    ht += lht;
    if (!ae) tva += lht * ((l.tva || 0) / 100);
  });
  const remiseAmt = ht * (remise / 100);
  ht -= remiseAmt;
  if (!ae) tva *= 1 - remise / 100;
  const ttc = ae ? ht : ht + tva;
  return { ht, tva, ttc, remise };
}
