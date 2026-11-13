// API client. The browser only talks to our backend - never to Meta directly,
// and it never sees the WhatsApp token. Login token is kept in localStorage.
import axios from 'axios';

const TOKEN_KEY = 'wa_auth_token';
const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api` });

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
};

// Attach the token to every request.
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Expired/invalid session on a protected call => tell the app to show the login page.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      setToken(null);
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

/** Extract a readable message from an axios error. */
export function errorMessage(err) {
  if (!err.response) return 'Cannot reach the server. Check that the backend is running.';
  return err.response?.data?.error?.message || err.message || 'Something went wrong';
}

export const login = async (username, password) => {
  const { data } = await api.post('/auth/login', { username, password });
  setToken(data.token);
};
export const logout = () => setToken(null);

export const getContacts = () => api.get('/contacts').then((r) => r.data.contacts);
export const createContact = (data) => api.post('/contacts', data).then((r) => r.data.contact);
export const updateContact = (id, data) => api.put(`/contacts/${id}`, data).then((r) => r.data.contact);
export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const importContacts = (contacts) => api.post('/contacts/import', { contacts }).then((r) => r.data);
export const sendMessages = (payload) => api.post('/messages/send', payload).then((r) => r.data.results);
export const getLogs = () => api.get('/messages/logs').then((r) => r.data.logs);
