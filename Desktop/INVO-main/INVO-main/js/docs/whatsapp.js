// WhatsApp sharing for documents from history.

function _normalizePhoneForWhatsApp(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('212')) return p;
  if (p.startsWith('0')) return '212' + p.slice(1);
  return '212' + p;
}

export function sendDocWhatsApp(docId) {
  const d = DB.docs.find(x => x.id === docId);
  if (!d) return;

  const c = DB.clients.find(x => x.id === d.clientId);
  const phone = _normalizePhoneForWhatsApp(c?.phone);
  if (!phone) {
    toast("Client sans téléphone — impossible d'envoyer via WhatsApp", 'err');
    return;
  }

  const typeLabel =
    { F: 'Facture', D: 'Devis', BL: 'Bon de Livraison', AV: 'Avoir' }[d.type] || d.type;
  const name = c?.name || d.clientName || 'client';
  const sender = DB.settings?.name || 'INVO';

  const ht = Number(d.ht || 0);
  const tvaAmount = Number(d.tva || 0);
  const ttc = Number(d.ttc || 0);
  const acompte = Number(d.acompte || 0);
  const reste = Math.max(0, ttc - acompte);

  // Résumé lignes (WhatsApp = court ; on limite pour éviter un message trop long)
  const allLines = Array.isArray(d.lines) ? d.lines : [];
  const linesPreview = allLines.slice(0, 6).map(l => {
    const q = Number(l.qty || 0);
    const pu = Number(l.price || 0);
    const th = q * pu;
    const label = l.name || l.designation || 'Article';
    const tvaPct = l.tva == null ? null : Number(l.tva);
    return `• ${label} — ${q} x ${fmt(pu)} = ${fmt(th)}${tvaPct != null && !Number.isNaN(tvaPct) ? ` (TVA ${tvaPct}%)` : ''}`;
  });
  if (allLines.length > 6) {
    linesPreview.push(`• ... (${allLines.length - 6} autre(s) ligne(s))`);
  }

  // Templates "intelligents" : par type de document
  const headerByType = (() => {
    if (d.type === 'F')
      return `Bonjour ${name},\n\nVoici votre ${typeLabel} ${d.ref} (statut : ${d.status}).`;
    if (d.type === 'D')
      return `Bonjour ${name},\n\nVoici votre ${typeLabel} ${d.ref} (statut : ${d.status}).`;
    if (d.type === 'BL')
      return `Bonjour ${name},\n\nVoici votre ${typeLabel} ${d.ref} (statut : ${d.status}).`;
    if (d.type === 'AV')
      return `Bonjour ${name},\n\nVoici votre ${typeLabel} ${d.ref} (statut : ${d.status}).`;
    return `Bonjour ${name},\n\nDocument ${typeLabel} ${d.ref} (statut : ${d.status}).`;
  })();

  const montantBlock = [
    `Date : ${d.date}`,
    `Total HT : ${fmt(ht)}`,
    `TVA : ${fmt(tvaAmount)}`,
    `Total TTC : ${fmt(ttc)}`,
  ];

  const paiementBlock = (() => {
    const out = [];
    if (d.type === 'F' || d.type === 'BL') {
      if (acompte > 0) out.push(`Acompte : ${fmt(acompte)} · Reste à payer : ${fmt(reste)}`);
      else out.push(`Montant à payer : ${fmt(ttc)}`);
    } else if (d.type === 'D') {
      out.push(`Montant TTC : ${fmt(ttc)}`);
      if (acompte > 0) out.push(`Acompte (si prévu) : ${fmt(acompte)}`);
    } else if (d.type === 'AV') {
      out.push(`Montant TTC de l'avoir : ${fmt(ttc)}`);
      if (acompte > 0) out.push(`Acompte associé : ${fmt(acompte)}`);
    }
    if (d.payment) out.push(`Paiement : ${d.payment}`);
    return out;
  })();

  const notesBlock = d.notes ? [`Notes : ${d.notes}`] : [];
  const iceBlock = c?.ice ? [`ICE client : ${c.ice}`] : [];

  const text = [
    headerByType,
    ...(iceBlock.length ? [''] : []),
    ...iceBlock,
    ...(iceBlock.length ? [''] : []),
    ...montantBlock,
    ...(paiementBlock.length ? [''] : []),
    ...paiementBlock,
    ...(linesPreview.length ? ['', 'Articles :', ...linesPreview] : []),
    ...(notesBlock.length ? ['', ''] : []),
    ...notesBlock,
    `\nCordialement, ${sender}`,
  ]
    .filter(Boolean)
    .join('\n');

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
