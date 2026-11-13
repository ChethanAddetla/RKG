import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { getToken, logout } from './api/client.js';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const [authed, setAuthed] = useState(() => !!getToken());

  // The API client fires this when the server rejects our token (expired session).
  useEffect(() => {
    const onLogout = () => setAuthed(false);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      {authed ? (
        <Home onLogout={() => { logout(); setAuthed(false); }} />
      ) : (
        <Login onLoggedIn={() => setAuthed(true)} />
      )}
    </>
  );
}
