import { describe, expect, it } from "vitest";
import { ClapDetector, DEFAULT_CLAP, thresholdFromSensitivity } from "../../src/lib/clap";
import { parseCommand } from "../../src/lib/commands";

/** Simula o microfone: lista de [início s, duração s, nível] sobre um ruído de fundo, amostras a cada 20 ms. */
function simular(sons: [number, number, number][], total = 3, ruido = 0.004) {
  const d = new ClapDetector({ ...DEFAULT_CLAP, threshold: thresholdFromSensitivity(5) });
  const disparos: number[] = [];
  for (let t = 0; t <= total; t += 0.02) {
    const som = sons.find(([ini, dur]) => t >= ini && t < ini + dur);
    if (d.push(som ? som[2] : ruido, t)) disparos.push(Number(t.toFixed(2)));
  }
  return disparos;
}

describe("ClapDetector (duas palmas, como o VISION)", () => {
  it("duas palmas curtas com 0,3 s de intervalo ativam uma vez", () => {
    expect(simular([[1.0, 0.04, 0.3], [1.3, 0.04, 0.3]])).toHaveLength(1);
  });
  it("uma palma só não ativa", () => {
    expect(simular([[1.0, 0.04, 0.3]])).toHaveLength(0);
  });
  it("palmas lentas demais (1,2 s) não ativam", () => {
    expect(simular([[0.5, 0.04, 0.3], [1.7, 0.04, 0.3]])).toHaveLength(0);
  });
  it("som longo e alto (fala, música) não conta como palma", () => {
    expect(simular([[0.5, 0.6, 0.3], [1.3, 0.6, 0.3]])).toHaveLength(0);
  });
  it("sons fracos abaixo do limiar não ativam", () => {
    expect(simular([[1.0, 0.04, 0.02], [1.3, 0.04, 0.02]])).toHaveLength(0);
  });
  it("três palmas rápidas ativam uma vez (a terceira começa um novo par)", () => {
    expect(simular([[1.0, 0.04, 0.3], [1.3, 0.04, 0.3], [1.6, 0.04, 0.3]])).toHaveLength(1);
  });
  it("sensibilidade maior = limiar menor", () => {
    expect(thresholdFromSensitivity(9)).toBeLessThan(thresholdFromSensitivity(5));
    expect(thresholdFromSensitivity(5)).toBeCloseTo(2000 / 32768, 2); // mesmo limiar padrão do VISION
  });
});

describe("Comandos no estilo VISION", () => {
  it("abrir sites", () => {
    expect(parseCommand("Orion, abrir YouTube")).toEqual({ type: "open_site", site: "youtube" });
    expect(parseCommand("abre o whatsapp")).toEqual({ type: "open_site", site: "whatsapp" });
    expect(parseCommand("abrir google maps")).toEqual({ type: "open_site", site: "maps" });
  });
  it("pesquisa no Google/YouTube só quando o site é citado (sem site vai para a IA)", () => {
    expect(parseCommand("pesquisar receita de bolo no google")).toEqual({ type: "web_search", platform: "google", query: "receita de bolo" });
    expect(parseCommand("procure tutoriais de python no YouTube")).toEqual({ type: "web_search", platform: "youtube", query: "tutoriais de python" });
    expect(parseCommand("pesquise sobre buracos negros")).toBeNull();
  });
  it("tocar música", () => {
    expect(parseCommand("toca Believer")).toEqual({ type: "play", query: "believer" });
    expect(parseCommand("coloca a música do Imagine Dragons pra tocar")).toEqual({ type: "play", query: "imagine dragons" });
  });
  it("foto, bateria, holograma, dormir, apresentação", () => {
    expect(parseCommand("tira uma foto")).toEqual({ type: "photo" });
    expect(parseCommand("quanto de bateria eu tenho?")).toEqual({ type: "battery" });
    expect(parseCommand("abrir holograma")).toEqual({ type: "hologram", open: true });
    expect(parseCommand("fecha o holograma")).toEqual({ type: "hologram", open: false });
    expect(parseCommand("pode dormir")).toEqual({ type: "sleep" });
    expect(parseCommand("quem é você?")).toEqual({ type: "introduce" });
  });
  it("volume é o da voz do Orion; print e pastas são recusados com honestidade", () => {
    expect(parseCommand("volume 40")).toEqual({ type: "voice_volume", mode: "set", value: 40 });
    expect(parseCommand("aumentar o volume")).toEqual({ type: "voice_volume", mode: "up", value: undefined });
    expect(parseCommand("abaixa o som")).toEqual({ type: "voice_volume", mode: "down" });
    expect(parseCommand("tira um print da tela")).toEqual({ type: "unsupported", what: "screenshot" });
    expect(parseCommand("cria uma pasta chamada projetos")).toEqual({ type: "unsupported", what: "folder" });
  });
  it("não rouba perguntas normais nem os comandos antigos", () => {
    expect(parseCommand("qual a capacidade da bateria do meu projeto do anel?")).toBeNull();
    expect(parseCommand("abrir projetos")).toEqual({ type: "navigate", page: "projetos" });
    expect(parseCommand("ativar câmera")).toEqual({ type: "camera", on: true });
    expect(parseCommand("me explique como funciona uma foto digital")).toBeNull();
  });
});
