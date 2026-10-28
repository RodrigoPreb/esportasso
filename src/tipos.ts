// Prioridade = relevância do jogo (baixa = jogo comum, alta = clássico/decisão)
export type Prioridade = "baixa" | "media" | "alta";
// Status = situação da partida (pendente = agendada, concluida = encerrada)
export type Status = "pendente" | "em_andamento" | "concluida";
export interface Partida {
  readonly id: number;
  titulo: string; // ex.: "Flamengo x Palmeiras"
  descricao?: string | null; // no banco, "sem valor" é NULL
  prioridade: Prioridade;
  status: Status;
  tags: string[];
  data?: string | null; // NOVO: data da partida, ex.: "2026-11-08" ou null
  criadaEm: Date;
}
// O que o usuário informa ao cadastrar:
// id, status e criadaEm são responsabilidade do sistema
export type NovaPartida = Omit<Partida, "id" | "status" | "criadaEm">;
