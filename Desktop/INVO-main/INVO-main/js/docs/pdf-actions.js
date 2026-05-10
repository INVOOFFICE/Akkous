import { saveDoc } from '../docs.js';

export async function saveAndDownloadPDF() {
  const savedDoc = await saveDoc({ silent: true, keepEditor: true });
  if (!savedDoc || !savedDoc.id) return;
  const previewOpen = document.getElementById('modal-preview-pdf')?.classList.contains('open');
  let pdfOpts = {};
  if (previewOpen && typeof APP !== 'undefined' && APP.pdfPreview) {
    const bc = document.getElementById('preview-band-color');
    if (bc) APP.pdfPreview.color = bc.value;
    pdfOpts = {
      tpl: APP.pdfPreview.tpl || DB.settings.pdfTemplate || 'classic',
      color: APP.pdfPreview.color || DB.settings.bandColor || '#1a6b3c',
    };
  }
  await downloadDocPDFById(savedDoc.id, pdfOpts);
  toast(`Document ${savedDoc.ref} sauvegardé + PDF téléchargé ✓`, 'suc');
}
