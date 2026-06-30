import os

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

from inference import get_class_labels, get_feature_columns, health_status, predict_single


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    @app.route("/", methods=["GET"])
    def home():
        return render_template(
            "index.html",
            feature_columns=get_feature_columns(),
            class_labels=get_class_labels(),
        )

    @app.route("/health", methods=["GET"])
    def health_check():
        status = health_status()
        return jsonify(
            {
                "status": "healthy" if status["ready"] else "degraded",
                "message": "OTDR CNN-LSTM Flask API is running",
                "data": status,
            }
        )

    @app.route("/features", methods=["GET"])
    def get_features():
        feature_columns = get_feature_columns()
        return jsonify(
            {
                "feature_columns": feature_columns,
                "total_features": len(feature_columns),
            }
        )

    @app.route("/classes", methods=["GET"])
    def get_classes():
        return jsonify({"class_labels": get_class_labels()})

    @app.route("/predict", methods=["POST"])
    def predict():
        try:
            payload = request.get_json(silent=True)
            if payload is None:
                return jsonify(
                    {
                        "status": "error",
                        "message": "Request body harus berupa JSON.",
                    }
                ), 400

            data = payload.get("features", payload) if isinstance(payload, dict) else payload
            result = predict_single(data)
            return jsonify({"status": "success", "data": result})

        except Exception as error:
            return jsonify({"status": "error", "message": str(error)}), 400

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
