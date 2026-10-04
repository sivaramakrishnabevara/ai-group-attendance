import cv2
import numpy as np
from PIL import Image
import io

def decode_image(image_bytes: bytes) -> np.ndarray:
    """Decodes raw image bytes into a BGR OpenCV numpy array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image from provided bytes.")
    return img

def encode_image_to_jpeg(image: np.ndarray, quality: int = 90) -> bytes:
    """Encodes a BGR OpenCV image into JPEG bytes."""
    success, buffer = cv2.imencode('.jpg', image, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not success:
        raise ValueError("Could not encode image to JPEG.")
    return buffer.tobytes()

def resize_if_larger(image: np.ndarray, max_dim: int = 1280) -> np.ndarray:
    """Resizes image keeping aspect ratio if max(h, w) > max_dim to boost inference speed."""
    h, w = image.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        new_w = int(w * scale)
        new_h = int(h * scale)
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return image
