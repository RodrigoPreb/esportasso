import type { Contagem, NovaPartida, Partida, Sessao, Status } from "./tipos";

const CHAVE_SESSAO = "agendadabola:sessao";

// ---------- A sessão: o "crachá" guardado no navegador ----------
export function sessaoAtual(): Sessao | undefined {
  try {
    const texto = localStorage.getItem(CHAVE_SESSAO);
    return texto ? (JSON.parse(texto) as Sessao) : undefined;
  } catch {
    return undefined; // localStorage bloqueado ou texto quebrado: sem sessão
  }
}

export function guardarSessao(sessao: Sessao): void {
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

export function encerrarSessao(): void {
  localStorage.removeItem(CHAVE_SESSAO);
}

// Mensagem amigável para quando a API não responde (Ouro da Aula 3)
const API_FORA_DO_AR =
  "A API não respondeu. Abra um terminal na pasta api e rode npm run dev.";

// A ajudante que todas as chamadas usam: monta o pedido, mostra o crachá e trata o erro
async function enviar(metodo: string, url: string, corpo?: unknown): Promise<Response> {
  const sessao = sessaoAtual();
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(sessao ? { Authorization: `Bearer ${sessao.token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    // fetch rejeita quando não há ninguém atendendo
    throw new Error(API_FORA_DO_AR);
  }
  // crachá vencido ou inválido: volta para a tela de entrada
  if (resposta.status === 401 && sessao) {
    encerrarSessao();
    location.reload();
  }
  if (!resposta.ok) {
    // a API manda { erro: "..." }; se não mandar, usamos o código
    const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
    // sem { erro } e com status 5xx: o Vite não achou a API na porta 3000
    const semApi = dados.erro === undefined && resposta.status >= 500;
    throw new Error(dados.erro ?? (semApi ? API_FORA_DO_AR : `Erro ${resposta.status}`));
  }
  return resposta;
}

// JSON não tem data: criadaEm chega como texto e precisa virar Date
function converter(partida: Partida): Partida {
  return { ...partida, criadaEm: new Date(partida.criadaEm) };
}

// ---------- Partidas (CRUD) ----------
// Aula 6: a lista aceita filtros que o BANCO aplica (?status=...&busca=...)
export async function listarPartidas(status?: Status, busca?: string): Promise<Partida[]> {
  const filtros = new URLSearchParams();
  if (status) filtros.set("status", status);
  if (busca?.trim()) filtros.set("busca", busca.trim());
  const texto = filtros.toString();
  const resposta = await enviar("GET", `/api/partidas${texto ? `?${texto}` : ""}`);
  const bruto = (await resposta.json()) as Partida[];
  return bruto.map(converter);
}

// Uma partida: devolve undefined se ela não existir (o mesmo padrão do find)
export async function buscarPartida(id: number): Promise<Partida | undefined> {
  try {
    const resposta = await enviar("GET", `/api/partidas/${id}`);
    return converter((await resposta.json()) as Partida);
  } catch (erro) {
    if (erro instanceof Error && erro.message.includes("não encontrada")) {
      return undefined;
    }
    throw erro;
  }
}

export async function cadastrarPartida(dados: NovaPartida): Promise<Partida> {
  const resposta = await enviar("POST", "/api/partidas", dados);
  return converter((await resposta.json()) as Partida);
}

export async function alterarStatus(id: number, status: Status): Promise<void> {
  await enviar("PATCH", `/api/partidas/${id}/status`, { status });
}

// Prata da Aula 4: troca o título (PUT)
export async function editarPartida(id: number, titulo: string): Promise<Partida> {
  const resposta = await enviar("PUT", `/api/partidas/${id}`, { titulo });
  return converter((await resposta.json()) as Partida);
}

export async function removerPartida(id: number): Promise<void> {
  await enviar("DELETE", `/api/partidas/${id}`);
}

// Os números do painel, calculados pelo banco com GROUP BY
export async function buscarEstatisticas(): Promise<Contagem> {
  const resposta = await enviar("GET", "/api/estatisticas");
  return (await resposta.json()) as Contagem;
}

// ---------- Usuários ----------
export async function entrar(email: string, senha: string): Promise<Sessao> {
  const resposta = await enviar("POST", "/api/login", { email, senha });
  return (await resposta.json()) as Sessao;
}

export async function criarConta(nome: string, email: string, senha: string): Promise<void> {
  await enviar("POST", "/api/usuarios", { nome, email, senha });
}

// Prata da Aula 5: quem sou eu, segundo a API (nunca vem a senha)
export async function buscarEu(): Promise<{ id: number; nome: string; email: string }> {
  const resposta = await enviar("GET", "/api/eu");
  return (await resposta.json()) as { id: number; nome: string; email: string };
}
