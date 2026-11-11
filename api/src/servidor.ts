import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import express from "express";
import type { RowDataPacket } from "mysql2";
import { banco } from "./banco";

const app = express();
app.use(express.json());

// Aula 3: a lista mostra as partidas de TODOS os usuários

// O SELECT que as duas rotas usam. Os "AS" trocam o nome da coluna
// do jeito do banco (criada_em, data_partida) para o jeito do TypeScript (criadaEm, data).
const SELECT_PARTIDAS = `
  SELECT id, titulo, descricao, categoria, status,
         DATE_FORMAT(data_partida, '%Y-%m-%d') AS data,
         criada_em AS criadaEm
    FROM partidas`;

// Todas as partidas
app.get("/api/partidas", async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_PARTIDAS} ORDER BY id`,
    [] // sem filtro: nenhum ? nesta consulta
  );
  // as tags chegam na Aula 6; por enquanto, uma lista vazia em cada partida
  res.json(linhas.map((linha) => ({ ...linha, tags: [] })));
});

// Uma partida: pode não existir!
app.get("/api/partidas/:id", async (req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_PARTIDAS} WHERE id = ?`,
    [Number(req.params.id)] // o ? vira o número da URL
  );
  if (linhas.length === 0) {
    res.status(404).json({ erro: `Partida #${req.params.id} não encontrada.` });
    return;
  }
  res.json({ ...linhas[0], tags: [] });
});

app.listen(3000, () => console.log("API da Agenda da Bola em http://localhost:3000"));
