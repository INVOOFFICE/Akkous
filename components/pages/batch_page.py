import streamlit as st
import zipfile
import io
import time
from components.uploader import render_uploader
from converters.pdf_to_text import pdf_to_text
from converters.pdf_to_word import pdf_to_word
from converters.pdf_to_csv import pdf_to_csv
from utils.file_utils import get_file_size_str


def render_batch():
    st.markdown("""
    <div style='margin-bottom: 1.5rem;'>
        <div style='font-family: Syne, sans-serif; font-size: 1.8rem; font-weight: 800;
             color: #e2e8f0;'>⚡ Batch Processor</div>
        <div style='color: #64748b; font-size: 0.9rem; margin-top: 4px;'>
            Convert multiple PDFs simultaneously — download all as a ZIP archive
        </div>
    </div>
    """, unsafe_allow_html=True)

    files = render_uploader("Upload multiple PDFs", multiple=True, key="batch_up")
    if not files:
        return

    st.markdown(f"**{len(files)} file(s) queued:**")
    for name, fb in files:
        st.markdown(f"• `{name}` — {get_file_size_str(len(fb))}")

    st.markdown("<br/>", unsafe_allow_html=True)
    output_fmt = st.selectbox("Batch output format", ["TXT (text)", "DOCX (Word)", "CSV"])

    if st.button("⚡ Process All Files", use_container_width=True):
        prog = st.progress(0, text="Starting batch…")
        results = {}
        errors = []

        for i, (name, fb) in enumerate(files):
            pct = int((i / len(files)) * 90)
            prog.progress(pct, text=f"Processing {name}…")
            stem = name.rsplit(".", 1)[0]
            try:
                if output_fmt.startswith("TXT"):
                    data = pdf_to_text(fb).encode()
                    out_name = f"{stem}.txt"
                elif output_fmt.startswith("DOCX"):
                    data = pdf_to_word(fb)
                    out_name = f"{stem}.docx"
                else:
                    data = pdf_to_csv(fb)
                    out_name = f"{stem}.csv"
                results[out_name] = data
            except Exception as e:
                errors.append(f"{name}: {e}")

        prog.progress(100, text="Done!")

        if errors:
            for err in errors:
                st.error(f"❌ {err}")

        if results:
            st.success(f"✅ Converted {len(results)} / {len(files)} files")
            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                for fname, data in results.items():
                    zf.writestr(fname, data)
            st.download_button(
                f"⬇️ Download all ({len(results)} files) as ZIP",
                data=zip_buf.getvalue(),
                file_name="batch_output.zip",
                mime="application/zip",
                use_container_width=True,
            )
