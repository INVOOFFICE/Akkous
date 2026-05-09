import streamlit as st

TOOLS = {
    "🏠 Home": "home",
    "📄 PDF → Word": "pdf_to_word",
    "📊 PDF → Excel": "pdf_to_excel",
    "📋 PDF → CSV": "pdf_to_csv",
    "📝 PDF → Text": "pdf_to_text",
    "🔗 Merge PDFs": "merge",
    "✂️ Split PDF": "split",
    "🗜️ Compress PDF": "compress",
    "📐 Extract Tables": "extract_tables",
    "🔍 OCR Scanner": "ocr",
    "⚡ Batch Process": "batch",
    "❓ FAQ": "faq",
}


def render_sidebar() -> str:
    with st.sidebar:
        st.markdown("""
        <div style='text-align:center; padding: 1.5rem 0 1rem;'>
            <div style='font-family: Syne, sans-serif; font-size: 1.5rem; font-weight: 800;
                 background: linear-gradient(135deg, #a78bfa, #818cf8);
                 -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
                PDF Converter
            </div>
            <div style='font-size: 11px; color: #475569; letter-spacing: 0.1em; 
                 text-transform: uppercase; margin-top: 2px;'>Professional Toolkit</div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("<hr style='border-color:rgba(99,102,241,0.15);margin:0 0 1rem'/>",
                    unsafe_allow_html=True)

        selected = st.radio(
            "Navigation",
            list(TOOLS.keys()),
            label_visibility="collapsed",
        )

        st.markdown("<br/>", unsafe_allow_html=True)
        st.markdown("""
        <div style='background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(167,139,250,0.1));
             border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 1rem; 
             font-size: 12px; color: #64748b; line-height: 1.6;'>
            <div style='color: #a78bfa; font-weight: 600; margin-bottom: 4px;'>✨ Pro Features</div>
            🔒 Files processed locally<br>
            ⚡ Fast conversion engine<br>
            📱 Mobile optimized<br>
            🌍 EN / FR support
        </div>
        """, unsafe_allow_html=True)

    return TOOLS[selected]
