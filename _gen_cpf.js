// Gera um CPF válido para teste
function gerarCPF() {
  const n = () => Math.floor(Math.random() * 10);
  let cpf = [];
  for (let i = 0; i < 9; i++) cpf.push(n());
  // 1o digito
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += cpf[i] * (10 - i);
  let r = (soma * 10) % 11; if (r === 10) r = 0; cpf.push(r);
  // 2o digito
  soma = 0;
  for (let i = 0; i < 10; i++) soma += cpf[i] * (11 - i);
  r = (soma * 10) % 11; if (r === 10) r = 0; cpf.push(r);
  return cpf.join('');
}
console.log(gerarCPF());
