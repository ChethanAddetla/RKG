// API client. The browser only talks to our backend - never to Meta directly,
// and it never sees the WhatsApp token.
import axios from 'axios';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api` });

/** Extract a readable message from an axios error. */
export function errorMessage(err) {
  return err.response?.data?.error?.message || err.message || 'Something went wrong';
}

export const getContacts = () => api.get('/contacts').then((r) => r.data.contacts);
export const createContact = (data) => api.post('/contacts', data).then((r) => r.data.contact);
export const updateContact = (id, data) => api.put(`/contacts/${id}`, data).then((r) => r.data.contact);
export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const importContacts = (contacts) => api.post('/contacts/import', { contacts }).then((r) => r.data);
export const sendMessages = (payload) => api.post('/messages/send', payload).then((r) => r.data.results);
export const getLogs = () => api.get('/messages/logs').then((r) => r.data.logs);
