import { calcTotals, getTotals, nombreEnLettres, refreshAutoEntrepreneurDocUI, renderTVABreakdown } from './docs/totals.js';
import {
  applyUniqueSequentialRef,
  bumpSeq,
  docRefExistsGlobally,
  getNextRef,
  hideDocRefHint,
  showDocRefHint,
  updateDocRef,
} from './docs/refs.js';
import { updateDocStatus } from './docs/status.js';
import { refreshDocSourceHint } from './docs/source-links.js';
import {
  accumulateDocTvaByRateForReport,
  renderReports,
  setRepPeriod,
  showSalesReport,
} from './docs/reports.js';
import { getHistFiltered, populateHistClientFilter, resetHistFilters } from './docs/history-filters.js';
import { runDGICheck, validateICEInput } from './docs/dgi-checker.js';
import { sendDocWhatsApp } from './docs/whatsapp.js';
import { exportHistXLSX } from './docs/history-export.js';
import {
  closePostSaveBar,
  showConvertSuccessBar,
  showPostSaveActions,
} from './docs/post-save-bar.js';
import {
  onClientChange,
  populateDocClient,
  syncGenerateFromSettings,
} from './docs/client-form.js';
import { saveAndDownloadPDF } from './docs/pdf-actions.js';

const docsPublicApi = {
  updateDocRef,
  updateDocStatus,
  refreshDocSourceHint,
  initDocLines,
  addLine,
  onDocPriceModeChange,
  renderDocLines,
  nombreEnLettres,
  calcTotals,
  getTotals,
  saveDoc,
  saveAndDownloadPDF,
  showPostSaveActions,
  closePostSaveBar,
  populateDocClient,
  onClientChange,
  syncGenerateFromSettings,
  validateICEInput,
  runDGICheck,
  editDocFromHistory,
  createAvoirFromCancelledFacture,
  populateHistClientFilter,
  getHistFiltered,
  openConvertModal,
  updateConvDateField,
  confirmConvert,
  showConvertSuccessBar,
  renderHistory,
  quickChangeStatus,
  cancelDoc,
  resetHistFilters,
  deleteDoc,
  sendDocWhatsApp,
  duplicateDoc,
  exportHistXLSX,
  showSalesReport,
  accumulateDocTvaByRateForReport,
  setRepPeriod,
  renderReports,
};

Object.assign(window, docsPublicApi);

// ═══════════════════════════════════════════
//  docs.js  —  Documents, lignes, DGI, historique
// ═══════════════════════════════════════════
//
//  INDEX — fonctions & entrées principales (navigation rapide)
//  ───────────────────────────────────────────────────────────
//  Référence & numérotation : maxSeqFromExistingRefs, parseDocRefNum,
//    docRefExistsGlobally, getNextRef, syncSeqCounterFromDocs,
//    applyUniqueSequentialRef, updateDocRef, bumpSeq
//  Avoir / document source : syncAvoirSourceMetaFromContext,
//    refreshDocSourceHint
//  Statuts & liste déroulante doc : updateDocStatus, initDocLines
//  Lignes de document : addLine, removeLine, getLineTTC, getLineUnitTTC,
//    setLineFromUnitTTC, getDisplayedUnitPrice, applyUserUnitPriceInput,
//    renderDocLines, updateLineTotal, updLine
//  Montants, TVA, arrêté : nombreEnLettres, calcTotals, renderTVABreakdown,
//    refreshAutoEntrepreneurDocUI, getTotals
//  Persistance & PDF : saveDoc, saveAndDownloadPDF, showPostSaveActions,
//    closePostSaveBar
//  Formulaire génération : populateDocClient, onClientChange,
//    syncGenerateFromSettings, validateICEInput, runDGICheck
//  Historique & CRUD doc : editDocFromHistory,
//    createAvoirFromCancelledFacture, populateHistClientFilter,
//    getHistFiltered, openConvertModal, updateConvDateField, confirmConvert,
//    showConvertSuccessBar, renderHistory, quickChangeStatus, cancelDoc,
//    resetHistFilters, deleteDoc, duplicateDoc, exportHistXLSX,
//    sendDocWhatsApp, _normalizePhoneForWhatsApp
//  Rapports fiscaux : showSalesReport, accumulateDocTvaByRateForReport,
//    _setReportsSkeletonLoading, _repDocYmd, _repCutoffYmd, setRepPeriod,
//    renderReports
//
// ═══════════════════════════════════════════

// ── Référence document (séquence stricte ; comptabilise tous les documents, y compris Annulé) ──
// Source-link and status logic moved to js/docs/source-links.js and js/docs/status.js.

// ═══════════════════════════════════════════
function initDocLines() {
  APP.docLines = [];
  const c = document.getElementById('doc-lines');
  if (c) clearChildren(c);
  const empty = document.getElementById('doc-lines-empty');
  if (empty) empty.style.display = 'block';
  ['doc-date', 'doc-remise', 'doc-acompte', 'doc-notes', 'doc-terms', 'doc-payment'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  updateDocStatus('Brouillon');
  const clientEl = document.getElementById('doc-client');
  if (clientEl) clientEl.value = '';
  const pillEl = document.getElementById('client-ice-pill');
  if (pillEl) pillEl.style.display = 'none';
  const docDate = document.getElementById('doc-date');
  if (docDate) docDate.value = today();
  // Réinitialiser l'id caché → le prochain save sera un nouveau document
  const docIdEl = document.getElementById('doc-id');
  if (docIdEl) docIdEl.value = '';
  // Réinitialiser les métadonnées de liaison (source doc)
  const srcRefEl = document.getElementById('doc-source-ref');
  if (srcRefEl) srcRefEl.value = '';
  const srcIdEl = document.getElementById('doc-source-id');
  if (srcIdEl) srcIdEl.value = '';
  const srcTypeEl = document.getElementById('doc-source-type');
  if (srcTypeEl) srcTypeEl.value = '';
  const originRefEl = document.getElementById('doc-origin-ref');
  if (originRefEl) originRefEl.value = '';
  const originTypeEl = document.getElementById('doc-origin-type');
  if (originTypeEl) originTypeEl.value = '';
  const originStatusEl = document.getElementById('doc-origin-status');
  if (originStatusEl) originStatusEl.value = '';
  updateDocRef();
  calcTotals();
  if (typeof refreshAutoEntrepreneurDocUI === 'function') refreshAutoEntrepreneurDocUI();
  closePostSaveBar();
  runDGICheck();
  refreshDocSourceHint();
  if (typeof refreshThemedSelect === 'function') {
    ['doc-type', 'doc-status', 'doc-client', 'doc-terms', 'doc-payment', 'doc-price-mode'].forEach(
      refreshThemedSelect,
    );
  }
  initDocPriceModeForNewDoc();
  // ── Bouton 🔄 régénération référence ──
  const btnRegen = document.getElementById('btn-regen-ref');
  if (btnRegen) {
    btnRegen.onclick = () => {
      updateDocRef();
      toast('Référence régénérée automatiquement', '');
    };
  }
  // ── Validation live du champ Référence ──
  const refInput = document.getElementById('doc-ref');
  if (refInput) {
    // Supprimer l'ancien listener pour éviter les doublons
    if (refInput._refInputHandler) refInput.removeEventListener('input', refInput._refInputHandler);
    refInput._refInputHandler = () => {
      const val = (refInput.value || '').trim();
      hideDocRefHint();
      if (!val) return;
      const editingId = document.getElementById('doc-id')?.value || '';
      const isDuplicate = DB.docs.some(d => d.ref === val && d.id !== editingId);
      if (isDuplicate) {
        showDocRefHint('⚠️ Cette référence est déjà utilisée.', true);
      } else {
        showDocRefHint('Référence disponible ✓', false);
      }
    };
    refInput.addEventListener('input', refInput._refInputHandler);
  }
}

// ── Ajouter ligne ──
// ═══════════════════════════════════════════
function addLine(article = null) {
  // Ignorer si article est un Event (clic sur div vide) ou n'a pas de name
  if (article && (article instanceof Event || typeof article.name !== 'string')) article = null;
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  const ae = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
  const defaultTva = ae ? 0 : parseInt(DB.settings.tva, 10) || 20;
  const line = article
    ? {
        id,
        name: article.name,
        qty: 1,
        price: 0,
        tva: ae ? 0 : article.tva != null ? article.tva : defaultTva,
        fromStock: article.id,
      }
    : { id, name: '', qty: 1, price: 0, tva: defaultTva, fromStock: null };
  // Catalogue stock : prix de vente article.sell en TTC → toujours converti en PU HT (line.price).
  if (article) setLineFromUnitTTC(line, article.sell || 0);
  APP.docLines.push(line);
  renderDocLines();
  calcTotals(); /* refresh via renderDocLines */
  setTimeout(() => {
    const row = document.getElementById('line-' + id);
    if (row) row.querySelector('input')?.focus();
  }, 30);
}
function removeLine(id) {
  APP.docLines = APP.docLines.filter(l => l.id !== id);
  renderDocLines();
  calcTotals();
}
function getLineTTC(line) {
  const ae = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
  const qty = Number(line?.qty || 0);
  const price = Number(line?.price || 0);
  const rate = ae ? 0 : Number(line?.tva || 0);
  const ht = qty * price;
  return ht + (ht * rate) / 100;
}

// Prix Unitaire TTC (line.price stocke le PU HT en interne)
function getLineUnitTTC(line) {
  const ae = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
  const rate = ae ? 0 : Number(line?.tva || 0);
  const htUnit = Number(line?.price || 0);
  return htUnit + (htUnit * rate) / 100;
}

// Convertit un PU TTC en PU HT (pour stocker dans line.price)
function setLineFromUnitTTC(line, unitTTC) {
  const ae = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
  const rate = ae ? 0 : Number(line?.tva || 0);
  const denom = 1 + rate / 100;
  const ttc = Number(unitTTC) || 0;
  line.price = denom > 0 ? ttc / denom : 0;
}

/**
 * PU affiché dans le champ « Prix U » selon le mode document / global (TTC ou HT).
 * Stockage interne inchangé : line.price reste toujours HT.
 */
function getDisplayedUnitPrice(line) {
  if (typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT') {
    return Number(line?.price || 0);
  }
  return getLineUnitTTC(line);
}

/**
 * Interprète la saisie utilisateur du PU selon le mode (TTC → conversion, HT → stockage direct).
 */
function applyUserUnitPriceInput(line, rawStr) {
  const v = parseFloat(rawStr) || 0;
  if (typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT') {
    line.price = v;
  } else {
    setLineFromUnitTTC(line, v);
  }
}

function refreshDocPriceModeLabels() {
  const ht = typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT';
  const label = ht ? 'Prix U (HT)' : 'Prix U (TTC)';
  const head = document.getElementById('doc-inv-head-price');
  if (head) head.textContent = label;
  document.querySelectorAll('.inv-line .inv-cell-price .inv-mini-label').forEach(el => {
    el.textContent = label;
  });
}

function refreshAllDocLinePriceInputs() {
  (APP.docLines || []).forEach(l => {
    const row = document.getElementById('line-' + l.id);
    const inp = row?.querySelector('input[data-line-field="price"]');
    if (inp) inp.value = l.price ? String(getDisplayedUnitPrice(l)) : '';
  });
}

/** Synchronise APP.docPriceMode depuis le select document (bonus : mode par document). */
function syncDocPriceModeFromSelect() {
  const sel = document.getElementById('doc-price-mode');
  if (!sel) return;
  const m =
    typeof normalizePriceMode === 'function' ? normalizePriceMode(sel.value) : null;
  APP.docPriceMode = m || (typeof getGlobalPriceMode === 'function' ? getGlobalPriceMode() : 'TTC');
}

function initDocPriceModeForNewDoc() {
  APP.docPriceMode = typeof getGlobalPriceMode === 'function' ? getGlobalPriceMode() : 'TTC';
  const sel = document.getElementById('doc-price-mode');
  if (sel) sel.value = APP.docPriceMode;
  refreshDocPriceModeLabels();
}

function loadDocPriceModeFromSaved(d) {
  const fromDoc =
    d && typeof normalizePriceMode === 'function' ? normalizePriceMode(d.priceMode) : null;
  APP.docPriceMode = fromDoc || (typeof getGlobalPriceMode === 'function' ? getGlobalPriceMode() : 'TTC');
  const sel = document.getElementById('doc-price-mode');
  if (sel) sel.value = APP.docPriceMode;
  refreshDocPriceModeLabels();
}

/** Changement du mode sur le document : réaffiche les PU sans altérer line.price (HT). */
function onDocPriceModeChange() {
  syncDocPriceModeFromSelect();
  refreshDocPriceModeLabels();
  refreshAllDocLinePriceInputs();
  if (document.getElementById('modal-stock-picker')?.classList.contains('open') && typeof renderStockPicker === 'function') {
    renderStockPicker();
  }
}

// ── Render lignes (autocomplete) ──
// ═══════════════════════════════════════════
function renderDocLines() {
  const c = document.getElementById('doc-lines');
  const empty = document.getElementById('doc-lines-empty');
  if (empty) empty.style.display = APP.docLines.length ? 'none' : 'block';
  c.querySelectorAll('.inv-line').forEach(row => {
    if (!APP.docLines.find(l => l.id === row.dataset.lid)) row.remove();
  });

  APP.docLines.forEach((l, idx) => {
    if (document.getElementById('line-' + l.id)) return;
    const row = document.createElement('div');
    row.className = 'inv-line';
    row.id = 'line-' + l.id;
    row.dataset.lid = l.id;

    // Helper: field wrapper with mobile mini-label
    const makeCell = (label, child, extraClass = '') => {
      const cell = document.createElement('div');
      cell.className = 'inv-cell ' + extraClass;
      const lab = document.createElement('div');
      lab.className = 'inv-mini-label';
      lab.textContent = label;
      cell.appendChild(lab);
      cell.appendChild(child);
      return cell;
    };

    // Autocomplete wrap
    const acWrap = document.createElement('div');
    acWrap.className = 'ac-wrap';
    const name = document.createElement('input');
    name.dataset.lineField = 'name';
    name.value = l.name;
    name.placeholder = 'Désignation ou code article...';
    name.autocomplete = 'off';
    name.style.width = '100%';
    const dropdown = document.createElement('div');
    dropdown.className = 'ac-dropdown';
    dropdown.id = 'ac-' + l.id;
    let acFocusIdx = -1;
    const closeAC = () => {
      dropdown.classList.remove('open');
      acFocusIdx = -1;
    };
    const markAc = 'background:rgba(26,107,60,.15);color:var(--brand);border-radius:2px';
    const applyArt = a => {
      const ae = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
      l.name = a.name;
      l.tva = ae ? 0 : a.tva != null ? a.tva : parseInt(DB.settings.tva, 10) || 20;
      l.fromStock = a.id;
      setLineFromUnitTTC(l, a.sell || 0);
      name.value = a.name;
      const priceInput = row.querySelector('input[data-line-field="price"]');
      const qtyInput = row.querySelector('input[data-line-field="qty"]');
      if (priceInput) priceInput.value = l.price ? String(getDisplayedUnitPrice(l)) : '';
      if (qtyInput) qtyInput.value = l.qty;
      const s = row.querySelector('select');
      if (s) s.value = String(l.tva);
      updateLineTotal(l);
      calcTotals();
      if (qtyInput) {
        qtyInput.select();
        qtyInput.focus();
      }
    };
    const openAC = q => {
      const ql = (q || '').toLowerCase();
      const results = q
        ? DB.stock
            .filter(
              a =>
                a.name.toLowerCase().includes(ql) ||
                (a.barcode || '').toLowerCase().includes(ql) ||
                (a.category || '').toLowerCase().includes(ql),
            )
            .slice(0, 8)
        : DB.stock.slice(0, 8);
      clearChildren(dropdown);
      acFocusIdx = -1;
      if (!results.length && q) {
        const empty = document.createElement('div');
        empty.className = 'ac-empty';
        empty.textContent = 'Aucun article pour "' + q + '"';
        dropdown.appendChild(empty);
        const libre = document.createElement('div');
        libre.className = 'ac-add';
        libre.appendChild(document.createTextNode('✏️ Utiliser "'));
        const st = document.createElement('strong');
        st.textContent = q;
        libre.appendChild(st);
        libre.appendChild(document.createTextNode('" comme texte libre'));
        libre.addEventListener('mousedown', e => {
          e.preventDefault();
          l.name = q;
          name.value = q;
          closeAC();
        });
        dropdown.appendChild(libre);
        dropdown.classList.add('open');
        return;
      }
      if (!results.length) {
        closeAC();
        return;
      }
      results.forEach(a => {
        const low = (a.qty || 0) < 5,
          zero = (a.qty || 0) === 0;
        const item = document.createElement('div');
        item.className = 'ac-item';
        const left = document.createElement('div');
        const nameRow = document.createElement('div');
        nameRow.className = 'ac-name';
        appendHighlightedContent(nameRow, a.name, q, markAc);
        if (low && !zero) {
          const w = document.createElement('span');
          w.className = 'ac-stock-low';
          w.textContent = '⚠';
          nameRow.appendChild(w);
        }
        const meta = document.createElement('div');
        meta.className = 'ac-meta';
        meta.textContent = `${a.category || '—'} · stock: ${a.qty || 0}`;
        left.appendChild(nameRow);
        left.appendChild(meta);
        const price = document.createElement('div');
        price.className = 'ac-price';
        const aePick = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
        const arTva = aePick ? 0 : a.tva != null ? a.tva : parseInt(DB.settings.tva, 10) || 20;
        const sellShown =
          typeof displayTTCForDocLineMode === 'function'
            ? displayTTCForDocLineMode(a.sell || 0, arTva)
            : a.sell || 0;
        price.textContent = fmt(sellShown);
        item.appendChild(left);
        item.appendChild(price);
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          applyArt(a);
          closeAC();
        });
        dropdown.appendChild(item);
      });
      if (q) {
        const libre = document.createElement('div');
        libre.className = 'ac-add';
        libre.appendChild(document.createTextNode('✏️ Utiliser "'));
        const st2 = document.createElement('strong');
        st2.textContent = q;
        libre.appendChild(st2);
        libre.appendChild(document.createTextNode('" comme texte libre'));
        libre.addEventListener('mousedown', e => {
          e.preventDefault();
          l.name = q;
          name.value = q;
          closeAC();
        });
        dropdown.appendChild(libre);
      }
      dropdown.classList.add('open');
    };
    name.addEventListener('input', e => {
      l.name = e.target.value;
      openAC(e.target.value.trim());
    });
    name.addEventListener('focus', e => {
      if (DB.stock.length) openAC(e.target.value.trim());
    });
    name.addEventListener('blur', () => setTimeout(closeAC, 160));
    name.addEventListener('change', e => {
      l.name = e.target.value;
    });
    name.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.ac-item,.ac-add');
      if (!dropdown.classList.contains('open')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acFocusIdx = Math.min(acFocusIdx + 1, items.length - 1);
        items.forEach((it, i) => it.classList.toggle('focused', i === acFocusIdx));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acFocusIdx = Math.max(acFocusIdx - 1, 0);
        items.forEach((it, i) => it.classList.toggle('focused', i === acFocusIdx));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const f = dropdown.querySelector('.focused') || dropdown.querySelector('.ac-item');
        if (f) f.dispatchEvent(new MouseEvent('mousedown'));
        closeAC();
      } else if (e.key === 'Escape' || e.key === 'Tab') closeAC();
    });
    acWrap.appendChild(name);
    acWrap.appendChild(dropdown);
    row.appendChild(makeCell('Désignation', acWrap, 'inv-cell-name'));

    const priceLabel =
      typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT'
        ? 'Prix U (HT)'
        : 'Prix U (TTC)';

    const price = document.createElement('input');
    price.type = 'text';
    price.inputMode = 'decimal';
    price.value = l.price ? String(getDisplayedUnitPrice(l)) : '';
    price.dataset.lineField = 'price';
    price.addEventListener('input', e => {
      applyUserUnitPriceInput(l, e.target.value);
      updateLineTotal(l);
      calcTotals();
    });
    price.addEventListener('blur', e => {
      if (e.target.value === '' || e.target.value === '0') e.target.value = '';
    });
    row.appendChild(makeCell(priceLabel, price, 'inv-cell-price'));

    const qty = document.createElement('input');
    qty.type = 'text';
    qty.inputMode = 'decimal';
    qty.value = l.qty;
    qty.dataset.lineField = 'qty';
    qty.addEventListener('input', e => {
      l.qty = parseFloat(e.target.value) || 0;
      updateLineTotal(l);
      calcTotals();
      runDGICheck();
    });
    qty.addEventListener('blur', e => {
      if (e.target.value === '') e.target.value = 0;
    });
    row.appendChild(makeCell('Qté', qty, 'inv-cell-qty'));

    const total = document.createElement('div');
    total.id = 'line-total-' + l.id;
    total.style.cssText =
      'font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1,"zero" 0';
    total.textContent = l.price > 0 ? fmtNum(l.qty * l.price) : '';
    row.appendChild(makeCell('Total HT', total, 'inv-cell-totalht'));

    const totalTTC = document.createElement('div');
    totalTTC.id = 'line-total-ttc-' + l.id;
    totalTTC.style.cssText =
      'font-size:12px;font-weight:700;color:var(--brand);font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1,"zero" 0';
    totalTTC.textContent = l.price > 0 ? fmtNum(getLineTTC(l)) : '';
    row.appendChild(makeCell('Total TTC', totalTTC, 'inv-cell-totalttc'));

    const sel = document.createElement('select');
    sel.style.cssText = 'padding:6px 4px;font-size:12px';
    sel.dataset.lineTvaSelect = '1';
    ['20', '14', '10', '7', '0'].forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r + '%';
      if (String(l.tva) === r) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', e => {
      l.tva = parseInt(e.target.value, 10);
      const unitInput = row.querySelector('input[data-line-field="price"]');
      const raw = parseFloat(unitInput?.value) || 0;
      if (typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT') {
        l.price = raw;
      } else {
        setLineFromUnitTTC(l, raw);
      }
      updateLineTotal(l);
      calcTotals();
    });
    row.appendChild(makeCell('TVA%', sel, 'inv-cell-tva'));

    const del = document.createElement('button');
    del.className = 'btn btn-icon btn-danger';
    del.textContent = '✕';
    del.addEventListener('click', () => removeLine(l.id));
    row.appendChild(del);

    const rows = c.querySelectorAll('.inv-line');
    if (rows[idx]) c.insertBefore(row, rows[idx]);
    else c.appendChild(row);
  });
  refreshDocPriceModeLabels();
  if (typeof refreshAutoEntrepreneurDocUI === 'function') refreshAutoEntrepreneurDocUI();
  runDGICheck();
}

document.addEventListener('click', e => {
  if (!e.target.closest('.ac-wrap'))
    document.querySelectorAll('.ac-dropdown').forEach(d => d.classList.remove('open'));
});

function updateLineTotal(l) {
  const el = document.getElementById('line-total-' + l.id);
  if (el) el.textContent = l.qty && l.price ? fmtNum(l.qty * l.price) : '';
  const ttcEl = document.getElementById('line-total-ttc-' + l.id);
  if (ttcEl) ttcEl.textContent = l.qty && l.price ? fmtNum(getLineTTC(l)) : '';
}
function updLine(id, field, val) {
  const l = APP.docLines.find(x => x.id === id);
  if (!l) return;
  if (field === 'price') applyUserUnitPriceInput(l, val);
  else if (field === 'qty' || field === 'tva') l[field] = parseFloat(val) || 0;
  else l[field] = val;
  updateLineTotal(l);
  calcTotals();
}

// ── Nombre en lettres (DGI Maroc) ──
// Totals/fiscal calculations moved to js/docs/totals.js.

// ── Sauvegarder document ──
// ═══════════════════════════════════════════
async function saveDoc(opts = {}) {
  const fb = document.getElementById('doc-feedback');
  const setDocFeedback = msg => {
    if (fb) fb.textContent = msg;
  };
  setDocFeedback('Enregistrement en cours...');
  const silent = !!opts.silent;
  const keepEditor = !!opts.keepEditor;
  const type = document.getElementById('doc-type').value;
  const statusRaw = document.getElementById('doc-status').value;
  const date = document.getElementById('doc-date').value;
  const clientId = document.getElementById('doc-client').value;
  const terms = document.getElementById('doc-terms').value;
  const payment = document.getElementById('doc-payment').value;
  const notes = document.getElementById('doc-notes').value;
  const remise = parseFloat(document.getElementById('doc-remise').value) || 0;
  const acompte = parseFloat(document.getElementById('doc-acompte').value) || 0;

  syncDocPriceModeFromSelect();

  if (!APP.docLines.length) {
    toast('Ajoutez au moins un article', 'err');
    setDocFeedback('Ajoutez au moins un article pour sauvegarder.');
    return null;
  }

  // Identifier le document par son id interne (champ caché) — fiable même si la ref change
  const editingId = document.getElementById('doc-id')?.value || '';
  const existing = editingId ? DB.docs.findIndex(d => d.id === editingId) : -1;
  const isNew = existing < 0;
  const prevDoc = isNew ? null : DB.docs[existing];

  // Cas métier: on édite une facture annulée et on la transforme en avoir.
  // => on doit créer un NOUVEL avoir, sans écraser la facture source.
  const isAvoirFromCancelledFacture = !!(
    prevDoc &&
    prevDoc.type === 'F' &&
    prevDoc.status === 'Annulé' &&
    type === 'AV'
  );
  const createAsNew = isNew || isAvoirFromCancelledFacture;

  if (createAsNew) applyUniqueSequentialRef(type);
  let ref = (document.getElementById('doc-ref').value || '').trim();
  if (!ref) {
    toast('Référence manquante', 'err');
    setDocFeedback('Référence manquante.');
    return null;
  }

  // Vérification doublon de référence
  if (createAsNew) {
    // Nouveau document : la ref ne doit exister nulle part
    if (docRefExistsGlobally(ref)) {
      toast('Cette référence est déjà utilisée. Modifiez-la ou cliquez sur 🔄.', 'err');
      setDocFeedback('Référence en double — modifiez la référence.');
      showDocRefHint('⚠️ Référence déjà utilisée.', true);
      return null;
    }
  } else if (prevDoc && ref !== prevDoc.ref) {
    // Édition : si la ref a changé, elle ne doit pas exister dans un autre doc
    if (DB.docs.some(d => d.ref === ref && d.id !== editingId)) {
      toast('Cette référence est déjà utilisée par un autre document.', 'err');
      setDocFeedback('Référence en double — modifiez la référence.');
      showDocRefHint('⚠️ Référence déjà utilisée par un autre document.', true);
      return null;
    }
  }

  let status = statusRaw;
  if (isAvoirFromCancelledFacture && status === 'Annulé') {
    // Un avoir nouvellement créé ne doit pas rester en "Annulé" par défaut.
    status = 'Brouillon';
    const statusEl = document.getElementById('doc-status');
    if (statusEl) {
      statusEl.value = 'Brouillon';
      if (typeof refreshThemedSelect === 'function') refreshThemedSelect('doc-status');
    }
  }
  if (status === 'Annulé' && !isAvoirFromCancelledFacture) {
    toast(
      "Un document annulé ne peut pas être sauvegardé. Utilisez l'Historique pour gérer ce document.",
      'err',
    );
    setDocFeedback("Ce document annule ne peut pas etre sauvegarde depuis cet ecran.");
    return null;
  }

  const iceVal = (DB.settings.ice || '').replace(/\D/g, '');
  if (iceVal.length !== 15) {
    const force = await showConfirm({
      title: 'ICE absent ou invalide',
      message:
        'Votre ICE vendeur est absent ou invalide.<br><br>La facture <strong>ne sera pas conforme DGI</strong>.<br>Continuer quand même ?',
      icon: '⚠️',
      okLabel: 'Continuer quand même',
      okStyle: 'danger',
      cancelLabel: 'Annuler',
    });
    if (!force) {
      nav('settings', sbItem('settings'));
      return null;
    }
  }

  const totals = getTotals();
  const client = DB.clients.find(c => c.id === clientId) || null;

  const aeSave = typeof isAutoEntrepreneurVAT === 'function' && isAutoEntrepreneurVAT();
  // Build TVA by rate for storage
  const byRate = {};
  APP.docLines.forEach(l => {
    const r = aeSave ? 0 : l.tva || 0;
    const lht = l.qty * l.price;
    if (!byRate[r]) byRate[r] = { ht: 0, tva: 0, ttc: 0 };
    byRate[r].ht += lht;
    byRate[r].tva += aeSave ? 0 : lht * (r / 100);
    byRate[r].ttc += aeSave ? lht : lht * (1 + r / 100);
  });
  // Aligner tvaByRate sur les totaux (getTotals / calcTotals) : remise globale proportionnelle
  if (remise > 0) {
    const factor = 1 - remise / 100;
    Object.keys(byRate).forEach(k => {
      byRate[k].ht *= factor;
      byRate[k].tva *= factor;
      byRate[k].ttc *= factor;
    });
  }

  // Préserver/charger la liaison source depuis le formulaire (si édition)
  let sourceRef = (document.getElementById('doc-source-ref')?.value || '').trim();
  let sourceId = (document.getElementById('doc-source-id')?.value || '').trim();
  let sourceType = (document.getElementById('doc-source-type')?.value || '').trim();
  if (prevDoc) {
    sourceRef = sourceRef || String(prevDoc.sourceRef || '');
    sourceId = sourceId || String(prevDoc.sourceId || '');
    sourceType = sourceType || String(prevDoc.sourceType || '');
  }

  // Cas demandé: Facture annulée -> transformée en Avoir
  if (prevDoc && prevDoc.type === 'F' && prevDoc.status === 'Annulé' && type === 'AV') {
    sourceRef = prevDoc.ref || sourceRef;
    sourceId = prevDoc.id || sourceId;
    sourceType = 'F';
  }

  const doc = {
    id: createAsNew ? 'doc_' + Date.now() : DB.docs[existing].id,
    ref,
    type,
    status,
    date,
    clientId,
    clientName: client ? client.name : 'N/A',
    terms,
    payment,
    notes,
    remise,
    acompte,
    sourceRef,
    sourceId,
    sourceType,
    convertedToRef: prevDoc?.convertedToRef || '',
    convertedToId: prevDoc?.convertedToId || '',
    priceMode:
      typeof normalizePriceMode === 'function'
        ? normalizePriceMode(APP.docPriceMode) ||
          (typeof getGlobalPriceMode === 'function' ? getGlobalPriceMode() : 'TTC')
        : 'TTC',
    lines: APP.docLines.map(l => (aeSave ? { ...l, tva: 0 } : { ...l })),
    tvaByRate: byRate,
    aeExempt: aeSave,
    ...totals,
    createdAt: createAsNew ? new Date().toISOString() : DB.docs[existing].createdAt,
    updatedAt: new Date().toISOString(),
  };

  // ── Gestion stock intelligente ──
  // Uniquement Facture (F) et Bon de Livraison (BL), statut Envoyé ou Payé
  const deductOnSave =
    (type === 'F' || type === 'BL') && (status === 'Envoyé' || status === 'Payé');
  const wasDeducted = prevDoc ? prevDoc.stockDeducted === true : false;

  // Anti incohérence : on garde les quantités stock avant modification
  // afin de pouvoir les restaurer si une erreur JS survient avant l'enregistrement du doc.
  const oldStockQtyById = {};
  (APP.docLines || []).forEach(l => {
    if (!l.fromStock) return;
    const a = DB.stock.find(x => x.id === l.fromStock);
    if (a) oldStockQtyById[l.fromStock] = a.qty || 0;
  });

  if (!isNew && wasDeducted) {
    // Restituer l'ancien stock avant de recalculer
    (prevDoc.lines || []).forEach(l => {
      if (l.fromStock) {
        const a = DB.stock.find(x => x.id === l.fromStock);
        if (a) {
          // Ne restituer que la quantité réellement déduite (si le clamp avait réduit)
          const restoreQty =
            typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
          a.qty = (a.qty || 0) + restoreQty;
        }
      }
    });
  }

  const stockWarnings = [];
  let stockDeductedCount = 0;
  if (deductOnSave) {
    // Déduire le stock de manière “réversible” : on calcule la quantité réellement déduite.
    doc.lines.forEach(l => {
      if (!l.fromStock) return;
      const a = DB.stock.find(x => x.id === l.fromStock);
      if (!a) return;
      const currentQty = a.qty || 0;
      const needQty = l.qty || 0;

      const deductedQty = Math.min(currentQty, needQty);
      a.qty = Math.max(0, currentQty - deductedQty);
      l.stockDeductedQty = deductedQty;

      if (deductedQty > 0) {
        stockDeductedCount++;
        if (a.qty < 5) stockWarnings.push(`${a.name}: ${a.qty} restant(s)`);
      }
    });
  } else {
    // Si on ne déduit pas (Brouillon / Devis / autres statuts), nettoyer le marqueur.
    doc.lines.forEach(l => {
      if (l.fromStock) l.stockDeductedQty = 0;
    });
  }
  doc.stockDeducted = deductOnSave;

  try {
    if (createAsNew) {
      DB.docs.unshift(doc);
      bumpSeq(type);
    } else {
      DB.docs[existing] = doc;
    }
    // Mettre à jour le champ caché avec l'id réel — si on sauvegarde à nouveau sans recharger, c'est une mise à jour
    const docIdEl = document.getElementById('doc-id');
    if (docIdEl) docIdEl.value = doc.id;
    save('docs');
    // Envoi stock uniquement après save du doc (cohérence minimale stock <-> docs)
    save('stock');
    buildNotifications();

    const typeLabel =
      { F: 'Facture', D: 'Devis', BL: 'Bon de Livraison', AV: 'Avoir' }[type] || type;
    if (!silent) {
      toast(`${typeLabel} ${ref} sauvegardée ✓`, 'suc');
      showPostSaveActions(doc, stockDeductedCount);
    }
    setDocFeedback(`${typeLabel} enregistre avec succes.`);
    if (!keepEditor) {
      initDocLines();
      updateDocRef();
    }
    if (stockWarnings.length)
      setTimeout(() => toast('⚠️ Stock bas — ' + stockWarnings.join(', '), ''), 800);
    return doc;
  } catch (e) {
    dbgErr('[saveDoc] Erreur sauvegarde:', e);
    // Rollback stock en mémoire (en cas d'erreur avant la persistance)
    Object.entries(oldStockQtyById).forEach(([id, qty]) => {
      const a = DB.stock.find(x => String(x.id) === String(id));
      if (a) a.qty = qty;
    });
    toast('❌ Erreur lors de la sauvegarde — réessayez', 'err');
    setDocFeedback('Erreur lors de la sauvegarde. Reessayez.');
    return null;
  }
}

// PDF save/download helper moved to js/docs/pdf-actions.js.

// Post-save bar logic moved to js/docs/post-save-bar.js.

// Client/form helper logic moved to js/docs/client-form.js.

// ── Validation ICE ──
// ═══════════════════════════════════════════
// Validation ICE and DGI checker logic moved to js/docs/dgi-checker.js.

// ── DGI Checker ──
// ═══════════════════════════════════════════
// Validation ICE and DGI checker logic moved to js/docs/dgi-checker.js.
function editDocFromHistory(id) {
  const d = DB.docs.find(x => x.id === id);
  if (!d) return;
  nav('generate', sbItem('generate'));
  setTimeout(() => {
    // Stocker l'id interne pour que saveDoc sache qu'il s'agit d'une modification
    const docIdEl = document.getElementById('doc-id');
    if (docIdEl) docIdEl.value = d.id;
    const srcRefEl = document.getElementById('doc-source-ref');
    if (srcRefEl) srcRefEl.value = d.sourceRef || '';
    const srcIdEl = document.getElementById('doc-source-id');
    if (srcIdEl) srcIdEl.value = d.sourceId || '';
    const srcTypeEl = document.getElementById('doc-source-type');
    if (srcTypeEl) srcTypeEl.value = d.sourceType || '';
    const originRefEl = document.getElementById('doc-origin-ref');
    if (originRefEl) originRefEl.value = d.ref || '';
    const originTypeEl = document.getElementById('doc-origin-type');
    if (originTypeEl) originTypeEl.value = d.type || '';
    const originStatusEl = document.getElementById('doc-origin-status');
    if (originStatusEl) originStatusEl.value = d.status || '';
    document.getElementById('doc-ref').value = d.ref;
    document.getElementById('doc-type').value = d.type;
    // Mettre à jour les statuts disponibles selon le type rechargé
    updateDocStatus(d.status);
    // Gérer le cas Annulé : l'afficher en lecture seule si pas déjà dans la liste
    const statusSel = document.getElementById('doc-status');
    if (d.status === 'Annulé' && !statusSel.querySelector('option[value="Annulé"]')) {
      const opt = document.createElement('option');
      opt.value = 'Annulé';
      opt.textContent = 'Annulé';
      opt.disabled = true;
      statusSel.appendChild(opt);
      statusSel.value = 'Annulé';
    }
    statusSel.value = d.status;
    statusSel.title =
      d.status === 'Annulé'
        ? "Ce document est annulé. Pour modifier le statut, utilisez les actions dans l'Historique."
        : '';
    document.getElementById('doc-date').value = d.date;
    document.getElementById('doc-terms').value = d.terms || '';
    document.getElementById('doc-payment').value = d.payment || '';
    document.getElementById('doc-notes').value = d.notes || '';
    document.getElementById('doc-remise').value = d.remise || 0;
    document.getElementById('doc-acompte').value = d.acompte || 0;
    populateDocClient();
    document.getElementById('doc-client').value = d.clientId || '';
    if (typeof refreshThemedSelect === 'function') {
      ['doc-type', 'doc-status', 'doc-client', 'doc-terms', 'doc-payment', 'doc-price-mode'].forEach(
        refreshThemedSelect,
      );
    }
    loadDocPriceModeFromSaved(d);
    APP.docLines = (d.lines || []).map(l => ({
      ...l,
      id: l.id || 'l_' + Date.now() + Math.random(),
    }));
    renderDocLines();
    calcTotals();
    if (typeof refreshAutoEntrepreneurDocUI === 'function') refreshAutoEntrepreneurDocUI();
    closePostSaveBar();
    refreshDocSourceHint();
    toast(d.status === 'Annulé' ? `⚠️ Document annulé — lecture seule` : `Édition de ${d.ref}`, '');
  }, 80);
}

function createAvoirFromCancelledFacture(id) {
  const d = DB.docs.find(x => x.id === id);
  if (!d || d.type !== 'F' || d.status !== 'Annulé') {
    toast('Action disponible uniquement pour une facture annulée', 'err');
    return;
  }
  editDocFromHistory(id);
  setTimeout(() => {
    const typeEl = document.getElementById('doc-type');
    if (typeEl) {
      typeEl.value = 'AV';
      updateDocRef();
      updateDocStatus('Brouillon');
      const statusEl = document.getElementById('doc-status');
      if (statusEl) statusEl.value = 'Brouillon';
      if (typeof refreshThemedSelect === 'function') {
        ['doc-type', 'doc-status'].forEach(refreshThemedSelect);
      }
    }
    refreshDocSourceHint();
    toast(`Avoir prêt depuis ${d.ref} — cliquez sur Sauvegarder`, 'suc');
  }, 120);
}

// ── Historique ──
// History filtering logic moved to js/docs/history-filters.js.
let _convSourceId = null;

// ── Maintenabilité : encapsulation de la conversion Devis → Facture ──
window.APP = window.APP || {};
window.APP.docsConversion = window.APP.docsConversion || {};
const _defineDocsConversionState = (key, getter, setter) => {
  try {
    const desc = Object.getOwnPropertyDescriptor(window.APP.docsConversion, key);
    if (desc && (desc.get || desc.set)) return;
    Object.defineProperty(window.APP.docsConversion, key, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: false,
    });
  } catch (_) {}
};
_defineDocsConversionState(
  'conversionSourceId',
  () => _convSourceId,
  v => {
    _convSourceId = v;
  },
);

function openConvertModal(id) {
  const d = DB.docs.find(x => x.id === id);
  if (!d || d.type !== 'D') return;
  APP.docsConversion.conversionSourceId = id;
  const nextRef = getNextRef('F');
  document.getElementById('conv-title').textContent = `Convertir ${d.ref} en Facture`;
  document.getElementById('conv-sub').textContent = `${d.clientName || 'N/A'} — ${fmt(d.ttc)}`;
  document.getElementById('conv-from-ref').textContent = d.ref;
  document.getElementById('conv-from-client').textContent = d.clientName || 'N/A';
  document.getElementById('conv-to-ref').textContent = nextRef;
  document.getElementById('conv-amount').textContent = fmt(d.ttc);
  const convLc = document.getElementById('conv-lines-count');
  if (convLc) {
    clearChildren(convLc);
    convLc.appendChild(document.createTextNode(`${(d.lines || []).length} ligne(s)`));
    const br = document.createElement('br');
    const sub = document.createElement('span');
    sub.style.color = 'var(--text3)';
    sub.textContent = 'Tous les articles repris';
    convLc.appendChild(br);
    convLc.appendChild(sub);
  }
  document.getElementById('conv-date-today').checked = true;
  document.getElementById('conv-custom-date').value = today();
  document.getElementById('conv-custom-date').style.display = 'none';
  document.getElementById('conv-keep-devis').checked = true;
  document.getElementById('conv-opt-date-wrap')?.classList.add('selected');
  document.getElementById('conv-opt-date-custom-wrap')?.classList.remove('selected');
  openModal('modal-convert');
}

function updateConvDateField() {
  const isCustom = document.getElementById('conv-date-custom').checked;
  document.getElementById('conv-custom-date').style.display = isCustom ? 'block' : 'none';
  document.getElementById('conv-opt-date-wrap')?.classList.toggle('selected', !isCustom);
  document.getElementById('conv-opt-date-custom-wrap')?.classList.toggle('selected', isCustom);
}

function confirmConvert() {
  const d = DB.docs.find(x => x.id === APP.docsConversion.conversionSourceId);
  if (!d) {
    closeModal('modal-convert');
    return;
  }
  const isCustomDate = document.getElementById('conv-date-custom').checked;
  const invoiceDate = isCustomDate
    ? document.getElementById('conv-custom-date').value || today()
    : today();
  const keepDevis = document.getElementById('conv-keep-devis').checked;
  const newRef = getNextRef('F');
  const invoice = {
    ...d,
    id: 'doc_' + Date.now(),
    ref: newRef,
    type: 'F',
    status: 'Brouillon',
    date: invoiceDate,
    sourceRef: d.ref,
    sourceId: d.id,
    sourceType: 'D',
    convertedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines: (d.lines || []).map(l => ({
      ...l,
      id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    })),
  };
  DB.docs.unshift(invoice);
  bumpSeq('F');
  if (keepDevis) {
    const srcIdx = DB.docs.findIndex(x => x.id === APP.docsConversion.conversionSourceId);
    if (srcIdx >= 0) {
      DB.docs[srcIdx].status = 'Converti';
      DB.docs[srcIdx].convertedToRef = newRef;
      DB.docs[srcIdx].convertedToId = invoice.id;
    }
  }
  save('docs');
  buildNotifications();
  closeModal('modal-convert');
  renderHistory();
  toast(`✓ Facture ${newRef} créée depuis ${d.ref}`, 'suc');
  setTimeout(() => showConvertSuccessBar(invoice, d), 300);
}

// Convert success bar logic moved to js/docs/post-save-bar.js.

function renderHistory() {
  const feedback = document.getElementById('hist-feedback');
  const setFeedback = msg => {
    if (feedback) feedback.textContent = msg;
  };
  const docs = getHistFiltered();
  const total = docs.length;
  const maxPage = total > 0 ? Math.max(1, Math.ceil(total / APP.histPerPage)) : 1;
  if (APP.histPage > maxPage) APP.histPage = maxPage;
  if (APP.histPage < 1) APP.histPage = 1;
  const setEl = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setEl('hist-kpi-total', DB.docs.length);
  setEl(
    'hist-kpi-paid',
    fmt(DB.docs.filter(d => d.status === 'Payé').reduce((s, d) => s + (d.ttc || 0), 0)),
  );
  setEl(
    'hist-kpi-sent',
    fmt(DB.docs.filter(d => d.status === 'Envoyé').reduce((s, d) => s + (d.ttc || 0), 0)),
  );
  setEl('hist-kpi-draft', DB.docs.filter(d => d.status === 'Brouillon').length);
  const start = (APP.histPage - 1) * APP.histPerPage;
  const page = docs.slice(start, start + APP.histPerPage);
  const tbody = document.getElementById('history-tbody');
  const pagEl = document.getElementById('hist-pagination');
  if (!tbody) return;
  tbody.setAttribute('aria-busy', 'true');
  setFeedback('Mise a jour de la liste...');
  if (!docs.length) {
    clearChildren(tbody);
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.style.cssText = 'text-align:center;padding:30px;color:var(--text2)';
    td.textContent = 'Aucun document ne correspond aux filtres actuels.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    if (pagEl) clearChildren(pagEl);
    const mobEmpty = document.getElementById('mob-history-list');
    if (mobEmpty) clearChildren(mobEmpty);
    tbody.setAttribute('aria-busy', 'false');
    setFeedback('Aucun resultat.');
    return;
  }
  const typeLabel = { F: 'Facture', D: 'Devis', BL: 'Bon de Livraison', AV: 'Avoir' };
  const statusClass = {
    Brouillon: 'draft',
    Envoyé: 'sent',
    Payé: 'paid',
    Annulé: 'cancelled',
    Converti: 'devis',
  };
  const nextStatusLabel = { Brouillon: '→ Envoyé', Envoyé: '→ Payé' };
  const closeHistMoreMenus = () => {
    document.querySelectorAll('.hist-more-menu.open').forEach(m => m.classList.remove('open'));
    document
      .querySelectorAll('.hist-more-wrap > .btn[aria-haspopup="menu"]')
      .forEach(b => b.setAttribute('aria-expanded', 'false'));
  };
  clearChildren(tbody);
  if (!APP._histMoreMenuBound) {
    document.addEventListener('click', e => {
      const keepOpen = e.target.closest('.hist-more-wrap');
      if (keepOpen) return;
      closeHistMoreMenus();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeHistMoreMenus();
    });
    APP._histMoreMenuBound = true;
  }
  page.forEach(d => {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td');
    const refSp = document.createElement('span');
    refSp.className = 'hist-doc-ref';
    refSp.textContent = d.ref || '';
    td0.appendChild(refSp);
    const sourceType = d.sourceType || (d.type === 'F' && d.sourceRef ? 'D' : '');
    const sourceTitle =
      sourceType === 'F'
        ? 'Issu de la facture'
        : sourceType === 'D'
          ? 'Issu du devis'
          : 'Document source';
    if (d.sourceRef) {
      const lb = document.createElement('span');
      lb.className = 'linked-badge';
      lb.title = `${sourceTitle} ${d.sourceRef}`;
      lb.setAttribute('data-hist-linked-ref', encodeURIComponent(String(d.sourceRef || '')));
      lb.textContent = '↗ ' + (d.sourceRef || '');
      td0.appendChild(lb);
    } else if (d.convertedToRef) {
      const lb = document.createElement('span');
      lb.className = 'linked-badge linked-converted';
      lb.title = `Converti en ${d.convertedToRef}`;
      lb.setAttribute('data-hist-linked-ref', encodeURIComponent(String(d.convertedToRef || '')));
      lb.textContent = '⇒ ' + (d.convertedToRef || '');
      td0.appendChild(lb);
    }
    tr.appendChild(td0);
    const tdDate = document.createElement('td');
    tdDate.textContent = d.date || '';
    tr.appendChild(tdDate);
    const tdTyp = document.createElement('td');
    const typBadge = document.createElement('span');
    typBadge.className =
      'badge ' +
      (d.type === 'D' ? 'devis' : d.type === 'BL' ? 'bl' : d.type === 'AV' ? 'avoir' : '');
    typBadge.textContent = typeLabel[d.type] || d.type || '';
    tdTyp.appendChild(typBadge);
    tr.appendChild(tdTyp);
    const tdSt = document.createElement('td');
    const stWrap = document.createElement('div');
    stWrap.className = 'hist-status-wrap';
    const stBadge = document.createElement('span');
    stBadge.className = 'badge ' + (statusClass[d.status] || 'draft');
    stBadge.textContent = d.status || '';
    stWrap.appendChild(stBadge);
    if (nextStatusLabel[d.status]) {
      const qb = document.createElement('button');
      qb.className = 'hist-quick-status';
      qb.setAttribute('data-action', 'hist-quick-status');
      qb.setAttribute('data-id', encodeURIComponent(String(d.id || '')));
      qb.textContent = nextStatusLabel[d.status];
      stWrap.appendChild(qb);
    }
    tdSt.appendChild(stWrap);
    tr.appendChild(tdSt);
    const tdCli = document.createElement('td');
    tdCli.textContent = d.clientName || 'N/A';
    tr.appendChild(tdCli);
    const tdHt = document.createElement('td');
    tdHt.className = 'hist-num';
    tdHt.textContent = fmt(d.ht);
    tr.appendChild(tdHt);
    const tdTtc = document.createElement('td');
    tdTtc.className = 'hist-num';
    tdTtc.textContent = fmt(d.ttc);
    tr.appendChild(tdTtc);
    const tdReste = document.createElement('td');
    const reste = (d.ttc || 0) - (d.acompte || 0);
    if (d.status === 'Payé') {
      const s = document.createElement('span');
      s.className = 'hist-rest-sold hist-num';
      s.textContent = '✓ Soldé';
      tdReste.appendChild(s);
    } else if (reste > 0) {
      const s = document.createElement('span');
      s.className = 'hist-rest-pending hist-num';
      s.textContent = fmt(reste);
      tdReste.appendChild(s);
    } else {
      const s = document.createElement('span');
      s.className = 'hist-rest-ok';
      s.textContent = '✓';
      tdReste.appendChild(s);
    }
    tr.appendChild(tdReste);
    const tdAct = document.createElement('td');
    tdAct.className = 'hist-actions-cell';
    const act = document.createElement('div');
    act.className = 'hist-actions';
    const enc = encodeURIComponent(String(d.id || ''));
    const addAct = (cls, tit, tx, st, an) => {
      const b = document.createElement('button');
      b.className = cls;
      if (tit) b.title = tit;
      if (tit) b.setAttribute('aria-label', tit);
      b.textContent = tx;
      if (st) b.style.cssText = st;
      b.setAttribute('data-action', an);
      b.setAttribute('data-id', enc);
      return b;
    };

    // Primary actions (always visible): edit, quick status
    const bEdit = addAct('btn btn-icon btn-secondary btn-sm', 'Modifier', '✏️', null, 'hist-edit-doc');
    act.appendChild(bEdit);
    if (nextStatusLabel[d.status]) {
      const bQuick = addAct(
        'btn btn-icon btn-secondary btn-sm',
        'Changer le statut',
        '↻',
        null,
        'hist-quick-status',
      );
      act.appendChild(bQuick);
    }

    // Secondary actions (visible directement)
    const bDownload = addAct('btn btn-icon btn-secondary btn-sm', 'Télécharger le PDF', '⬇', null, 'hist-download-doc');
    const bWhatsApp = addAct('btn btn-icon btn-secondary btn-sm', 'Envoyer via WhatsApp', '🟢', null, 'hist-wa-doc');
    const bDuplicate = addAct('btn btn-icon btn-secondary btn-sm', 'Dupliquer', '⎘', null, 'hist-duplicate-doc');
    act.appendChild(bDownload);
    act.appendChild(bWhatsApp);
    act.appendChild(bDuplicate);

    if (d.type === 'D' && d.status !== 'Converti') {
      const bConvert = addAct('btn btn-icon btn-secondary btn-sm', 'Convertir en facture', '⚡', null, 'hist-convert');
      act.appendChild(bConvert);
    }
    if (d.type === 'F' && d.status === 'Annulé') {
      const bAvoir = addAct('btn btn-icon btn-secondary btn-sm', 'Créer un avoir', '↩', null, 'hist-create-avoir');
      act.appendChild(bAvoir);
    }
    if ((d.type === 'F' || d.type === 'BL') && d.status !== 'Annulé' && d.status !== 'Brouillon') {
      const bCancel = addAct('btn btn-icon btn-secondary btn-sm', 'Annuler (retour stock)', '✕', null, 'hist-cancel-doc');
      act.appendChild(bCancel);
    }

    const delX = d.type === 'F' || d.type === 'BL' || d.type === 'AV' ? 'Annuler document' : 'Supprimer';
    const bDelete = addAct('btn btn-icon btn-secondary btn-sm', delX, '🗑', null, 'hist-delete-doc');
    bDelete.classList.add('danger');
    act.appendChild(bDelete);
    tdAct.appendChild(act);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  let mobHist = document.getElementById('mob-history-list');
  if (!mobHist) {
    mobHist = document.createElement('div');
    mobHist.id = 'mob-history-list';
    mobHist.className = 'mob-card-list';
    const wrap = document.querySelector('#page-history .tbl-wrap');
    if (wrap) wrap.after(mobHist);
  }
  clearChildren(mobHist);
  page.forEach(d => {
    const enc = encodeURIComponent(String(d.id || ''));
    const card = document.createElement('div');
    card.className = 'mob-card';
    const hdr = document.createElement('div');
    hdr.className = 'mob-card-header';
    const ttl = document.createElement('div');
    ttl.className = 'mob-card-title';
    ttl.textContent = d.ref || '';
    const sb = document.createElement('span');
    sb.className = 'badge ' + (statusClass[d.status] || 'draft');
    sb.textContent = d.status || '';
    hdr.appendChild(ttl);
    hdr.appendChild(sb);
    card.appendChild(hdr);
    const row = (lab, val) => {
      const r = document.createElement('div');
      r.className = 'mob-card-row';
      const l = document.createElement('span');
      l.className = 'mob-card-label';
      l.textContent = lab;
      const v = document.createElement('span');
      v.className = 'mob-card-val';
      v.appendChild(val);
      r.appendChild(l);
      r.appendChild(v);
      card.appendChild(r);
    };
    const typeBadgeCls =
      d.type === 'D' ? 'devis' : d.type === 'BL' ? 'bl' : d.type === 'AV' ? 'avoir' : '';
    const tb = document.createElement('span');
    tb.className = 'badge ' + typeBadgeCls;
    tb.textContent = typeLabel[d.type] || d.type || '';
    row('Type', tb);
    row('Client', document.createTextNode(d.clientName || 'Non renseigne'));
    row('Date', document.createTextNode(d.date || ''));
    const ttcN = document.createElement('span');
    ttcN.style.color = 'var(--teal)';
    ttcN.textContent = fmt(d.ttc);
    row('Total TTC', ttcN);
    const mAct = document.createElement('div');
    mAct.className = 'mob-card-actions';
    const mb = (txt, an, st) => {
      const b = document.createElement('button');
      b.className = st || 'btn btn-secondary btn-sm';
      b.setAttribute('data-action', an);
      b.setAttribute('data-id', enc);
      b.textContent = txt;
      return b;
    };
    mAct.appendChild(mb('✏️ Modifier', 'hist-edit-doc'));
    if (nextStatusLabel[d.status]) mAct.appendChild(mb(nextStatusLabel[d.status], 'hist-quick-status'));

    const mMore = document.createElement('details');
    mMore.className = 'mob-card-more';
    const mSum = document.createElement('summary');
    mSum.textContent = '⋯ Plus';
    mMore.appendChild(mSum);
    const mList = document.createElement('div');
    mList.className = 'mob-card-more-list';
    const mbMore = (txt, an, danger = false) => {
      const b = document.createElement('button');
      b.className = danger ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm';
      b.setAttribute('data-action', an);
      b.setAttribute('data-id', enc);
      b.textContent = txt;
      mList.appendChild(b);
    };
    mbMore('⬇ Télécharger PDF', 'hist-download-doc');
    mbMore('🟢 WhatsApp', 'hist-wa-doc');
    mbMore('⎘ Dupliquer', 'hist-duplicate-doc');
    if (d.type === 'D' && d.status !== 'Converti') mbMore('⚡ Convertir en Facture', 'hist-convert');
    if (d.type === 'F' && d.status === 'Annulé') mbMore('↩ Créer un avoir', 'hist-create-avoir');
    if ((d.type === 'F' || d.type === 'BL') && d.status !== 'Annulé' && d.status !== 'Brouillon')
      mbMore('✕ Annuler (retour stock)', 'hist-cancel-doc');
    mbMore(d.type === 'F' || d.type === 'BL' || d.type === 'AV' ? '✕ Annuler document' : '🗑 Supprimer', 'hist-delete-doc', true);
    mMore.appendChild(mList);
    mAct.appendChild(mMore);
    card.appendChild(mAct);
    mobHist.appendChild(card);
  });
  const pages = Math.ceil(total / APP.histPerPage);
  if (pagEl) {
    clearChildren(pagEl);
    for (let i = 0; i < pages; i++) {
      const pn = i + 1;
      const btn = document.createElement('button');
      btn.className = 'pg-btn' + (pn === APP.histPage ? ' active' : '');
      btn.setAttribute('data-hist-page', String(pn));
      btn.textContent = String(pn);
      btn.addEventListener('click', () => {
        APP.histPage = pn;
        renderHistory();
      });
      pagEl.appendChild(btn);
    }
  }
  tbody.querySelectorAll('[data-hist-linked-ref]').forEach(el => {
    el.addEventListener('click', () => {
      const ref = decodeURIComponent(el.getAttribute('data-hist-linked-ref') || '');
      nav('history', sbItem('history'));
      setTimeout(() => {
        const hs = document.getElementById('hist-search');
        if (hs) hs.value = ref;
        renderHistory();
      }, 80);
    });
  });
  tbody.setAttribute('aria-busy', 'false');
  setFeedback(`${total} document(s) affiche(s).`);
}
function quickChangeStatus(id) {
  const d = DB.docs.find(x => x.id === id);
  if (!d) return;
  const flow = { Brouillon: 'Envoyé', Envoyé: 'Payé' };
  const next = flow[d.status];
  if (!next) return;
  const wasDeducted = d.stockDeducted === true;
  // Uniquement Facture et BL
  const isStockDoc = d.type === 'F' || d.type === 'BL';
  const willDeduct = isStockDoc && (next === 'Envoyé' || next === 'Payé');
  if (willDeduct && !wasDeducted) {
    const warnings = [];
    (d.lines || []).forEach(l => {
      if (!l.fromStock) return;
      const a = DB.stock.find(x => x.id === l.fromStock);
      if (!a) return;
      const currentQty = a.qty || 0;
      const needQty = l.qty || 0;
      const deductedQty = Math.min(currentQty, needQty);
      a.qty = Math.max(0, currentQty - deductedQty);
      l.stockDeductedQty = deductedQty;
      if (deductedQty > 0 && a.qty < 5) warnings.push(`${a.name}: ${a.qty} restant(s)`);
    });
    d.stockDeducted = true;
    save('stock');
    if (warnings.length) setTimeout(() => toast('⚠️ Stock bas — ' + warnings.join(', '), ''), 500);
  }
  d.status = next;
  d.updatedAt = new Date().toISOString();
  save('docs');
  renderHistory();
  buildNotifications();
  toast(`${d.ref} → ${next}`, 'suc');
}

async function cancelDoc(id) {
  const d = DB.docs.find(x => x.id === id);
  if (!d) return;
  const stockLines = (d.lines || []).filter(l => l.fromStock);
  const hasStock = stockLines.length > 0 && d.stockDeducted === true;
  const stockDetail = hasStock
    ? `<br><br>Les articles suivants seront <strong>restitués au stock</strong> :<br>${stockLines
        .map(l => {
          const a = DB.stock.find(x => x.id === l.fromStock);
          const restoreQty =
            typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
          return `• ${a ? a.name : l.name} : +${restoreQty}`;
        })
        .join('<br>')}`
    : '';
  const ok = await showConfirm({
    title: `Annuler "${d.ref}" ?`,
    message: `Cette action passera le document en statut <strong>Annulé</strong>.${stockDetail}`,
    icon: '🚫',
    okLabel: 'Annuler le document',
    okStyle: 'danger',
  });
  if (!ok) return;
  // Restituer le stock si déduit
  try {
    if (d.stockDeducted) {
      stockLines.forEach(l => {
        const a = DB.stock.find(x => x.id === l.fromStock);
        if (a) {
          const restoreQty =
            typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
          a.qty = (a.qty || 0) + restoreQty;
        }
      });
      d.stockDeducted = false;
      save('stock');
      if (stockLines.length) toast(`📦 Stock restitué pour ${stockLines.length} article(s)`, 'suc');
    }
    d.status = 'Annulé';
    d.updatedAt = new Date().toISOString();
    save('docs');
    renderHistory();
    buildNotifications();
    toast(`${d.ref} annulé`, '');
  } catch (e) {
    dbgErr('[cancelDoc] Erreur:', e);
    toast("❌ Erreur lors de l'annulation — réessayez", 'err');
  }
}
async function deleteDoc(id) {
  const d = DB.docs.find(x => x.id === id);
  if (!d) return;
  // DGI-01 : ne pas supprimer les documents légaux — passer en statut Annulé
  // (données conservées 10 ans ; restitution stock si déduit)
  if (d.type === 'F' || d.type === 'BL' || d.type === 'AV') {
    if (d.status === 'Annulé') {
      toast('Document déjà annulé — données conservées', 'suc');
      renderHistory();
      buildNotifications();
      return;
    }
    const stockLines = (d.lines || []).filter(l => l.fromStock);
    const hasStock = stockLines.length > 0 && d.stockDeducted === true;
    const stockDetail = hasStock
      ? `<br><br>Les articles suivants seront <strong>restitués au stock</strong> :<br>${stockLines
          .map(l => {
            const a = DB.stock.find(x => x.id === l.fromStock);
            const restoreQty =
              typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
            return `• ${a ? a.name : l.name} : +${restoreQty}`;
          })
          .join('<br>')}`
      : '';
    const ok = await showConfirm({
      title: `Annuler "${d.ref}" ?`,
      message: `Cette action passera le document en statut <strong>Annulé</strong> (données conservées).${stockDetail}`,
      icon: '🚫',
      okLabel: 'Annuler le document',
      okStyle: 'danger',
    });
    if (!ok) return;
    try {
      // Restituer le stock si déduit
      if (d.stockDeducted) {
        stockLines.forEach(l => {
          const a = DB.stock.find(x => x.id === l.fromStock);
          if (a) {
            const restoreQty =
              typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
            a.qty = (a.qty || 0) + restoreQty;
          }
        });
        d.stockDeducted = false;
        save('stock');
        if (stockLines.length)
          toast(`📦 Stock restitué pour ${stockLines.length} article(s)`, 'suc');
      }
      d.status = 'Annulé';
      d.updatedAt = new Date().toISOString();
      save('docs');
      renderHistory();
      buildNotifications();
      toast(`${d.ref} annulé (données conservées)`, '');
    } catch (e) {
      dbgErr('[deleteDoc→annule] Erreur:', e);
      toast("❌ Erreur lors de l'annulation — réessayez", 'err');
    }
    return;
  }

  const stockLines = (d.lines || []).filter(l => l.fromStock);
  const hasStock = stockLines.length > 0 && d.stockDeducted === true;
  const stockDetail = hasStock
    ? `<br><br>Les articles suivants seront <strong>restitués au stock</strong> :<br>${stockLines
        .map(l => {
          const a = DB.stock.find(x => x.id === l.fromStock);
          const restoreQty =
            typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
          return `• ${a ? a.name : l.name} : +${restoreQty}`;
        })
        .join('<br>')}`
    : '';
  const ok = await showConfirm({
    title: `Supprimer "${d.ref}" ?`,
    message: `Cette action est <strong>irréversible</strong>.${stockDetail}`,
    icon: '🗑️',
    okLabel: 'Supprimer',
    okStyle: 'danger',
  });
  if (!ok) return;
  // Restituer le stock si déduit
  try {
    if (d.stockDeducted) {
      stockLines.forEach(l => {
        const a = DB.stock.find(x => x.id === l.fromStock);
        if (a) {
          const restoreQty =
            typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
          a.qty = (a.qty || 0) + restoreQty;
        }
      });
      save('stock');
      if (stockLines.length) toast(`📦 Stock restitué pour ${stockLines.length} article(s)`, 'suc');
    }
    if (typeof invooSupabaseSoftDelete === 'function') invooSupabaseSoftDelete('docs', id);
    DB.docs = DB.docs.filter(x => x.id !== id);
    save('docs');
    renderHistory();
    buildNotifications();
    toast('Document supprimé', 'suc');
  } catch (e) {
    dbgErr('[deleteDoc] Erreur:', e);
    toast('❌ Erreur lors de la suppression — réessayez', 'err');
  }
}

// WhatsApp sharing logic moved to js/docs/whatsapp.js.
function duplicateDoc(id) {
  const d = DB.docs.find(x => x.id === id);
  if (!d) return;
  const type = d.type;
  const newDoc = {
    ...d,
    id: 'doc_' + Date.now(),
    ref: getNextRef(type),
    status: 'Brouillon',
    date: today(),
    createdAt: new Date().toISOString(),
    stockDeducted: false,
    lines: (d.lines || []).map(l => ({
      ...l,
      id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    })),
  };
  DB.docs.unshift(newDoc);
  bumpSeq(type);
  save('docs');
  renderHistory();
  toast('Document dupliqué ✓', 'suc');
}
// History XLSX export logic moved to js/docs/history-export.js.

// Reporting logic moved to js/docs/reports.js.

export {
  addLine,
  calcTotals,
  cancelDoc,
  closePostSaveBar,
  confirmConvert,
  createAvoirFromCancelledFacture,
  deleteDoc,
  duplicateDoc,
  editDocFromHistory,
  exportHistXLSX,
  getHistFiltered,
  getTotals,
  initDocLines,
  nombreEnLettres,
  onClientChange,
  onDocPriceModeChange,
  openConvertModal,
  populateDocClient,
  populateHistClientFilter,
  quickChangeStatus,
  refreshDocSourceHint,
  renderDocLines,
  renderHistory,
  renderReports,
  resetHistFilters,
  runDGICheck,
  saveAndDownloadPDF,
  saveDoc,
  sendDocWhatsApp,
  setRepPeriod,
  showConvertSuccessBar,
  showPostSaveActions,
  showSalesReport,
  syncGenerateFromSettings,
  updateConvDateField,
  updateDocRef,
  updateDocStatus,
  validateICEInput,
  accumulateDocTvaByRateForReport,
};
