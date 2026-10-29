const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
const short = (n) => Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

let data = null;
let sortBy = store.get('sort') || 'views';

function ago(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`;
}

function renderSetup() {
  $('setup').hidden = false;
  $('dash').hidden = true;
  $('updated').textContent = 'Conta ainda não conectada';
  const { clientKey, redirectUri } = data?.config || {};
  if (!clientKey) {
    $('connect').disabled = true;
    $('setup-msg').textContent = 'Falta cadastrar o secret TIKTOK_CLIENT_KEY no GitHub e rodar o workflow de novo.';
    return;
  }
  $('connect').onclick = () => {
    const state = crypto.getRandomValues(new Uint32Array(2)).join('');
    store.set('oauth_state', state);
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.search = new URLSearchParams({
      client_key: clientKey,
      scope: 'user.info.basic,user.info.profile,user.info.stats,video.list',
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    location.href = url;
  };
}

function renderChart(history) {
  const svg = $('chart');
  const points = history.slice(-200);
  if (points.length < 2) {
    svg.innerHTML = '';
    $('chart-note').textContent = 'O gráfico aparece depois de algumas atualizações.';
    return;
  }
  const W = 320, H = 120, P = 6;
  const vals = points.map((p) => p.views);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const xy = points.map((p, i) => [
    P + (i / (points.length - 1)) * (W - 2 * P),
    H - P - ((p.views - min) / span) * (H - 2 * P),
  ]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  svg.innerHTML = `
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fe2c55" stop-opacity=".45"/><stop offset="1" stop-color="#fe2c55" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${line}L${W - P},${H}L${P},${H}Z" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="#fe2c55" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  $('chart-note').textContent =
    `${new Date(points[0].t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} → agora · ` +
    `de ${short(min)} a ${short(max)}`;
}

function gainSince(history, hours) {
  if (!history.length) return 0;
  const cutoff = Date.now() - hours * 3600e3;
  const base = history.find((p) => new Date(p.t) >= cutoff) || history[0];
  return history[history.length - 1].views - base.views;
}

function renderVideos() {
  const list = [...data.videos].sort((a, b) =>
    sortBy === 'recent' ? b.create_time - a.create_time : (b.view_count || 0) - (a.view_count || 0));
  $('videos').innerHTML = '';
  for (const v of list) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = v.share_url || '#';
    a.target = '_blank';
    a.rel = 'noopener';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.onerror = () => { img.onerror = null; img.removeAttribute('src'); };
    img.src = v.cover_image_url || '';
    const body = document.createElement('div');
    body.className = 'v-body';
    const title = document.createElement('div');
    title.className = 'v-title';
    title.textContent = v.title || v.video_description || 'Sem título';
    const meta = document.createElement('div');
    meta.className = 'v-meta';
    meta.innerHTML = `<span class="v-views">▶ ${fmt(v.view_count)}</span><span>♥ ${short(v.like_count)}</span>` +
      `<span>💬 ${short(v.comment_count)}</span><span>${new Date(v.create_time * 1000).toLocaleDateString('pt-BR')}</span>`;
    body.append(title, meta);
    a.append(img, body);
    li.append(a);
    $('videos').append(li);
  }
  if (!list.length) $('videos').innerHTML = '<li class="muted small">Nenhum vídeo encontrado.</li>';
}

function renderDash() {
  $('setup').hidden = true;
  $('dash').hidden = false;
  const { user, totals, history = [], step = 100 } = data;
  $('name').textContent = user.display_name || 'Meu TikTok';
  if (user.avatar_url) { $('avatar').src = user.avatar_url; $('avatar').hidden = false; }
  $('updated').textContent = `Atualizado ${ago(data.updatedAt)}`;

  $('total').textContent = fmt(totals.views);
  $('followers').textContent = fmt(user.follower_count);
  $('likes').textContent = fmt(user.likes_count);
  $('comments').textContent = fmt(totals.comments);
  $('count').textContent = fmt(data.videos.length);

  const parts = [];
  const day = gainSince(history, 24);
  if (day > 0) parts.push(`+${fmt(day)} nas últimas 24 h`);
  const seen = Number(store.get('last_seen_views'));
  if (seen && totals.views > seen) parts.push(`+${fmt(totals.views - seen)} desde sua última visita`);
  $('delta').textContent = parts.join(' · ');
  store.set('last_seen_views', totals.views);

  const into = totals.views % step;
  $('bar').style.width = `${(into / step) * 100}%`;
  $('next').textContent = `Faltam ${fmt(step - into)} para a próxima notificação (${fmt(totals.views - into + step)})`;

  renderChart(history);
  renderVideos();
}

async function load() {
  $('refresh').classList.add('spin');
  try {
    const res = await fetch(`data.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
    data.connected ? renderDash() : renderSetup();
  } catch {
    if (!data) $('updated').textContent = 'Não consegui carregar os dados. Tente de novo.';
  } finally {
    $('refresh').classList.remove('spin');
  }
}

document.querySelectorAll('.tabs button').forEach((b) => {
  b.classList.toggle('on', b.dataset.sort === sortBy);
  b.onclick = () => {
    sortBy = b.dataset.sort;
    store.set('sort', sortBy);
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    renderVideos();
  };
});
$('refresh').onclick = load;
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
setInterval(load, 5 * 60 * 1000);
load();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
