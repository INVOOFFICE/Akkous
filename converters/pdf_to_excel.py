import pdfplumber
import pandas as pd
import io


def pdf_to_excel(file_bytes: bytes) -> bytes:
    """Extract tables from PDF and write to Excel workbook."""
    buf = io.BytesIO()
    all_tables = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            for tbl_idx, table in enumerate(tables, 1):
                if table:
                    df = pd.DataFrame(table)
                    # Promote first row to header if it looks like one
                    if df.iloc[0].notna().all():
                        df.columns = df.iloc[0]
                        df = df[1:].reset_index(drop=True)
                    df.insert(0, "_page", page_num)
                    df.insert(1, "_table", tbl_idx)
                    all_tables.append(df)

    if not all_tables:
        # Fallback: dump raw text per page
        text_rows = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                for line in text.split("\n"):
                    if line.strip():
                        text_rows.append({"Page": page_num, "Text": line.strip()})
        df_text = pd.DataFrame(text_rows)
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df_text.to_excel(writer, sheet_name="Text Content", index=False)
    else:
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            for i, df in enumerate(all_tables):
                sheet_name = f"Table_{i+1}"[:31]
                df.to_excel(writer, sheet_name=sheet_name, index=False)

    return buf.getvalue()
