# Tesseract OCR HTTP service
import os
import io
import tempfile
from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes
import magic

app = Flask(__name__)
MAX_FILE_MB = int(os.environ.get("MAX_FILE_MB", "20"))

def ocr_image(image: Image.Image) -> str:
    return pytesseract.image_to_string(
        image,
        config="--psm 1 --oem 3"  # auto page seg + LSTM engine
    )

def ocr_pdf(data: bytes) -> str:
    pages = convert_from_bytes(data, dpi=300)
    return "\n\n".join(ocr_image(p) for p in pages)

@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "tesseract-ocr"})

@app.route("/ocr", methods=["POST"])
def ocr():
    if "file" not in request.files and not request.data:
        return jsonify({"error": "No file provided"}), 400

    raw = request.files["file"].read() if "file" in request.files else request.data

    if len(raw) > MAX_FILE_MB * 1024 * 1024:
        return jsonify({"error": f"File too large (max {MAX_FILE_MB}MB)"}), 413

    try:
        mime = magic.from_buffer(raw, mime=True)
        if mime == "application/pdf":
            text = ocr_pdf(raw)
        elif mime.startswith("image/"):
            image = Image.open(io.BytesIO(raw))
            text = ocr_image(image)
        else:
            return jsonify({"error": f"Unsupported file type: {mime}"}), 415

        cleaned = text.strip()
        if not cleaned:
            return jsonify({"error": "OCR produced no text"}), 422

        # Privacy: never log the extracted text
        app.logger.info(f"OCR complete, chars={len(cleaned)}")
        return jsonify({"text": cleaned, "char_count": len(cleaned)})

    except Exception as e:
        app.logger.error(f"OCR error: {e}")
        return jsonify({"error": "OCR processing failed"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8884, debug=False)