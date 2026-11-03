
const API_KEY = process.env.ZAPI_KEY;

const API_URL =
  "https://api.zapi.ink/v1/bypass-tools:safelinku/resolve";

async function resolveLink(input) {
  if (!API_KEY) {
    throw new Error("ZAPI_KEY belum dipasang.");
  }

  let original;

  try {
    original = new URL(input);
  } catch {
    throw new Error("URL tidak valid.");
  }

  if (
    original.protocol !== "https:" ||
    !["sfl.gl", "www.sfl.gl"].includes(original.hostname)
  ) {
    throw new Error("Masukkan link SFL.gl yang valid.");
  }

  const endpoint = new URL(API_URL);
  endpoint.searchParams.set("url", original.href);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "x-api-key": API_KEY,
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(30000)
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Respons API tidak valid.");
  }

  if (!response.ok) {
    throw new Error(
      result.message ||
      result.error ||
      `Zapi API error: ${response.status}`
    );
  }

  // Mengambil URL download asli dari respons Zapi
  const finalUrl = result.data?.finalUrl;

  if (!finalUrl) {
    throw new Error("URL tujuan akhir tidak ditemukan.");
  }

  let destination;

  try {
    destination = new URL(finalUrl);
  } catch {
    throw new Error("URL hasil API tidak valid.");
  }

  if (!["http:", "https:"].includes(destination.protocol)) {
    throw new Error("Protokol URL tujuan tidak didukung.");
  }

  return {
    originalUrl: original.href,
    finalUrl: destination.href,
    status: "success",
    type: "safelinku_resolved",
    message: "URL tujuan akhir berhasil ditemukan."
  };
}

module.exports = { resolveLink };
