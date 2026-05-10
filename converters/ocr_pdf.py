import fitz
import io
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


def preprocess_image(pil_img: Image.Image) -> Image.Image:
    """Enhance image for better OCR accuracy."""
    # Convert to grayscale
    img = pil_img.convert("L")

    if CV2_AVAILABLE:
        arr = np.array(img)
        # Denoise
        arr = cv2.fastNlMeansDenoising(arr, h=10)
        # Adaptive threshold
        arr = cv2.adaptiveThreshold(
            arr, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        img = Image.fromarray(arr)
    else:
        # Pure Pillow fallback
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        img = img.filter(ImageFilter.SHARPEN)

    return img


def ocr_pdf(file_bytes: bytes, dpi: int = 200) -> str:
    """Run OCR on each page of a PDF and return extracted text."""
    if not TESSERACT_AVAILABLE:
        return "[pytesseract not available. Please install tesseract-ocr system package.]"

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    results = []

    for i, page in enumerate(doc):
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        processed = preprocess_image(img)
        text = pytesseract.image_to_string(processed, config="--oem 3 --psm 6")
        if text.strip():
            results.append(f"--- Page {i+1} ---\n{text.strip()}")

    doc.close()
    return "\n\n".join(results) if results else "[No text detected via OCR]"
