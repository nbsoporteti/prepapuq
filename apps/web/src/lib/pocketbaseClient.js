import Pocketbase from 'pocketbase';

// In Horizons (Hostinger) the SPA and PocketBase are served from the same
// origin behind a reverse-proxy mounted at /hcgi/platform. For a custom
// deploy (e.g. Coolify on a VPS) set VITE_POCKETBASE_URL to the public URL
// of the PocketBase instance, e.g. https://api.prepa.example.com
const POCKETBASE_API_URL =
  import.meta.env.VITE_POCKETBASE_URL || '/hcgi/platform';

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };
