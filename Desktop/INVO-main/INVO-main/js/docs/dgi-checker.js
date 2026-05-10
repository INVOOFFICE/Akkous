// Validation ICE et panneau de conformite DGI.

export function validateICEInput(input) {
  const v = (input.value || '').replace(/\D/g, '');
  input.value = v;
  input.classList.remove('ice-valid', 'ice-warn', 'ice-invalid');
  if (!v) return;
  if (v.length === 15) input.classList.add('ice-valid');
  else input.classList.add('ice-warn');
  if (document.getElementById('dgi-checker')) runDGICheck();
}

const DGI_CHECKS = [
  {
    id: 'ice-v',
    label: 'ICE vendeur',
    tip: '15 chiffres, art. 145 CGI',
    check: () => {
      const v = (DB.settings.ice || '').replace(/\D/g, '');
      return v.length === 15 ? 'ok' : v.length > 0 ? 'warn' : 'err';
    },
  },
  {
    id: 'if-v',
    label: 'IF vendeur',
    tip: 'Identifiant Fiscal obligatoire',
    check: () => (DB.settings.if ? 'ok' : 'err'),
  },
  {
    id: 'rc-v',
    label: 'RC vendeur',
    tip: 'Registre du Commerce obligatoire',
    check: () => (DB.settings.rc ? 'ok' : 'err'),
  },
  {
    id: 'nom-v',
    label: 'Raison sociale',
    tip: 'Nom du vendeur obligatoire',
    check: () => (DB.settings.name ? 'ok' : 'err'),
  },
  {
    id: 'ice-c',
    label: 'ICE client',
    tip: 'Obligatoire pour dÃ©duction TVA B2B',
    check: () => {
      const cid = (document.getElementById('doc-client') || {}).value;
      if (!cid || cid === '__new__') return 'warn';
      const type = (document.getElementById('doc-type') || {}).value;
      if (type === 'D' || type === 'BL') return 'ok';
      const c = DB.clients.find(x => x.id === cid);
      if (!c) return 'warn';
      const v = (c.ice || '').replace(/\D/g, '');
      return v.length === 15 ? 'ok' : v.length > 0 ? 'warn' : 'err';
    },
  },
  {
    id: 'cli',
    label: 'Client renseignÃ©',
    tip: 'Client obligatoire sur facture',
    check: () => {
      const cid = (document.getElementById('doc-client') || {}).value;
      const type = (document.getElementById('doc-type') || {}).value;
      if (type === 'D') return 'ok';
      return cid && cid !== '__new__' ? 'ok' : 'err';
    },
  },
  {
    id: 'date',
    label: "Date d'Ã©mission",
    tip: 'Date obligatoire sur tout document',
    check: () => ((document.getElementById('doc-date') || {}).value ? 'ok' : 'err'),
  },
  {
    id: 'lignes',
    label: 'Au moins 1 article',
    tip: 'Document vide non valide',
    check: () => (APP.docLines.length > 0 ? 'ok' : 'err'),
  },
];

const DGI_LBL = { ok: 'âœ“', warn: 'âš ', err: 'âœ—' };

export function runDGICheck() {
  const list = document.getElementById('dgi-items-list');
  const badge = document.getElementById('dgi-score-badge');
  if (!list || !badge) return;
  let ok = 0,
    err = 0,
    warn = 0;
  clearChildren(list);
  DGI_CHECKS.forEach(c => {
    const s = c.check();
    if (s === 'ok') ok++;
    else if (s === 'err') err++;
    else warn++;
    const div = document.createElement('div');
    div.className = 'dgi-item ' + s;
    div.title = c.tip || '';
    const dot = document.createElement('span');
    dot.className = 'dgi-dot';
    const sp = document.createElement('span');
    sp.textContent = `${DGI_LBL[s]} ${c.label}`;
    div.appendChild(dot);
    div.appendChild(sp);
    list.appendChild(div);
  });
  badge.textContent = `${ok}/${DGI_CHECKS.length} mentions conformes`;
  badge.className = 'dgi-score ' + (err > 0 ? 'err' : warn > 0 ? 'warn' : 'ok');
}
