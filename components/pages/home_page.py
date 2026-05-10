import streamlit as st


def render_home():
    st.markdown("""
    <div class="hero-header">
        <div class="hero-badge">⚡ 2026 Edition — Powered by AI</div>
        <h1 class="hero-title">Your Complete<br>PDF Toolkit</h1>
        <p class="hero-subtitle">
            Convert, merge, split, compress and extract data from PDFs — 
            instantly in your browser. No signup. No limits.
        </p>
    </div>
    """, unsafe_allow_html=True)

    # Stats row
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("✅ Conversions", "2.4M+")
    c2.metric("⚡ Avg Speed", "< 3s")
    c3.metric("🔒 Privacy", "100%")
    c4.metric("🌍 Languages", "EN / FR")

    st.markdown("<br/>", unsafe_allow_html=True)
    st.markdown("""<div class="section-title">All Tools</div>
    <div class="section-sub">Professional PDF processing — pick a tool from the sidebar</div>""",
                unsafe_allow_html=True)

    tools_data = [
        ("📄", "PDF → Word", "Convert PDF to editable .docx with preserved structure"),
        ("📊", "PDF → Excel", "Extract tables into spreadsheet-ready .xlsx format"),
        ("📋", "PDF → CSV", "Export tabular data to clean, machine-readable CSV"),
        ("📝", "PDF → Text", "Extract plain text for NLP, archiving or analysis"),
        ("🔗", "Merge PDFs", "Combine multiple PDFs into a single document"),
        ("✂️", "Split PDF", "Divide PDFs by page range or individual pages"),
        ("🗜️", "Compress PDF", "Reduce file size without losing quality"),
        ("📐", "Extract Tables", "Detect and export every table from a PDF"),
        ("🔍", "OCR Scanner", "Turn scanned images into searchable text"),
        ("⚡", "Batch Process", "Process multiple PDFs at once"),
    ]

    cols = st.columns(2)
    for i, (icon, title, desc) in enumerate(tools_data):
        with cols[i % 2]:
            st.markdown(f"""
            <div class="tool-card">
                <span class="tool-card-icon">{icon}</span>
                <div class="tool-card-title">{title}</div>
                <div class="tool-card-desc">{desc}</div>
            </div>
            """, unsafe_allow_html=True)

    # Features
    st.markdown("<br/>", unsafe_allow_html=True)
    st.markdown("""<div class="section-title">Why PDF Converter?</div>""", unsafe_allow_html=True)
    st.markdown("""
    <div class="feature-grid">
        <div class="feature-item"><span>🛡️</span> Files never stored on server</div>
        <div class="feature-item"><span>⚡</span> Lightning-fast conversion</div>
        <div class="feature-item"><span>📱</span> Works on mobile & desktop</div>
        <div class="feature-item"><span>🤖</span> AI-powered OCR engine</div>
        <div class="feature-item"><span>🌍</span> English & French UI</div>
        <div class="feature-item"><span>💯</span> 100% free, no signup</div>
    </div>
    """, unsafe_allow_html=True)
