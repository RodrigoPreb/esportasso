export type Prioridade = "baixa" | "media" | "alta";
export type Status = "pendente" | "em_andamento" | "concluida";
export interface Partida {
  readonly id: number;
  titulo: string;
  descricao?: string;
  prioridade: Prioridade;
  status: Status;
  tags: string[];
  criadaEm: Date;
}
// O que o usuário informa ao cadastrar:
// id, status e criadaEm são responsabilidade do sistema
export type NovaPartida = Omit<Partida, "id" | "status" | "criadaEm">;
