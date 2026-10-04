import os
import json
import base64
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query, Body
from pydantic import BaseModel

from services.face_pipeline import pipeline
from services.face_validator import validate_face_for_enrollment
from services.similarity import cosine_similarity, l2_normalize
from services.evaluation import evaluate_thresholds
from utils.image_processing import decode_image, resize_if_larger, encode_image_to_jpeg

router = APIRouter()

DEFAULT_THRESHOLD = float(os.getenv("FACE_RECOGNITION_THRESHOLD", "0.36"))

class EnrolledStudent(BaseModel):
    student_id: str
    student_name: str
    embeddings: List[List[float]]

class GroupRecognitionRequest(BaseModel):
    image_base64: Optional[str] = None
    enrolled_students: List[EnrolledStudent]
    threshold: Optional[float] = None

class CompareEmbeddingsRequest(BaseModel):
    embedding1: List[float]
    embedding2: List[float]
    threshold: Optional[float] = None

class EvaluationRequest(BaseModel):
    pairs: List[dict]
    thresholds: Optional[List[float]] = None

@router.get("/health")
async def health_check():
    return {
        "status": "OK",
        "models_loaded": pipeline.is_loaded,
        "detector": "YuNet",
        "recognizer": "SFace",
        "threshold": DEFAULT_THRESHOLD
    }

@router.post("/detect-face")
async def detect_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = decode_image(contents)
        image = resize_if_larger(image, max_dim=1280)

        faces = pipeline.detect_faces(image, score_threshold=0.5)

        results = []
        for f in faces:
            results.append({
                "box": f["box"],
                "score": round(f["score"], 4),
                "landmarks": f["landmarks"]
            })

        return {
            "success": True,
            "face_count": len(results),
            "faces": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/validate-face")
async def validate_face(
    file: UploadFile = File(...),
    expected_pose: str = Form("natural_front")
):
    try:
        contents = await file.read()
        image = decode_image(contents)
        image = resize_if_larger(image, max_dim=1280)

        validation = validate_face_for_enrollment(image, expected_pose=expected_pose)
        return validation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/register-face")
async def register_face(
    file: UploadFile = File(...),
    expected_pose: str = Form("natural_front")
):
    try:
        contents = await file.read()
        image = decode_image(contents)
        image = resize_if_larger(image, max_dim=1280)

        # Validate strictly before enrollment
        validation = validate_face_for_enrollment(image, expected_pose=expected_pose)
        if not validation["is_valid"]:
            return {
                "success": False,
                "message": validation["instruction"],
                "validation": validation
            }

        # Extract SFace embedding for the detected face
        faces = pipeline.detect_faces(image, score_threshold=0.6)
        if len(faces) != 1:
            return {
                "success": False,
                "message": "Exactly one face must be present for enrollment.",
                "validation": validation
            }

        face = faces[0]
        embedding = pipeline.extract_embedding(image, face["raw_face"])

        return {
            "success": True,
            "message": "Face enrollment embedding generated successfully.",
            "quality_score": validation["quality_score"],
            "embedding": embedding,
            "embedding_dimension": len(embedding),
            "box": face["box"],
            "pose": expected_pose
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/recognize-face")
async def recognize_single_face(
    file: UploadFile = File(...),
    enrolled_data_json: str = Form(...),
    threshold: Optional[float] = Form(None)
):
    try:
        active_threshold = threshold if threshold is not None else DEFAULT_THRESHOLD
        enrolled_students = json.loads(enrolled_data_json)

        contents = await file.read()
        image = decode_image(contents)
        image = resize_if_larger(image, max_dim=1280)

        faces = pipeline.detect_faces(image, score_threshold=0.55)
        if len(faces) == 0:
            return {"success": False, "message": "No face detected in image."}

        face = faces[0]
        query_embedding = pipeline.extract_embedding(image, face["raw_face"])

        best_student = None
        best_similarity = -1.0

        for student in enrolled_students:
            for emb in student.get("embeddings", []):
                sim = cosine_similarity(query_embedding, emb)
                if sim > best_similarity:
                    best_similarity = sim
                    best_student = student

        is_recognized = best_similarity >= active_threshold
        return {
            "success": True,
            "status": "recognized" if is_recognized else "unknown",
            "similarity": round(best_similarity, 4),
            "threshold_used": active_threshold,
            "student": best_student if is_recognized else None,
            "box": face["box"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/recognize-group")
async def recognize_group(
    file: Optional[UploadFile] = File(None),
    enrolled_data_json: Optional[str] = Form(None),
    threshold: Optional[float] = Form(None),
    body: Optional[GroupRecognitionRequest] = Body(None)
):
    """
    Teacher captures group classroom image.
    YuNet detects ALL faces in parallel.
    SFace generates 128-dim normalized embedding for each face.
    Cosine similarity matches against each enrolled student's multi-pose embeddings.
    Returns recognized students, unknown faces with cropped base64 previews, and absent students.
    """
    try:
        active_threshold = DEFAULT_THRESHOLD
        students_data = []

        if file is not None and enrolled_data_json is not None:
            contents = await file.read()
            image = decode_image(contents)
            students_data = json.loads(enrolled_data_json)
            if threshold is not None:
                active_threshold = float(threshold)
        elif body is not None and body.image_base64:
            image_bytes = base64.b64decode(body.image_base64.split(",")[-1])
            image = decode_image(image_bytes)
            students_data = [s.model_dump() for s in body.enrolled_students]
            if body.threshold is not None:
                active_threshold = body.threshold
        else:
            raise HTTPException(status_code=400, detail="Missing image or enrolled students data.")

        image = resize_if_larger(image, max_dim=1600)
        h, w = image.shape[:2]

        detected_faces = pipeline.detect_faces(image, score_threshold=0.50)

        recognized_list = []
        unknown_faces_list = []
        seen_student_ids = set()

        for idx, face in enumerate(detected_faces):
            box = face["box"]
            face_score = face["score"]
            embedding = pipeline.extract_embedding(image, face["raw_face"])

            best_match_id = None
            best_match_name = None
            best_similarity = -1.0

            # Compare against enrolled students
            for student in students_data:
                s_id = student.get("student_id")
                s_name = student.get("student_name", "Student")
                s_embeddings = student.get("embeddings", [])

                for enrolled_emb in s_embeddings:
                    sim = cosine_similarity(embedding, enrolled_emb)
                    if sim > best_similarity:
                        best_similarity = sim
                        best_match_id = s_id
                        best_match_name = s_name

            # Crop face for visualization or unknown face saving
            cropped_img = pipeline.crop_face(image, box, margin=0.15)
            crop_jpeg = encode_image_to_jpeg(cropped_img, quality=85)
            crop_base64 = "data:image/jpeg;base64," + base64.b64encode(crop_jpeg).decode("utf-8")

            if best_similarity >= active_threshold and best_match_id is not None:
                # If student was already recognized by a previous face, only update if higher similarity
                if best_match_id not in seen_student_ids:
                    seen_student_ids.add(best_match_id)
                    recognized_list.append({
                        "student_id": best_match_id,
                        "student_name": best_match_name,
                        "similarity": round(best_similarity, 4),
                        "confidence": round(face_score, 4),
                        "status": "recognized",
                        "box": box,
                        "face_crop": crop_base64
                    })
                else:
                    # Duplicate appearance in same frame with lower confidence, track as reviewed
                    recognized_list.append({
                        "student_id": best_match_id,
                        "student_name": best_match_name,
                        "similarity": round(best_similarity, 4),
                        "confidence": round(face_score, 4),
                        "status": "duplicate_candidate",
                        "box": box,
                        "face_crop": crop_base64
                    })
            else:
                # Unknown face detected
                unknown_faces_list.append({
                    "face_index": idx + 1,
                    "similarity": round(best_similarity, 4) if best_similarity > 0 else 0.0,
                    "confidence": round(face_score, 4),
                    "status": "unknown",
                    "box": box,
                    "embedding": embedding,
                    "face_crop": crop_base64
                })

        return {
            "success": True,
            "total_faces_detected": len(detected_faces),
            "recognized_count": len([r for r in recognized_list if r["status"] == "recognized"]),
            "unknown_count": len(unknown_faces_list),
            "threshold_used": active_threshold,
            "image_dimensions": {"width": w, "height": h},
            "recognized": recognized_list,
            "unknown": unknown_faces_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare-faces")
async def compare_faces(
    file1: Optional[UploadFile] = File(None),
    file2: Optional[UploadFile] = File(None),
    body: Optional[CompareEmbeddingsRequest] = Body(None)
):
    try:
        threshold = DEFAULT_THRESHOLD
        if body is not None:
            if body.threshold is not None:
                threshold = body.threshold
            sim = cosine_similarity(body.embedding1, body.embedding2)
            return {
                "similarity": round(sim, 4),
                "is_match": sim >= threshold,
                "threshold": threshold
            }

        if file1 is None or file2 is None:
            raise HTTPException(status_code=400, detail="Two files or embeddings required.")

        img1 = decode_image(await file1.read())
        img2 = decode_image(await file2.read())

        faces1 = pipeline.detect_faces(img1)
        faces2 = pipeline.detect_faces(img2)

        if len(faces1) == 0 or len(faces2) == 0:
            raise HTTPException(status_code=400, detail="Faces could not be detected in one or both images.")

        emb1 = pipeline.extract_embedding(img1, faces1[0]["raw_face"])
        emb2 = pipeline.extract_embedding(img2, faces2[0]["raw_face"])

        sim = cosine_similarity(emb1, emb2)
        return {
            "similarity": round(sim, 4),
            "is_match": sim >= threshold,
            "threshold": threshold
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/evaluate-model")
async def evaluate_model(request: EvaluationRequest):
    try:
        report = evaluate_thresholds(request.pairs, request.thresholds)
        return {
            "success": True,
            "report": report
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
