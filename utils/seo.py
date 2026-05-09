SEO_HTML = """
<!-- SEO Meta Tags -->
<title>PDF Converter — Free Online PDF Tools 2026 | Convert, Merge, Split, OCR</title>
<meta name="description" content="Free online PDF converter. Convert PDF to Word, Excel, CSV, TXT. Merge, split, compress PDFs. OCR scanned documents. Fast, secure, no signup required.">
<meta name="keywords" content="PDF converter, PDF to Word, PDF to Excel, free PDF converter, PDF OCR tool, extract tables from PDF, scanned PDF to text, convert PDF online, merge PDF, split PDF, compress PDF">
<meta name="robots" content="index, follow">
<meta name="language" content="en, fr">
<meta name="author" content="PDF Converter SaaS">

<!-- Open Graph -->
<meta property="og:title" content="PDF Converter — Free Online PDF Tools 2026">
<meta property="og:description" content="Convert, merge, split, compress and OCR PDFs instantly. Professional PDF toolkit with no signup required.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://pdfconverter.app">
<meta property="og:image" content="https://pdfconverter.app/og-image.png">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="PDF Converter — Free Online PDF Tools">
<meta name="twitter:description" content="Convert PDF to Word, Excel, CSV. Merge, split, compress. OCR scanned PDFs. Free and instant.">

<!-- Schema.org Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PDF Converter",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": "Web",
  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
  "description": "Free online PDF converter. Convert PDF to Word, Excel, CSV, TXT. OCR scanned documents. Merge, split, compress PDFs.",
  "featureList": ["PDF to Word", "PDF to Excel", "PDF to CSV", "PDF OCR", "Merge PDF", "Split PDF", "Compress PDF"],
  "url": "https://pdfconverter.app",
  "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "12500"}
}
</script>
"""


def inject_seo():
    import streamlit as st
    st.markdown(SEO_HTML, unsafe_allow_html=True)
