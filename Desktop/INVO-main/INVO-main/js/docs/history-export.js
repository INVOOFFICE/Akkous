import { getHistFiltered } from './history-filters.js';

export function exportHistXLSX() {
  const docs = getHistFiltered();
  if (!docs.length) {
    toast('Aucun document à exporter', 'err');
    return;
  }
  if (typeof XLSX === 'undefined') {
    toast('❌ Librairie Excel non chargée — vérifiez votre connexion', 'err');
    return;
  }

  try {
    // Neutralise les cellules texte pouvant être interprétées comme formules Excel.
    const safeXlsxText = v => {
      const s = String(v == null ? '' : v);
      return /^\s*[=+\-@]/.test(s) ? "'" + s : s;
    };

  // ── En-têtes ──
    const headers = [
      'Référence',
      'Date',
      'Type',
      'Statut',
      'Client',
      'ICE Client',
      'Total HT',
      'TVA',
      'Total TTC',
      'Reste à payer',
    ];

  // ── Données ──
  const rows = docs.map(d => {
    const acompte = d.acompte || 0;
      const reste = Math.max(0, (d.ttc || 0) - acompte);
    return [
        safeXlsxText(d.ref || ''),
        safeXlsxText(d.date || ''),
        safeXlsxText({ F: 'Facture', D: 'Devis', BL: 'Bon de livraison', AV: 'Avoir' }[d.type] || d.type),
        safeXlsxText(d.status || ''),
      safeXlsxText(d.clientName || ''),
        safeXlsxText(DB.clients.find(c => c.id === d.clientId)?.ice || ''),
        d.ht || 0,
      d.tva || 0,
      d.ttc || 0,
      reste,
    ];
  });

  // ── Créer le workbook SheetJS ──
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── Largeurs des colonnes ──
  ws['!cols'] = [
      { wch: 18 }, // Référence
      { wch: 12 }, // Date
      { wch: 18 }, // Type
      { wch: 12 }, // Statut
      { wch: 28 }, // Client
      { wch: 18 }, // ICE
      { wch: 14 }, // HT
      { wch: 12 }, // TVA
      { wch: 14 }, // TTC
      { wch: 14 }, // Reste
  ];

  // ── Figer la première ligne (en-têtes) ──
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  // ── Styles en-têtes (fond foncé + texte blanc + gras) ──
  const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '1A3C5E' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
    border: {
      bottom: { style: 'medium', color: { rgb: '09BC8A' } },
      },
  };

  // ── Styles colonnes montants (droite + format nombre) ──
  const amountStyle = {
      font: { sz: 10 },
    alignment: { horizontal: 'right' },
      numFmt: '#,##0.00',
  };

  // ── Styles lignes alternées ──
  const rowStyleEven = { fill: { fgColor: { rgb: 'F8F9FA' }, patternType: 'solid' } };
  const rowStyleBadge = {
      Payé: { font: { color: { rgb: '27AE60' }, bold: true } },
      Envoyé: { font: { color: { rgb: '2980B9' }, bold: true } },
      Brouillon: { font: { color: { rgb: '888888' } } },
      Annulé: { font: { color: { rgb: 'C0392B' } } },
      Accepté: { font: { color: { rgb: '27AE60' }, bold: true } },
      Livré: { font: { color: { rgb: '09BC8A' }, bold: true } },
  };

  const range = XLSX.utils.decode_range(ws['!ref']);

  // Appliquer styles en-têtes (ligne 0)
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) continue;
    ws[addr].s = headerStyle;
  }

  // Appliquer styles sur les données
    const amountCols = new Set([6, 7, 8, 9]); // HT, TVA, TTC, Reste
    for (let r = 1; r <= range.e.r; r++) {
    const isEven = r % 2 === 0;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };

        if (amountCols.has(c)) {
        ws[addr].s = { ...amountStyle, ...(isEven ? rowStyleEven : {}) };
        ws[addr].t = 'n'; // forcer type numérique
        } else if (c === 3) {
          // colonne Statut
        const statusVal = ws[addr].v || '';
        ws[addr].s = { ...(rowStyleBadge[statusVal] || {}), ...(isEven ? rowStyleEven : {}) };
      } else {
        ws[addr].s = isEven ? rowStyleEven : {};
      }
    }
  }

  // ── Onglet récap TVA (factures payées - avoirs validés) ──
    const fiscals = docs.filter(
      d =>
        (d.type === 'F' && d.status === 'Payé') ||
        (d.type === 'AV' && (d.status === 'Validé' || d.status === 'Payé')),
    );
    if (fiscals.length) {
    const tvaMap = {};
    fiscals.forEach(d => {
        const sign = d.type === 'AV' ? -1 : 1;
        Object.entries(d.tvaByRate || {}).forEach(([rate, vals]) => {
          if (!tvaMap[rate]) tvaMap[rate] = { base: 0, tva: 0, ttc: 0 };
          tvaMap[rate].base += sign * (vals.ht || 0);
          tvaMap[rate].tva += sign * (vals.tva || 0);
          tvaMap[rate].ttc += sign * (vals.ttc || 0);
        });
        if (!Object.keys(d.tvaByRate || {}).length) {
        const r = Number(d.tva ?? 20);
          if (!tvaMap[r]) tvaMap[r] = { base: 0, tva: 0, ttc: 0 };
          tvaMap[r].base += sign * (d.ht || 0);
          tvaMap[r].tva += sign * (d.tva || 0);
          tvaMap[r].ttc += sign * (d.ttc || 0);
        }
      });

      const tvaHeaders = ['Taux TVA', 'Base HT', 'Montant TVA', 'Total TTC'];
    const tvaRows = Object.entries(tvaMap)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([rate, v]) => [rate + '%', v.base, v.tva, v.ttc]);
      const totalRow = [
        'TOTAL',
        tvaRows.reduce((s, r) => s + r[1], 0),
        tvaRows.reduce((s, r) => s + r[2], 0),
        tvaRows.reduce((s, r) => s + r[3], 0),
    ];

    const wsTVA = XLSX.utils.aoa_to_sheet([tvaHeaders, ...tvaRows, totalRow]);
      wsTVA['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

    // Style en-tête TVA
      for (let c = 0; c < 4; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (wsTVA[addr]) wsTVA[addr].s = headerStyle;
    }
    // Style ligne total
    const totalR = tvaRows.length + 1;
      for (let c = 0; c < 4; c++) {
        const addr = XLSX.utils.encode_cell({ r: totalR, c });
        if (wsTVA[addr])
          wsTVA[addr].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '09BC8A' }, patternType: 'solid' },
        numFmt: '#,##0.00',
      };
    }

    XLSX.utils.book_append_sheet(wb, wsTVA, 'TVA DGI');
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Historique');

  // ── Métadonnées ──
  wb.Props = {
      Title: 'Historique INVO',
    Subject: 'Export documents',
      Author: DB.settings.name || 'INVO',
    CreatedDate: new Date(),
  };

  // ── Télécharger ──
    const period = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `historique_${period}.xlsx`);
  toast(`✅ Export Excel — ${docs.length} document(s)`, 'suc');
  } catch (e) {
    dbgErr('[exportHistXLSX] Erreur:', e);
    toast('❌ Erreur export Excel — ' + (e.message || 'réessayez'), 'err');
  }
}
