import pdfplumber
import pandas as pd
import io


def pdf_to_csv(file_bytes: bytes) -> bytes:
    """Extract tables from PDF and return as CSV bytes."""
    all_rows = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        clean = [str(c).strip() if c else "" for c in row]
                        all_rows.append(clean)
            else:
                text = page.extract_text() or ""
                for line in text.split("\n"):
                    if line.strip():
                        all_rows.append([str(page_num), line.strip()])

    if not all_rows:
        return b""

    df = pd.DataFrame(all_rows)
    buf = io.BytesIO()
    df.to_csv(buf, index=False, header=False)
    return buf.getvalue()
