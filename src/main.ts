import { campo, elemento, selecao } from "./dom";
import { buscarPartida, listarPartidas } from "./api";
import type { Categoria, Partida } from "./tipos";
import { adicionarPartida } from "./servicos";

elemento("nome-do-sistema").textContent = "Agenda da Bola";
elemento("versao").textContent = "v0.3.0";
elemento("data-de-hoje").textContent = new Date().toLocaleDateString("pt-BR");

// Começa vazia: quem preenche é a API (e por isso é let, não const)
let lista: Partida[] = [];

// Uma partida vira um <li> pronto para a tela
function criarItem(partida: Partida): HTMLLIElement {
  const item = document.createElement("li");
  item.className = `partida partida--${partida.categoria}`;

  const titulo = document.createElement("h3");
  titulo.className = "partida__titulo";
  titulo.textContent = `#${partida.id} ${partida.titulo}`;

  const meta = document.createElement("div");
  meta.className = "partida__meta";

  const etiqueta = document.createElement("span");
  etiqueta.className = `etiqueta etiqueta--${partida.categoria}`;
  etiqueta.textContent = partida.categoria;

  const situacao = document.createElement("span");
  situacao.className = "etiqueta etiqueta--status";
  situacao.textContent = partida.status;

  // map de novo: cada tag vira um <span>
  const tags = partida.tags.map((tag) => {
    const elementoTag = document.createElement("span");
    elementoTag.className = "tag";
    elementoTag.textContent = tag;
    return elementoTag;
  });

  meta.append(etiqueta, situacao, ...tags);
  item.append(titulo, meta);
  return item;
}

// A função que desenha a tela inteira a partir da lista
function desenhar(): void {
  // map: transforma cada partida em um <li>
  elemento("lista").replaceChildren(...lista.map(criarItem));

  // filter: só as que passam no teste
  const pendentes = lista.filter((p) => p.status === "pendente");
  elemento("total").textContent = String(lista.length);
  elemento("pendentes").textContent = String(pendentes.length);
}

// O cadastro ainda grava só na tela. Na Aula 4 ele vai para o banco.
elemento("formulario").addEventListener("submit", (evento) => {
  evento.preventDefault();
  elemento("erro").textContent = "";
  try {
    adicionarPartida(lista, {
      titulo: campo("titulo").value.trim(),
      categoria: selecao("categoria").value as Categoria,
      tags: [],
    });
    campo("titulo").value = "";
    desenhar();
  } catch (erro) {
    if (erro instanceof Error) {
      elemento("erro").textContent = erro.message;
    }
  }
});

// Desafio Prata: busca UMA partida pelo id e mostra o título no console
async function mostrarPartida(id: number): Promise<void> {
  const procurada = await buscarPartida(id); // Partida | undefined
  if (procurada) {
    console.log(`Encontrada: ${procurada.titulo}`);
  } else {
    console.log("Partida não encontrada");
  }
}

// O começo do programa: busca no banco, depois desenha
async function iniciar(): Promise<void> {
  try {
    lista = await listarPartidas();
    desenhar();
    await mostrarPartida(3);
    await mostrarPartida(99); // não existe: cai no else
  } catch (erro) {
    // Desafio Ouro: a mensagem amigável aparece na TELA, não só no console
    if (erro instanceof Error) {
      elemento("erro").textContent = erro.message;
    }
  }
}

iniciar();
