import { useEffect, useState } from 'react';
import { normalizePhone } from '../utils/phone.js';

/** Add / edit form with inline validation. `contact` set => edit mode. */
export default function ContactForm({ contact, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(contact?.name || '');
    setPhone(contact?.phone || '');
    setTouched({});
  }, [contact]);

  const errors = {};
  if (!name.trim()) errors.name = 'Name is required';
  const p = normalizePhone(phone);
  if (!p.ok) errors.phone = p.error;
  const valid = Object.keys(errors).length === 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, phone: true });
    if (!valid) return;
    setBusy(true);
    const ok = await onSubmit({ name: name.trim(), phone: p.phone });
    setBusy(false);
    if (ok && !contact) { setName(''); setPhone(''); setTouched({}); }
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>{contact ? 'Edit contact' : 'Add contact'}</h2>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} placeholder="John Doe" />
        {touched.name && errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label>
        Phone
        <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} placeholder="6302746267 or 916302746267" />
        {touched.phone && errors.phone ? (
          <span className="field-error">{errors.phone}</span>
        ) : (
          p.ok && phone && <span className="hint">Will be saved as {p.phone}</span>
        )}
      </label>
      <div className="row">
        <button className="btn primary" type="submit" disabled={busy}>{contact ? 'Save changes' : 'Add contact'}</button>
        {contact && <button className="btn" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
