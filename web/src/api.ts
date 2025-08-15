/**
 * Data structure representing the payload for a print job.
 *
 * @property {string} title - The title text for the print job.
 * @property {string} body - The body text for the print job.
 * @property {File|null} [file] - Optional image file to include in the printout.
 * @property {string} [font] - Optional font key to use for the title (e.g. "default", "evangelion").
 */
export type PrintPayload = {
  title: string;
  body: string;
  file?: File | null;
  font?: string;
};

/**
 * Checks the health of the print server.
 *
 * Sends a GET request to /api/v1/health and returns the server status.
 * Throws an error if the request fails or the status is not OK.
 *
 * @returns {Promise<{ ok: boolean; printer: string }>} The server health and printer address.
 */
export async function getHealth() {
  // interface checks health of server
  const res = await fetch("/api/v1/health");
  if (!res.ok) throw new Error(`Health failed: ${res.status}`);
  return res.json() as Promise<{ ok: boolean; printer: string }>;
}

/**
 * Sends a print job to the server as multipart/form-data.
 *
 * Includes text fields (title, body, optional font) and an optional image file
 * in binary form to avoid base64 encoding overhead.
 *
 * @param {PrintPayload} payload - The print job payload.
 * @returns {Promise<any>} The server response.
 * @throws Will throw if the request fails or the server returns an error.
 */
export async function sendPrintMultipart(payload: PrintPayload) {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("body", payload.body);
  if (payload.file) form.append("image", payload.file);
  if (payload.font) form.append("font", payload.font);

  const res = await fetch("/api/v1/print-multipart", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `Print failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Sends a print job to the server as a JSON payload with an optional base64-encoded image.
 *
 * Converts the image file (if present) to base64 and embeds it in the JSON body.
 * This is simpler but less efficient than multipart for large images.
 *
 * @param {PrintPayload} payload - The print job payload.
 * @returns {Promise<any>} The server response.
 * @throws Will throw if the request fails or the server returns an error.
 */
export async function sendPrintBase64(payload: PrintPayload) {
  let imageBase64: string | undefined;

  if (payload.file) {
    imageBase64 = await fileToBase64(payload.file);
  }

  const res = await fetch("/api/v1/print", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
      imageBase64,
      font: payload.font ?? "default",
    }),
  });

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `Print failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Converts a File object to a base64-encoded data URL.
 *
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} The base64-encoded string.
 */
function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/**
 * Safely parses a Response object as JSON.
 *
 * @param {Response} res - The fetch Response object.
 * @returns {Promise<any|null>} Parsed JSON or null if parsing fails.
 */
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
