import { useMemo, useRef, useState } from 'react';

/** Searchable contact table with checkboxes, select-all, edit, delete, CSV import. */
export default function ContactList({ contacts, selected, onToggle, onToggleAll, onEdit, onDelete, onImportFile }) {
  const [query, setQuery] = useState('');
  const fileRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, '') || q));
  }, [contacts, query]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  return (
    <div className="card">
      <div className="row between">
        <h2>Contacts ({contacts.length})</h2>
        <div className="row">
          <span className="badge">{selected.size} selected</span>
          <button className="btn small" onClick={() => fileRef.current?.click()}>Import CSV</button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ''; }}
          />
        </div>
      </div>
      <input className="search" placeholder="Search by name or phone..." value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => onToggleAll(filtered.map((c) => c.id), !allSelected)} />
              </th>
              <th>Name</th>
              <th>Phone</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className={selected.has(c.id) ? 'selected' : ''}>
                <td><input type="checkbox" aria-label={`Select ${c.name}`} checked={selected.has(c.id)} onChange={() => onToggle(c.id)} /></td>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => onEdit(c)}>Edit</button>
                  <button className="btn small danger" onClick={() => onDelete(c)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="empty">{contacts.length ? 'No matches' : 'No contacts yet - add one or import a CSV (name,phone).'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
