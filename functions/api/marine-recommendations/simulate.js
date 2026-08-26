import { handleMarineSimulation } from '../../lib/marine/simulation-handler.mjs';

const ALLOWED_ORIGINS = new Set(['https://lab-control.livesantamaria.org', 'https://control.livesantamaria.org']);
const cors = request => ALLOWED_ORIGINS.has(request.headers.get('origin')) ? request.headers.get('origin') : null;

export async function onRequestPost({ request }) {
  const response = await handleMarineSimulation(request);
  const origin = cors(request);
  if (origin) response.headers.set('Access-Control-Allow-Origin', origin);
  return response;
}

export function onRequestOptions({ request }) {
  const origin = cors(request);
  return new Response(null, { status: origin ? 204 : 403, headers: origin ? {
    'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'
  } : {} });
}
