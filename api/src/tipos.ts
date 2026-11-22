// Os valores aceitos ficam em listas (para validar no servidor com includes)
// e os tipos são tirados delas, assim os dois nunca ficam diferentes.
export const CATEGORIAS = ["comum", "decisivo", "clássico"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const STATUS = ["pendente", "em_andamento", "concluida"] as const;
export type Status = (typeof STATUS)[number];

// O que chega no corpo de POST/PUT /api/partidas.
// Tudo é opcional porque vem de fora: quem confere é a função validar().
export interface DadosPartida {
  titulo?: string;
  descricao?: string | null;
  categoria?: Categoria;
  data?: string | null;
  tags?: string[];
}
