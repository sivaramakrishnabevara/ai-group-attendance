import cv2
import numpy as np
from typing import Dict, Any, List, Tuple
from services.face_pipeline import pipeline

def validate_face_for_enrollment(image: np.ndarray, expected_pose: str = "natural_front") -> Dict[str, Any]:
    """
    Validates single face image for enrollment with strict biometric criteria:
    - Exactly one face
    - Centered bounding box
    - Proper face-to-frame size ratio
    - Sharpness / blur (Laplacian variance)
    - Adequate illumination (mean brightness)
    - Head pose check (yaw/pitch estimation from eye and nose landmarks)
    """
    h, w = image.shape[:2]

    # Check minimum resolution
    if w < 240 or h < 240:
        return {
            "is_valid": False,
            "instruction": "Image resolution too low. Please use a clearer webcam stream.",
            "quality_score": 0.0,
            "details": {"resolution": f"{w}x{h}"}
        }

    # Detect faces with high confidence threshold
    detected_faces = pipeline.detect_faces(image, score_threshold=0.6)

    if len(detected_faces) == 0:
        return {
            "is_valid": False,
            "instruction": "No face detected. Please face the camera directly.",
            "quality_score": 0.0,
            "details": {"faces_found": 0}
        }

    if len(detected_faces) > 1:
        return {
            "is_valid": False,
            "instruction": "Only one face allowed. Please ensure no other people are in the frame.",
            "quality_score": 0.0,
            "details": {"faces_found": len(detected_faces)}
        }

    face = detected_faces[0]
    box = face["box"]
    bx, by, bw, bh = box["x"], box["y"], box["width"], box["height"]

    # Face size ratio
    face_ratio = float(bw) / float(w)
    if face_ratio < 0.15:
        return {
            "is_valid": False,
            "instruction": "Move closer to the camera.",
            "quality_score": round(face["score"] * 0.4, 3),
            "details": {"face_ratio": round(face_ratio, 3)}
        }
    if face_ratio > 0.85:
        return {
            "is_valid": False,
            "instruction": "Move back slightly from the camera.",
            "quality_score": round(face["score"] * 0.5, 3),
            "details": {"face_ratio": round(face_ratio, 3)}
        }

    # Centering check
    center_x = (bx + bw / 2.0) / float(w)
    center_y = (by + bh / 2.0) / float(h)
    if center_x < 0.25 or center_x > 0.75 or center_y < 0.20 or center_y > 0.80:
        return {
            "is_valid": False,
            "instruction": "Center your face in the camera frame.",
            "quality_score": round(face["score"] * 0.6, 3),
            "details": {"center_x": round(center_x, 3), "center_y": round(center_y, 3)}
        }

    # Lighting / Brightness check
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    face_gray = gray[by:by+bh, bx:bx+bw] if bw > 0 and bh > 0 else gray
    mean_brightness = float(np.mean(face_gray))

    if mean_brightness < 40:
        return {
            "is_valid": False,
            "instruction": "Image too dark. Increase ambient lighting.",
            "quality_score": round(face["score"] * 0.4, 3),
            "details": {"brightness": round(mean_brightness, 1)}
        }
    if mean_brightness > 225:
        return {
            "is_valid": False,
            "instruction": "Image too bright. Avoid strong direct backlight.",
            "quality_score": round(face["score"] * 0.4, 3),
            "details": {"brightness": round(mean_brightness, 1)}
        }

    # Blur / Sharpness check using Laplacian variance
    laplacian_var = float(cv2.Laplacian(face_gray, cv2.CV_64F).var())
    if laplacian_var < 35.0:
        return {
            "is_valid": False,
            "instruction": "Image too blurry. Hold steady while capturing.",
            "quality_score": round(min(1.0, laplacian_var / 100.0), 3),
            "details": {"laplacian_var": round(laplacian_var, 1)}
        }

    # Pose estimation via facial landmarks
    landmarks = face["landmarks"]
    right_eye = landmarks["right_eye"]
    left_eye = landmarks["left_eye"]
    nose_tip = landmarks["nose_tip"]

    eye_distance = abs(left_eye[0] - right_eye[0])
    if eye_distance > 0:
        # Ratio of nose position relative to eyes: ~0.5 means center front
        yaw_ratio = (nose_tip[0] - right_eye[0]) / eye_distance
    else:
        yaw_ratio = 0.5

    # Check expected pose guidance
    pose_valid = True
    pose_instruction = "Face validated successfully"

    if expected_pose == "slight_left":
        # Face turned slightly left: user's left (nose moves towards left eye, yaw_ratio > 0.55)
        if yaw_ratio < 0.52:
            pose_valid = False
            pose_instruction = "Turn slightly to your left"
    elif expected_pose == "slight_right":
        # Face turned slightly right: user's right (nose moves towards right eye, yaw_ratio < 0.48)
        if yaw_ratio > 0.48:
            pose_valid = False
            pose_instruction = "Turn slightly to your right"
    elif expected_pose in ["natural_front", "front"]:
        if yaw_ratio < 0.35 or yaw_ratio > 0.65:
            pose_valid = False
            pose_instruction = "Face the camera directly (natural front)"

    # Compute overall quality score [0.0 - 1.0]
    clarity_factor = min(1.0, laplacian_var / 120.0)
    detection_factor = face["score"]
    lighting_factor = 1.0 - abs(mean_brightness - 128.0) / 128.0
    quality_score = round(float(0.4 * detection_factor + 0.35 * clarity_factor + 0.25 * lighting_factor), 3)

    return {
        "is_valid": pose_valid,
        "instruction": pose_instruction if not pose_valid else "Face validated successfully. Ready to capture.",
        "quality_score": quality_score,
        "face": {
            "box": box,
            "landmarks": landmarks,
            "score": round(face["score"], 4)
        },
        "details": {
            "yaw_ratio": round(yaw_ratio, 3),
            "laplacian_var": round(laplacian_var, 1),
            "brightness": round(mean_brightness, 1),
            "face_ratio": round(face_ratio, 3)
        }
    }
