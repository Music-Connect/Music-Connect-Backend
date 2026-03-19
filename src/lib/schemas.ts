import { z } from "zod";

export const updateUsuarioSchema = z.object({
  name: z.string().min(2).optional(),
  descricao: z.string().optional(),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
  genero_musical: z.string().optional(),
  cor_tema: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  cor_banner: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  image: z.string().url().optional(),
  preco_minimo: z.number().positive().optional(),
  preco_maximo: z.number().positive().optional(),
  portfolio: z.array(z.string().url()).optional(),
  spotify_url: z.string().url().optional(),
  instagram_url: z.string().optional(),
  youtube_url: z.string().url().optional(),
});

export const createPropostaSchema = z.object({
  id_artista: z.string().min(1, "ID do artista é obrigatório"),
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  descricao: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  data_evento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)"),
  hora_evento: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  local_evento: z.string().min(3),
  endereco_completo: z.string().optional(),
  tipo_evento: z.string().optional(),
  duracao_horas: z.number().positive().optional(),
  publico_esperado: z.number().int().positive().optional(),
  equipamento_incluso: z.boolean().optional(),
  nome_responsavel: z.string().optional(),
  telefone_contato: z.string().optional(),
  observacoes: z.string().optional(),
  valor_oferecido: z.number().positive("Valor deve ser positivo"),
});

export const updatePropostaStatusSchema = z.object({
  status: z.enum(["aceita", "recusada", "cancelada"]),
  mensagem_resposta: z.string().optional(),
});

export const createAvaliacaoSchema = z.object({
  id_avaliado: z.string().min(1, "ID do avaliado é obrigatório"),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
