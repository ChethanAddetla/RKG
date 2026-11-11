import { useState } from 'react';
import toast from 'react-hot-toast';
import { errorMessage, sendMessages } from '../api/client.js';
import { resolvePlaceholders } from '../utils/phone.js';

const MAX_RECIPIENTS = 50;

/** Template/Text composer with personalization preview, confirmation and send. */
export default function MessageComposer({ selectedContacts, onResults }) {
  const [type, setType] = useState('template');
  const [templateName, setTemplateName] = useState('jaspers_market_order_confirmation_v1');
  const [languageCode, setLanguageCode] = useState('en_US');
  const [variables, setVariables] = useState(['{{name}}', '123456', 'Nov 10, 2026']);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const n = selectedContacts.length;
  const first = selectedContacts[0];

  const fieldsValid =
    type === 'template'
      ? templateName.trim() && languageCode.trim() && variables.every((v) => v.trim())
      : message.trim();
  const tooMany = n > MAX_RECIPIENTS;
  const canSend = n > 0 && !!fieldsValid && !tooMany && !sending;

  const setVar = (i, value) => setVariables((vs) => vs.map((v, idx) => (idx === i ? value : v)));

  async function doSend() {
    setConfirming(false);
    setSending(true);
    try {
      const payload = {
        contactIds: selectedContacts.map((c) => c.id),
        type,
        ...(type === 'text'
          ? { message: message.trim() }
          : { template: { name: templateName.trim(), languageCode: languageCode.trim(), variables: variables.map((v) => v.trim()) } }),
      };
      const results = await sendMessages(payload);
      const ok = results.filter((r) => r.status === 'sent').length;
      if (ok === results.length) toast.success(`Sent to all ${ok} contacts`);
      else toast.error(`${ok} sent, ${results.length - ok} failed`);
      onResults(results);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <h2>Compose message</h2>

      <div className="toggle">
        <button type="button" className={type === 'template' ? 'active' : ''} onClick={() => setType('template')}>Template</button>
        <button type="button" className={type === 'text' ? 'active' : ''} onClick={() => setType('text')}>Text</button>
      </div>

      {type === 'template' ? (
        <>
          <div className="grid2">
            <label>Template name<input value={templateName} onChange={(e) => setTemplateName(e.target.value)} /></label>
            <label>Language code<input value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} /></label>
          </div>

          <div className="row between">
            <strong>Variables</strong>
            <div className="row">
              <button type="button" className="btn small" onClick={() => setVariables((v) => [...v, ''])}>+ Add</button>
              <button type="button" className="btn small" disabled={!variables.length} onClick={() => setVariables((v) => v.slice(0, -1))}>- Remove</button>
            </div>
          </div>
          {variables.map((v, i) => (
            <label key={i}>
              {`{{${i + 1}}}`}
              <input value={v} onChange={(e) => setVar(i, e.target.value)} placeholder="Value, or {{name}} / {{phone}}" />
            </label>
          ))}
          <p className="hint">Placeholders <code>{'{{name}}'}</code> and <code>{'{{phone}}'}</code> are replaced per contact. The number of variables must match your approved template.</p>

          <div className="preview">
            <strong>Preview{first ? ` for ${first.name}` : ''}</strong>
            {first ? (
              <ol>{variables.map((v, i) => <li key={i}>{`{{${i + 1}}}`} = {resolvePlaceholders(v, first) || <em>(empty)</em>}</li>)}</ol>
            ) : (
              <p className="muted">Select a contact to preview.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <label>
            Message
            <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi {{name}}, ..." />
          </label>
          <p className="warn">Free-form text only delivers if the recipient messaged your number in the last 24 hours. Otherwise use a template.</p>
          {first && message && <div className="preview"><strong>Preview for {first.name}</strong><p>{resolvePlaceholders(message, first)}</p></div>}
        </>
      )}

      {tooMany && <p className="field-error">Maximum {MAX_RECIPIENTS} recipients per send (you selected {n}).</p>}

      <button className="btn primary wide" disabled={!canSend} onClick={() => setConfirming(true)}>
        {sending ? 'Sending...' : `Send to ${n} contact${n === 1 ? '' : 's'}`}
      </button>

      {confirming && (
        <div className="modal-backdrop" onClick={() => setConfirming(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm send</h3>
            <p>
              Send a <strong>{type}</strong> message{type === 'template' ? <> (<code>{templateName}</code>)</> : null} to <strong>{n}</strong> contact{n === 1 ? '' : 's'}?
            </p>
            <div className="row end">
              <button className="btn" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn primary" onClick={doSend}>Yes, send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
