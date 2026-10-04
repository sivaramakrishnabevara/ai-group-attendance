import os
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
from services.similarity import l2_normalize

class FacePipeline:
    def __init__(self):
        self.detector: Optional[cv2.FaceDetectorYN] = None
        self.recognizer: Optional[cv2.FaceRecognizerSF] = None
        self.yunet_model_path: str = ""
        self.sface_model_path: str = ""
        self.is_loaded: bool = False

    def load_models(self, models_dir: str):
        """Loads YuNet and SFace models once at application startup."""
        self.yunet_model_path = os.path.join(models_dir, "face_detection_yunet_2023mar.onnx")
        self.sface_model_path = os.path.join(models_dir, "face_recognition_sface_2021dec.onnx")

        if not os.path.exists(self.yunet_model_path):
            raise FileNotFoundError(f"YuNet model not found at {self.yunet_model_path}")
        if not os.path.exists(self.sface_model_path):
            raise FileNotFoundError(f"SFace model not found at {self.sface_model_path}")

        # Initialize YuNet face detector with default resolution (updated per frame)
        self.detector = cv2.FaceDetectorYN.create(
            model=self.yunet_model_path,
            config="",
            input_size=(320, 320),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5000
        )

        # Initialize SFace face recognizer
        self.recognizer = cv2.FaceRecognizerSF.create(
            model=self.sface_model_path,
            config=""
        )

        self.is_loaded = True
        print(f"[FacePipeline] Models successfully loaded into memory from {models_dir}")

    def detect_faces(self, image: np.ndarray, score_threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        Detects all faces in the provided BGR image using YuNet.
        Returns list of face metadata including coordinates, landmarks, and raw face vector.
        """
        if not self.is_loaded or self.detector is None:
            raise RuntimeError("FacePipeline models not loaded.")

        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))
        self.detector.setScoreThreshold(score_threshold)

        _, raw_faces = self.detector.detect(image)

        results = []
        if raw_faces is not None:
            for face in raw_faces:
                # YuNet format: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rc, y_rc, x_lc, y_lc, score]
                box_x = max(0, int(face[0]))
                box_y = max(0, int(face[1]))
                box_w = min(w - box_x, int(face[2]))
                box_h = min(h - box_y, int(face[3]))
                score = float(face[14])

                landmarks = {
                    "right_eye": [float(face[4]), float(face[5])],
                    "left_eye": [float(face[6]), float(face[7])],
                    "nose_tip": [float(face[8]), float(face[9])],
                    "mouth_right": [float(face[10]), float(face[11])],
                    "mouth_left": [float(face[12]), float(face[13])]
                }

                results.append({
                    "box": {
                        "x": box_x,
                        "y": box_y,
                        "width": box_w,
                        "height": box_h
                    },
                    "score": score,
                    "landmarks": landmarks,
                    "raw_face": face
                })

        return results

    def extract_embedding(self, image: np.ndarray, raw_face: np.ndarray) -> List[float]:
        """
        Aligns the face with SFace and extracts a normalized 128-dimensional embedding.
        """
        if not self.is_loaded or self.recognizer is None:
            raise RuntimeError("FacePipeline models not loaded.")

        aligned_face = self.recognizer.alignCrop(image, raw_face)
        feature = self.recognizer.feature(aligned_face)
        normalized = l2_normalize(feature.flatten())
        return normalized.tolist()

    def crop_face(self, image: np.ndarray, box: Dict[str, int], margin: float = 0.2) -> np.ndarray:
        """Crops face region with safe padding margins."""
        h, w = image.shape[:2]
        bx, by, bw, bh = box["x"], box["y"], box["width"], box["height"]

        pad_x = int(bw * margin)
        pad_y = int(bh * margin)

        x1 = max(0, bx - pad_x)
        y1 = max(0, by - pad_y)
        x2 = min(w, bx + bw + pad_x)
        y2 = min(h, by + bh + pad_y)

        cropped = image[y1:y2, x1:x2]
        return cropped

pipeline = FacePipeline()
