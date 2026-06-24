import Pocketbase from 'pocketbase';

// La URL del backend se inyecta en build con VITE_POCKETBASE_URL
// (ej. https://api.prepapuq.cl). Si no está definida, cae al PocketBase
// local de desarrollo en el puerto 8090.
const POCKETBASE_API_URL =
  import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };
