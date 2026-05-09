import streamlit as st
import time
import zipfile
import io
from components.uploader import render_uploader, render_file_info
from converters.merge_pdf import merge_pdfs
from converters.split_pdf import split_pdf, split_pdf_by_pages
from converters.compress_pdf import compress_pdf
from converters.extract_tables import extract_tables, clean_dataframe
from converters.ocr_pdf import ocr_pdf
from utils.file_utils import get_page_count, get_file_size_str


def _header(icon, title, desc):
    st.markdown(f"""
    <div style='margin-bottom: 1.5rem;'>
        <div style='font-family: Syne, sans-serif; font-size: 1.8rem; font-weight: 800;
             color: #e2e8f0;'>{icon} {title}</div>
        <div style='color: #64748b; font-size: 0.9rem; margin-top: 4px;'>{desc}</div>
    </div>
    """, unsafe_allow_html=True)


def render_merge():
    _header("🔗", "Merge PDFs", "Combine multiple PDF files into one document")
    files = render_uploader("Upload 2+ PDFs to merge", multiple=True, key="merge_up")
    if not files:
        return
    if len(files) < 2:
        st.info("ℹ️ Please upload at least 2 PDF files.")
        return

    st.markdown(f"**{len(files)} files selected:**")
    for i, (name, fb) in enumerate(files):
        st.markdown(f"`{i+1}.` {name} — {get_file_size_str(len(fb))} · {get_page_count(fb)} pages")

    st.markdown("<br/>", unsafe_allow_html=True)
    if st.button("🔗 Merge All PDFs", use_container_width=True):
        prog = st.progress(0, text="Merging…")
        try:
            for i in range(5):
                time.sleep(0.08)
                prog.progress((i + 1) * 15)
            result = merge_pdfs([fb for _, fb in files])
            prog.progress(100, text="Done!")
            st.success(f"✅ Merged {len(files)} files → {get_file_size_str(len(result))}")
            st.download_button("⬇️ Download merged.pdf", data=result,
                               file_name="merged.pdf", mime="application/pdf",
                               use_container_width=True)
        except Exception as e:
            st.error(f"❌ {e}")


def render_split():
    _header("✂️", "Split PDF", "Divide a PDF by page ranges or extract individual pages")
    files = render_uploader("Upload PDF to split", key="split_up")
    if not files:
        return
    name, fb = files[0]
    render_file_info(name, fb)
    total_pages = get_page_count(fb)
    st.markdown("<br/>", unsafe_allow_html=True)

    mode = st.radio("Split mode", ["Split by page range", "Extract individual pages"],
                    horizontal=True)

    stem = name.rsplit(".", 1)[0]

    if mode == "Extract individual pages":
        if st.button("✂️ Split into individual pages", use_container_width=True):
            with st.spinner("Splitting…"):
                try:
                    pages = split_pdf_by_pages(fb)
                    buf = io.BytesIO()
                    with zipfile.ZipFile(buf, "w") as zf:
                        for i, p in enumerate(pages):
                            zf.writestr(f"{stem}_page_{i+1}.pdf", p)
                    st.success(f"✅ Split into {len(pages)} pages")
                    st.download_button("⬇️ Download all pages (.zip)", data=buf.getvalue(),
                                       file_name=f"{stem}_pages.zip", mime="application/zip",
                                       use_container_width=True)
                except Exception as e:
                    st.error(f"❌ {e}")
    else:
        col1, col2 = st.columns(2)
        with col1:
            start = st.number_input("From page", min_value=1, max_value=total_pages, value=1)
        with col2:
            end = st.number_input("To page", min_value=1, max_value=total_pages, value=total_pages)

        if st.button("✂️ Split range", use_container_width=True):
            with st.spinner("Splitting…"):
                try:
                    parts = split_pdf(fb, [(int(start), int(end))])
                    st.success(f"✅ Extracted pages {start}–{end}")
                    st.download_button("⬇️ Download split PDF",
                                       data=parts[0],
                                       file_name=f"{stem}_p{start}-{end}.pdf",
                                       mime="application/pdf",
                                       use_container_width=True)
                except Exception as e:
                    st.error(f"❌ {e}")


def render_compress():
    _header("🗜️", "Compress PDF", "Reduce file size while preserving quality")
    files = render_uploader("Upload PDF to compress", key="comp_up")
    if not files:
        return
    name, fb = files[0]
    render_file_info(name, fb)
    st.markdown("<br/>", unsafe_allow_html=True)

    quality = st.slider("Image quality (lower = smaller file)", 10, 95, 60)
    st.caption("💡 60–75 gives the best size/quality balance")

    stem = name.rsplit(".", 1)[0]
    if st.button("🗜️ Compress PDF", use_container_width=True):
        with st.spinner("Compressing…"):
            try:
                result = compress_pdf(fb, quality=quality)
                orig = len(fb)
                comp = len(result)
                ratio = (1 - comp / orig) * 100
                col1, col2, col3 = st.columns(3)
                col1.metric("Original", get_file_size_str(orig))
                col2.metric("Compressed", get_file_size_str(comp))
                col3.metric("Saved", f"{ratio:.1f}%")
                st.download_button("⬇️ Download compressed PDF", data=result,
                                   file_name=f"{stem}_compressed.pdf", mime="application/pdf",
                                   use_container_width=True)
            except Exception as e:
                st.error(f"❌ {e}")


def render_extract_tables():
    _header("📐", "Extract Tables", "Detect and export tables from PDF to DataFrame")
    files = render_uploader("Upload PDF", key="tbl_up")
    if not files:
        return
    name, fb = files[0]
    render_file_info(name, fb)
    st.markdown("<br/>", unsafe_allow_html=True)

    do_clean = st.checkbox("Clean extracted data (remove empty rows/cols)", value=True)

    if st.button("📐 Extract Tables", use_container_width=True):
        with st.spinner("Detecting tables…"):
            try:
                dfs = extract_tables(fb)
                if not dfs:
                    st.warning("No tables detected. Try the PDF→Excel or PDF→CSV tools.")
                    return
                st.success(f"✅ Found {len(dfs)} table(s)")
                import pandas as pd
                import io as _io
                excel_buf = _io.BytesIO()
                with pd.ExcelWriter(excel_buf, engine="openpyxl") as writer:
                    for i, df in enumerate(dfs):
                        if do_clean:
                            df = clean_dataframe(df)
                        page = df.attrs.get("page", i + 1)
                        sheet = f"Table_{i+1}_p{page}"[:31]
                        df.to_excel(writer, sheet_name=sheet, index=False)
                        with st.expander(f"📋 Table {i+1} (Page {page}) — {df.shape[0]} rows × {df.shape[1]} cols"):
                            st.dataframe(df, use_container_width=True)
                stem = name.rsplit(".", 1)[0]
                st.download_button("⬇️ Download all tables (.xlsx)", data=excel_buf.getvalue(),
                                   file_name=f"{stem}_tables.xlsx",
                                   mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                   use_container_width=True)
            except Exception as e:
                st.error(f"❌ {e}")


def render_ocr():
    _header("🔍", "OCR Scanner", "Extract text from scanned or image-based PDFs")
    st.info("ℹ️ OCR requires Tesseract to be installed on the server (`apt install tesseract-ocr`).")
    files = render_uploader("Upload scanned PDF", key="ocr_up")
    if not files:
        return
    name, fb = files[0]
    render_file_info(name, fb)
    st.markdown("<br/>", unsafe_allow_html=True)

    dpi = st.select_slider("OCR Resolution (DPI)", options=[100, 150, 200, 300], value=200)
    st.caption("Higher DPI = better accuracy but slower. 200 DPI recommended.")

    if st.button("🔍 Run OCR", use_container_width=True):
        prog = st.progress(0, text="Rendering pages…")
        status = st.empty()
        try:
            prog.progress(20, text="Preprocessing images…")
            time.sleep(0.1)
            prog.progress(40, text="Running OCR engine…")
            text = ocr_pdf(fb, dpi=dpi)
            prog.progress(90, text="Assembling result…")
            time.sleep(0.05)
            prog.progress(100, text="Done!")
            if text and "[No text" not in text and "[pytesseract" not in text:
                status.success(f"✅ Extracted {len(text):,} characters via OCR")
                with st.expander("👁️ OCR Preview", expanded=True):
                    st.text_area("", text[:3000] + ("…" if len(text) > 3000 else ""),
                                 height=300, label_visibility="collapsed")
                stem = name.rsplit(".", 1)[0]
                st.download_button("⬇️ Download OCR text (.txt)", data=text.encode(),
                                   file_name=f"{stem}_ocr.txt", mime="text/plain",
                                   use_container_width=True)
            else:
                status.warning(text or "No text extracted.")
        except Exception as e:
            st.error(f"❌ {e}")
