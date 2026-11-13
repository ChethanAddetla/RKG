import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import * as api from '../api/client.js';
import ContactForm from '../components/ContactForm.jsx';
import ContactList from '../components/ContactList.jsx';
import MessageComposer from '../components/MessageComposer.jsx';
import MessageLogs from '../components/MessageLogs.jsx';
import SendResults from '../components/SendResults.jsx';
import { parseContactsCsv } from '../utils/csv.js';

export default function Home({ onLogout }) {
  const [tab, setTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [results, setResults] = useState(null);
  const [logsKey, setLogsKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const list = await api.getContacts();
      setContacts(list);
      // drop selections for contacts that no longer exist
      setSelected((s) => new Set([...s].filter((id) => list.some((c) => c.id === id))));
    } catch (e) {
      toast.error(api.errorMessage(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectedContacts = useMemo(() => contacts.filter((c) => selected.has(c.id)), [contacts, selected]);

  /** Returns true on success (so the form can reset). */
  async function saveContact(data) {
    try {
      if (editing) {
        await api.updateContact(editing.id, data);
        toast.success('Contact updated');
        setEditing(null);
      } else {
        await api.createContact(data);
        toast.success('Contact added');
      }
      await load();
      return true;
    } catch (e) {
      toast.error(api.errorMessage(e));
      return false;
    }
  }

  async function removeContact(c) {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    try {
      await api.deleteContact(c.id);
      toast.success('Contact deleted');
      if (editing?.id === c.id) setEditing(null);
      await load();
    } catch (e) {
      toast.error(api.errorMessage(e));
    }
  }

  async function importFile(file) {
    try {
      const rows = parseContactsCsv(await file.text());
      if (!rows.length) return toast.error('CSV has no rows');
      const res = await api.importContacts(rows);
      toast.success(`Imported ${res.importedCount}, skipped ${res.skipped.length}`);
      if (res.skipped.length) {
        const sample = res.skipped.slice(0, 3).map((s) => `row ${s.row}: ${s.reason}`).join('\n');
        toast(sample, { duration: 8000 });
      }
      await load();
    } catch (e) {
      toast.error(api.errorMessage(e));
    }
  }

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids, on) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });

  return (
    <div className="container">
      <header>
        <h1>WhatsApp Messenger</h1>
        <nav className="tabs">
          <button className={tab === 'contacts' ? 'active' : ''} onClick={() => setTab('contacts')}>Contacts &amp; Send</button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History</button>
          <button onClick={onLogout}>Log out</button>
        </nav>
      </header>

      {tab === 'contacts' ? (
        <div className="layout">
          <div className="col">
            <ContactForm contact={editing} onSubmit={saveContact} onCancel={() => setEditing(null)} />
            <ContactList
              contacts={contacts}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onEdit={setEditing}
              onDelete={removeContact}
              onImportFile={importFile}
            />
          </div>
          <div className="col">
            <MessageComposer
              selectedContacts={selectedContacts}
              onResults={(r) => { setResults(r); setLogsKey((k) => k + 1); }}
            />
            <SendResults results={results} onClose={() => setResults(null)} />
          </div>
        </div>
      ) : (
        <MessageLogs refreshKey={logsKey} />
      )}
    </div>
  );
}
