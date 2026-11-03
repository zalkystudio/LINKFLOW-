
const form = document.getElementById("resolveForm");
const input = document.getElementById("urlInput");
const button = document.getElementById("resolveButton");

const result = document.getElementById("result");
const errorBox = document.getElementById("error");
const resultStatus = document.getElementById("resultStatus");
const finalUrl = document.getElementById("finalUrl");
const copyButton = document.getElementById("copyButton");

const historyList = document.getElementById("historyList");
const refreshButton = document.getElementById("refreshHistory");

let currentOriginalUrl = "";
let currentIntermediateUrl = "";

// Browser Assist UI
const assist = document.createElement("section");
assist.id = "browserAssist";
assist.className = "hidden";
assist.style.cssText = `
  margin-top:18px;padding:20px;border-radius:16px;
  background:#111713;border:1px solid #b5f36b;
`;

assist.innerHTML = `
  <h3 style="color:#b5f36b;margin-top:0">BROWSER ASSIST</h3>
  <p style="color:#aaa;font-size:14px">
    Selesaikan langkah pada halaman perantara, lalu tempel URL tujuan akhirnya di bawah.
  </p>
  <button id="openIntermediate" type="button"
    style="width:100%;padding:15px;background:#b5f36b;
    border:0;border-radius:10px;font-weight:bold">
    OPEN INTERMEDIATE PAGE ↗
  </button>
  <input id="manualFinalUrl" type="url"
    placeholder="Paste final download URL di sini"
    style="box-sizing:border-box;width:100%;margin-top:14px;
    padding:15px;background:#080b09;color:white;
    border:1px solid #333;border-radius:10px">
  <button id="saveFinalUrl" type="button"
    style="width:100%;padding:15px;margin-top:10px;
    background:#252d27;color:white;border:0;border-radius:10px">
    USE FINAL URL
  </button>
  <p id="assistMessage" style="color:#aaa;font-size:13px"></p>
`;

result.insertAdjacentElement("afterend", assist);

const openIntermediate = assist.querySelector("#openIntermediate");
const manualFinalUrl = assist.querySelector("#manualFinalUrl");
const saveFinalUrl = assist.querySelector("#saveFinalUrl");
const assistMessage = assist.querySelector("#assistMessage");

function getLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem("linkflow_manual_history") || "[]");
  } catch {
    return [];
  }
}

function saveLocalHistory(item) {
  const history = getLocalHistory();
  history.unshift(item);
  localStorage.setItem(
    "linkflow_manual_history",
    JSON.stringify(history.slice(0, 30))
  );
}

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function readResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server mengembalikan respons tidak valid (HTTP ${response.status}). Pastikan server.js aktif.`
    );
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  result.classList.add("hidden");
  errorBox.classList.add("hidden");
  assist.classList.add("hidden");

  currentOriginalUrl = input.value.trim();

  if (!validHttpUrl(currentOriginalUrl)) {
    errorBox.textContent = "Masukkan URL HTTP atau HTTPS yang valid.";
    errorBox.classList.remove("hidden");
    return;
  }

  button.disabled = true;
  button.textContent = "PROCESSING...";

  try {
    const response = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentOriginalUrl })
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Gagal memproses link.");
    }

    currentIntermediateUrl = data.finalUrl || "";

    const typeLabels = {
      webpage: "HALAMAN WEB / PERANTARA",
      "possible-download": "KEMUNGKINAN FILE LANGSUNG",
      redirect: "REDIRECT",
      protected: "HALAMAN TERPROTEKSI"
    };

    resultStatus.textContent =
      `${typeLabels[data.type] || "HASIL RESOLVER"} • HTTP ${data.status}`;

    finalUrl.textContent = data.finalUrl || "Tujuan tidak tersedia";

    if (data.finalUrl && validHttpUrl(data.finalUrl)) {
      finalUrl.href = data.finalUrl;
    } else {
      finalUrl.removeAttribute("href");
    }

    result.classList.remove("hidden");

    // Tampilkan bantuan manual untuk halaman perantara
    if (
      ["webpage", "protected"].includes(data.type) &&
      currentIntermediateUrl &&
      validHttpUrl(currentIntermediateUrl)
    ) {
      assist.classList.remove("hidden");
      assistMessage.textContent =
        "Buka halaman perantara, ikuti langkah yang disediakan situs, lalu masukkan URL tujuan.";
    }

    loadHistory();

  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "RESOLVE ↗";
  }
});

// Buka halaman perantara di tab baru
openIntermediate.addEventListener("click", () => {
  if (!validHttpUrl(currentIntermediateUrl)) return;

  window.open(
    currentIntermediateUrl,
    "_blank",
    "noopener,noreferrer"
  );
});

// Gunakan URL tujuan yang dimasukkan secara manual
saveFinalUrl.addEventListener("click", () => {
  const destination = manualFinalUrl.value.trim();

  if (!validHttpUrl(destination)) {
    assistMessage.textContent =
      "URL tidak valid. Masukkan URL yang diawali http:// atau https://";
    return;
  }

  finalUrl.textContent = destination;
  finalUrl.href = destination;

  resultStatus.textContent = "TUJUAN AKHIR • MANUAL";

  saveLocalHistory({
    original_url: currentOriginalUrl,
    final_url: destination,
    status: "manual",
    created_at: new Date().toLocaleString("id-ID")
  });

  assistMessage.textContent = "URL tujuan berhasil digunakan dan disimpan.";
  loadHistory();
});

// Copy final URL
copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(finalUrl.href);
    copyButton.textContent = "COPIED!";
  } catch {
    copyButton.textContent = "FAILED";
  }

  setTimeout(() => {
    copyButton.textContent = "COPY";
  }, 1800);
});

// Riwayat
async function loadHistory() {
  historyList.replaceChildren();

  let serverHistory = [];

  try {
    const response = await fetch("/api/history");

    if (response.ok) {
      serverHistory = await readResponse(response);
    }
  } catch {
    // Riwayat lokal tetap ditampilkan jika server tidak tersedia
  }

  const localHistory = getLocalHistory();
  const allHistory = [...localHistory, ...serverHistory];

  if (!allHistory.length) {
    historyList.textContent = "Belum ada riwayat.";
    return;
  }

  allHistory.slice(0, 50).forEach(item => {
    const card = document.createElement("div");
    card.className = "history-item";

    const original = document.createElement("strong");
    original.textContent = item.original_url || "URL tidak diketahui";

    const destination = document.createElement("a");
    destination.textContent = item.final_url || "Tidak tersedia";

    if (item.final_url && validHttpUrl(item.final_url)) {
      destination.href = item.final_url;
      destination.target = "_blank";
      destination.rel = "noopener noreferrer";
    }

    const info = document.createElement("small");
    info.textContent =
      `Status: ${item.status} • ${item.created_at || "-"}`;

    card.append(original, destination, info);
    historyList.appendChild(card);
  });
}

refreshButton.addEventListener("click", loadHistory);

loadHistory();
