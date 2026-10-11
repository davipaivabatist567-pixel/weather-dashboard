import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChatAttachment, Permissions } from "../../shared/types";
import { buildSystemPrompt, toolsFor } from "../../server/ai/core";
import { learnFromAttachments, learnFromConversation } from "../../server/ai/learner";
import type { AIProvider } from "../../server/ai/provider";
import { chunkText, KnowledgeIndex, tokenize } from "../../server/knowledge/search";
import { createFileStore } from "../../server/storage/filePersistence";
import { Store, type Persistence } from "../../server/storage/store";
import { executeTool, findTool, PendingActions } from "../../server/tools/registry";

const tmpStore = () => createFileStore(join(mkdtempSync(join(tmpdir(), "orion-learn-")), "db.json"));
const ALL: Permissions = { readMemory: true, writeMemory: true, manageProjects: true, webSearch: true };

/** Provedor falso que devolve uma saída estruturada fixa e registra o pedido. */
const fakeProvider = (output: unknown) => {
  const calls: { prompt: string; attachments?: ChatAttachment[] }[] = [];
  const provider: AIProvider = {
    name: "Fake",
    model: "fake",
    supportsWebSearch: false,
    chat: async () => ({ stopReason: "end_turn", model: "fake" }),
    structured: async <T,>(prompt: string, _schema: unknown, opts?: { attachments?: ChatAttachment[] }) => {
      calls.push({ prompt, attachments: opts?.attachments });
      return output as T;
    },
  };
  return { provider, calls };
};

describe("busca na base de conhecimento", () => {
  it("normaliza acentos, plurais e palavras vazias", () => {
    expect(tokenize("As Funções da Fotossíntese")).toEqual(tokenize("função fotossíntese"));
    for (const [plural, sing] of [["animais", "animal"], ["flores", "flor"], ["papéis", "papel"], ["homens", "homem"], ["robôs", "robô"], ["pães", "pão"]]) {
      expect(tokenize(plural), plural).toEqual(tokenize(sing));
    }
    expect(tokenize("de da do e o a")).toEqual([]);
  });

  it("divide textos longos em trechos sem perder conteúdo", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Parágrafo ${i}. ${"palavra ".repeat(30)}`).join("\n\n");
    const chunks = chunkText(text, 900);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length <= 900)).toBe(true);
    expect(chunks.join(" ")).toContain("Parágrafo 29");
  });

  it("encontra o trecho certo por relevância", () => {
    const index = new KnowledgeIndex([
      { id: "1", title: "Biologia", content: "A fotossíntese transforma luz em energia química nas plantas.\n\nAs mitocôndrias fazem a respiração celular." },
      { id: "2", title: "Meu jogo", content: "No jogo Aventura do Pinguim, o pinguim coleta peixes para ganhar vidas extras." },
      { id: "3", title: "Receita", content: "Bolo de cenoura: 3 cenouras, 4 ovos, 2 xícaras de açúcar." },
    ]);
    expect(index.search("como o pinguim ganha vidas?")[0].docId).toBe("2");
    expect(index.search("o que é fotossíntese")[0].docId).toBe("1");
    expect(index.search("ingredientes do bolo de cenoura")[0].docId).toBe("3");
    expect(index.search("física quântica")).toEqual([]);
    // coleção com um único documento ainda encontra o termo
    expect(new KnowledgeIndex([{ id: "x", title: "Sobre", content: "O Orion foi criado pelo Davi." }]).search("quem fez o Orion")).toHaveLength(1);
  });
});

describe("armazenamento do conhecimento", () => {
  it("guarda, busca, persiste e apaga documentos", () => {
    const s = tmpStore();
    const doc = s.addKnowledge("Regras do jogo", "O jogador perde quando o pinguim cai na água gelada.");
    expect(s.searchKnowledge("quando o jogador perde")[0].docId).toBe(doc.id);
    const again = createFileStore(s.path);
    expect(again.listKnowledge()).toHaveLength(1);
    expect(again.searchKnowledge("pinguim água")).toHaveLength(1);
    again.deleteKnowledge(doc.id);
    expect(again.searchKnowledge("pinguim")).toEqual([]);
  });

  it("remove credenciais dos documentos, mas aceita a palavra senha", () => {
    const s = tmpStore();
    const d = s.addKnowledge("Config", "Use a chave sk-ant-api03-abcdefghijklmnopqrstuv para testar.\nO campo senha deve ter 8 letras.");
    expect(d.redacted).toBe(1);
    const full = s.getKnowledge(d.id)!.content;
    expect(full).not.toContain("sk-ant");
    expect(full).toContain("O campo senha deve ter 8 letras");
  });

  it("não aprende com a memória desativada e não busca nada", () => {
    const s = tmpStore();
    s.addKnowledge("A", "conteúdo sobre robôs");
    s.setMemoryEnabled(false);
    expect(() => s.addKnowledge("B", "outro")).toThrow(/desativada/);
    expect(s.searchKnowledge("robôs")).toEqual([]);
    expect(s.learningEnabled).toBe(false);
  });

  it("evita memórias duplicadas", () => {
    const s = tmpStore();
    const a = s.addMemory("O usuário gosta de xadrez.");
    const b = s.addMemory("o usuário gosta de XADREZ");
    expect(b.id).toBe(a.id);
    expect(s.listMemory()).toHaveLength(1);
  });

  it("desfaz a alteração quando o armazenamento está cheio", () => {
    let saved: string | null = null;
    let full = false;
    const p: Persistence = {
      label: "teste",
      load: () => (saved ? JSON.parse(saved) : null),
      save: (json) => {
        if (full) throw new Error("QuotaExceededError");
        saved = json;
      },
    };
    const s = new Store(p);
    s.addKnowledge("A", "primeiro documento");
    full = true;
    expect(() => s.addKnowledge("B", "segundo documento")).toThrow(/salvar/);
    expect(s.listKnowledge().map((d) => d.title)).toEqual(["A"]);
  });
});

describe("aprendizado", () => {
  it("aprende fatos da conversa sem duplicar e recusa dados sensíveis", async () => {
    const store = tmpStore();
    store.addMemory("O usuário se chama Davi.");
    const { provider, calls } = fakeProvider({
      aprendizados: [
        { conteudo: "O usuário está criando o jogo Aventura do Pinguim.", categoria: "projeto" },
        { conteudo: "O usuário se chama Davi.", categoria: "geral" },
        { conteudo: "A senha: 1234 do usuário", categoria: "geral" },
      ],
    });
    const r = await learnFromConversation(provider, store, [
      { role: "user", content: "Estou criando o jogo Aventura do Pinguim" },
      { role: "assistant", content: "Que legal!" },
    ]);
    expect(r.learned.map((m) => m.content)).toEqual(["O usuário está criando o jogo Aventura do Pinguim."]);
    expect(r.learned[0].origin).toBe("automatico");
    expect(r.skipped).toHaveLength(1);
    expect(store.listMemory()).toHaveLength(2);
    expect(calls[0].prompt).toContain("O usuário se chama Davi."); // envia o que já sabe para evitar repetição
  });

  it("respeita o aprendizado automático desligado, mas aceita pedidos explícitos", async () => {
    const store = tmpStore();
    store.setLearningEnabled(false);
    const { provider, calls } = fakeProvider({ aprendizados: [{ conteudo: "O usuário gosta de robótica.", categoria: "preferencia" }] });
    const turns = [{ role: "user" as const, content: "gosto de robótica" }];
    expect((await learnFromConversation(provider, store, turns)).learned).toHaveLength(0);
    expect(calls).toHaveLength(0);
    expect((await learnFromConversation(provider, store, turns, { explicit: true })).learned).toHaveLength(1);
  });

  it("guarda arquivos de texto direto e usa a IA para PDFs e imagens", async () => {
    const store = tmpStore();
    const { provider, calls } = fakeProvider({ titulo: "Resumo da aula", conteudo: "A Revolução Francesa começou em 1789." });
    const r = await learnFromAttachments(provider, store, [
      { name: "notas.md", kind: "text", mediaType: "text/markdown", data: "# Notas\nO Brasil tem 26 estados e o Distrito Federal." },
      { name: "aula.pdf", kind: "pdf", mediaType: "application/pdf", data: "JVBERi0=" },
    ]);
    expect(r.knowledge.map((k) => k.title)).toEqual(["notas.md", "Resumo da aula (aula.pdf)"]);
    expect(calls).toHaveLength(1);
    expect(calls[0].attachments?.[0].name).toBe("aula.pdf");
    expect(store.searchKnowledge("quando começou a revolução francesa")[0].title).toContain("aula.pdf");
  });

  it("sem IA, guarda só os arquivos de texto e explica o resto", async () => {
    const store = tmpStore();
    const r = await learnFromAttachments(null, store, [
      { name: "a.txt", kind: "text", mediaType: "text/plain", data: "conteúdo" },
      { name: "foto.png", kind: "image", mediaType: "image/png", data: "iVBOR" },
    ]);
    expect(r.knowledge).toHaveLength(1);
    expect(r.skipped[0]).toMatch(/foto\.png.*IA/);
  });
});

describe("o conhecimento chega à IA", () => {
  it("injeta os trechos relevantes no contexto quando autorizado", () => {
    const store = tmpStore();
    store.addKnowledge("Meu jogo", "No jogo Aventura do Pinguim, o chefe final é a Morsa Gigante.");
    const req = { mode: "assistente" as const, messages: [{ role: "user" as const, content: "quem é o chefe final do meu jogo do pinguim?" }], permissions: ALL };
    const prompt = buildSystemPrompt(req, store, false);
    expect(prompt).toContain("<conhecimento_do_usuario>");
    expect(prompt).toContain("Morsa Gigante");
    expect(buildSystemPrompt({ ...req, permissions: { ...ALL, readMemory: false } }, store, false)).not.toContain("Morsa Gigante");
  });

  it("ferramentas de busca e de aprender funcionam e respeitam permissões", async () => {
    const store = tmpStore();
    const ctx = { store, permissions: ALL, pending: new PendingActions() };
    const learned = await executeTool(findTool("aprender_texto")!, { titulo: "Química", conteudo: "A água ferve a 100 °C ao nível do mar." }, ctx);
    expect(learned.ok).toBe(true);
    const found = await executeTool(findTool("conhecimento_buscar")!, { consulta: "temperatura em que a água ferve" }, ctx);
    expect(found.content).toContain("100 °C");
    const names = toolsFor({ mode: "assistente", permissions: { ...ALL, writeMemory: false } }, true).map((t) => t.name);
    expect(names).toContain("conhecimento_buscar");
    expect(names).not.toContain("aprender_texto");
  });
});
