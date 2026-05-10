import fitz
import io
from typing import List


def merge_pdfs(files_bytes: List[bytes]) -> bytes:
    """Merge multiple PDFs into one."""
    merged = fitz.open()
    for fb in files_bytes:
        doc = fitz.open(stream=fb, filetype="pdf")
        merged.insert_pdf(doc)
        doc.close()
    buf = io.BytesIO()
    merged.save(buf)
    merged.close()
    return buf.getvalue()
