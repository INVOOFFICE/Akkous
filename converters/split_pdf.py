import fitz
import io
from typing import List, Tuple


def split_pdf(file_bytes: bytes, ranges: List[Tuple[int, int]]) -> List[bytes]:
    """
    Split PDF by page ranges.
    ranges: list of (start, end) 1-indexed inclusive tuples.
    Returns list of PDF bytes, one per range.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    total = len(doc)
    results = []

    for start, end in ranges:
        s = max(0, start - 1)
        e = min(total - 1, end - 1)
        part = fitz.open()
        part.insert_pdf(doc, from_page=s, to_page=e)
        buf = io.BytesIO()
        part.save(buf)
        part.close()
        results.append(buf.getvalue())

    doc.close()
    return results


def split_pdf_by_pages(file_bytes: bytes) -> List[bytes]:
    """Split PDF into individual pages."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for i in range(len(doc)):
        part = fitz.open()
        part.insert_pdf(doc, from_page=i, to_page=i)
        buf = io.BytesIO()
        part.save(buf)
        part.close()
        pages.append(buf.getvalue())
    doc.close()
    return pages
