
export type Categoria = "comum" | "decisivo" | "clássico";

export type Status = "pendente" | "em_andamento" | "concluida";
export interface Partida {
  readonly id: number;
  titulo: string;
  descricao?: string | null;
  categoria: Categoria;
  status: Status;
  tags: string[];
  data?: string | null;
  criadaEm: Date;
}

export type NovaPartida = Omit<Partida, "id" | "status" | "criadaEm">;
