// Saudações dinâmicas: variam com o horário e evitam repetir a última usada.

const BY_PERIOD: Record<"madrugada" | "manha" | "tarde" | "noite", string[]> = {
  madrugada: [
    "Trabalhando até tarde? Orion online e sem sono — vantagens de não ter um.",
    "Madrugada produtiva detectada. O que vamos construir?",
    "Sistemas ativos. A cidade dorme, o laboratório não.",
  ],
  manha: [
    "Bom dia. Orion está online. O que vamos desenvolver hoje?",
    "Bom dia. Todos os sistemas responderam à verificação inicial. Por onde começamos?",
    "Bom dia. Café pronto? Eu já estou.",
  ],
  tarde: [
    "Boa tarde. Orion online e pronto para trabalhar.",
    "Boa tarde. Que problema vamos resolver agora?",
    "Boa tarde. Laboratório operacional. Qual é o próximo projeto?",
  ],
  noite: [
    "Boa noite. Orion online. Vamos continuar de onde paramos?",
    "Boa noite. Hora ideal para ideias ambiciosas. O que tem em mente?",
    "Boa noite. Sistemas estáveis, interface pronta. Em que posso ajudar?",
  ],
};

export function period(hour: number): keyof typeof BY_PERIOD {
  if (hour < 5) return "madrugada";
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

export function pickGreeting(now = new Date(), random = Math.random): string {
  const options = BY_PERIOD[period(now.getHours())];
  let last: string | null = null;
  try {
    last = localStorage.getItem("orion.lastGreeting");
  } catch {
    /* armazenamento indisponível */
  }
  const pool = options.filter((g) => g !== last);
  const choice = pool[Math.floor(random() * pool.length)] ?? options[0];
  try {
    localStorage.setItem("orion.lastGreeting", choice);
  } catch {
    /* ignora */
  }
  return choice;
}
