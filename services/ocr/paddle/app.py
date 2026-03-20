# PaddleOCR HTTP service
import os
import io
import tempfile
from flask import Flask, request, jsonify
from PIL import Image
from pdf2image import convert_from_bytes
from paddleocr import PaddleOCR

app    = Flask(__name__)
engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
MAX_FILE_MB = int(os.environ.get("MAX_FILE_MB", "20"))

def ocr_image(image: Image.Image) -> str:
    import numpy as np
    arr    = np.array(image)
    result = engine.ocr(arr, cls=True)
    lines  = []
    for page in (result or []):
        for line in (page or []):
            if line and len(line) >= 2:
                text_conf = line[1]
                if isinstance(text_conf, (list, tuple)) and len(text_conf) >= 1:
                    lines.append(str(text_conf[0]))
    return " ".join(lines)

def ocr_pdf(data: bytes) -> str:
    pages = convert_from_bytes(data, dpi=200)
    return "\n\n".join(ocr_image(p) for p in pages)

@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "paddle-ocr"})

@app.route("/ocr", methods=["POST"])
def ocr():
    if "file" not in request.files and not request.data:
        return jsonify({"error": "No file provided"}), 400

    raw = request.files["file"].read() if "file" in request.files else request.data

    if len(raw) > MAX_FILE_MB * 1024 * 1024:
        return jsonify({"error": f"File too large (max {MAX_FILE_MB}MB)"}), 413

    try:
        # Detect type by magic bytes
        is_pdf = raw[:4] == b"%PDF"
        if is_pdf:
            text = ocr_pdf(raw)
        else:
            image = Image.open(io.BytesIO(raw)).convert("RGB")
            text  = ocr_image(image)

        cleaned = text.strip()
        if not cleaned:
            return jsonify({"error": "OCR produced no text"}), 422

        app.logger.info(f"PaddleOCR complete, chars={len(cleaned)}")
        return jsonify({"text": cleaned, "char_count": len(cleaned)})

    except Exception as e:
        app.logger.error(f"PaddleOCR error: {e}")
        return jsonify({"error": "OCR processing failed"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8885, debug=False)