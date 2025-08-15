export type PrintPayload = {
  title: string;
  body: string;
  file?: File | null;
};

export async function getHealth() {
  const res = await fetch('/api/v1/health');
  if (!res.ok) throw new Error(`Health failed: ${res.status}`);
  return res.json() as Promise<{ ok: boolean; printer: string }>;
}

export async function sendPrintMultipart(payload: PrintPayload) {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('body', payload.body);
  if (payload.file) form.append('image', payload.file);

  const res = await fetch('/api/v1/print-multipart', {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `Print failed: ${res.status}`);
  }
  return res.json();
}

export async function sendPrintBase64(payload: PrintPayload) {
  let imageBase64: string | undefined;

  if (payload.file) {
    imageBase64 = await fileToBase64(payload.file);
  }

  const res = await fetch('/api/v1/print', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
      imageBase64
    })
  });

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `Print failed: ${res.status}`);
  }
  return res.json();
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read failed'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}