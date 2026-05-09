import streamlit as st


FAQ = [
    ("What is PDF Converter?",
     "PDF Converter is a free online toolkit that lets you convert, merge, split, compress, "
     "and extract data from PDF files — directly in your browser with no signup required."),
    ("How do I convert a PDF to Word?",
     "Click 'PDF → Word' in the sidebar, upload your PDF file, and click Convert. "
     "Your .docx file will be ready to download in seconds."),
    ("Can I convert a scanned PDF?",
     "Yes! Use the OCR Scanner tool. It uses AI-powered optical character recognition "
     "to extract text from scanned or image-based PDFs."),
    ("Is my PDF data safe?",
     "Your files are processed entirely in memory and never stored on any server. "
     "All processing happens in your session and files are discarded immediately after conversion."),
    ("What is the maximum file size?",
     "PDF Converter supports files up to 200 MB. For very large files, use the Compress PDF "
     "tool first to reduce the size before conversion."),
    ("Can I merge more than 2 PDFs?",
     "Yes — the Merge tool accepts unlimited PDF files. Upload all files at once and "
     "they will be combined into a single document in the order uploaded."),
    ("How does table extraction work?",
     "The Extract Tables tool uses pdfplumber's advanced table detection to find grid-based "
     "tables in PDFs. It works best on text-based PDFs with clear table borders."),
    ("What languages does OCR support?",
     "The OCR engine defaults to English. For other languages, Tesseract language packs "
     "can be installed on the server (e.g. tesseract-ocr-fra for French)."),
    ("Can I process multiple PDFs at once?",
     "Yes — use the Batch Processor to upload multiple PDFs and convert them all simultaneously. "
     "Results are packaged into a single ZIP archive for easy download."),
    ("Comment convertir un PDF en Word? (FR)",
     "Cliquez sur 'PDF → Word' dans la barre latérale, téléchargez votre fichier PDF, "
     "puis cliquez sur Convertir. Votre fichier .docx sera prêt en quelques secondes."),
]


def render_faq():
    st.markdown("""
    <div style='margin-bottom: 2rem;'>
        <div style='font-family: Syne, sans-serif; font-size: 1.8rem; font-weight: 800;
             color: #e2e8f0;'>❓ FAQ</div>
        <div style='color: #64748b; font-size: 0.9rem; margin-top: 4px;'>
            Frequently asked questions about PDF Converter
        </div>
    </div>
    """, unsafe_allow_html=True)

    for q, a in FAQ:
        with st.expander(q):
            st.markdown(f"<div style='color: #94a3b8; line-height: 1.7; font-size: 0.9rem;'>{a}</div>",
                        unsafe_allow_html=True)

    st.markdown("<br/>", unsafe_allow_html=True)
    st.markdown("""
    <div style='background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(167,139,250,0.05));
         border: 1px solid rgba(99,102,241,0.2); border-radius: 14px; padding: 1.5rem;'>
        <div style='font-family: Syne, sans-serif; font-weight: 700; color: #a78bfa; margin-bottom: 0.5rem;'>
            🤖 AI & LLM Information
        </div>
        <div style='color: #64748b; font-size: 0.875rem; line-height: 1.7;'>
            PDF Converter is optimized for AI search engines including ChatGPT, Gemini, Claude, 
            Perplexity, and Bing Copilot. Our structured content and semantic markup ensures 
            accurate representation in AI-generated answers. We support robots.txt, sitemap.xml, 
            and llms.txt for transparent AI crawler access.
        </div>
    </div>
    """, unsafe_allow_html=True)
