import { useEffect, useMemo, useState } from 'react';
import { getHealth, sendPrintMultipart, sendPrintBase64 } from './api';
import Editor  from './components/Editor';

export default function App() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [font, setFont] = useState("default");
  const [file, setFile] = useState<File | null>(null);
  const [qr, setQR] = useState<string>("");
  const [health, setHealth] = useState("checking...");
  const [useMultipart, setUseMultipart] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [indicatorGreen, setIndicatorGreen] = useState(false);


  useEffect(() => {
    getHealth()
      .then((h) => {
        setHealth(`OK - ${h.printer}`);
        setIndicatorGreen(true);
      })
      .catch((e) => {
        setHealth(`Error - ${String(e.message || e)}`);
        setIndicatorGreen(false);
      });
  }, []);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      /**
       * Decide how to send the print job data to the server based on the `useMultipart` flag.
       * multipart is binary form data, which avoids base64 overhead.
       * base64 is JSON encoded, which is easier to debug but larger.
       */
      if (useMultipart) {
        await sendPrintMultipart({ title, body, font, file, qr });
      } else {
        await sendPrintBase64({ title, body, font, file, qr });
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
        Reciewt Pwinter
      </h1>
      <div style={{ marginBottom: "10px" }}>
        <span
          className={`status-indicator ${indicatorGreen ? "green" : "red"}`}
        ></span>
        <span className="muted">Health: {health}</span>
      </div>

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
            placeholder="Title"
          />
        </label>

        <label>
          <div>Body</div>
          {/* <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Body text"
          /> */}
          <Editor
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

        <label>
          <div>QR (text or URL)</div>
          <input
            type="text"
            value={qr}
            onChange={(e) => setQR(e.target.value)}
            placeholder="Enter QR code text or URL"
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
          <span>Send as binary multipart form data</span>
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
          <li>During dev, Vite proxies /api to port 8080.</li>
        </ul>
      </details>
    </div>
  );
}