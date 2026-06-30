# OTDR Fiber Fault Detection

Proyek riset *machine learning* untuk mengklasifikasikan gangguan pada jaringan fiber optik dari data **Optical Time-Domain Reflectometer (OTDR)**. Repository ini mencakup dataset, notebook eksperimen model klasik dan CNN-LSTM, analisis perbandingan performa, artefak evaluasi, serta aplikasi web/API Flask untuk inferensi menggunakan model terbaik.

Model deployment menerima 31 fitur (`SNR` dan `P1`–`P30`) dan mengeluarkan jenis gangguan, confidence, probabilitas setiap kelas, rekomendasi pemeriksaan, dan waktu inferensi.

## Kelas yang diprediksi

| ID | Label |
|---:|---|
| 0 | Normal |
| 1 | Fiber eavesdropping |
| 2 | Bad splice |
| 3 | Fiber bending |
| 4 | Dirty connectors |
| 5 | Fiber cut |
| 6 | PC connector |
| 7 | Reflectors |

## Ringkasan hasil

Evaluasi tersimpan di `reports/final_model_comparison_all_models.csv`. Berdasarkan metrik tersebut, CNN-LSTM memberi akurasi tertinggi dan dipilih sebagai model deployment.

| Model | Accuracy | Macro F1 | Macro ROC-AUC |
|---|---:|---:|---:|
| CNN-LSTM | **0.8716** | **0.8601** | **0.9904** |
| Random Forest | 0.8677 | 0.8494 | 0.9896 |
| Soft Voting Ensemble | 0.8529 | 0.8375 | 0.9843 |
| SVM | 0.8399 | 0.8243 | 0.9847 |
| Logistic Regression | 0.6387 | 0.5814 | 0.9254 |

Angka di atas berasal dari hasil eksperimen yang sudah tersimpan, bukan hasil pelatihan ulang saat aplikasi dijalankan.

## Alur proyek

```text
OTDR_data.csv
      |
      v
Pembersihan dan eksplorasi data
      |
      +--> RF / SVM / Logistic Regression / Soft Voting
      |
      +--> CNN-LSTM single-input (SNR + P1-P30)
                 |
                 v
       Evaluasi dan perbandingan model
                 |
                 v
       Artefak model + scaler + metadata
                 |
                 v
         Flask API dan web interface
```

## Struktur repository

```text
.
├── 02_ml_rf_svm_lr_soft_voting_otdr.ipynb   # Model ML klasik dan ensemble
├── CNN_LSTM_OTDR_Article_Version.ipynb       # Pelatihan/evaluasi CNN-LSTM
├── comparison.ipynb                          # Perbandingan seluruh model
├── OTDR_data.csv                             # Dataset utama (Git LFS)
├── requirements-notebook.txt                 # Dependensi eksperimen
├── reports/                                  # Metrik, tabel, dan visualisasi
├── tes/feature_importance/                   # Hasil analisis importance fitur
├── LAPORAN_DEPLOYMENT_OTDR_FLASK_CNN_LSTM.md # Laporan deployment terperinci
└── otdr-flask-deployment/
    ├── app.py                                # Route Flask
    ├── inference.py                          # Validasi, load model, inferensi
    ├── models/                               # Model aktif, scaler, metadata
    ├── templates/ dan static/                # Antarmuka web
    ├── tests/sample_request.json             # Contoh payload
    ├── requirements.txt                      # Dependensi runtime
    ├── Dockerfile                            # Image deployment
    └── Procfile                              # PaaS/gunicorn entry point
```

Folder `models/` di root sengaja tidak disimpan. Isinya merupakan artefak eksperimen berukuran besar yang dapat dibuat ulang dari notebook. Hanya tiga artefak kecil yang dibutuhkan aplikasi disimpan di `otdr-flask-deployment/models/`:

- `best_cnn_lstm_single_input.keras`
- `cnn_lstm_single_input_scaler.joblib`
- `cnn_lstm_single_input_metadata.joblib`

## Dataset

`OTDR_data.csv` berisi **125.832 baris** dan **36 kolom** pada data mentah:

- `SNR`: signal-to-noise ratio;
- `P1`–`P30`: sampel/fitur daya sinyal OTDR;
- `Class`: target kelas 0–7;
- `Position`, `Reflectance`, dan `loss`: atribut event OTDR;
- satu kolom indeks tanpa nama dari proses ekspor CSV.

Setelah tahap pembersihan pada analisis feature importance, tercatat 119.008 observasi. Aplikasi deployment hanya menggunakan `SNR` dan `P1`–`P30`, sesuai input model CNN-LSTM dan untuk menghindari ketergantungan pada atribut event tambahan.

Karena file dataset sekitar 71 MiB, repository memakai **Git LFS**. Jalankan `git lfs install` sebelum clone/push agar file tersedia secara benar.

## Menjalankan notebook

Prasyarat yang direkomendasikan: Python 3.11, Git LFS, dan RAM yang cukup untuk memuat dataset/model.

```powershell
git lfs install
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-notebook.txt
jupyter lab
```

Urutan reproduksi eksperimen:

1. Jalankan `02_ml_rf_svm_lr_soft_voting_otdr.ipynb` untuk model klasik.
2. Jalankan `CNN_LSTM_OTDR_Article_Version.ipynb` untuk CNN-LSTM.
3. Jalankan `comparison.ipynb` setelah hasil kedua eksperimen tersedia.

Notebook menghasilkan ulang folder `models/` dan memperbarui berkas di `reports/`. Waktu serta metrik dapat sedikit berubah menurut hardware, versi library, dan random seed.

## Menjalankan aplikasi Flask

```powershell
cd otdr-flask-deployment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Buka `http://127.0.0.1:5000`. Untuk mode produksi, gunakan gunicorn di Linux/container; server bawaan Flask hanya untuk pengembangan.

### Endpoint API

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/` | Form prediksi berbasis web |
| `GET` | `/health` | Status API dan ketersediaan artefak |
| `GET` | `/features` | Daftar serta jumlah fitur input |
| `GET` | `/classes` | Mapping kelas model |
| `POST` | `/predict` | Prediksi satu sampel OTDR |

Contoh pengujian di PowerShell:

```powershell
curl.exe -X POST http://127.0.0.1:5000/predict `
  -H "Content-Type: application/json" `
  --data-binary "@tests/sample_request.json"
```

Respons sukses memiliki bentuk berikut:

```json
{
  "status": "success",
  "data": {
    "predicted_class": 3,
    "fault_name": "Fiber bending",
    "confidence": 0.8161,
    "probabilities": {},
    "recommendation": "Cek jalur kabel dan perbaiki radius bending sesuai standar instalasi.",
    "delay_seconds": 0.36
  }
}
```

## Konfigurasi environment

Semua variabel bersifat opsional.

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `5000` | Port saat menjalankan `python app.py` |
| `FLASK_DEBUG` | `1` | Set `0` pada production |
| `OTDR_MODEL_DIR` | `models/` | Direktori seluruh artefak |
| `OTDR_MODEL_PATH` | `models/best_cnn_lstm_single_input.keras` | Lokasi model Keras |
| `OTDR_SCALER_PATH` | `models/cnn_lstm_single_input_scaler.joblib` | Lokasi scaler |
| `OTDR_METADATA_PATH` | `models/cnn_lstm_single_input_metadata.joblib` | Lokasi metadata |

## Docker

```powershell
cd otdr-flask-deployment
docker build -t otdr-fault-detection .
docker run --rm -p 7860:7860 otdr-fault-detection
```

Buka `http://127.0.0.1:7860`. Container menjalankan satu worker gunicorn agar model TensorFlow tidak dimuat berkali-kali ke memori.

## Menyiapkan push ke GitHub

Repository sudah dikonfigurasi pada branch `main` dan dataset sudah ditandai untuk Git LFS. Buat repository kosong di GitHub, lalu:

```powershell
git add .
git commit -m "Initial commit: OTDR fault detection"
git remote add origin https://github.com/USERNAME/NAMA-REPOSITORY.git
git push -u origin main
```

Pastikan kuota Git LFS akun GitHub mencukupi. Jangan menambahkan ulang artefak model klasik di root; beberapa di antaranya berukuran 472–969 MiB dan melebihi batas file GitHub biasa.

## Catatan keamanan dan batasan

- Hasil model adalah bantuan analisis, bukan pengganti verifikasi teknisi dan pengukuran OTDR lapangan.
- Input divalidasi sebagai angka dan harus memuat seluruh 31 fitur yang diminta model; field tambahan diabaikan.
- File `.joblib` menggunakan mekanisme serialisasi Python; hanya muat artefak dari sumber tepercaya.
- CORS saat ini diaktifkan untuk semua origin. Batasi origin sebelum membuka API publik.
- Endpoint `/predict` belum memiliki autentikasi atau rate limiting.
- Jangan menjalankan Flask debug mode pada production.

Dokumentasi deployment yang lebih rinci tersedia di `LAPORAN_DEPLOYMENT_OTDR_FLASK_CNN_LSTM.md` dan `otdr-flask-deployment/README.md`.
