import { campo, elemento, selecao } from "./dom";
import { partidas } from "./dados";
import type { Prioridade, Partida } from "./tipos";
import { adicionarPartida, transformar } from "./servicos";
elemento("nome-do-sistema").textContent = "TaskFlow";
elemento("versao").textContent = "v0.2.0";
elemento("data-de-hoje").textContent = new Date().toLocaleDateString("pt-BR");
// O estado do programa: a lista que está valendo agora
const lista: Partida[] = [...partidas];
// Uma tarefa vira um <li> pronto para a tela
function criarItem(partida: Partida): HTMLLIElement {
  const item = document.createElement("li");
  item.className = `partida partida--${partida.prioridade}`;
  const titulo = document.createElement("h3");
  titulo.className = "partida__titulo";
  titulo.textContent = `#${partida.id} ${partida.titulo}`;
  const etiqueta = document.createElement("span");
  etiqueta.className = `etiqueta etiqueta--${partida.prioridade}`;
  etiqueta.textContent = partida.prioridade;
  item.append(titulo, etiqueta);
  return item;
}
// A função que desenha a tela inteira a partir da lista
function desenhar(): void {
  const itens = transformar(lista, criarItem); // a SUA função de alta ordem
  elemento("lista").replaceChildren(...itens);
  let pendentes = 0;
  for (const partida of lista) {
    if (partida.status === "pendente") {
      pendentes++;
    }
  }
  elemento("total").textContent = String(lista.length);
  elemento("pendentes").textContent = String(pendentes);
}
// O formulário: a função abaixo é um CALLBACK — quem a chama é o navegador
elemento("formulario").addEventListener("submit", (evento) => {
  evento.preventDefault(); // sem isto, a página recarrega e tudo se perde
  elemento("erro").textContent = "";
  try {
    adicionarPartida(lista, {
      titulo: campo("titulo").value.trim(),
      prioridade: selecao("prioridade").value as Prioridade,
      tags: [],
    });
    campo("titulo").value = "";
    desenhar(); // mudou a lista? desenhe de novo
  } catch (erro) {
    if (erro instanceof Error) {
      elemento("erro").textContent = erro.message;
    }
  }
});
desenhar();
