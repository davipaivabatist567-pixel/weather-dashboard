// Planejamento estruturado de projetos (usado pelo servidor e pela versão HTML).
import type { Project } from "../../shared/types";
import type { AIProvider } from "./provider";

export interface ProjectPlan {
  etapas: string[];
  proximo_passo: string;
  riscos: string[];
}

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    etapas: { type: "array", items: { type: "string" } },
    proximo_passo: { type: "string" },
    riscos: { type: "array", items: { type: "string" } },
  },
  required: ["etapas", "proximo_passo", "riscos"],
  additionalProperties: false,
};

export function planProject(provider: AIProvider, project: Project): Promise<ProjectPlan> {
  const prompt = `Divida o projeto abaixo em 4 a 10 etapas pequenas, concretas e em ordem de execução (cada uma com até 120 caracteres, em português). Considere as etapas já existentes e não as repita. Indique o próximo passo imediato e até 3 riscos.

<projeto>
Nome: ${project.name}
Descrição: ${project.description || "(sem descrição)"}
Objetivo: ${project.objective || "(sem objetivo)"}
Prazo: ${project.deadline ?? "(sem prazo)"}
Etapas existentes: ${project.steps.map((s) => `${s.done ? "[feita]" : "[pendente]"} ${s.title}`).join("; ") || "(nenhuma)"}
Notas: ${project.notes || "(sem notas)"}
</projeto>`;
  return provider.structured<ProjectPlan>(prompt, PLAN_SCHEMA);
}
