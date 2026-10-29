# Meu TikTok – painel de visualizações

Painel para o celular com todas as visualizações da sua conta do TikTok, e uma
**notificação no celular a cada 100 visualizações novas**.

- **Painel**: `https://davipaivabatist567-pixel.github.io/weather-dashboard/`
  (abra no celular e use "Adicionar à tela inicial" para virar um app).
- **Dados**: vêm da API oficial do TikTok (Display API), que fornece seus vídeos,
  as visualizações de cada um, seguidores e curtidas.
- **Atualização**: um GitHub Actions roda a cada ~15 minutos, busca os números,
  publica o painel e manda a notificação pelo app gratuito **ntfy**.

> O TikTok Studio não tem uma forma oficial de ser lido por outros apps. Por isso
> o painel usa a API oficial, que exige criar um "app de desenvolvedor"
> (gratuito, uma única vez). Os números são os mesmos de visualizações por vídeo
> do Studio. Métricas exclusivas do Studio (tempo assistido, origem do tráfego)
> não estão disponíveis na API.

## Configuração (uma vez só, ~15 min)

### 1. Notificações no celular (ntfy)
1. Instale o app **ntfy** (Android: Play Store / iPhone: App Store).
2. Toque em **+** e assine um tópico com um nome difícil de adivinhar,
   ex.: `davi-tiktok-8f3k29x`. Quem souber esse nome recebe suas notificações,
   então não divulgue.

### 2. Publicar o site (GitHub Pages)
1. Junte (merge) este branch na `main`.
2. No GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Para o Pages grátis o repositório precisa ser **público**. (O painel fica
   visível para quem tiver o link, mas só mostra números que já são públicos no
   seu perfil.)

### 3. Criar o app no TikTok
1. Entre em <https://developers.tiktok.com/> com a sua conta e crie um app.
2. Preencha:
   - **Terms of Service URL**: `https://davipaivabatist567-pixel.github.io/weather-dashboard/terms.html`
   - **Privacy Policy URL**: `https://davipaivabatist567-pixel.github.io/weather-dashboard/privacy.html`
   - **Plataforma**: Web, com o site `https://davipaivabatist567-pixel.github.io/weather-dashboard/`
3. Adicione os produtos **Login Kit** e **Display API**.
4. Em Login Kit, cadastre o **Redirect URI**:
   `https://davipaivabatist567-pixel.github.io/weather-dashboard/callback.html`
5. Escopos: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`.
6. Use o modo **Sandbox** e adicione a sua própria conta do TikTok como
   *target user* — assim funciona sem precisar de aprovação do TikTok.
7. Anote o **Client key** e o **Client secret**.

### 4. Criar um token do GitHub
Ele permite que o robô guarde o login do TikTok e o último aviso enviado.
1. <https://github.com/settings/personal-access-tokens/new> (fine-grained).
2. Repository access: só `weather-dashboard`.
3. Permissions → **Secrets: Read and write** e **Variables: Read and write**.
4. Validade: a maior possível (lembre de renovar quando vencer).

### 5. Cadastrar os secrets
No repositório: **Settings → Secrets and variables → Actions → New repository secret**:

| Nome | Valor |
| --- | --- |
| `TIKTOK_CLIENT_KEY` | Client key do passo 3 |
| `TIKTOK_CLIENT_SECRET` | Client secret do passo 3 |
| `NTFY_TOPIC` | nome do tópico do passo 1 |
| `GH_PAT` | token do passo 4 |

### 6. Conectar a conta
1. Em **Actions → "TikTok – painel e notificações" → Run workflow** (sem código)
   para publicar o painel pela primeira vez.
2. Abra o painel no celular e toque em **Conectar TikTok**, autorize.
3. Na página que abrir, copie o código, toque em **Abrir GitHub Actions →
   Run workflow**, cole o código e confirme (faça logo, o código expira rápido).
4. Chega a notificação **"TikTok conectado ✅"**. Pronto! A partir daí, a cada
   100 visualizações novas no total você recebe um aviso como
   *"🎉 +100 visualizações! Total: 12.300"*, com o vídeo que mais cresceu.

## Bom saber
- O GitHub pode atrasar os agendamentos; o aviso costuma chegar entre 15 e 30
  minutos depois de bater a marca. Se passar de várias centenas de uma vez, vem
  um aviso só (ex.: "+300").
- Em repositórios sem atividade por 60 dias o GitHub pausa os agendamentos; é só
  reativar em Actions.
- O login do TikTok dura 1 ano; depois, repita o passo 6.

## Arquivos
- `site/` – o painel (HTML/CSS/JS, funciona como app no celular).
- `scripts/tiktok.mjs` – busca os dados na API do TikTok e envia as notificações.
- `.github/workflows/tiktok.yml` – roda o script a cada 15 min e publica o site.
