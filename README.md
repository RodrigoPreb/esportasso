# Agenda da Bola

Agenda de partidas do Brasileirão: cada usuário entra com a sua conta, cadastra jogos
(com categoria, data e tags), acompanha o andamento e vê o painel com os números.

Projeto da disciplina — Grupo Anchieta, 2026.
Grupo: Fabricio, Rodrigo, Guilherme

## Como rodar

Pré-requisitos: Node.js (versão LTS) e MySQL (ou MariaDB/XAMPP).

1. **Banco:** abra o `banco/script.sql` no MySQL Workbench (ou phpMyAdmin) e execute tudo.
   Isso cria o banco `AgendadaBola`, as tabelas e os dados de exemplo.
2. **API:** na pasta `api`, copie `.env.exemplo` para `.env`, preencha a senha do MySQL
   (`DB_SENHA`) e troque o `JWT_SEGREDO` por um texto aleatório seu. Para gerar um:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   O `.env` nunca vai para o GitHub (está no `.gitignore`). Depois:
   ```
   cd api
   npm install
   npm run dev
   ```
   A API fica em http://localhost:3000.
3. **Página:** na pasta do projeto (raiz), em outro terminal:
   ```
   npm install
   npm run dev
   ```
4. Abra http://localhost:5173 (não abra o `index.html` com duplo clique).

Usuário de demonstração: `ana@brazinos.com` / `senha123`
(o `bruno@brazinos.com` tem a mesma senha e vê apenas as partidas dele).

Para checar os tipos do TypeScript: `npm run verificar` (na raiz e em `api`).

## Estrutura

```
src/      front-end (TypeScript): api.ts fala com o servidor, servicos.ts tem as regras
          de lista (filtrar, pesquisar, ordenar), main.ts monta a tela
api/src/  servidor Express: servidor.ts (rotas), autenticacao.ts (JWT), banco.ts (MySQL)
banco/    script.sql (tabelas + dados de exemplo)
docs/     DER.png e ROTEIRO.md (roteiro da apresentação)
css/      estilos
```

## Funcionalidades

- Cadastro e login (senha guardada com hash bcrypt; sessão com token JWT de 8 horas)
- Cada usuário só enxerga e altera as próprias partidas
- CRUD de partidas: agendar, iniciar, encerrar, reabrir, editar o nome, remover
- Categorias (comum, decisivo, clássico) e tags por partida
- Data do jogo; jogos com data vencida e não encerrados ficam destacados
- Painel com totais por situação (calculado no banco com `GROUP BY`)
- Filtro por situação e pesquisa por nome ou tag; clássicos sempre no topo

## Modelo do banco (DER)

![DER do banco AgendadaBola](docs/DER.png)

- `usuarios` 1—N `partidas`: cada partida pertence a um usuário
- `usuarios` 1—N `tags`: cada usuário tem as suas tags (nome único por usuário)
- `partidas` N—N `tags`, resolvido pela tabela `partida_tag` (chave primária composta)
- `ON DELETE CASCADE`: apagar um usuário ou uma partida apaga o que depende dela

## Rotas da API

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/usuarios` | cria conta (201; 409 se o e-mail já existe) |
| POST | `/api/login` | devolve o token |
| GET | `/api/eu` | dados de quem está logado |
| GET | `/api/estatisticas` | contagem por situação |
| GET | `/api/partidas?status=&busca=` | lista (com filtros no banco) |
| GET | `/api/partidas/:id` | uma partida |
| POST | `/api/partidas` | cria (201) |
| PATCH | `/api/partidas/:id/status` | muda a situação (204) |
| PUT | `/api/partidas/:id` | edita o título |
| DELETE | `/api/partidas/:id` | remove (204) |

Todas, menos cadastro e login, exigem `Authorization: Bearer <token>`.
