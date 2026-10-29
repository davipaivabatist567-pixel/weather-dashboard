// Sincroniza as estatísticas do TikTok (API oficial "Display API") e avisa
// pelo ntfy a cada 100 visualizações novas no total da conta.
//
// Uso:
//   node scripts/tiktok.mjs auth   -> troca o código do login (TIKTOK_CODE) por um refresh token
//   node scripts/tiktok.mjs sync   -> busca os dados, gera site/data.json e envia notificações
//
// Arquivos de saída (no RUNNER_TEMP) que o workflow usa para atualizar secrets/variáveis:
//   refresh_token  -> novo refresh token (quando o TikTok devolve um diferente)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.TIKTOK_API_BASE || 'https://open.tiktokapis.com';
const NTFY = process.env.NTFY_SERVER || 'https://ntfy.sh';
const TMP = process.env.RUNNER_TEMP || join(ROOT, '.tmp');
const STEP = 100; // notifica a cada 100 visualizações
const MAX_HISTORY = 3000;

const env = (k) => (process.env[k] || '').trim();
const CLIENT_KEY = env('TIKTOK_CLIENT_KEY');
const CLIENT_SECRET = env('TIKTOK_CLIENT_SECRET');
const PAGES_URL = env('PAGES_URL').replace(/\/?$/, '/');
const REDIRECT_URI = PAGES_URL + 'callback.html';

function mask(value) {
  if (value && process.env.GITHUB_ACTIONS) console.log(`::add-mask::${value}`);
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  else console.log(`[output] ${name}=${value}`);
}

async function saveTemp(name, value) {
  await mkdir(TMP, { recursive: true });
  await writeFile(join(TMP, name), value);
}

async function token(params) {
  const res = await fetch(`${API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: CLIENT_KEY, client_secret: CLIENT_SECRET, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error || !body.access_token) {
    throw new Error(`TikTok recusou o token: ${body.error || res.status} ${body.error_description || ''}`.trim());
  }
  mask(body.access_token);
  mask(body.refresh_token);
  return body;
}

async function api(path, { method = 'GET', fields, body, accessToken }) {
  const url = `${API}${path}?fields=${fields.join(',')}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.error && json.error.code !== 'ok')) {
    throw new Error(`Erro na API ${path}: ${json.error?.code || res.status} ${json.error?.message || ''}`.trim());
  }
  return json.data;
}

async function notify({ title, message, tags, priority }) {
  const topic = env('NTFY_TOPIC');
  if (!topic) return console.log(`(sem NTFY_TOPIC) ${title}: ${message}`);
  const res = await fetch(NTFY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic, title, message,
      tags: [tags || 'tada'],
      priority: priority || 4,
      ...(PAGES_URL.startsWith('http') ? { click: PAGES_URL } : {}),
    }),
  });
  if (!res.ok) console.warn(`Falha ao enviar notificação: ${res.status}`);
  else console.log(`Notificação enviada: ${title}`);
}

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');

async function writeData(data) {
  const file = join(ROOT, 'site', 'data.json');
  await writeFile(file, JSON.stringify(data));
}

async function previousData() {
  if (!PAGES_URL.startsWith('http')) return null;
  try {
    const res = await fetch(`${PAGES_URL}data.json?t=${Date.now()}`, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function authCommand() {
  const code = env('TIKTOK_CODE');
  if (!code) throw new Error('Informe o código do TikTok (TIKTOK_CODE).');
  mask(code);
  const t = await token({ code: decodeURIComponent(code), grant_type: 'authorization_code', redirect_uri: REDIRECT_URI });
  await saveTemp('refresh_token', t.refresh_token);
  console.log(`Conta conectada (escopos: ${t.scope}).`);
  await notify({
    title: 'TikTok conectado ✅',
    message: `Pronto! Você vai receber um aviso a cada ${STEP} visualizações novas.`,
    tags: 'white_check_mark',
    priority: 3,
  });
}

async function fetchAllVideos(accessToken) {
  const fields = ['id', 'title', 'video_description', 'cover_image_url', 'share_url', 'create_time',
    'duration', 'view_count', 'like_count', 'comment_count', 'share_count'];
  const videos = [];
  let cursor;
  for (let page = 0; page < 50; page++) {
    const data = await api('/v2/video/list/', {
      method: 'POST', fields, accessToken, body: { max_count: 20, ...(cursor ? { cursor } : {}) },
    });
    videos.push(...(data.videos || []));
    if (!data.has_more) break;
    cursor = data.cursor;
  }
  return videos;
}

async function syncCommand() {
  const config = { clientKey: CLIENT_KEY, redirectUri: REDIRECT_URI };
  const tempToken = join(TMP, 'refresh_token');
  const refreshToken = existsSync(tempToken) ? (await readFile(tempToken, 'utf8')).trim() : env('TIKTOK_REFRESH_TOKEN');

  if (!CLIENT_KEY || !CLIENT_SECRET || !refreshToken) {
    console.log('TikTok ainda não conectado; publicando o painel em modo de configuração.');
    await writeData({ connected: false, config, updatedAt: new Date().toISOString() });
    return;
  }

  const t = await token({ grant_type: 'refresh_token', refresh_token: refreshToken });
  if (t.refresh_token && t.refresh_token !== refreshToken) await saveTemp('refresh_token', t.refresh_token);

  const user = await api('/v2/user/info/', {
    fields: ['open_id', 'display_name', 'avatar_url', 'profile_deep_link', 'follower_count',
      'following_count', 'likes_count', 'video_count'],
    accessToken: t.access_token,
  }).then((d) => d.user);
  const videos = await fetchAllVideos(t.access_token);
  const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);

  const prev = await previousData();
  const now = new Date().toISOString();
  const history = [...(prev?.history || []), {
    t: now, views: totalViews, followers: user.follower_count || 0, likes: user.likes_count || 0,
  }].slice(-MAX_HISTORY);

  // Marco = quantas centenas de visualizações a conta já tem.
  const milestone = Math.floor(totalViews / STEP);
  const lastRaw = env('TIKTOK_LAST_MILESTONE');
  const last = lastRaw === '' ? null : Number(lastRaw);

  if (last === null || Number.isNaN(last)) {
    console.log(`Primeira sincronização: ${fmt(totalViews)} visualizações. Próximo aviso em ${fmt((milestone + 1) * STEP)}.`);
    setOutput('milestone', milestone);
  } else if (milestone > last) {
    const prevViews = new Map((prev?.videos || []).map((v) => [v.id, v.view_count || 0]));
    const top = videos
      .map((v) => ({ v, gain: (v.view_count || 0) - (prevViews.get(v.id) ?? v.view_count ?? 0) }))
      .sort((a, b) => b.gain - a.gain)[0];
    const crossed = milestone - last;
    const reached = milestone * STEP;
    const title = crossed === 1
      ? `🎉 +${STEP} visualizações! Total: ${fmt(reached)}`
      : `🚀 +${fmt(crossed * STEP)} visualizações! Total: ${fmt(reached)}`;
    const lines = [`Agora você tem ${fmt(totalViews)} visualizações no total.`];
    if (top && top.gain > 0) lines.push(`Vídeo que mais cresceu: "${(top.v.title || top.v.video_description || 'sem título').slice(0, 60)}" (+${fmt(top.gain)})`);
    await notify({ title, message: lines.join('\n') });
    setOutput('milestone', milestone);
  } else {
    console.log(`${fmt(totalViews)} visualizações. Próximo aviso em ${fmt((Math.max(milestone, last) + 1) * STEP)}.`);
  }

  await writeData({
    connected: true,
    config,
    updatedAt: now,
    step: STEP,
    user,
    totals: {
      views: totalViews,
      likes: videos.reduce((s, v) => s + (v.like_count || 0), 0),
      comments: videos.reduce((s, v) => s + (v.comment_count || 0), 0),
      shares: videos.reduce((s, v) => s + (v.share_count || 0), 0),
    },
    videos,
    history,
  });
  console.log(`OK: ${videos.length} vídeos, ${fmt(totalViews)} visualizações.`);
}

const commands = { auth: authCommand, sync: syncCommand };
const cmd = commands[process.argv[2]];
if (!cmd) {
  console.error('Uso: node scripts/tiktok.mjs <auth|sync>');
  process.exit(2);
}
cmd().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
