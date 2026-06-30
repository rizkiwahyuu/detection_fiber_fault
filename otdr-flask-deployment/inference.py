import os
import time
from typing import Any


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.getenv("OTDR_MODEL_DIR", os.path.join(BASE_DIR, "models"))

MODEL_PATH = os.getenv(
    "OTDR_MODEL_PATH",
    os.path.join(MODEL_DIR, "best_cnn_lstm_single_input.keras"),
)
SCALER_PATH = os.getenv(
    "OTDR_SCALER_PATH",
    os.path.join(MODEL_DIR, "cnn_lstm_single_input_scaler.joblib"),
)
METADATA_PATH = os.getenv(
    "OTDR_METADATA_PATH",
    os.path.join(MODEL_DIR, "cnn_lstm_single_input_metadata.joblib"),
)

DEFAULT_FEATURE_COLUMNS = ["SNR"] + [f"P{i}" for i in range(1, 31)]
DEFAULT_CLASS_LABELS = {
    0: "Normal",
    1: "Fiber eavesdropping",
    2: "Bad splice",
    3: "Fiber bending",
    4: "Dirty connectors",
    5: "Fiber cut",
    6: "PC connector",
    7: "Reflectors",
}

_model = None
_scaler = None
_metadata = None
_feature_columns = DEFAULT_FEATURE_COLUMNS
_class_labels = DEFAULT_CLASS_LABELS


def _load_metadata() -> dict[str, Any]:
    global _metadata, _feature_columns, _class_labels

    if _metadata is not None:
        return _metadata

    import joblib

    _metadata = joblib.load(METADATA_PATH)
    _feature_columns = _extract_feature_columns(_metadata)
    _class_labels = _extract_class_labels(_metadata)
    return _metadata


def _load_artifacts() -> tuple[Any, Any, dict[str, Any]]:
    global _model, _scaler

    metadata = _load_metadata()

    if _scaler is None:
        import joblib

        _scaler = joblib.load(SCALER_PATH)

    if _model is None:
        import tensorflow as tf

        _model = tf.keras.models.load_model(MODEL_PATH)

    return _model, _scaler, metadata


def _extract_feature_columns(metadata: Any) -> list[str]:
    if isinstance(metadata, dict):
        for key in ("feature_columns", "features", "input_features", "feature_names"):
            value = metadata.get(key)
            if value:
                return [str(item) for item in value]

    return DEFAULT_FEATURE_COLUMNS


def _extract_class_labels(metadata: Any) -> dict[int, str]:
    labels = None

    if isinstance(metadata, dict):
        for key in ("class_labels", "class_names", "target_names", "labels"):
            if metadata.get(key) is not None:
                labels = metadata[key]
                break

        encoder = metadata.get("label_encoder")
        if labels is None and hasattr(encoder, "classes_"):
            labels = encoder.classes_

    if isinstance(labels, dict):
        return {int(key): str(value) for key, value in labels.items()}

    if isinstance(labels, (list, tuple)):
        return {index: str(label) for index, label in enumerate(labels)}

    return DEFAULT_CLASS_LABELS


def get_feature_columns() -> list[str]:
    try:
        _load_metadata()
    except Exception:
        return DEFAULT_FEATURE_COLUMNS

    return list(_feature_columns)


def get_class_labels() -> dict[int, str]:
    try:
        _load_metadata()
    except Exception:
        return dict(DEFAULT_CLASS_LABELS)

    return dict(_class_labels)


def fault_recommendation(class_id: int) -> str:
    recommendations = {
        0: "Jaringan berjalan normal. Lanjutkan monitoring berkala.",
        1: "Cek potensi penyadapan, aktifkan pengamanan kanal, dan lakukan inspeksi fisik.",
        2: "Cek titik sambungan fiber dan lakukan resplicing jika splice loss tinggi.",
        3: "Cek jalur kabel dan perbaiki radius bending sesuai standar instalasi.",
        4: "Bersihkan konektor menggunakan cleaning kit atau ganti konektor jika loss tetap tinggi.",
        5: "Lakukan reroute ke backup link, buat tiket prioritas, dan lakukan perbaikan fisik kabel.",
        6: "Bersihkan atau ganti PC connector, lalu lakukan pengukuran ulang dengan OTDR.",
        7: "Gunakan reflector sebagai penanda cabang PON dan validasi posisi cabang pada peta jaringan.",
    }
    return recommendations.get(class_id, "Kelas tidak dikenal. Lakukan inspeksi manual.")


def health_status() -> dict[str, Any]:
    files = {
        "model": os.path.exists(MODEL_PATH),
        "scaler": os.path.exists(SCALER_PATH),
        "metadata": os.path.exists(METADATA_PATH),
    }

    return {
        "ready": all(files.values()),
        "files": files,
        "paths": {
            "model": MODEL_PATH,
            "scaler": SCALER_PATH,
            "metadata": METADATA_PATH,
        },
        "loaded": {
            "model": _model is not None,
            "scaler": _scaler is not None,
            "metadata": _metadata is not None,
        },
        "total_features": len(get_feature_columns()),
    }


def validate_input(data: dict[str, Any]) -> dict[str, float]:
    if not isinstance(data, dict):
        raise ValueError("Input harus berupa object JSON.")

    feature_columns = get_feature_columns()
    missing = [column for column in feature_columns if column not in data]
    if missing:
        raise ValueError(f"Fitur berikut belum tersedia: {missing}")

    values: dict[str, float] = {}
    invalid = []

    for column in feature_columns:
        try:
            values[column] = float(data[column])
        except (TypeError, ValueError):
            invalid.append(column)

    if invalid:
        raise ValueError(f"Fitur berikut harus berupa angka: {invalid}")

    return values


def predict_single(data: dict[str, Any]) -> dict[str, Any]:
    import numpy as np

    values = validate_input(data)
    model, scaler, _ = _load_artifacts()

    start_time = time.time()
    feature_columns = get_feature_columns()

    x_raw = np.array([[values[column] for column in feature_columns]], dtype=float)
    x_scaled = scaler.transform(x_raw)
    x_input = x_scaled.reshape((x_scaled.shape[0], x_scaled.shape[1], 1))

    probabilities = model.predict(x_input, verbose=0)[0]
    predicted_class = int(np.argmax(probabilities))
    confidence = float(np.max(probabilities))
    delay = time.time() - start_time

    class_labels = get_class_labels()
    probability_detail = {}
    for index, probability in enumerate(probabilities):
        label = class_labels.get(index, f"Class {index}")
        probability_detail[label] = float(probability)

    return {
        "predicted_class": predicted_class,
        "fault_name": class_labels.get(predicted_class, f"Class {predicted_class}"),
        "confidence": confidence,
        "probabilities": probability_detail,
        "recommendation": fault_recommendation(predicted_class),
        "delay_seconds": delay,
    }
