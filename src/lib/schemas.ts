import { z } from "zod";

const phoneRegex = /^\+?[0-9()\-\s]{8,20}$/;

export const updateUsuarioSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100)
    .refine((value) => value === "" || value.length >= 2, "Nome deve ter pelo menos 2 caracteres")
    .optional(),
  descricao: z.string().trim().max(1000).optional(),
  telefone: z
    .string()
    .trim()
    .refine((value) => value === "" || phoneRegex.test(value), "Número de telefone inválido")
    .optional(),
  cidade: z
    .string()
    .trim()
    .max(100)
    .refine((value) => value === "" || value.length >= 2, "Cidade deve ter pelo menos 2 caracteres")
    .optional(),
  estado: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || /^[A-Z]{2}$/.test(value), "Estado deve conter 2 letras (UF)")
    .optional(),
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

// ── Feed System ──

export const createPostSchema = z.object({
  conteudo: z.string().min(1, "Conteúdo é obrigatório").max(2000),
  tipo: z.enum(["post", "disponibilidade", "buscando"]).default("post"),
  visibilidade: z.enum(["publico", "seguidores", "privado"]).default("publico"),
  imagens: z.array(z.string().url()).max(10).optional(),
  video_url: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
});

export const updatePostSchema = z.object({
  conteudo: z.string().min(1).max(2000).optional(),
  tipo: z.enum(["post", "disponibilidade", "buscando"]).optional(),
  visibilidade: z.enum(["publico", "seguidores", "privado"]).optional(),
  imagens: z.array(z.string().url()).max(10).optional(),
  video_url: z.string().url().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().max(2).nullable().optional(),
});

export const createComentarioSchema = z.object({
  conteudo: z.string().min(1, "Comentário é obrigatório").max(1000),
  id_comentario_pai: z.string().optional(),
});

export const createStorySchema = z.object({
  midia_url: z.string().url("URL de mídia inválida"),
  tipo_midia: z.enum(["imagem", "video"]).default("imagem"),
  duracao: z.coerce.number().int().min(1).max(30).default(5),
});

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
  tipo: z.enum(["post", "disponibilidade", "buscando"]).optional(),
  genero: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  tag: z.string().optional(),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
