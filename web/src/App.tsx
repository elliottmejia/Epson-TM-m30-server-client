import { useEffect, useMemo, useState } from 'react';
import { getHealth, sendPrintMultipart, sendPrintBase64 } from './api';

export default function App() {
  const [title, setTitle] = useState('Test ticket');
  const [body, setBody] = useState('Hello from the frontend');
  const [font, setFont] = useState("default");
  const [file, setFile] = useState<File | null>(null);
  const [health, setHealth] = useState('checking...');
  const [useMultipart, setUseMultipart] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(h => setHealth(`OK - ${h.printer}`))
      .catch(e => setHealth(`Error - ${String(e.message || e)}`));
  }, []);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (useMultipart) {
        await sendPrintMultipart({ title, body, font, file });
      } else {
        await sendPrintBase64({ title, body, font, file });
      }
      setMsg("Sent to printer");
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h1 className={font === "evangelion" ? "eva-title" : undefined}>
        TM‑M30 Printer Console
      </h1>
      <p className="muted">Health: {health}</p>

      <form onSubmit={onSubmit} className="grid">
        <label>
          <div>Font</div>
          <select value={font} onChange={(e) => setFont(e.target.value)}>
            <option value="default">default</option>
            <option value="evangelion">evangelion</option>
          </select>
        </label>

        <label>
          <div>Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Receipt title"
          />
        </label>

        <label>
          <div>Body</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Body text"
          />
        </label>

        <label>
          <div>Image (optional)</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {previewUrl && (
          <div>
            <div>Preview</div>
            <img
              src={previewUrl}
              alt="preview"
              className="preview"
              onLoad={() => {
                // free object URL after load
                if (previewUrl) URL.revokeObjectURL(previewUrl);
              }}
            />
          </div>
        )}

        <label className="row">
          <input
            type="checkbox"
            checked={useMultipart}
            onChange={(e) => setUseMultipart(e.target.checked)}
          />
          <span>Send as multipart form-data</span>
        </label>

        <button disabled={busy} type="submit">
          {busy ? "Printing..." : "Print"}
        </button>
      </form>

      {msg && <p className="status">{msg}</p>}

      <hr />

      <details>
        <summary>Notes</summary>
        <ul>
          <li>The server clamps width and quantizes to 16 tones.</li>
          <li>
            Multipart avoids base64 overhead and is preferred for large images.
          </li>
          <li>During dev, Vite proxies /api to port 3000.</li>
        </ul>
      </details>
    </div>
  );
}