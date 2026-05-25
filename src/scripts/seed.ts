import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("Limpando banco...");
  await prisma.curtida.deleteMany();
  await prisma.comentario.deleteMany();
  await prisma.post.deleteMany();
  await prisma.proposta.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log("Criando usuários...");
  const artista = await prisma.user.create({
    data: {
      email: "artista@mc.com",
      name: "João Silva",
      tipo_usuario: "artista",
      cidade: "São Paulo",
      estado: "SP",
      genero_musical: "Rock",
      descricao: "Guitarrista e vocalista com 10 anos de experiência.",
    },
  });

  const contratante = await prisma.user.create({
    data: {
      email: "contratante@mc.com",
      name: "Eventos Premium LTDA",
      tipo_usuario: "contratante",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  console.log("Criando posts...");
  const p1 = await prisma.post.create({
    data: {
      id_autor: artista.id,
      conteudo: "🎵 Disponível para shows neste fim de semana em São Paulo! Repertório MPB, Bossa Nova e Pop Nacional. Entre em contato!",
      tipo: "disponibilidade",
      visibilidade: "publico",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  const p2 = await prisma.post.create({
    data: {
      id_autor: contratante.id,
      conteudo: "🔍 Buscando artista para evento corporativo no dia 28/06 em São Paulo. Evento para 200 pessoas, 3 horas de show. Orçamento: R$ 2.000 - R$ 5.000. Interessados, enviem proposta!",
      tipo: "buscando",
      visibilidade: "publico",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  console.log("Criando propostas...");
  await prisma.proposta.create({
    data: {
      id_contratante: contratante.id,
      id_artista: artista.id,
      titulo: "Show corporativo de fim de ano",
      descricao: "Gostaríamos de contar com o seu show para o nosso evento de encerramento.",
      data_evento: new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      local_evento: "Espaço Premium, SP",
      valor_oferecido: 2500.0,
      status: "pendente",
      tipo_evento: "Corporativo",
      duracao_horas: 2,
      publico_esperado: 150,
      equipamento_incluso: true,
      nome_responsavel: "Carlos Eventos",
      telefone_contato: "11999999999"
    }
  });

  console.log("Criando comentários...");
  await prisma.comentario.create({
    data: {
      id_post: p1.id,
      id_autor: contratante.id,
      conteudo: "Te mandei uma proposta! Dá uma olhada.",
    }
  });


  console.log("Seed concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
