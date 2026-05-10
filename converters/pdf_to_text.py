import pdfplumber
import fitz
import io


def pdf_to_text(file_bytes: bytes) -> str:
    """Extract plain text from PDF using pdfplumber with fitz fallback."""
    text_parts = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages):
                t = page.extract_text()
                if t:
                    text_parts.append(f"--- Page {i+1} ---\n{t}")
        if text_parts:
            return "\n\n".join(text_parts)
    except Exception:
        pass

    # Fallback: fitz
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for i, page in enumerate(doc):
            t = page.get_text()
            if t.strip():
                text_parts.append(f"--- Page {i+1} ---\n{t}")
        doc.close()
    except Exception as e:
        raise RuntimeError(f"Text extraction failed: {e}")

    return "\n\n".join(text_parts) if text_parts else ""
