import pdfplumber
import pandas as pd
import io
from typing import List


def extract_tables(file_bytes: bytes) -> List[pd.DataFrame]:
    """Extract all tables from PDF and return as list of DataFrames."""
    dfs = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            for tbl in tables:
                if tbl and len(tbl) > 1:
                    df = pd.DataFrame(tbl[1:], columns=tbl[0])
                    df = df.dropna(how="all").reset_index(drop=True)
                    df.attrs["page"] = page_num
                    dfs.append(df)
    return dfs


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Clean extracted DataFrame: strip whitespace, drop empty cols."""
    df = df.copy()
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
    df = df.replace("", pd.NA)
    df = df.dropna(how="all", axis=1)
    df = df.dropna(how="all", axis=0)
    return df.reset_index(drop=True)
