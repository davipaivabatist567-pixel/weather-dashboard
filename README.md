# weather-dashboard
Weather Dashboard - Fetches real-time weather data from a public API with beautiful UI

## Painel do Clima

Site estático (HTML, CSS e JavaScript puros, sem dependências) que mostra o clima em tempo real usando a API pública e gratuita [Open-Meteo](https://open-meteo.com/) — não precisa de chave de API.

### Recursos
- Busca de cidades com sugestões (navegação por teclado)
- Clima atual: temperatura, sensação térmica, umidade, vento, precipitação, pressão, índice UV, nascer e pôr do sol
- Gráfico e lista das próximas 24 horas com chance de chuva
- Previsão de 7 dias com faixa de mínima/máxima
- Botão de localização atual (geolocalização do navegador)
- Alternância °C / °F e tema claro / escuro (as preferências ficam salvas)
- Layout responsivo para celular
- Atualização automática a cada 10 minutos

### Como usar
Abra o `index.html` no navegador, ou sirva a pasta localmente:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

Para publicar, basta ativar o GitHub Pages no repositório (Settings → Pages → branch e pasta raiz).
