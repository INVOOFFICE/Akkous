import fitz
import io


def compress_pdf(file_bytes: bytes, quality: int = 60) -> bytes:
    """
    Compress PDF by downsampling images and using deflate compression.
    quality: JPEG quality for image recompression (0-100).
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")

    for page in doc:
        img_list = page.get_images(full=True)
        for img in img_list:
            xref = img[0]
            try:
                base_img = doc.extract_image(xref)
                img_bytes = base_img["image"]
                ext = base_img["ext"]
                if ext in ("jpeg", "jpg", "png", "bmp"):
                    from PIL import Image
                    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                    # Downsample large images
                    w, h = pil_img.size
                    if w > 1200 or h > 1200:
                        pil_img = pil_img.resize(
                            (min(w, 1200), min(h, 1200)), Image.LANCZOS
                        )
                    out = io.BytesIO()
                    pil_img.save(out, format="JPEG", quality=quality, optimize=True)
                    doc.update_stream(xref, out.getvalue())
            except Exception:
                continue

    buf = io.BytesIO()
    doc.save(buf, deflate=True, garbage=4, clean=True)
    doc.close()
    return buf.getvalue()
