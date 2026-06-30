const dummyPayload = {
    SNR: 10.09,
    P1: 0.98,
    P2: 0.76,
    P3: 0.86,
    P4: 1.0,
    P5: 0.83,
    P6: 0.79,
    P7: 0.8,
    P8: 0.76,
    P9: 0.72,
    P10: 0.84,
    P11: 0.73,
    P12: 0.88,
    P13: 0.81,
    P14: 0.8,
    P15: 0.78,
    P16: 0.76,
    P17: 0.74,
    P18: 0.71,
    P19: 0.69,
    P20: 0.66,
    P21: 0.64,
    P22: 0.61,
    P23: 0.59,
    P24: 0.56,
    P25: 0.54,
    P26: 0.51,
    P27: 0.49,
    P28: 0.46,
    P29: 0.44,
    P30: 0.41
};

let dummyClickCount = 0;

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}

function setApiStatus(kind, text) {
    const apiStatus = document.getElementById("apiStatus");
    apiStatus.className = `status ${kind}`;
    apiStatus.textContent = text;
}

async function refreshApiStatus() {
    try {
        const response = await fetch("/health");
        const result = await response.json();
        setApiStatus(result.status === "healthy" ? "ok" : "warn", `API ${result.status}`);
    } catch (error) {
        setApiStatus("error", "API offline");
    }
}

function readPayload(form) {
    const payload = {};
    const formData = new FormData(form);

    formData.forEach((value, key) => {
        payload[key] = Number.parseFloat(value);
    });

    return payload;
}

function generateDummyPayload() {
    dummyClickCount += 1;

    const variant = dummyClickCount % 4;
    const payload = {};
    const snrBase = [10.09, 13.4, 8.75, 15.2][variant];
    const slope = [0.018, 0.011, 0.026, 0.008][variant];
    const ripple = [0.035, 0.018, 0.052, 0.025][variant];
    const dropStart = [18, 24, 12, 28][variant];
    const dropSize = [0.05, 0.02, 0.16, 0.0][variant];

    payload.SNR = Number((snrBase + (Math.random() - 0.5) * 1.2).toFixed(2));

    for (let index = 1; index <= 30; index += 1) {
        const baseValue = dummyPayload[`P${index}`] ?? 0.75;
        const trend = 1 - slope * index;
        const wave = Math.sin((index + dummyClickCount) * 0.7) * ripple;
        const noise = (Math.random() - 0.5) * ripple;
        const drop = index >= dropStart ? dropSize : 0;
        const value = Math.max(0.05, Math.min(1.2, baseValue * trend + wave + noise - drop));
        payload[`P${index}`] = Number(value.toFixed(2));
    }

    return payload;
}

function fillSample() {
    const generatedPayload = generateDummyPayload();

    Object.entries(generatedPayload).forEach(([key, value]) => {
        const input = document.getElementById(key);
        if (input) {
            input.value = value;
        }
    });
    drawSignalPreview();
}

function resetResult() {
    document.getElementById("resultPanel").hidden = true;
    document.getElementById("resultMeta").textContent = "Belum ada prediksi";
    drawSignalPreview();
}

function renderProbabilities(probabilities) {
    const probabilityList = document.getElementById("probabilityList");
    probabilityList.innerHTML = "";

    Object.entries(probabilities)
        .sort((a, b) => b[1] - a[1])
        .forEach(([label, probability]) => {
            const percent = probability * 100;
            const row = document.createElement("div");
            row.className = "probability-row";
            row.innerHTML = `
                <div class="probability-name" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
                <div class="probability-value">${percent.toFixed(2)}%</div>
                <div class="probability-bar">
                    <div class="probability-fill" style="width: ${Math.max(0, Math.min(100, percent))}%"></div>
                </div>
            `;
            probabilityList.appendChild(row);
        });
}

function renderSuccess(data) {
    const resultPanel = document.getElementById("resultPanel");
    resultPanel.hidden = false;
    document.getElementById("resultMeta").textContent = "Prediksi berhasil";
    document.getElementById("faultName").textContent = data.fault_name;
    document.getElementById("classBadge").textContent = `Class ${data.predicted_class}`;
    document.getElementById("confidenceValue").textContent = `${(data.confidence * 100).toFixed(2)}%`;
    document.getElementById("delayValue").textContent = `${data.delay_seconds.toFixed(4)} s`;

    const recommendation = document.getElementById("recommendation");
    recommendation.closest(".recommendation").className = "recommendation";
    recommendation.textContent = data.recommendation;

    renderProbabilities(data.probabilities);
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderError(message) {
    const resultPanel = document.getElementById("resultPanel");
    resultPanel.hidden = false;
    document.getElementById("resultMeta").textContent = "Prediksi gagal";
    document.getElementById("faultName").textContent = "Error";
    document.getElementById("classBadge").textContent = "API";
    document.getElementById("confidenceValue").textContent = "-";
    document.getElementById("delayValue").textContent = "-";
    document.getElementById("probabilityList").innerHTML = "";

    const recommendation = document.getElementById("recommendation");
    recommendation.closest(".recommendation").className = "recommendation error-message";
    recommendation.textContent = message;
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setSubmitBusy(isBusy) {
    const submitButton = document.getElementById("submitButton");
    submitButton.disabled = isBusy;
    submitButton.innerHTML = isBusy
        ? '<span class="button-icon predict-icon" aria-hidden="true"></span>Memproses'
        : '<span class="button-icon predict-icon" aria-hidden="true"></span>Prediksi Fault';
}

function getSignalValues() {
    return Array.from({ length: 30 }, (_, index) => {
        const input = document.getElementById(`P${index + 1}`);
        const value = Number.parseFloat(input?.value ?? "");
        return Number.isFinite(value) ? value : null;
    });
}

function drawSignalPreview() {
    const canvas = document.getElementById("signalPreview");
    const rangeLabel = document.getElementById("previewRange");
    if (!canvas || !rangeLabel) {
        return;
    }

    const context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 112;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const values = getSignalValues();
    const numericValues = values.filter((value) => value !== null);

    context.lineWidth = 1;
    context.strokeStyle = "#d8e0ea";
    for (let index = 0; index < 4; index += 1) {
        const y = 12 + index * ((height - 24) / 3);
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }

    if (numericValues.length < 2) {
        rangeLabel.textContent = "-";
        context.fillStyle = "#667085";
        context.font = "700 13px Arial";
        context.textAlign = "center";
        context.fillText("Preview sinyal muncul setelah data P diisi", width / 2, height / 2 + 4);
        return;
    }

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const spread = Math.max(max - min, 0.0001);
    rangeLabel.textContent = `${min.toFixed(2)} - ${max.toFixed(2)}`;

    const points = values.map((value, index) => {
        const x = 10 + index * ((width - 20) / 29);
        const normalized = value === null ? 0 : (value - min) / spread;
        const y = height - 13 - normalized * (height - 28);
        return { x, y, value };
    });

    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#e21b2f");
    gradient.addColorStop(0.55, "#2d4f87");
    gradient.addColorStop(1, "#4ba9dc");

    context.beginPath();
    points.forEach((point, index) => {
        if (index === 0) {
            context.moveTo(point.x, point.y);
        } else {
            context.lineTo(point.x, point.y);
        }
    });
    context.strokeStyle = gradient;
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    context.lineTo(points[points.length - 1].x, height - 12);
    context.lineTo(points[0].x, height - 12);
    context.closePath();
    const fill = context.createLinearGradient(0, 8, 0, height);
    fill.addColorStop(0, "rgba(226, 27, 47, 0.16)");
    fill.addColorStop(1, "rgba(45, 79, 135, 0)");
    context.fillStyle = fill;
    context.fill();

    context.fillStyle = "#172033";
    points.forEach((point, index) => {
        if (index % 5 === 0 || index === points.length - 1) {
            context.beginPath();
            context.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
            context.fill();
        }
    });
}

async function submitPrediction(event) {
    event.preventDefault();

    const form = event.target;
    setSubmitBusy(true);

    try {
        const response = await fetch("/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(readPayload(form))
        });

        const result = await response.json();
        if (result.status === "success") {
            renderSuccess(result.data);
        } else {
            renderError(result.message);
        }
    } catch (error) {
        renderError(error.message);
    } finally {
        setSubmitBusy(false);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("sampleButton").addEventListener("click", fillSample);
    document.getElementById("predictionForm").addEventListener("submit", submitPrediction);
    document.querySelectorAll("#predictionForm input").forEach((input) => {
        input.addEventListener("input", drawSignalPreview);
    });
    document.getElementById("predictionForm").addEventListener("reset", () => {
        window.setTimeout(resetResult, 0);
    });
    window.addEventListener("resize", drawSignalPreview);
    drawSignalPreview();
    refreshApiStatus();
});
