/** Per-contact send outcome: green = sent, red = failed (with Meta's reason). */
export default function SendResults({ results, onClose }) {
  if (!results) return null;
  const sent = results.filter((r) => r.status === 'sent').length;
  return (
    <div className="card">
      <div className="row between">
        <h2>Results: {sent} sent, {results.length - sent} failed</h2>
        <button className="btn small" onClick={onClose}>Dismiss</button>
      </div>
      <ul className="results">
        {results.map((r) => (
          <li key={r.contactId} className={r.status === 'sent' ? 'ok' : 'fail'}>
            <strong>{r.name ?? `Contact #${r.contactId}`}</strong> {r.phone && <span className="muted">({r.phone})</span>}
            <div>
              {r.status === 'sent'
                ? `Sent${r.messageId ? ` - ${r.messageId.slice(0, 28)}...` : ''}`
                : `Failed - ${r.error?.code ? `[${r.error.code}] ` : ''}${r.error?.message || 'Unknown error'}`}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
