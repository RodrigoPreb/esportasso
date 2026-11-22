import type { Categoria, Contagem, Partida, Status } from "./tipos";

// ---------- filter e find: selecionar ----------
export function filtrarPorStatus(lista: Partida[], status: Status): Partida[] {
  return lista.filter((p) => p.status === status);
}

// Pesquisa sem diferenciar maiúsculas de minúsculas, no título e nas tags (Ouro da Aula 6)
export function pesquisarPartidas(lista: Partida[], termo: string): Partida[] {
  const procurado = termo.trim().toLowerCase();
  return lista.filter(
    (p) =>
      p.titulo.toLowerCase().includes(procurado) ||
      p.tags.some((tag) => tag.toLowerCase().includes(procurado))
  );
}

// ---------- some e every: perguntas de sim ou não ----------
export function existeClassicoPendente(lista: Partida[]): boolean {
  return lista.some((p) => p.categoria === "clássico" && p.status === "pendente");
}

export function todasEncerradas(lista: Partida[]): boolean {
  return lista.length > 0 && lista.every((p) => p.status === "concluida");
}

// ---------- reduce: o painel calculado no navegador ----------
export function contarPorStatus(lista: Partida[]): Contagem {
  return lista.reduce<Contagem>(
    (acumulador, p) => {
      acumulador[p.status]++;
      return acumulador; // não esqueça este return!
    },
    { pendente: 0, em_andamento: 0, concluida: 0 }
  );
}

// ---------- sort: ordenar sem estragar o original ----------
const pesoCategoria: Record<Categoria, number> = { clássico: 3, decisivo: 2, comum: 1 };

export function ordenarPorCategoria(lista: Partida[]): Partida[] {
  return [...lista].sort((a, b) => pesoCategoria[b.categoria] - pesoCategoria[a.categoria]);
}

// ---------- Ouro da Aula 4: data vencida ----------
// Uma partida está atrasada se a data já passou e ela ainda não foi encerrada.
// "2026-11-08" é texto no formato ano-mês-dia, então comparar como texto funciona.
export function estaAtrasada(partida: Partida, hoje: Date = new Date()): boolean {
  if (!partida.data || partida.status === "concluida") {
    return false;
  }
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return partida.data < `${hoje.getFullYear()}-${mes}-${dia}`;
}

// A SUA função de alta ordem (Aula 2): recebe uma lista e uma regra
export function transformar<T, R>(lista: T[], regra: (item: T) => R): R[] {
  const resultado: R[] = [];
  for (const item of lista) {
    resultado.push(regra(item));
  }
  return resultado;
}
