---
title: OTDR CNN-LSTM Fault Detection
emoji: "📡"
colorFrom: blue
colorTo: red
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# OTDR CNN-LSTM Flask Deployment

Flask API dan web form untuk prediksi gangguan fiber optik berbasis model CNN-LSTM Single-Input.

## Struktur utama

```text
app.py
inference.py
models/
templates/
static/
tests/sample_request.json
```

## File model wajib

```text
models/best_cnn_lstm_single_input.keras
models/cnn_lstm_single_input_scaler.joblib
models/cnn_lstm_single_input_metadata.joblib
```

## Menjalankan lokal

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Buka:

```text
http://127.0.0.1:5000
```

## Menjalankan dengan Docker

```bash
docker build -t otdr-flask-hf .
docker run --rm -p 7860:7860 otdr-flask-hf
```

Buka:

```text
http://127.0.0.1:7860
```

## Deploy ke Hugging Face Spaces

1. Buat Space baru di Hugging Face.
2. Pilih SDK: `Docker`.
3. Upload semua isi folder ini ke repository Space.
4. Pastikan file model ada di folder `models/`.
5. Tunggu proses build selesai, lalu buka URL Space.

Kalau memakai Git:

```bash
git init
git lfs install
git lfs track "*.keras" "*.joblib"
git add .
git commit -m "Deploy OTDR Flask app to Hugging Face Space"
git branch -M main
git remote add origin https://huggingface.co/spaces/USERNAME/NAMA_SPACE
git push -u origin main
```

## Endpoint

| Endpoint | Method | Fungsi |
|---|---|---|
| `/` | GET | Web form prediksi |
| `/health` | GET | Status API dan file model |
| `/features` | GET | Daftar fitur input |
| `/classes` | GET | Daftar label kelas |
| `/predict` | POST | Prediksi fault OTDR |

## Test API

```bash
curl -X POST http://127.0.0.1:5000/predict ^
  -H "Content-Type: application/json" ^
  -d @tests/sample_request.json
```

Untuk Linux atau Mac, ganti `^` dengan `\`.
