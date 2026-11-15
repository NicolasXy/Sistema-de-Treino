// Documentação OpenAPI 3 exibida em /docs (Swagger UI). Use "Try it out" para gerar as evidências.
const erro = (descricao) => ({ description: descricao, content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } });
const json = (schema, example) => ({ 'application/json': { schema, ...(example && { example }) } });
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } };

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'API de Treinos Esportivos',
    version: '1.0.0',
    description:
      'Gerenciamento semanal de treinos, carga acumulada e indicador de sobrecarga.\n\n' +
      '**Carga** = (duração / 10) × intensidade × multiplicador (F=1,5; T=1,2; E=1,0).\n\n' +
      'O indicador de risco é exclusivamente didático e não é diagnóstico nem predição clínica de lesão.',
  },
  tags: [{ name: 'Jogadores' }, { name: 'Configuração' }, { name: 'Treinos' }, { name: 'Relatórios' }],
  paths: {
    '/jogadores': {
      post: {
        tags: ['Jogadores'], summary: 'Cadastrar atleta',
        requestBody: { required: true, content: json(ref('JogadorEntrada'), { nome: 'Gabriel Rocha', posicao: 'G' }) },
        responses: { 201: { description: 'Criado', content: json(ref('Jogador')) }, 400: erro('Dados inválidos') },
      },
      get: {
        tags: ['Jogadores'], summary: 'Listar atletas',
        parameters: [
          { name: 'posicao', in: 'query', schema: { type: 'string', enum: ['G', 'Z', 'M', 'A'] } },
          { name: 'ativo', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'Lista', content: json({ type: 'array', items: ref('Jogador') }) }, 400: erro('Filtro inválido') },
      },
    },
    '/jogadores/{id}': {
      get: {
        tags: ['Jogadores'], summary: 'Consultar atleta', parameters: [idParam],
        responses: { 200: { description: 'Atleta', content: json(ref('Jogador')) }, 400: erro('id inválido'), 404: erro('Não encontrado') },
      },
      put: {
        tags: ['Jogadores'], summary: 'Atualizar atleta (nome, posicao e/ou ativo)', parameters: [idParam],
        requestBody: { required: true, content: json(ref('JogadorAtualizacao'), { nome: 'Gabriel R. Souza', posicao: 'G' }) },
        responses: { 200: { description: 'Atualizado', content: json(ref('Jogador')) }, 400: erro('Dados inválidos'), 404: erro('Não encontrado') },
      },
    },
    '/jogadores/{id}/desativar': {
      patch: {
        tags: ['Jogadores'], summary: 'Desativar atleta (preserva o histórico de treinos)', parameters: [idParam],
        responses: { 200: { description: 'Desativado', content: json(ref('Jogador')) }, 404: erro('Não encontrado') },
      },
    },
    '/configuracao': {
      get: {
        tags: ['Configuração'], summary: 'Consultar limite máximo semanal de carga',
        responses: { 200: { description: 'Configuração vigente', content: json(ref('Configuracao')) }, 404: erro('Ainda não configurado') },
      },
      put: {
        tags: ['Configuração'], summary: 'Cadastrar/atualizar limite máximo semanal de carga',
        requestBody: { required: true, content: json(ref('ConfiguracaoEntrada'), { cargaMaximaSemanal: 300, dataVigencia: '2026-10-01' }) },
        responses: {
          200: { description: 'Atualizado', content: json(ref('Configuracao')) },
          201: { description: 'Criado (primeira configuração)', content: json(ref('Configuracao')) },
          400: erro('Valor inválido'),
        },
      },
    },
    '/treinos': {
      post: {
        tags: ['Treinos'], summary: 'Registrar sessão de treino (carga calculada automaticamente)',
        requestBody: {
          required: true,
          content: json(ref('TreinoEntrada'), { codigo: 'TR-100', jogadorId: 1, dataTreino: '2026-10-19 09:00:00', tipo: 'F', duracaoMin: 60, intensidade: 8 }),
        },
        responses: {
          201: { description: 'Criado (ex.: F, 60 min, intensidade 8 → carga 72)', content: json(ref('Treino')) },
          400: erro('Intensidade fora de 1–10, duração não positiva, tipo/data inválidos'),
          404: erro('Atleta inexistente'),
          409: erro('Código duplicado ou atleta inativo'),
        },
      },
      get: {
        tags: ['Treinos'], summary: 'Listar e filtrar sessões',
        parameters: [
          { name: 'jogadorId', in: 'query', schema: { type: 'integer' } },
          { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['F', 'T', 'E'] } },
          { name: 'inicio', in: 'query', description: 'YYYY-MM-DD (inclusivo)', schema: { type: 'string', example: '2026-10-05' } },
          { name: 'fim', in: 'query', description: 'YYYY-MM-DD (inclusivo)', schema: { type: 'string', example: '2026-10-11' } },
        ],
        responses: { 200: { description: 'Lista com dados do jogador', content: json({ type: 'array', items: ref('Treino') }) }, 400: erro('Filtro inválido') },
      },
    },
    '/treinos/jogador/{id}': {
      get: {
        tags: ['Treinos'], summary: 'Treinos do atleta (aceita os mesmos filtros tipo, inicio e fim)',
        parameters: [
          idParam,
          { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['F', 'T', 'E'] } },
          { name: 'inicio', in: 'query', schema: { type: 'string' } },
          { name: 'fim', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Lista', content: json({ type: 'array', items: ref('Treino') }) }, 404: erro('Atleta não encontrado') },
      },
    },
    '/treinos/{codigo}': {
      delete: {
        tags: ['Treinos'], summary: 'Excluir sessão pelo código',
        parameters: [{ name: 'codigo', in: 'path', required: true, schema: { type: 'string', example: 'TR-100' } }],
        responses: { 200: { description: 'Excluído' }, 404: erro('Código não encontrado') },
      },
    },
    '/relatorios/semanal': {
      get: {
        tags: ['Relatórios'], summary: 'Relatório semanal (segunda a domingo) da semana que contém a data',
        parameters: [{ name: 'data', in: 'query', required: true, schema: { type: 'string', example: '2026-10-05' } }],
        responses: {
          200: { description: 'Relatório consolidado', content: json({ type: 'object' }) },
          400: erro('Data ausente ou inválida'),
          409: erro('Limite semanal não configurado'),
        },
      },
    },
  },
  components: {
    schemas: {
      Erro: { type: 'object', properties: { erro: { type: 'string' } } },
      Jogador: {
        type: 'object',
        properties: { id: { type: 'integer' }, nome: { type: 'string' }, posicao: { type: 'string', enum: ['G', 'Z', 'M', 'A'] }, ativo: { type: 'boolean' } },
      },
      JogadorEntrada: { type: 'object', required: ['nome', 'posicao'], properties: { nome: { type: 'string' }, posicao: { type: 'string', enum: ['G', 'Z', 'M', 'A'] } } },
      JogadorAtualizacao: {
        type: 'object',
        properties: { nome: { type: 'string' }, posicao: { type: 'string', enum: ['G', 'Z', 'M', 'A'] }, ativo: { type: 'boolean' } },
      },
      Configuracao: { type: 'object', properties: { id: { type: 'integer' }, cargaMaximaSemanal: { type: 'number' }, dataVigencia: { type: 'string', nullable: true } } },
      ConfiguracaoEntrada: { type: 'object', required: ['cargaMaximaSemanal'], properties: { cargaMaximaSemanal: { type: 'number' }, dataVigencia: { type: 'string' } } },
      TreinoEntrada: {
        type: 'object',
        required: ['codigo', 'jogadorId', 'tipo', 'duracaoMin', 'intensidade'],
        properties: {
          codigo: { type: 'string' }, jogadorId: { type: 'integer' }, dataTreino: { type: 'string', description: 'Padrão: agora (UTC)' },
          tipo: { type: 'string', enum: ['F', 'T', 'E'] }, duracaoMin: { type: 'integer', minimum: 1 }, intensidade: { type: 'integer', minimum: 1, maximum: 10 },
        },
      },
      Treino: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, codigo: { type: 'string' }, jogadorId: { type: 'integer' }, dataTreino: { type: 'string', format: 'date-time' },
          tipo: { type: 'string' }, duracaoMin: { type: 'integer' }, intensidade: { type: 'integer' }, carga: { type: 'number' }, Jogador: ref('Jogador'),
        },
      },
    },
  },
};
