import numpy as np
from typing import List, Dict, Any, Tuple
from services.similarity import cosine_similarity

def evaluate_thresholds(
    pairs: List[Dict[str, Any]],
    thresholds: List[float] = None
) -> Dict[str, Any]:
    """
    Evaluates face matching across a range of thresholds.
    Each pair contains:
      - 'embedding1': list/array of floats
      - 'embedding2': list/array of floats
      - 'is_same_person': bool (True for genuine, False for imposter)
    Computes:
      - TP, FP, TN, FN
      - Accuracy, Precision, Recall, F1 Score
      - False Acceptance Rate (FAR = FP / (FP + TN))
      - False Rejection Rate (FRR = FN / (FN + TP))
    """
    if thresholds is None:
        thresholds = [round(t, 2) for t in np.arange(0.20, 0.62, 0.02)]

    # Pre-calculate similarities
    similarities = []
    labels = []
    for pair in pairs:
        e1 = np.array(pair["embedding1"], dtype=np.float32)
        e2 = np.array(pair["embedding2"], dtype=np.float32)
        sim = cosine_similarity(e1, e2)
        similarities.append(sim)
        labels.append(bool(pair["is_same_person"]))

    similarities = np.array(similarities)
    labels = np.array(labels)

    total_genuine = int(np.sum(labels == True))
    total_imposter = int(np.sum(labels == False))

    results = []
    best_f1 = -1.0
    optimal_threshold = 0.36

    for th in thresholds:
        preds = similarities >= th

        tp = int(np.sum((preds == True) & (labels == True)))
        fp = int(np.sum((preds == True) & (labels == False)))
        tn = int(np.sum((preds == False) & (labels == False)))
        fn = int(np.sum((preds == False) & (labels == True)))

        total = len(labels)
        accuracy = (tp + tn) / total if total > 0 else 0.0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        far = fp / total_imposter if total_imposter > 0 else 0.0
        frr = fn / total_genuine if total_genuine > 0 else 0.0

        item = {
            "threshold": round(th, 3),
            "tp": tp,
            "fp": fp,
            "tn": tn,
            "fn": fn,
            "accuracy": round(float(accuracy), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "far": round(float(far), 4),
            "frr": round(float(frr), 4)
        }
        results.append(item)

        if f1 > best_f1:
            best_f1 = f1
            optimal_threshold = th

    return {
        "total_pairs_tested": len(pairs),
        "total_genuine_pairs": total_genuine,
        "total_imposter_pairs": total_imposter,
        "optimal_threshold": optimal_threshold,
        "best_f1_score": round(float(best_f1), 4),
        "threshold_evaluations": results
    }
