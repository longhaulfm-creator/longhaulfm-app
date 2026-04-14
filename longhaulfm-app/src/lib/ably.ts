// src/lib/ably.ts
import Ably from 'ably';

const ablyApiKey = import.meta.env.VITE_ABLY_API_KEY as string;

if (!ablyApiKey) {
  throw new Error('Missing Ably API Key env var — check your .env file');
}

export const ably = new Ably.Realtime({
  key: ablyApiKey,
  autoConnect: true,
});

ably.connection.on((stateChange) => {
  console.log('Ably connection state:', stateChange.current);
});
