// Categoria = importância do jogo (comum, decisivo ou clássico)
export type Categoria = "comum" | "decisivo" | "clássico";
// Status = situação da partida (pendente = agendada, concluida = encerrada)
export type Status = "pendente" | "em_andamento" | "concluida";

export interface Partida {
  readonly id: number;
  titulo: string; // ex.: "Flamengo x Palmeiras"
  descricao?: string | null;
  categoria: Categoria;
  status: Status;
  tags: string[];
  data?: string | null; // data da partida, ex.: "2026-11-08"
  criadaEm: Date;
}

// O que o usuário informa ao cadastrar:
// id, status e criadaEm são responsabilidade do sistema
export type NovaPartida = Omit<Partida, "id" | "status" | "criadaEm">;

// Quem está logado. A API devolve isto no login.
export interface Sessao {
  token: string;
  nome: string;
}

// Os números do painel. Record garante que as três chaves existam.
export type Contagem = Record<Status, number>;
