/* Apto, o mascote do RSF Online (mesmo comportamento do RNC Online): depois da
   abertura mostra um balão com dicas tiradas do manual, trocando a cada 9 s;
   passar o mouse nele reabre o balão e clicar abre o manual em PDF. */
(function(){
  const DICAS = [
    'Oi! Eu sou o Apto, sempre apto a ajudar. Ficou com dúvida em alguma aba? O manual explica tudo, passo a passo.',
    'Cada aba do menu é um slide do relatório. Logo abaixo dos campos, a prévia mostra como o slide vai ficar.',
    'Seu rascunho fica salvo neste navegador. Se der F5 sem querer, os dados voltam sozinhos.',
    'O escopo do projeto aceita até 400 caracteres. O contador fica vermelho quando chega no limite.',
    'Texto demais em Fatos Relevantes ou Atrasos? Eu crio uma página de continuação automaticamente.',
    'Em Registros Fotográficos, as 6 fotos são obrigatórias. Arraste a foto para ajustar o enquadramento.',
  ];
  const balao = document.getElementById('aptoBalao');
  const dica = document.getElementById('aptoDica');
  const pontos = document.getElementById('aptoPontos');
  let atual = 0, timer = null;

  pontos.innerHTML = DICAS.map(()=> '<span></span>').join('');
  function mostrar(i){
    atual = i % DICAS.length;
    dica.textContent = DICAS[atual];
    dica.style.animation = 'none'; void dica.offsetWidth; dica.style.animation = ''; // reinicia o fade
    [...pontos.children].forEach((p,k)=> p.classList.toggle('on', k === atual));
  }
  function abrir(){
    if(!balao.hidden) return;
    balao.hidden = false;
    mostrar(atual);
    timer = setInterval(()=> mostrar(atual + 1), 9000);
  }
  function fechar(){ balao.hidden = true; clearInterval(timer); }

  document.getElementById('aptoFechar').onclick = fechar;
  const mascote = document.getElementById('aptoMascote');
  mascote.addEventListener('mouseenter', abrir);
  mascote.addEventListener('focus', abrir);
  setTimeout(abrir, 3600); // cumprimenta assim que a abertura termina
})();
