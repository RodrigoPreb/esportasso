import { campo, elemento, selecao } from "./dom";
import {
  alterarStatus,
  buscarEstatisticas,
  buscarEu,
  cadastrarPartida,
  criarConta,
  editarPartida,
  encerrarSessao,
  entrar,
  guardarSessao,
  listarPartidas,
  removerPartida,
  sessaoAtual,
} from "./api";
import {
  contarPorStatus,
  estaAtrasada,
  existeClassicoPendente,
  filtrarPorStatus,
  ordenarPorCategoria,
  pesquisarPartidas,
  todasEncerradas,
} from "./servicos";
import type { Categoria, Contagem, Partida, Status } from "./tipos";

elemento("nome-do-sistema").textContent = "Agenda da Bola";
elemento("versao").textContent = "v1.0.0";
elemento("data-de-hoje").textContent = new Date().toLocaleDateString("pt-BR");

// O estado da página. Começa vazio: quem preenche é a API.
let lista: Partida[] = [];
let statusSelecionado: Status | "todos" = "todos";
let termoDeBusca = "";

// Como cada status aparece na tela (o valor guardado no banco continua igual)
const ROTULO_STATUS: Record<Status, string> = {
  pendente: "agendada",
  em_andamento: "em andamento",
  concluida: "encerrada",
};

function mostrarErro(erro: unknown): void {
  elemento("erro").textContent = erro instanceof Error ? erro.message : "Erro inesperado.";
}

// Uma ajudante para criar botões sem repetir código
function botao(texto: string, extra: string, aoClicar: () => void): HTMLButtonElement {
  const elementoBotao = document.createElement("button");
  elementoBotao.type = "button";
  elementoBotao.className = `botao botao--pequeno ${extra}`;
  elementoBotao.textContent = texto;
  elementoBotao.addEventListener("click", aoClicar); // callback, de novo
  return elementoBotao;
}

// "2026-11-08" -> "08/11/2026"
function formatarData(data: string): string {
  return data.split("-").reverse().join("/");
}

// Uma partida vira um <li> pronto para a tela
function criarItem(partida: Partida): HTMLLIElement {
  const item = document.createElement("li");
  item.className = `partida partida--${partida.categoria}`;
  if (partida.status === "concluida") {
    item.classList.add("partida--concluida");
  }
  if (estaAtrasada(partida)) {
    item.classList.add("partida--atrasada"); // data vencida e ainda não encerrada
  }

  const principal = document.createElement("div");
  principal.className = "partida__principal";

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
  situacao.textContent = ROTULO_STATUS[partida.status];

  meta.append(etiqueta, situacao);

  if (partida.data) {
    const dia = document.createElement("span");
    dia.className = "etiqueta etiqueta--status";
    dia.textContent = `jogo em ${formatarData(partida.data)}`;
    meta.append(dia);
  }

  // as tags voltaram: cada uma vira um <span>
  const tags = partida.tags.map((tag) => {
    const elementoTag = document.createElement("span");
    elementoTag.className = "tag";
    elementoTag.textContent = tag;
    return elementoTag;
  });
  meta.append(...tags);
  principal.append(titulo, meta);

  // Os botões: cada um fecha sobre a SUA partida
  const acoes = document.createElement("div");
  acoes.className = "partida__acoes";
  if (partida.status === "pendente") {
    acoes.append(botao("Iniciar", "", () => mudarStatus(partida.id, "em_andamento")));
  }
  if (partida.status !== "concluida") {
    acoes.append(botao("Encerrar", "botao--sucesso", () => mudarStatus(partida.id, "concluida")));
  } else {
    acoes.append(botao("Reabrir", "", () => mudarStatus(partida.id, "pendente")));
  }
  acoes.append(botao("Editar", "", () => editar(partida)));
  acoes.append(botao("Remover", "botao--perigo", () => remover(partida.id)));

  item.append(principal, acoes);
  return item;
}

// ---------- O painel: duas formas de chegar nos mesmos números ----------
function pintarPainel(contagem: Contagem): void {
  const total = contagem.pendente + contagem.em_andamento + contagem.concluida;
  elemento("total").textContent = String(total);
  elemento("pendentes").textContent = String(contagem.pendente);
  elemento("em-andamento").textContent = String(contagem.em_andamento);
  elemento("concluidas").textContent = String(contagem.concluida);
}

// VERSÃO 1, no banco (GROUP BY): é a melhor quando a lista é grande ou está
// filtrada/paginada, porque conta TODAS as partidas sem trazê-las para o navegador.
// É a que usamos normalmente.
async function atualizarPainel(): Promise<void> {
  try {
    pintarPainel(await buscarEstatisticas());
  } catch {
    // se a rota do painel falhar, ainda dá para mostrar os números da lista carregada
    atualizarPainelNoNavegador();
  }
}

// VERSÃO 2, no navegador (reduce): é a melhor quando a lista inteira já está aqui e
// pequena, porque não gasta uma ida à rede. Cuidado: só conta o que foi carregado.
function atualizarPainelNoNavegador(): void {
  pintarPainel(contarPorStatus(lista));
}

// ---------- Quais partidas mostrar: filtrar, pesquisar, ordenar ----------
// O filtro muda o que é MOSTRADO, nunca a lista que existe.
function partidasVisiveis(): Partida[] {
  let resultado = lista;
  if (statusSelecionado !== "todos") {
    resultado = filtrarPorStatus(resultado, statusSelecionado);
  }
  if (termoDeBusca.trim() !== "") {
    resultado = pesquisarPartidas(resultado, termoDeBusca);
  }
  return ordenarPorCategoria(resultado);
}

function desenhar(): void {
  const visiveis = partidasVisiveis();
  elemento("lista").replaceChildren(...visiveis.map(criarItem));
  elemento("vazio").hidden = visiveis.length > 0;

  // some: existe pelo menos um clássico agendado?
  elemento("aviso-urgente").classList.toggle("aviso--oculto", !existeClassicoPendente(lista));

  // every: todas encerradas?
  if (todasEncerradas(lista)) {
    console.log("Parabéns: nenhuma partida em aberto!");
  }
  void atualizarPainel();
}

// ---------- As ações: o trio de sempre ----------
// 1. o banco confirma  2. a lista é reatribuída (sem alterar a original)  3. a tela acompanha
async function mudarStatus(id: number, status: Status): Promise<void> {
  try {
    await alterarStatus(id, status);
    lista = lista.map((p) => (p.id === id ? { ...p, status } : p));
    elemento("erro").textContent = ""; // deu certo: apaga o erro antigo
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function remover(id: number): Promise<void> {
  try {
    await removerPartida(id);
    lista = lista.filter((p) => p.id !== id);
    elemento("erro").textContent = ""; // deu certo: apaga o erro antigo
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
}

// Prata da Aula 4: o botão Editar troca o título usando prompt()
async function editar(partida: Partida): Promise<void> {
  const novoTitulo = prompt("Novo nome da partida:", partida.titulo);
  if (novoTitulo === null) {
    return; // clicou em Cancelar
  }
  try {
    const atualizada = await editarPartida(partida.id, novoTitulo);
    lista = lista.map((p) => (p.id === partida.id ? atualizada : p));
    elemento("erro").textContent = "";
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
}

elemento("formulario").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  elemento("erro").textContent = "";
  // Ouro da Aula 6: "rodada-32, clássico" vira ["rodada-32", "clássico"]
  const tags = campo("tags")
    .value.split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
  try {
    const nova = await cadastrarPartida({
      titulo: campo("titulo").value.trim(),
      categoria: selecao("categoria").value as Categoria,
      data: campo("data").value || null, // campo de data vazio vira null
      tags,
    });
    lista = [...lista, nova]; // acrescentar sem alterar: uma lista nova
    campo("titulo").value = "";
    campo("data").value = "";
    campo("tags").value = "";
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
});

// Os botões de filtro: um só "ouvinte" para o grupo inteiro
elemento("filtros-status").addEventListener("click", (evento) => {
  const alvo = evento.target;
  if (!(alvo instanceof HTMLButtonElement)) return;
  const escolhido = alvo.dataset.status;
  if (!escolhido) return;

  statusSelecionado = escolhido as Status | "todos";
  for (const b of elemento("filtros-status").querySelectorAll("button")) {
    b.classList.toggle("filtro--ativo", b === alvo);
  }
  desenhar();
});

// A busca filtra enquanto o usuário digita
campo("busca").addEventListener("input", () => {
  termoDeBusca = campo("busca").value;
  desenhar();
});

// ---------- A tela de entrada ----------
function mostrarErroEntrada(erro: unknown): void {
  const mensagem = erro instanceof Error ? erro.message : "Erro inesperado.";
  elemento("erro-entrada").textContent = mensagem;
}

// Troca entre "Entrar" e "Criar conta"
function mostrarFormulario(criando: boolean): void {
  elemento("form-criar").hidden = !criando;
  elemento("form-entrar").hidden = criando;
  elemento("alternar-entrada").textContent = criando ? "Já tenho conta" : "Ainda não tenho conta";
  elemento("erro-entrada").textContent = "";
}

elemento("alternar-entrada").addEventListener("click", () => {
  mostrarFormulario(elemento("form-criar").hidden === true); // escondido? então mostra
});

elemento("form-entrar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  try {
    guardarSessao(await entrar(campo("entrar-email").value, campo("entrar-senha").value));
    campo("entrar-senha").value = "";
    await iniciar();
  } catch (erro) {
    mostrarErroEntrada(erro);
  }
});

elemento("form-criar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const email = campo("criar-email").value;
  const senha = campo("criar-senha").value;
  try {
    await criarConta(campo("criar-nome").value, email, senha);
    guardarSessao(await entrar(email, senha)); // criou? já entra direto
    (elemento("form-criar") as HTMLFormElement).reset(); // não deixa a senha no campo
    await iniciar();
  } catch (erro) {
    mostrarErroEntrada(erro);
  }
});

elemento("botao-sair").addEventListener("click", () => {
  encerrarSessao();
  lista = [];
  statusSelecionado = "todos";
  termoDeBusca = "";
  // a tela também volta ao começo: filtro "Todas" marcado e busca vazia
  for (const b of elemento("filtros-status").querySelectorAll("button")) {
    b.classList.toggle("filtro--ativo", b.dataset.status === "todos");
  }
  campo("busca").value = "";
  (elemento("form-entrar") as HTMLFormElement).reset();
  mostrarFormulario(false); // volta sempre para "Entrar"
  void iniciar();
});

// ---------- O começo: com sessão, mostra o sistema; sem, a entrada ----------
async function iniciar(): Promise<void> {
  const sessao = sessaoAtual();
  elemento("tela-entrada").hidden = sessao !== undefined;
  elemento("tela-app").hidden = sessao === undefined;
  elemento("botao-sair").hidden = sessao === undefined;
  elemento("usuario-nome").textContent = sessao?.nome ?? "";
  if (!sessao) {
    return;
  }
  elemento("erro").textContent = "";
  try {
    lista = await listarPartidas();
    desenhar();
    // Prata da Aula 5: o nome do cabeçalho vem da API (GET /api/eu), não da sessão guardada
    elemento("usuario-nome").textContent = (await buscarEu()).nome;
  } catch (erro) {
    mostrarErro(erro);
  }
}

void iniciar();
