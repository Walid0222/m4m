import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const getToken = () => localStorage.getItem('m4m_token');

function getBroadcastAuthUrl() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const origin = base.replace(/\/api\/v1\/?$/, '') || 'http://localhost:8000';
  return `${origin}/broadcasting/auth`;
}

const reverbHost = import.meta.env.VITE_REVERB_HOST || 'localhost';
const reverbPort = import.meta.env.VITE_REVERB_PORT || '8080';
const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
const reverbKey = import.meta.env.VITE_REVERB_APP_KEY || 'f36bkswqapqpgiuj9kim';

const reverbWsHost = reverbHost;
const reverbWsPort = reverbPort;
const reverbForceTLS = reverbScheme === 'https';

export function getEcho() {
  return new Echo({
    broadcaster: 'reverb',
    key: reverbKey,
    wsHost: reverbWsHost,
    wsPort: Number(reverbWsPort),
    wssPort: Number(reverbWsPort),
    forceTLS: reverbForceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: getBroadcastAuthUrl(),
    auth: {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: 'application/json',
      },
    },
  });
}
