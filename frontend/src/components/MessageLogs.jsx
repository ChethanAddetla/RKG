import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { errorMessage, getLogs } from '../api/client.js';

export default function MessageLogs({ refreshKey }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setLogs(await getLogs()); } catch (e) { toast.error(errorMessage(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [refreshKey]);

  return (
    <div className="card">
      <div className="row between">
        <h2>Message history</h2>
        <button className="btn small" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Time (UTC)</th><th>Contact</th><th>Type</th><th>Template</th><th>Status</th><th>Details</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.createdAt}</td>
                <td>{l.contactName || '-'}<div className="muted">{l.phone}</div></td>
                <td>{l.type}</td>
                <td>{l.templateName || '-'}</td>
                <td><span className={`pill ${l.status}`}>{l.status}</span></td>
                <td className="details">{l.errorMessage ? `[${l.errorCode}] ${l.errorMessage}` : l.payloadSummary}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="empty">No messages sent yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
