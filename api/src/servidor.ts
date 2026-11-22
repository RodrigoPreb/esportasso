import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import bcrypt from "bcryptjs";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import jwt from "jsonwebtoken";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { exigirLogin, SEGREDO, usuarioDe } from "./autenticacao";
import { banco } from "./banco";
import { CATEGORIAS, STATUS, type DadosPartida, type Status } from "./tipos";

const app = express();
app.use(express.json());

// Agora com as tags: uma subconsulta junta os nomes numa linha só.
// Os "AS" trocam o nome da coluna do banco (criada_em, data_partida)
// pelo nome do TypeScript (criadaEm, data).
const SELECT_PARTIDAS = `
  SELECT t.id, t.titulo, t.descricao, t.categoria, t.status,
         DATE_FORMAT(t.data_partida, '%Y-%m-%d') AS data,
         t.criada_em AS criadaEm,
         (SELECT GROUP_CONCAT(g.nome ORDER BY g.nome SEPARATOR ',')
            FROM partida_tag pt
            JOIN tags g ON g.id = pt.tag_id
           WHERE pt.partida_id = t.id) AS tags
    FROM partidas t`;

// O banco devolve as tags como "clássico,rodada-31" (ou null): viram um array
function paraPartida(linha: RowDataPacket): RowDataPacket {
  return { ...linha, tags: linha.tags ? String(linha.tags).split(",") : [] };
}

// Busca uma partida pelo id, SÓ se for do usuário. Usada pelo GET e depois de cada INSERT/PUT.
async function buscarUma(
  id: number,
  usuarioId: number,
): Promise<RowDataPacket | undefined> {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_PARTIDAS} WHERE t.id = ? AND t.usuario_id = ?`,
    [id, usuarioId],
  );
  return linhas.length > 0 ? paraPartida(linhas[0]) : undefined;
}

// Devolve a mensagem de erro, ou undefined se estiver tudo certo
function validar(
  dados: DadosPartida,
  tituloObrigatorio: boolean,
): string | undefined {
  if (tituloObrigatorio || dados.titulo !== undefined) {
    if (
      typeof dados.titulo !== "string" ||
      dados.titulo.trim().length < 3 ||
      dados.titulo.trim().length > 120 // o tamanho da coluna no banco
    ) {
      return "O título precisa ter de 3 a 120 caracteres.";
    }
  }
  if (
    dados.descricao !== undefined &&
    dados.descricao !== null &&
    typeof dados.descricao !== "string"
  ) {
    return "Descrição inválida.";
  }
  if (dados.categoria !== undefined && !CATEGORIAS.includes(dados.categoria)) {
    return "Categoria inválida.";
  }
  if (dados.data !== undefined && dados.data !== null && dados.data !== "") {
    // Date.parse aceita "2026-02-30" (vira 2 de março), então conferimos se
    // a data volta igual depois de convertida: dia inexistente não volta.
    if (
      typeof dados.data !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dados.data) ||
      Number.isNaN(Date.parse(dados.data)) ||
      new Date(dados.data).toISOString().slice(0, 10) !== dados.data
    ) {
      return "Data inválida. Use o formato AAAA-MM-DD.";
    }
  }
  if (dados.tags !== undefined) {
    const ruim =
      !Array.isArray(dados.tags) ||
      dados.tags.length > 10 ||
      dados.tags.some(
        (tag) =>
          typeof tag !== "string" ||
          tag.trim().length === 0 ||
          tag.trim().length > 40 ||
          tag.includes(","), // o banco junta as tags separadas por vírgula
      );
    if (ruim) {
      return "Tags: até 10, cada uma com 1 a 40 caracteres e sem vírgula.";
    }
  }
  return undefined;
}

// ---------- USUÁRIOS ----------
app.post("/api/usuarios", async (req, res) => {
  // sem corpo JSON, o Express 5 deixa req.body undefined: daí o ?? {}
  const { nome, email, senha } = (req.body ?? {}) as {
    nome?: unknown;
    email?: unknown;
    senha?: unknown;
  };
  if (
    typeof nome !== "string" ||
    typeof email !== "string" ||
    typeof senha !== "string" ||
    !nome.trim() ||
    !email.includes("@") ||
    senha.length < 6
  ) {
    res.status(400).json({
      erro: "Preencha nome, e-mail válido e senha de 6 caracteres ou mais.",
    });
    return;
  }
  const hash = await bcrypt.hash(senha, 10); // a senha nunca vai para o banco
  try {
    const [resultado] = await banco.execute<ResultSetHeader>(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
      [nome.trim(), email.trim().toLowerCase(), hash],
    );
    res.status(201).json({ id: resultado.insertId });
  } catch (erro) {
    // quem descobre o e-mail repetido é o UNIQUE do banco
    if ((erro as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({ erro: "Este e-mail já está cadastrado." });
      return;
    }
    throw erro;
  }
});

app.post("/api/login", async (req, res) => {
  const { email, senha } = (req.body ?? {}) as {
    email?: unknown;
    senha?: unknown;
  };
  const [linhas] = await banco.execute<RowDataPacket[]>(
    "SELECT id, nome, senha_hash FROM usuarios WHERE email = ?",
    [typeof email === "string" ? email.trim().toLowerCase() : ""],
  );
  const usuario = linhas[0];
  if (
    !usuario ||
    typeof senha !== "string" ||
    !senha ||
    !(await bcrypt.compare(senha, usuario.senha_hash))
  ) {
    // a mesma mensagem nos dois casos: não contamos qual dos dois errou
    res.status(401).json({ erro: "E-mail ou senha inválidos." });
    return;
  }
  const token = jwt.sign({ id: usuario.id }, SEGREDO, { expiresIn: "8h" });
  res.json({ token, nome: usuario.nome });
});

// Desafio Prata (Aula 5): quem está logado. NUNCA devolve a senha_hash.
app.get("/api/eu", exigirLogin, async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    "SELECT id, nome, email FROM usuarios WHERE id = ?",
    [usuarioDe(res)],
  );
  if (linhas.length === 0) {
    res.status(404).json({ erro: "Usuário não encontrado." });
    return;
  }
  res.json(linhas[0]);
});

// ---------- O PAINEL: o GROUP BY faz o que o reduce fazia no front ----------
app.get("/api/estatisticas", exigirLogin, async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `SELECT status, COUNT(*) AS quantidade
       FROM partidas
      WHERE usuario_id = ?
      GROUP BY status`,
    [usuarioDe(res)],
  );
  // começa com zeros: o GROUP BY não devolve linha para status sem partida
  const contagem: Record<Status, number> = {
    pendente: 0,
    em_andamento: 0,
    concluida: 0,
  };
  for (const linha of linhas) {
    contagem[linha.status as Status] = Number(linha.quantidade);
  }
  res.json(contagem);
});

// ---------- LER ----------
// Filtros opcionais na URL: /api/partidas?status=pendente&busca=flamengo
app.get("/api/partidas", exigirLogin, async (req, res) => {
  let sql = `${SELECT_PARTIDAS} WHERE t.usuario_id = ?`;
  const valores: (string | number)[] = [usuarioDe(res)];

  const { status, busca } = req.query;
  if (typeof status === "string" && STATUS.includes(status as Status)) {
    sql += " AND t.status = ?"; // o filter, no banco
    valores.push(status);
  }
  if (typeof busca === "string" && busca.trim() !== "") {
    // o includes, no banco: procura no título E no nome das tags
    const padrao = `%${busca.trim().replace(/[\\%_]/g, "\\$&")}%`;
    sql += ` AND (t.titulo LIKE ? OR EXISTS (
               SELECT 1 FROM partida_tag pt JOIN tags g ON g.id = pt.tag_id
                WHERE pt.partida_id = t.id AND g.nome LIKE ?))`;
    valores.push(padrao, padrao);
  }
  // o sort: clássicos no topo, depois decisivos, depois comuns
  sql +=
    " ORDER BY FIELD(t.categoria, 'clássico', 'decisivo', 'comum'), t.titulo";

  const [linhas] = await banco.execute<RowDataPacket[]>(sql, valores);
  res.json(linhas.map(paraPartida));
});

app.get("/api/partidas/:id", exigirLogin, async (req, res) => {
  const partida = await buscarUma(Number(req.params.id), usuarioDe(res));
  if (!partida) {
    res.status(404).json({ erro: `Partida #${req.params.id} não encontrada.` });
    return;
  }
  res.json(partida);
});

// ---------- CRIAR ----------
app.post("/api/partidas", exigirLogin, async (req, res) => {
  const dados = (req.body ?? {}) as DadosPartida;
  const problema = validar(dados, true);
  if (problema) {
    res.status(400).json({ erro: problema }); // 400: o pedido veio errado
    return;
  }
  const usuarioId = usuarioDe(res);
  // a partida e as tags entram juntas ou não entra nada (transação)
  const conexao = await banco.getConnection();
  let novoId: number;
  try {
    await conexao.beginTransaction();
    const [resultado] = await conexao.execute<ResultSetHeader>(
      `INSERT INTO partidas (usuario_id, titulo, descricao, categoria, data_partida)
       VALUES (?, ?, ?, ?, ?)`,
      [
        usuarioId,
        dados.titulo!.trim(),
        dados.descricao ?? null,
        dados.categoria ?? "decisivo",
        dados.data || null,
      ],
    );
    novoId = resultado.insertId;
    for (const nome of new Set((dados.tags ?? []).map((tag) => tag.trim()))) {
      // se a tag já existe (UNIQUE usuario+nome), reaproveita o id dela
      const [tag] = await conexao.execute<ResultSetHeader>(
        `INSERT INTO tags (usuario_id, nome) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [usuarioId, nome],
      );
      await conexao.execute(
        "INSERT IGNORE INTO partida_tag (partida_id, tag_id) VALUES (?, ?)",
        [novoId, tag.insertId],
      );
    }
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
  // 201: criada. Devolve a partida como o banco guardou (com id, data e tags)
  res.status(201).json(await buscarUma(novoId, usuarioId));
});

// ---------- ATUALIZAR: só o status ----------
app.patch("/api/partidas/:id/status", exigirLogin, async (req, res) => {
  const { status } = (req.body ?? {}) as { status?: Status };
  if (!status || !STATUS.includes(status)) {
    res.status(400).json({ erro: "Status inválido." });
    return;
  }
  const [resultado] = await banco.execute<ResultSetHeader>(
    `UPDATE partidas
        SET status = ?, concluida_em = IF(? = 'concluida', NOW(), NULL)
      WHERE id = ? AND usuario_id = ?`,
    [status, status, Number(req.params.id), usuarioDe(res)],
  );
  if (resultado.affectedRows === 0) {
    res.status(404).json({ erro: `Partida #${req.params.id} não encontrada.` });
    return;
  }
  res.status(204).end(); // 204: deu certo, e não há nada para devolver
});

// ---------- EDITAR (Prata da Aula 4): troca o título ----------
app.put("/api/partidas/:id", exigirLogin, async (req, res) => {
  const dados = (req.body ?? {}) as DadosPartida;
  // Esta rota só troca o título: outro campo no corpo é recusado,
  // em vez de ser ignorado sem avisar.
  const extras = Object.keys(dados).filter((campo) => campo !== "titulo");
  if (extras.length > 0) {
    res.status(400).json({
      erro: `Esta rota só altera o título (recebi também: ${extras.join(", ")}).`,
    });
    return;
  }
  const problema = validar(dados, true);
  if (problema) {
    res.status(400).json({ erro: problema });
    return;
  }
  const [resultado] = await banco.execute<ResultSetHeader>(
    "UPDATE partidas SET titulo = ? WHERE id = ? AND usuario_id = ?",
    [dados.titulo!.trim(), Number(req.params.id), usuarioDe(res)],
  );
  if (resultado.affectedRows === 0) {
    res.status(404).json({ erro: `Partida #${req.params.id} não encontrada.` });
    return;
  }
  res.json(await buscarUma(Number(req.params.id), usuarioDe(res)));
});

// ---------- APAGAR ----------
app.delete("/api/partidas/:id", exigirLogin, async (req, res) => {
  const [resultado] = await banco.execute<ResultSetHeader>(
    "DELETE FROM partidas WHERE id = ? AND usuario_id = ?",
    [Number(req.params.id), usuarioDe(res)],
  );
  if (resultado.affectedRows === 0) {
    res.status(404).json({ erro: `Partida #${req.params.id} não encontrada.` });
    return;
  }
  res.status(204).end();
});

// ---------- ERROS NÃO PREVISTOS: sempre depois de todas as rotas ----------
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(erro); // o detalhe técnico fica só no terminal
  res.status(500).json({ erro: "Algo deu errado no servidor. Tente de novo." });
});

app.listen(3000, () =>
  console.log("API da Agenda da Bola em http://localhost:3000"),
);
