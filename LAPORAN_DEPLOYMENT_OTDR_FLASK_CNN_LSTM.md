# Laporan Deployment Aplikasi OTDR Fiber Fault Detection Berbasis CNN-LSTM

Tanggal penyusunan: 24 Juni 2026

Nama proyek: OTDR Fiber Fault Detection

Folder deployment: `otdr-flask-deployment/`

Model yang dideploy: CNN-LSTM Single-Input
Platform deployment yang disiapkan: Docker / Hugging Face Spaces, serta kompatibel dengan PaaS berbasis Procfile seperti Railway

---

## 1. Ringkasan Eksekutif

Deployment ini bertujuan mengubah model klasifikasi gangguan fiber optik berbasis data Optical Time Domain Reflectometer (OTDR) dari bentuk notebook/model file menjadi aplikasi yang dapat digunakan melalui web form dan API. Aplikasi dibangun menggunakan Flask sebagai backend, Gunicorn sebagai production WSGI server, dan Docker sebagai media deployment utama.

Sistem menerima input berupa 31 fitur OTDR, yaitu `SNR` dan `P1` sampai `P30`. Input tersebut divalidasi, diskalakan menggunakan scaler hasil training, dibentuk ulang ke format input CNN-LSTM, lalu diprediksi menggunakan model Keras. Output sistem berupa kelas gangguan, confidence score, probabilitas tiap kelas, delay prediksi, dan rekomendasi tindakan awal.

Berdasarkan hasil evaluasi model, CNN-LSTM menghasilkan accuracy sebesar 87,16%, macro F1-score sebesar 86,01%, dan macro ROC-AUC sebesar 99,04%. Hasil ini menunjukkan model layak digunakan sebagai layanan prediksi awal, dengan catatan tetap diperlukan validasi lapangan dan monitoring performa setelah deployment.

---

## 2. Latar Belakang

Gangguan pada jaringan fiber optik dapat disebabkan oleh berbagai kondisi, seperti fiber bending, fiber cut, dirty connector, bad splice, reflector, atau indikasi eavesdropping. Data OTDR dapat membantu mendeteksi pola gangguan tersebut melalui sinyal yang direkam pada titik-titik pengukuran.

Sebelum deployment, model hanya dapat digunakan di lingkungan eksperimen atau notebook. Agar model dapat dimanfaatkan oleh pengguna operasional, model perlu disediakan sebagai layanan yang mudah diakses. Oleh karena itu dibuat aplikasi Flask yang menyediakan:

1. Form web untuk input manual data OTDR.
2. API prediksi untuk integrasi dengan dashboard atau sistem eksternal.
3. Endpoint pengecekan status layanan dan artifact model.
4. Struktur deployment yang dapat dijalankan secara lokal maupun containerized.

---

## 3. Tujuan Deployment

Tujuan deployment adalah:

1. Menyediakan layanan prediksi gangguan fiber optik berbasis CNN-LSTM.
2. Membuat model dapat digunakan di luar notebook.
3. Menyediakan endpoint API untuk integrasi sistem.
4. Menyediakan web form untuk pengujian dan penggunaan manual.
5. Mengemas aplikasi dalam format yang siap dideploy menggunakan Docker.
6. Mendokumentasikan dependensi, struktur folder, endpoint, dan hasil pengujian deployment.

---

## 4. Ruang Lingkup

Ruang lingkup deployment mencakup:

1. Backend Flask untuk menerima request dan mengembalikan response JSON.
2. Modul inferensi untuk load model, scaler, metadata, validasi input, preprocessing, prediksi, dan rekomendasi.
3. Web interface untuk input OTDR dan visualisasi hasil prediksi.
4. Dockerfile untuk deployment container.
5. Procfile untuk opsi deployment pada platform PaaS.
6. Sample request untuk pengujian API.
7. Dokumentasi teknis deployment.

Deployment ini belum mencakup:

1. Autentikasi dan otorisasi user.
2. Penyimpanan riwayat prediksi ke database.
3. Monitoring produksi berbasis dashboard.
4. CI/CD otomatis.
5. Endpoint batch prediction untuk upload CSV.

---

## 5. Struktur Folder Deployment

Struktur utama folder `otdr-flask-deployment/` adalah sebagai berikut:

```text
otdr-flask-deployment/
|-- app.py
|-- inference.py
|-- requirements.txt
|-- Dockerfile
|-- Procfile
|-- runtime.txt
|-- README.md
|-- models/
|   |-- best_cnn_lstm_single_input.keras
|   |-- cnn_lstm_single_input_scaler.joblib
|   `-- cnn_lstm_single_input_metadata.joblib
|-- templates/
|   `-- index.html
|-- static/
|   |-- css/
|   |   `-- style.css
|   |-- js/
|   |   `-- main.js
|   `-- img/
|       `-- infranexia-logo.png
`-- tests/
    `-- sample_request.json
```

Keterangan komponen:

| Komponen | Fungsi |
|---|---|
| `app.py` | Entry point Flask, definisi route web dan API |
| `inference.py` | Logika load artifact, validasi input, preprocessing, prediksi, dan rekomendasi |
| `requirements.txt` | Daftar library Python yang dibutuhkan |
| `Dockerfile` | Konfigurasi container untuk deployment Docker |
| `Procfile` | Konfigurasi start command untuk PaaS seperti Railway |
| `runtime.txt` | Penanda versi Python untuk platform tertentu |
| `models/` | Penyimpanan model, scaler, dan metadata |
| `templates/index.html` | Tampilan web form prediksi |
| `static/css/style.css` | Styling antarmuka web |
| `static/js/main.js` | Logic frontend, dummy data, status API, canvas preview, dan render hasil |
| `tests/sample_request.json` | Contoh payload untuk pengujian endpoint `/predict` |

---

## 6. Artifact Model

Artifact model yang wajib tersedia dalam folder `models/` adalah:

| File | Status | Fungsi |
|---|---:|---|
| `best_cnn_lstm_single_input.keras` | Wajib | Model CNN-LSTM terbaik yang digunakan untuk inference |
| `cnn_lstm_single_input_scaler.joblib` | Wajib | Scaler untuk menyamakan skala input dengan data training |
| `cnn_lstm_single_input_metadata.joblib` | Wajib | Metadata fitur dan label kelas |

Hasil inventarisasi menunjukkan ketiga artifact wajib tersedia di folder deployment.

Ukuran artifact yang terdeteksi:

| File | Perkiraan ukuran |
|---|---:|
| `best_cnn_lstm_single_input.keras` | 0,47 MB |
| `cnn_lstm_single_input_scaler.joblib` | kurang dari 0,01 MB |
| `cnn_lstm_single_input_metadata.joblib` | kurang dari 0,01 MB |

---

## 7. Spesifikasi Model

Model yang digunakan adalah CNN-LSTM Single-Input. Model menerima satu rangkaian fitur numerik yang terdiri dari:

```text
SNR, P1, P2, P3, ..., P30
```

Jumlah fitur input: 31 fitur
Bentuk input model setelah preprocessing:

```text
(batch_size, 31, 1)
```

Alur preprocessing:

1. Menerima input JSON.
2. Memastikan input berupa object JSON.
3. Memastikan seluruh fitur wajib tersedia.
4. Mengonversi setiap nilai fitur ke tipe float.
5. Mengurutkan fitur sesuai urutan training.
6. Melakukan scaling menggunakan scaler joblib.
7. Melakukan reshape ke format input CNN-LSTM.
8. Menjalankan prediksi dengan model Keras.
9. Mengambil kelas dengan probabilitas tertinggi.
10. Mengembalikan hasil prediksi dan rekomendasi tindakan.

---

## 8. Mapping Kelas

Model menghasilkan delapan kelas gangguan:

| Class | Label |
|---:|---|
| 0 | Normal |
| 1 | Fiber eavesdropping |
| 2 | Bad splice |
| 3 | Fiber bending |
| 4 | Dirty connectors |
| 5 | Fiber cut |
| 6 | PC connector |
| 7 | Reflectors |

Setiap kelas memiliki rekomendasi tindakan awal. Contohnya, jika hasil prediksi adalah `Fiber cut`, sistem memberikan rekomendasi untuk melakukan reroute ke backup link, membuat tiket prioritas, dan melakukan perbaikan fisik kabel.

---

## 9. Arsitektur Aplikasi

Arsitektur deployment dapat dijelaskan sebagai berikut:

```text
User / Dashboard
      |
      v
Flask route (/predict)
      |
      v
Validasi JSON dan fitur
      |
      v
Scaler preprocessing
      |
      v
Reshape input CNN-LSTM
      |
      v
Model Keras (.keras)
      |
      v
Response JSON:
class, fault_name, confidence, probabilities, recommendation, delay
```

Aplikasi menggunakan lazy loading pada modul inferensi. Metadata, scaler, dan model baru dimuat ketika dibutuhkan, sehingga startup aplikasi lebih ringan dibandingkan jika semua artifact langsung dimuat pada saat import awal.

---

## 10. Endpoint API

Endpoint yang tersedia:

| Endpoint | Method | Fungsi |
|---|---|---|
| `/` | GET | Menampilkan web form prediksi |
| `/health` | GET | Mengecek status API dan ketersediaan file model |
| `/features` | GET | Mengembalikan daftar fitur input |
| `/classes` | GET | Mengembalikan daftar label kelas |
| `/predict` | POST | Melakukan prediksi fault OTDR |

### 10.1 Endpoint `/health`

Endpoint ini mengembalikan status aplikasi dan ketersediaan artifact:

```json
{
  "status": "healthy",
  "message": "OTDR CNN-LSTM Flask API is running",
  "data": {
    "ready": true,
    "files": {
      "model": true,
      "scaler": true,
      "metadata": true
    },
    "total_features": 31
  }
}
```

### 10.2 Endpoint `/features`

Endpoint ini mengembalikan daftar fitur input:

```json
{
  "feature_columns": ["SNR", "P1", "P2", "...", "P30"],
  "total_features": 31
}
```

### 10.3 Endpoint `/classes`

Endpoint ini mengembalikan mapping kelas:

```json
{
  "class_labels": {
    "0": "Normal",
    "1": "Fiber eavesdropping",
    "2": "Bad splice",
    "3": "Fiber bending",
    "4": "Dirty connectors",
    "5": "Fiber cut",
    "6": "PC connector",
    "7": "Reflectors"
  }
}
```

### 10.4 Endpoint `/predict`

Endpoint ini menerima JSON dengan 31 fitur.

Contoh input:

```json
{
  "SNR": 10.09,
  "P1": 0.98,
  "P2": 0.76,
  "P3": 0.86,
  "P4": 1.0,
  "P5": 0.83,
  "P6": 0.79,
  "P7": 0.8,
  "P8": 0.76,
  "P9": 0.72,
  "P10": 0.84,
  "P11": 0.73,
  "P12": 0.88,
  "P13": 0.81,
  "P14": 0.8,
  "P15": 0.78,
  "P16": 0.76,
  "P17": 0.74,
  "P18": 0.71,
  "P19": 0.69,
  "P20": 0.66,
  "P21": 0.64,
  "P22": 0.61,
  "P23": 0.59,
  "P24": 0.56,
  "P25": 0.54,
  "P26": 0.51,
  "P27": 0.49,
  "P28": 0.46,
  "P29": 0.44,
  "P30": 0.41
}
```

Format output sukses:

```json
{
  "status": "success",
  "data": {
    "predicted_class": 3,
    "fault_name": "Fiber bending",
    "confidence": 0.91,
    "probabilities": {
      "Normal": 0.01,
      "Fiber bending": 0.91
    },
    "recommendation": "Cek jalur kabel dan perbaiki radius bending sesuai standar instalasi.",
    "delay_seconds": 0.0342
  }
}
```

---

## 11. Web Interface

Deployment menyediakan web interface pada endpoint `/`. Fitur utama antarmuka:

1. Form input `SNR` dan `P1` sampai `P30`.
2. Tombol pengisian data dummy untuk pengujian cepat.
3. Tombol reset form.
4. Preview sinyal OTDR menggunakan canvas.
5. Status API berdasarkan endpoint `/health`.
6. Panel hasil prediksi berisi fault name, class, confidence, delay, rekomendasi, dan probabilitas kelas.
7. Tampilan responsif untuk desktop dan layar kecil.

Antarmuka ini dapat digunakan untuk demo, validasi manual, dan pengujian awal sebelum integrasi dengan dashboard produksi.

---

## 12. Konfigurasi Environment

Dependensi aplikasi berdasarkan `requirements.txt`:

| Library | Versi |
|---|---:|
| Flask | 3.0.3 |
| flask-cors | 4.0.1 |
| gunicorn | 22.0.0 |
| numpy | 1.26.4 |
| scikit-learn | 1.5.1 |
| joblib | 1.4.2 |
| tensorflow-cpu | 2.16.1 |

Runtime yang ditentukan:

```text
python-3.11
```

Penggunaan Python 3.11 penting karena TensorFlow memiliki kompatibilitas versi Python yang lebih ketat. Pada pengujian lokal saat laporan ini dibuat, Python yang aktif adalah Python 3.13 dari Laragon, sehingga dependency deployment belum sepenuhnya cocok dengan runtime yang ditargetkan.

---

## 13. Konfigurasi Docker

Deployment Docker menggunakan base image:

```text
python:3.11-slim
```

Konfigurasi utama Docker:

1. Menjalankan aplikasi sebagai user non-root.
2. Menggunakan `PIP_NO_CACHE_DIR=1` agar image lebih ringkas.
3. Mengatur `FLASK_DEBUG=0` untuk mode produksi.
4. Mengatur `PORT=7860`.
5. Menginstal dependency dari `requirements.txt`.
6. Mengekspos port `7860`.
7. Menjalankan aplikasi dengan Gunicorn.

Command produksi pada Dockerfile:

```bash
gunicorn app:app --bind 0.0.0.0:7860 --workers 1 --threads 2 --timeout 120
```

Konfigurasi ini sesuai untuk deployment awal di Hugging Face Spaces Docker SDK. Jumlah worker dibuat konservatif karena TensorFlow dapat menggunakan memori cukup besar.

---

## 14. Konfigurasi PaaS Berbasis Procfile

File `Procfile` berisi:

```text
web: gunicorn app:app --bind 0.0.0.0:$PORT
```

Konfigurasi ini memungkinkan aplikasi dijalankan pada platform seperti Railway atau Heroku-style PaaS yang menyediakan environment variable `PORT`.

---

## 15. Hasil Evaluasi Model

### 15.1 Performa CNN-LSTM

Berdasarkan file evaluasi `reports/cnn_lstm_single_input_evaluation.csv`, performa model CNN-LSTM adalah:

| Metrik | Nilai |
|---|---:|
| Accuracy | 87,16% |
| Precision macro | 86,21% |
| Recall macro | 85,93% |
| F1-score macro | 86,01% |
| ROC-AUC macro | 99,04% |
| Training time | 999,47 detik |
| Testing delay | 3,45 detik |

### 15.2 Perbandingan dengan Model Lain

| Model | Accuracy | Precision Macro | Recall Macro | F1 Macro | ROC-AUC Macro | Testing Delay |
|---|---:|---:|---:|---:|---:|---:|
| Logistic Regression | 63,87% | 59,61% | 60,57% | 58,14% | 92,54% | 0,02 s |
| SVM | 83,99% | 83,33% | 82,17% | 82,43% | 98,47% | 105,51 s |
| Random Forest | 86,77% | 87,32% | 84,55% | 84,94% | 98,96% | 0,28 s |
| Soft Voting Ensemble | 85,29% | 84,92% | 83,44% | 83,75% | 98,43% | 113,10 s |
| CNN-LSTM | 87,16% | 86,21% | 85,93% | 86,01% | 99,04% | 3,45 s |

CNN-LSTM memiliki accuracy dan F1-score tertinggi pada eksperimen ini. Random Forest memiliki delay pengujian lebih rendah, sehingga dapat dipertimbangkan sebagai alternatif jika prioritas utama deployment adalah kecepatan inference.

### 15.3 Classification Report CNN-LSTM

| Kelas | Precision | Recall | F1-score | Support |
|---|---:|---:|---:|---:|
| Normal | 0,79 | 0,82 | 0,80 | 4813 |
| Fiber eavesdropping | 0,95 | 0,94 | 0,94 | 4800 |
| Bad splice | 0,70 | 0,65 | 0,67 | 2754 |
| Fiber bending | 0,91 | 0,91 | 0,91 | 4800 |
| Dirty connectors | 0,93 | 0,91 | 0,92 | 4800 |
| Fiber cut | 0,78 | 0,85 | 0,82 | 4155 |
| PC connector | 0,94 | 0,87 | 0,90 | 4800 |
| Reflectors | 0,90 | 0,93 | 0,92 | 4781 |

Kelas dengan performa paling rendah adalah `Bad splice`, dengan F1-score 0,67. Hal ini perlu menjadi perhatian dalam interpretasi hasil prediksi, terutama jika sistem digunakan untuk mendukung keputusan operasional.

---

## 16. Hasil Pengujian Deployment Lokal

Pengujian dilakukan menggunakan Flask test client pada folder `otdr-flask-deployment/`.

### 16.1 Endpoint yang Berhasil Diuji

| Pengujian | Status | Hasil |
|---|---:|---|
| `GET /` | 200 | Web interface berhasil dirender |
| `GET /health` | 200 | API mengembalikan status `healthy` |
| `GET /features` | 200 | API mengembalikan 31 fitur |
| `GET /classes` | 200 | API mengembalikan 8 kelas |

Hasil `/health` menunjukkan file model, scaler, dan metadata tersedia:

```text
model: true
scaler: true
metadata: true
ready: true
total_features: 31
```

### 16.2 Endpoint yang Belum Berhasil Diuji Penuh

Pengujian `POST /predict` menggunakan `tests/sample_request.json` menghasilkan status 400 pada environment lokal saat laporan ini dibuat:

```text
No module named 'joblib'
```

Interpretasi:

1. Error ini bukan disebabkan oleh hilangnya artifact model.
2. Error terjadi karena environment Python lokal belum menginstal dependency dari `requirements.txt`.
3. Environment lokal yang aktif terdeteksi menggunakan Python 3.13, sedangkan deployment menargetkan Python 3.11.
4. Prediksi perlu diuji ulang setelah menjalankan instalasi dependency pada Python 3.11 atau menjalankan aplikasi melalui Docker.

Perintah yang disarankan untuk validasi ulang:

```bash
cd otdr-flask-deployment
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Atau menggunakan Docker:

```bash
docker build -t otdr-flask-deployment .
docker run --rm -p 7860:7860 otdr-flask-deployment
```

Setelah server berjalan, uji endpoint:

```bash
curl -X POST http://127.0.0.1:7860/predict ^
  -H "Content-Type: application/json" ^
  -d @tests/sample_request.json
```

---

## 17. Analisis Kesiapan Deployment

### 17.1 Hal yang Sudah Siap

1. Struktur folder deployment sudah rapi.
2. Artifact wajib model, scaler, dan metadata tersedia.
3. API Flask sudah menyediakan endpoint utama.
4. Health check sudah mengecek ketersediaan artifact.
5. Input validation sudah tersedia untuk fitur hilang dan fitur non-numerik.
6. Dockerfile sudah disiapkan untuk deployment container.
7. Gunicorn sudah digunakan sebagai server produksi.
8. Web interface sudah tersedia dan lebih lengkap dari form dasar.
9. CORS sudah diaktifkan sehingga API dapat diakses dari frontend/dashboard lain.

### 17.2 Hal yang Perlu Diperhatikan

1. Pengujian prediksi lokal belum sukses karena dependency lokal belum terpasang.
2. Belum ada autentikasi, sehingga API sebaiknya tidak dibuka publik tanpa perlindungan tambahan.
3. Belum ada rate limiting.
4. Belum ada logging prediksi yang persisten.
5. Belum ada monitoring error dan latency produksi.
6. Belum ada test otomatis untuk endpoint dan validasi payload.
7. Belum ada batch prediction untuk file CSV.
8. Belum ada mekanisme versioning model pada response API.

---

## 18. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Dependency tidak sesuai runtime | Aplikasi gagal menjalankan prediksi | Gunakan Python 3.11 dan instal `requirements.txt` |
| TensorFlow memakai memori besar | Container restart atau lambat | Gunakan `tensorflow-cpu`, worker konservatif, dan pantau memori |
| API terbuka tanpa autentikasi | Penyalahgunaan endpoint | Tambahkan token/API key sebelum publik |
| Prediksi salah untuk kelas tertentu | Keputusan operasional keliru | Tampilkan confidence dan lakukan validasi lapangan |
| Bad splice memiliki F1-score rendah | Risiko false prediction pada kelas tersebut | Tambah data, tuning model, dan evaluasi ulang kelas bad splice |
| Tidak ada log produksi | Sulit audit dan troubleshooting | Simpan log request, response, confidence, dan latency |
| Tidak ada monitoring | Gangguan tidak cepat diketahui | Tambahkan uptime monitoring dan error tracking |

---

## 19. Rekomendasi Pengembangan Lanjutan

Rekomendasi teknis:

1. Jalankan validasi ulang menggunakan Docker agar environment sama dengan target deployment.
2. Tambahkan test otomatis untuk endpoint `/health`, `/features`, `/classes`, dan `/predict`.
3. Tambahkan autentikasi API key untuk endpoint prediksi.
4. Tambahkan logging inference, termasuk timestamp, input summary, predicted class, confidence, dan delay.
5. Tambahkan model version pada response API.
6. Tambahkan endpoint batch prediction untuk upload CSV.
7. Tambahkan monitoring performa dan error.
8. Tambahkan dokumentasi OpenAPI atau Swagger.

Rekomendasi model:

1. Evaluasi ulang kelas `Bad splice` karena F1-score paling rendah.
2. Bandingkan deployment CNN-LSTM dengan Random Forest untuk skenario latency rendah.
3. Tambahkan threshold confidence untuk memberi label "perlu inspeksi manual" jika confidence rendah.
4. Lakukan validasi dengan data lapangan baru setelah aplikasi digunakan.

Rekomendasi operasional:

1. Gunakan Docker sebagai metode deployment utama agar dependency konsisten.
2. Simpan artifact besar menggunakan Git LFS atau object storage jika ukuran model bertambah.
3. Batasi akses API hanya untuk sistem internal atau dashboard resmi.
4. Buat SOP tindak lanjut berdasarkan hasil prediksi masing-masing kelas.

---

## 20. Langkah Deployment yang Direkomendasikan

### 20.1 Deployment Lokal

```bash
cd otdr-flask-deployment
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Akses aplikasi:

```text
http://127.0.0.1:5000
```

### 20.2 Deployment Docker

```bash
cd otdr-flask-deployment
docker build -t otdr-flask-deployment .
docker run --rm -p 7860:7860 otdr-flask-deployment
```

Akses aplikasi:

```text
http://127.0.0.1:7860
```

### 20.3 Deployment Hugging Face Spaces

Langkah deployment:

1. Buat Space baru di Hugging Face.
2. Pilih SDK `Docker`.
3. Upload seluruh isi folder `otdr-flask-deployment/`.
4. Pastikan folder `models/` berisi model, scaler, dan metadata.
5. Tunggu proses build selesai.
6. Buka URL Space dan uji `/health`.
7. Uji `/predict` menggunakan sample request.

### 20.4 Deployment Railway atau PaaS Sejenis

Langkah deployment:

1. Push folder deployment ke repository GitHub.
2. Hubungkan repository ke Railway.
3. Pastikan Railway membaca `Procfile`.
4. Pastikan environment menggunakan Python 3.11.
5. Tunggu build dan deploy selesai.
6. Uji endpoint `/health` dan `/predict`.

---

## 21. Kesimpulan

Deployment aplikasi OTDR Fiber Fault Detection berbasis CNN-LSTM sudah memiliki struktur yang layak untuk digunakan sebagai layanan prediksi berbasis API dan web form. Artifact model, scaler, dan metadata tersedia di folder deployment. Endpoint dasar seperti `/`, `/health`, `/features`, dan `/classes` berhasil diuji pada environment lokal.

Model CNN-LSTM menunjukkan performa terbaik pada eksperimen perbandingan dengan accuracy 87,16%, macro F1-score 86,01%, dan macro ROC-AUC 99,04%. Dengan hasil tersebut, model layak digunakan sebagai sistem pendukung deteksi awal gangguan fiber optik.

Catatan utama dari pengujian lokal adalah endpoint `/predict` belum berhasil dijalankan karena dependency `joblib` belum tersedia pada environment Python aktif. Untuk validasi produksi, aplikasi perlu dijalankan dengan Python 3.11 dan seluruh dependency dari `requirements.txt`, atau menggunakan Docker agar environment sesuai dengan konfigurasi deployment.

Secara keseluruhan, deployment ini siap dilanjutkan ke tahap validasi container, pengujian prediksi end-to-end, dan integrasi dengan dashboard atau sistem operasional.
