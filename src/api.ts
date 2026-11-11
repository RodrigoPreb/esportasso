import type { Partida } from "./tipos";

// Mensagem amigável para quando a API não responde (desafio Ouro)
const API_FORA_DO_AR =
  "Não conseguimos carregar as partidas agora. A API está rodando? Abra um terminal na pasta api e rode npm run dev.";

// Todas as partidas que estão no banco
export async function listarPartidas(): Promise<Partida[]> {
  let resposta: Response;
  try {
    resposta = await fetch("/api/partidas");
  } catch {
    // fetch falha (sem resposta nenhuma) quando não há servidor atendendo
    throw new Error(API_FORA_DO_AR);
  }
  if (!resposta.ok) {
    // com o Vite no meio, a API parada costuma chegar aqui como erro 500
    throw new Error(API_FORA_DO_AR);
  }
  const bruto = (await resposta.json()) as Partida[];
  // JSON não tem data: criadaEm chega como texto e precisa virar Date
  return bruto.map((p) => ({ ...p, criadaEm: new Date(p.criadaEm) }));
}

// Uma partida: devolve undefined se ela não existir (o mesmo padrão do find)
export async function buscarPartida(id: number): Promise<Partida | undefined> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api/partidas/${id}`);
  } catch {
    throw new Error(API_FORA_DO_AR);
  }
  if (resposta.status === 404) {
    return undefined;
  }
  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao buscar a partida #${id}.`);
  }
  const bruto = (await resposta.json()) as Partida;
  return { ...bruto, criadaEm: new Date(bruto.criadaEm) };
}
