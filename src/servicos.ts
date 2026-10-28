import type { NovaPartida, Partida } from "./tipos";
// Gera o próximo id a partir do maior id já existente
function gerarId(lista: Partida[]): number {
  let maior = 0;
  for (const partida of lista) {
    if (partida.id > maior) {
      maior = partida.id;
    }
  }
  return maior + 1;
}
// Cadastra uma partida: o usuário informa só o essencial
export function adicionarPartida(lista: Partida[], dados: NovaPartida): Partida {
  if (dados.titulo.trim().length < 3) {
    throw new Error("O título precisa ter pelo menos 3 caracteres.");
  }
  const partida: Partida = {
    ...dados,
    id: gerarId(lista),
    status: "pendente",
    criadaEm: new Date(),
  };
  lista.push(partida);
  return partida;
}
// A SUA função de alta ordem: recebe uma lista e uma regra
export function transformar<T, R>(lista: T[], regra: (item: T) => R): R[] {
  const resultado: R[] = [];
  for (const item of lista) {
    resultado.push(regra(item));
  }
  return resultado;
} 
