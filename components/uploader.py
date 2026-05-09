import streamlit as st
from utils.file_utils import validate_pdf, get_page_count, get_file_size_str, render_pdf_preview


def render_uploader(label: str = "Drop your PDF here", multiple: bool = False,
                    key: str = "upload") -> list:
    """Render styled PDF uploader. Returns list of (name, bytes) tuples."""
    st.markdown(f"""
    <div style='margin-bottom: 0.5rem;'>
        <div style='font-size: 0.8rem; font-weight: 600; color: #64748b;
             text-transform: uppercase; letter-spacing: 0.08em;'>{label}</div>
    </div>
    """, unsafe_allow_html=True)

    uploaded = st.file_uploader(
        label,
        type=["pdf"],
        accept_multiple_files=multiple,
        key=key,
        label_visibility="collapsed",
        help="Supports PDF files up to 200 MB",
    )

    if not uploaded:
        return []

    files = uploaded if isinstance(uploaded, list) else [uploaded]
    result = []

    for f in files:
        fb = f.read()
        if not validate_pdf(fb):
            st.error(f"⚠️ **{f.name}** is not a valid PDF file.")
            continue
        result.append((f.name, fb))

    return result


def render_file_info(name: str, file_bytes: bytes):
    """Display metadata card for uploaded file."""
    pages = get_page_count(file_bytes)
    size = get_file_size_str(len(file_bytes))
    col1, col2, col3 = st.columns(3)
    col1.metric("📄 File", name[:20] + ("…" if len(name) > 20 else ""))
    col2.metric("📑 Pages", pages)
    col3.metric("💾 Size", size)


def render_preview(file_bytes: bytes, page: int = 0):
    """Show rendered PDF page thumbnail."""
    try:
        img = render_pdf_preview(file_bytes, page=page)
        st.image(img, caption=f"Page {page + 1} preview", use_container_width=True)
    except Exception as e:
        st.caption(f"Preview unavailable: {e}")
