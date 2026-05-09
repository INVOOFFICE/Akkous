import streamlit as st
import time
from components.uploader import render_uploader, render_file_info, render_preview
from converters.pdf_to_word import pdf_to_word
from converters.pdf_to_excel import pdf_to_excel
from converters.pdf_to_csv import pdf_to_csv
from converters.pdf_to_text import pdf_to_text


def _header(icon, title, desc):
    st.markdown(f"""
    <div style='margin-bottom: 1.5rem;'>
        <div style='font-family: Syne, sans-serif; font-size: 1.8rem; font-weight: 800;
             color: #e2e8f0;'>{icon} {title}</div>
        <div style='color: #64748b; font-size: 0.9rem; margin-top: 4px;'>{desc}</div>
    </div>
    """, unsafe_allow_html=True)


def _run_conversion(label, file_bytes, fn, out_ext, mime, progress_steps=5):
    col1, col2 = st.columns([2, 1])
    with col1:
        if st.button(f"🚀 Convert to {out_ext.upper()}", use_container_width=True):
            prog = st.progress(0, text="Initialising…")
            status = st.empty()
            try:
                for i in range(progress_steps):
                    time.sleep(0.1)
                    prog.progress((i + 1) * (80 // progress_steps),
                                  text=f"Processing… {(i+1)*20}%")
                status.info("⚙️ Converting…")
                result = fn(file_bytes)
                prog.progress(100, text="Done!")
                status.success("✅ Conversion complete!")
                st.download_button(
                    f"⬇️ Download {label}.{out_ext}",
                    data=result,
                    file_name=f"{label}.{out_ext}",
                    mime=mime,
                    use_container_width=True,
                )
            except Exception as e:
                prog.empty()
                status.error(f"❌ Error: {e}")
    with col2:
        st.markdown(f"""
        <div style='background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.15);
             border-radius: 10px; padding: 1rem; font-size: 0.8rem; color: #64748b;'>
            <b style='color:#a78bfa'>Output format</b><br>
            {out_ext.upper()} file<br>
            <span style='color:#34d399'>✓ Ready to download</span>
        </div>
        """, unsafe_allow_html=True)


def render_pdf_to_word():
    _header("📄", "PDF to Word", "Convert PDF documents into editable Microsoft Word files")
    files = render_uploader("Upload PDF to convert", key="w_up")
    if not files:
        return
    name, fb = files[0]
    render_file_info(name, fb)
    st.markdown("<br/>", unsafe_allow_html=True)

    col_prev, col_tool = st.columns([1, 2])
    with col_prev:
        render_preview(fb)
    with col_tool:
        stem = name.rsplit(".", 1)[0]
        _run_conversion(stem, fb, pdf_to_word, "docx",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document")


def render_pdf_to_excel():
    _header("📊", "PDF to Excel", "Extract tables and data into structured Excel workbooks")
    files = render_uploader("Upload PDF", key="xl_up")
    if not files:
        return
    name, fb = files[0]
    render_file_info(name, fb)
    st.markdown("<br/>", unsafe_allow_html=True)
    stem = name.rsplit(".", 1)[0]
    _run_conversion(stem, fb, pdf_to_excel, "xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


def render_pdf_to_csv():
    _header("📋", "PDF to CSV", "Export PDF table data to clean, machine-readable CSV")
    files = render_uploader("Upload PDF", key="csv_up")
    if not files:
        return
    name, fb = files[0]
    render_file_info(name, fb)
    st.markdown("<br/>", unsafe_allow_html=True)
    stem = name.rsplit(".", 1)[0]
    _run_conversion(stem, fb, pdf_to_csv, "csv", "text/csv")


def render_pdf_to_text():
    _header("📝", "PDF to Text", "Extract plain text content from any PDF document")
    files = render_uploader("Upload PDF", key="txt_up")
    if not files:
        return
    name, fb = files[0]
    render_file_info(name, fb)
    st.markdown("<br/>", unsafe_allow_html=True)

    if st.button("🚀 Extract Text", use_container_width=True):
        with st.spinner("Extracting text…"):
            try:
                text = pdf_to_text(fb)
                if text:
                    st.success(f"✅ Extracted {len(text):,} characters")
                    with st.expander("👁️ Preview extracted text", expanded=True):
                        st.text_area("", text[:3000] + ("…" if len(text) > 3000 else ""),
                                     height=300, label_visibility="collapsed")
                    stem = name.rsplit(".", 1)[0]
                    st.download_button("⬇️ Download .txt", data=text.encode(),
                                       file_name=f"{stem}.txt", mime="text/plain",
                                       use_container_width=True)
                else:
                    st.warning("No text found. Try the OCR tool for scanned PDFs.")
            except Exception as e:
                st.error(f"❌ {e}")
