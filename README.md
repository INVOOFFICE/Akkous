# 📄 PDF Converter — Professional PDF Toolkit

> **Free, fast, and privacy-first PDF processing — built with Python & Streamlit**

[![Streamlit](https://img.shields.io/badge/Streamlit-1.32+-FF4B4B?logo=streamlit)](https://streamlit.io)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Features

| Tool | Description |
|------|-------------|
| 📄 **PDF → Word** | Convert PDF to editable .docx |
| 📊 **PDF → Excel** | Extract tables into .xlsx |
| 📋 **PDF → CSV** | Export data to CSV |
| 📝 **PDF → Text** | Extract plain text |
| 🔗 **Merge PDFs** | Combine multiple PDFs |
| ✂️ **Split PDF** | Divide by page range or per-page |
| 🗜️ **Compress PDF** | Reduce file size |
| 📐 **Extract Tables** | Detect & export all tables |
| 🔍 **OCR Scanner** | Text extraction from scanned PDFs |
| ⚡ **Batch Process** | Convert multiple PDFs at once |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourorg/pdf-converter
cd pdf-converter
pip install -r requirements.txt
```

### 2. System dependencies (for OCR)

```bash
# Ubuntu / Debian
sudo apt-get install tesseract-ocr tesseract-ocr-fra

# macOS
brew install tesseract

# Windows
# Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
```

### 3. Run the app

```bash
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501) in your browser.

---

## 📁 Project Structure

```
pdf_converter/
├── app.py                          # Main entry point
├── requirements.txt
├── README.md
├── components/
│   ├── sidebar.py                  # Navigation sidebar
│   ├── uploader.py                 # Reusable file uploader
│   └── pages/
│       ├── home_page.py
│       ├── convert_pages.py        # PDF→Word/Excel/CSV/Text
│       ├── tools_pages.py          # Merge/Split/Compress/OCR/Tables
│       ├── batch_page.py
│       └── faq_page.py
├── converters/
│   ├── pdf_to_text.py
│   ├── pdf_to_word.py
│   ├── pdf_to_excel.py
│   ├── pdf_to_csv.py
│   ├── merge_pdf.py
│   ├── split_pdf.py
│   ├── compress_pdf.py
│   ├── extract_tables.py
│   └── ocr_pdf.py
├── utils/
│   ├── styles.py                   # Custom CSS / SaaS theme
│   ├── seo.py                      # Meta tags & structured data
│   └── file_utils.py               # Validation, preview helpers
├── assets/
│   ├── robots.txt
│   ├── llms.txt
│   └── sitemap.xml
└── temp/                           # Scratch dir (auto-managed)
```

---

## ☁️ Deployment

### Streamlit Cloud

1. Push to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Connect repo → set `app.py` as entry point
4. Add `packages.txt` with `tesseract-ocr` for OCR support

**packages.txt:**
```
tesseract-ocr
```

### Render / Railway

```bash
# Build command
pip install -r requirements.txt

# Start command
streamlit run app.py --server.port $PORT --server.address 0.0.0.0
```

### Docker

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y tesseract-ocr && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8501
CMD ["streamlit", "run", "app.py", "--server.address=0.0.0.0"]
```

---

## 🔧 Configuration

Create `.streamlit/config.toml`:

```toml
[server]
maxUploadSize = 200
enableXsrfProtection = true

[theme]
base = "dark"
primaryColor = "#6366f1"
backgroundColor = "#0a0b0f"
secondaryBackgroundColor = "#111827"
textColor = "#e2e8f0"
```

---

## 📈 SEO & AI Optimization

- ✅ Schema.org `SoftwareApplication` structured data
- ✅ Open Graph & Twitter Card meta tags
- ✅ `robots.txt` with AI crawler permissions
- ✅ `llms.txt` for ChatGPT / Claude / Gemini indexing
- ✅ Semantic HTML structure
- ✅ EN + FR multilingual support
- ✅ FAQ section with conversational content

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `streamlit` | Web UI framework |
| `pdfplumber` | Text & table extraction |
| `PyMuPDF (fitz)` | PDF rendering & manipulation |
| `python-docx` | Word document generation |
| `openpyxl` | Excel workbook writing |
| `pandas` | Data manipulation |
| `pytesseract` | OCR engine wrapper |
| `opencv-python-headless` | Image preprocessing |
| `Pillow` | Image handling |
| `reportlab` | PDF generation utilities |

---

## 📄 License

MIT License — free to use, modify, and deploy.

---

*PDF Converter © 2026 — Built with ♥ using Python & Streamlit*
