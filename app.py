"""
PDF Converter — Professional SaaS PDF Toolkit
Built with Streamlit · 2026 Edition
"""

import streamlit as st

# ── Page config (must be first Streamlit call) ──────────────────────────
st.set_page_config(
    page_title="PDF Converter — Free Online PDF Tools 2026",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        "Get Help": "https://pdfconverter.app/help",
        "Report a bug": "https://pdfconverter.app/bug",
        "About": "PDF Converter — Professional PDF Toolkit · Free · No signup",
    },
)

# ── Local imports ────────────────────────────────────────────────────────
from utils.styles import load_styles
from utils.seo import inject_seo
from components.sidebar import render_sidebar
from components.pages.home_page import render_home
from components.pages.convert_pages import (
    render_pdf_to_word,
    render_pdf_to_excel,
    render_pdf_to_csv,
    render_pdf_to_text,
)
from components.pages.tools_pages import (
    render_merge,
    render_split,
    render_compress,
    render_extract_tables,
    render_ocr,
)
from components.pages.batch_page import render_batch
from components.pages.faq_page import render_faq

# ── Init session state ───────────────────────────────────────────────────
if "active_tool" not in st.session_state:
    st.session_state["active_tool"] = "home"

# ── Inject styling & SEO ─────────────────────────────────────────────────
load_styles()
inject_seo()

# ── Sidebar navigation ───────────────────────────────────────────────────
tool = render_sidebar()

# ── Route to tool ────────────────────────────────────────────────────────
ROUTES = {
    "home":         render_home,
    "pdf_to_word":  render_pdf_to_word,
    "pdf_to_excel": render_pdf_to_excel,
    "pdf_to_csv":   render_pdf_to_csv,
    "pdf_to_text":  render_pdf_to_text,
    "merge":        render_merge,
    "split":        render_split,
    "compress":     render_compress,
    "extract_tables": render_extract_tables,
    "ocr":          render_ocr,
    "batch":        render_batch,
    "faq":          render_faq,
}

render_fn = ROUTES.get(tool, render_home)
render_fn()

# ── Footer ───────────────────────────────────────────────────────────────
st.markdown("<br/><br/>", unsafe_allow_html=True)
st.markdown("""
<div style='text-align: center; color: #1e293b; font-size: 12px; padding: 1rem;
     border-top: 1px solid rgba(99,102,241,0.08);'>
    <span style='color: #334155;'>PDF Converter © 2026</span>
    &nbsp;·&nbsp;
    <span style='color: #334155;'>Free · Secure · No signup</span>
    &nbsp;·&nbsp;
    <span style='color: #334155;'>Built with ♥ using Streamlit & Python</span>
</div>
""", unsafe_allow_html=True)
