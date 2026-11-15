/** Erro de negócio/validação com código HTTP; o middleware converte em JSON. */
class ErroApp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.name = 'ErroApp';
    this.status = status;
  }
}

/** Converte valor da URL/corpo em inteiro positivo ou lança 400. */
function validarId(valor, rotulo = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new ErroApp(400, `${rotulo} deve ser um inteiro positivo.`);
  return n;
}

module.exports = { ErroApp, validarId };
