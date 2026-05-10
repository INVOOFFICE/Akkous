import os
import io
import fitz
from PIL import Image
import streamlit as st


def validate_pdf(file_bytes: bytes) -> bool:
    """Check if bytes are a valid PDF."""
    return file_bytes[:4] == b"%PDF"


def get_page_count(file_bytes: bytes) -> int:
    """Return number of pages in PDF."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        n = len(doc)
        doc.close()
        return n
    except Exception:
        return 0


def get_file_size_str(size_bytes: int) -> str:
    """Human-readable file size."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes/1024:.1f} KB"
    else:
        return f"{size_bytes/1024**2:.2f} MB"


@st.cache_data(show_spinner=False)
def render_pdf_preview(file_bytes: bytes, page: int = 0, dpi: int = 120) -> Image.Image:
    """Render a PDF page as PIL Image for preview."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = doc[page].get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    doc.close()
    return img
