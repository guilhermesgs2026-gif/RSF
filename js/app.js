/* ---------------------------------------------------------------------------
   CONSTANTS / STYLE CONFIG
--------------------------------------------------------------------------- */
const BLUE1 = '2E75B6';   // fixed label color (accent5 darker 25%)
const BLUE2 = '2F5597';   // fixed "Legenda:" label color (accent1 darker 25%)
const BLACK = '000000';
const WHITE = 'FFFFFF';
const FONT_TITLE = 'Tahoma';   // used only on slide 1 (capa)
const FONT_BODY  = 'Calibri';  // used on slides 2 through the end
const SLIDE_W = 13.333, SLIDE_H = 7.5;

let uid = 1;
function nextId(prefix){ return prefix + (uid++); }

/* ---------------------------------------------------------------------------
   DATA MODEL
--------------------------------------------------------------------------- */
function createInitialState(){
  return {
    capa: { projeto:'', localidade:'', regional:'', semana:'', periodo:'' },

    status: {
      dataEnergBase:'', dataEnergReprog:'', dataDesmob:'',
      escopo:'',
      contratadas:'', gestorProjetosIsa:'', gestorFiscIsa:'', fiscalIsa:'',
      gestorFiscContratada:'', fiscalContratada:'', engSegIsa:'', tecSeg:'',
      empresa:'', nome:'',
      situacao:'andamento', // andamento | paralisado | concluido
      dataParalisacao:'', motivoParalisacao:'', previsaoRetorno:'',
      dataConclusao:'', pendencias:'nao', seSimPendencias:'',
      viasFisicas:'sim', acessoKeepControl:'sim'
    },

    dds: {
      dias:[
        {dia:'Segunda-feira', tema:''},
        {dia:'Terça-feira', tema:''},
        {dia:'Quarta-feira', tema:''},
        {dia:'Quinta-feira', tema:''},
        {dia:'Sexta-feira', tema:''},
        {dia:'Sábado', tema:''},
        {dia:'Domingo', tema:''}
      ],
      acidentes:[
        'Relatar e informar se houve danos físicos, materiais etc',
        'Relatar e informar se houve danos físicos, materiais etc',
        'Relatar e informar se houve danos físicos, materiais etc',
        'Relatar e informar se houve danos físicos, materiais etc',
        'Relatar e informar se houve danos físicos, materiais etc',
        'Relatar e informar se houve danos físicos, materiais etc',
        'Relatar e informar se houve danos físicos, materiais etc'
      ],
      foto: {image:null},
      fotoComentario: ''
    },

    atividades: {
      realizadas:'sim', seNaoPorque:'',
      efetivoAtende:'',
      houveAlteracaoCronograma:'nao', dataUltimaRevisaoCronograma:'',
      houveAlteracaoDesenerg:'nao',
      curvaSRevisada:'sim', curvaSData:'', curvaSPercentual:''
    },

    fatosSlides: [
      {
        id: nextId('fatos'),
        fatos: Array(8).fill('Temas ocorridos na semana que podem vir proporcionar impactos negativos para energizações e ou etc.;'),
        pontos: Array(8).fill('Temas que antecedem os Fatos Relevantes e ou etc.;'),
        foto: {image:null},
        fotoComentario: '',
        acompanhamento: []
      }
    ],

    atrasos: {
      itens: Array(7).fill('Descreva atrasos ocorridos durante a semana, pertinentes: a falta de efetivo, falta de materiais, falta de maquinários, etc. Colocar data.'),
      criticas: Array(7).fill('Descreva atividades criticas futuras, numero de PT, data da atividade prevista, status da PT;'),
      foto: {image:null},
      fotoComentario: '',
      acompanhamento: []
    },

    curva: { data:'', diferenca:'', image:null },
    cronograma: { data:'', image:null },

    fotosSlides: [
      { id: nextId('fotos'), photos: Array(6).fill(null).map(()=>({image:null, legenda:'', zoom:1, x:0.5, y:0.5})) },
      { id: nextId('fotos'), photos: Array(6).fill(null).map(()=>({image:null, legenda:'', zoom:1, x:0.5, y:0.5})) }
    ]
  };
}

const state = createInitialState();

/* Reset a single section back to its default (empty) values, or the whole state.
   Used by the "limpar dados" buttons throughout the UI. */
function resetSection(key){
  const fresh = createInitialState();
  if(Array.isArray(state[key])){
    state[key].length = 0;
    state[key].push(...fresh[key]);
  } else {
    Object.keys(state[key]).forEach(k => delete state[key][k]);
    Object.assign(state[key], fresh[key]);
  }
  renderAll();
  schedulePreview();
}

function resetAllData(){
  const fresh = createInitialState();
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, fresh);
  currentTab = 'capa';
  renderAll();
  schedulePreview();
}

/* ---------------------------------------------------------------------------
   SALVAMENTO AUTOMÁTICO (localStorage do navegador)

   Guarda o progresso do fiscal SÓ no computador dele — igual a um cache local,
   nada é enviado para nenhum servidor. Serve apenas para que um F5 ou um
   fechamento acidental da aba não apague tudo que já foi preenchido.

   Se o navegador não tiver espaço suficiente (o localStorage costuma ter uns
   5-10 MB por site, e fotos em base64 pesam), o texto continua sendo salvo
   normalmente e só as fotos precisam ser reenviadas depois de um F5.
--------------------------------------------------------------------------- */
const AUTOSAVE_KEY      = 'rsf_gerador_autosave_v1';
const AUTOSAVE_FLAG_KEY = 'rsf_gerador_autosave_sem_fotos_v1';

// nunca persiste o cache de recorte gerado na hora de exportar — é redundante
// e é recriado automaticamente a partir da imagem original a cada exportação
function autosaveReplacerFull(key, value){
  if(key === '_croppedDataUrl') return undefined;
  return value;
}
function autosaveReplacerNoImages(key, value){
  if(key === '_croppedDataUrl') return undefined;
  if(key === 'dataUrl') return undefined;
  return value;
}

let autosaveTimer = null;
function scheduleAutosave(){
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveStateToLocalStorage, 800);
}

function saveStateToLocalStorage(){
  try{
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state, autosaveReplacerFull));
    localStorage.removeItem(AUTOSAVE_FLAG_KEY);
  } catch(err){
    // provavelmente estourou a cota do navegador por causa das fotos;
    // tenta de novo salvando só o texto, pra não perder o preenchimento
    try{
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state, autosaveReplacerNoImages));
      localStorage.setItem(AUTOSAVE_FLAG_KEY, '1');
    } catch(err2){
      // nem o texto coube (bem raro) — desiste silenciosamente desta rodada
    }
  }
}

function clearAutosave(){
  try{
    localStorage.removeItem(AUTOSAVE_KEY);
    localStorage.removeItem(AUTOSAVE_FLAG_KEY);
  } catch(err){ /* localStorage indisponível (ex.: aba anônima) — ignora */ }
}

/* Mescla o rascunho salvo por cima de um estado-padrão novo, campo a campo —
   assim, se uma versão futura do gerador adicionar um campo novo, um rascunho
   salvo antes dele existir não deixa esse campo undefined. */
function loadStateFromLocalStorage(){
  let raw;
  try{ raw = localStorage.getItem(AUTOSAVE_KEY); } catch(err){ return {restored:false}; }
  if(!raw) return {restored:false};

  let saved;
  try{ saved = JSON.parse(raw); } catch(err){ return {restored:false}; }
  if(!saved || typeof saved !== 'object') return {restored:false};

  try{
    const fresh = createInitialState();
    Object.keys(fresh).forEach(key=>{
      if(saved[key] === undefined) return;
      if(Array.isArray(fresh[key])){
        if(Array.isArray(saved[key]) && saved[key].length) fresh[key] = saved[key];
      } else if(fresh[key] && typeof fresh[key] === 'object'){
        fresh[key] = Object.assign({}, fresh[key], saved[key]);
      } else {
        fresh[key] = saved[key];
      }
    });

    Object.keys(state).forEach(k=>delete state[k]);
    Object.assign(state, fresh);

    // evita que nextId() gere um id repetido em cima dos blocos restaurados
    let maxId = 0;
    [...state.fatosSlides, ...state.fotosSlides].forEach(b=>{
      const m = /([0-9]+)$/.exec(b.id||'');
      if(m) maxId = Math.max(maxId, parseInt(m[1],10));
    });
    if(maxId >= uid) uid = maxId + 1;

    let semFotos = false;
    try{ semFotos = localStorage.getItem(AUTOSAVE_FLAG_KEY) === '1'; } catch(err){}
    return {restored:true, semFotos};
  } catch(err){
    return {restored:false};
  }
}


/* ---------------------------------------------------------------------------
   TAB DEFINITIONS
--------------------------------------------------------------------------- */
const TABS = [
  {id:'capa', label:'1. Capa', icon:'📘'},
  {id:'status', label:'2. Status do Projeto', icon:'📋'},
  {id:'dds', label:'3. Momento Segurança', icon:'🦺'},
  {id:'atividades', label:'4. Atividades / Curva S', icon:'📈'},
  {id:'fatos', label:'5. Fatos Relevantes', icon:'⚠️'},
  {id:'atrasos', label:'6. Atrasos / Previsões', icon:'⏱️'},
  {id:'curva', label:'7. Curva S (gráfico)', icon:'🖼️'},
  {id:'cronograma', label:'8. Cronograma (imagem)', icon:'🗓️'},
  {id:'fotos', label:'9. Registros Fotográficos', icon:'📷'},
];

let currentTab = 'capa';

function renderTabsNav(){
  const nav = document.getElementById('tabsNav');
  nav.innerHTML = '';
  TABS.forEach(t=>{
    const btn = document.createElement('button');
    btn.textContent = t.icon + '  ' + t.label;
    btn.className = (t.id===currentTab)?'active':'';
    btn.onclick = ()=>{ currentTab=t.id; renderAll(); };
    nav.appendChild(btn);
  });
}

/* ---------------------------------------------------------------------------
   RICH TEXT EDITOR COMPONENT
--------------------------------------------------------------------------- */
const PALETTE = ['#000000','#2E75B6','#C00000','#1F7A3D','#B8860B','#7030A0','#FF6600','#444444'];

function makeRichBox(initialHTML, placeholder, onChange){
  const wrap = document.createElement('div');
  wrap.className = 'richbox';

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  function toolBtn(label, title, cmd, val, cls){
    const b = document.createElement('button');
    b.type='button'; b.textContent = label; b.title = title;
    if(cls) b.className = cls;
    b.onmousedown = (e)=>e.preventDefault(); // keep focus/selection in editable
    b.onclick = ()=>{ document.execCommand(cmd, false, val||null); editable.focus(); onChange(editable.innerHTML); };
    return b;
  }

  toolbar.appendChild(toolBtn('B','Negrito','bold',null,'b'));
  toolbar.appendChild(toolBtn('I','Itálico','italic',null,'i'));
  const sep1 = document.createElement('div'); sep1.className='sep'; toolbar.appendChild(sep1);

  const colorInput = document.createElement('input');
  colorInput.type='color'; colorInput.title='Cor da fonte'; colorInput.value='#000000';
  colorInput.oninput = ()=>{ document.execCommand('foreColor', false, colorInput.value); editable.focus(); onChange(editable.innerHTML); };
  toolbar.appendChild(colorInput);

  // quick palette swatches
  PALETTE.forEach(c=>{
    const sw = document.createElement('button');
    sw.type='button'; sw.title=c; sw.style.background=c; sw.style.width='16px'; sw.style.height='16px';
    sw.style.border='1px solid #ccc'; sw.style.borderRadius='3px'; sw.style.padding='0'; sw.style.margin='5px 1px';
    sw.onmousedown=(e)=>e.preventDefault();
    sw.onclick=()=>{ document.execCommand('foreColor', false, c); editable.focus(); onChange(editable.innerHTML); };
    toolbar.appendChild(sw);
  });

  const sep2 = document.createElement('div'); sep2.className='sep'; toolbar.appendChild(sep2);
  toolbar.appendChild(toolBtn('•≡','Lista com marcadores','insertUnorderedList'));
  toolbar.appendChild(toolBtn('1≡','Lista numerada','insertOrderedList'));
  const sep3 = document.createElement('div'); sep3.className='sep'; toolbar.appendChild(sep3);
  toolbar.appendChild(toolBtn('⌫','Limpar formatação','removeFormat'));

  const editable = document.createElement('div');
  editable.className = 'editable';
  editable.contentEditable = 'true';
  editable.setAttribute('data-placeholder', placeholder||'');
  editable.innerHTML = initialHTML || '';
  editable.oninput = ()=> onChange(editable.innerHTML);
  editable.onblur = ()=> onChange(editable.innerHTML);

  wrap.appendChild(toolbar);
  wrap.appendChild(editable);
  return wrap;
}

/* ---------------------------------------------------------------------------
   HELPERS: form field builders
--------------------------------------------------------------------------- */
function el(tag, className, html){
  const e = document.createElement(tag);
  if(className) e.className = className;
  if(html!==undefined) e.innerHTML = html;
  return e;
}

function labelWithTag(text, tag){
  return `${text} ${tag? `<span class="fixed-tag">${tag}</span>`:''}`;
}

function textField(container, labelText, value, onChange, opts){
  opts = opts||{};
  const f = el('div','field');
  f.appendChild(el('label', null, labelWithTag(labelText)));
  const inp = document.createElement('input');
  inp.type = opts.type||'text';
  inp.value = value||'';
  inp.placeholder = opts.placeholder||'';
  inp.oninput = ()=> onChange(inp.value);
  f.appendChild(inp);
  container.appendChild(f);
  return f;
}

function richField(container, labelText, value, onChange, placeholder){
  const f = el('div','field');
  f.appendChild(el('label', null, labelWithTag(labelText)));
  const rb = makeRichBox(value, placeholder||'', (html)=> onChange(html));
  f.appendChild(rb);
  container.appendChild(f);
  return f;
}

function togglePair(container, labelText, value, onChange){
  const f = el('div','field');
  f.appendChild(el('label', null, labelWithTag(labelText)));
  const tp = el('div','toggle-pair');
  const groupName = nextId('tg'); // shared radio name so Sim/Não are mutually exclusive
  ['sim','nao'].forEach(v=>{
    const lab = document.createElement('label');
    const r = document.createElement('input');
    r.type='radio'; r.name = groupName; r.checked = (value===v);
    r.onchange = ()=>{ if(r.checked) onChange(v); };
    lab.appendChild(r);
    lab.appendChild(document.createTextNode(v==='sim'?'Sim':'Não'));
    tp.appendChild(lab);
  });
  f.appendChild(tp);
  container.appendChild(f);
  return f;
}

/* ---------------------------------------------------------------------------
   PANEL RENDERERS
--------------------------------------------------------------------------- */
function renderContent(){
  const root = document.getElementById('content');
  root.innerHTML='';

  if(currentTab==='capa') root.appendChild(renderCapa());
  else if(currentTab==='status') root.appendChild(renderStatus());
  else if(currentTab==='dds') root.appendChild(renderDDS());
  else if(currentTab==='atividades') root.appendChild(renderAtividades());
  else if(currentTab==='fatos') root.appendChild(renderFatos());
  else if(currentTab==='atrasos') root.appendChild(renderAtrasos());
  else if(currentTab==='curva') root.appendChild(renderCurva());
  else if(currentTab==='cronograma') root.appendChild(renderCronograma());
  else if(currentTab==='fotos') root.appendChild(renderFotos());

  root.appendChild(buildAppCredits());
}

/* Rodapé de créditos exibido no final de cada página (aba) do site.
   É só uma nota do próprio aplicativo web — não aparece na apresentação
   .pptx gerada, que segue exclusivamente o modelo oficial ISA/SGS. */
function buildAppCredits(){
  const div = el('div','app-credits');
  div.innerHTML =
    'Aplicativo desenvolvido por<br>' +
    '<b>Leirton Filho</b> \u00b7 <b>Rogerio Tirolla</b> \u00b7 <b>Guilherme Dorea</b> \u00b7 <b>Guilherme Figueira</b>';
  return div;
}

/* Editable list of rich-text items with a delete button per item and an
   "add new" button at the end. Used on slides 5 and 6 so each bullet /
   text box can be individually removed or new ones added. */
function buildEditableItemList(items, placeholder, onStructureChange){
  const frag = document.createDocumentFragment();
  const wrap = el('div','item-list');
  items.forEach((txt,i)=>{
    const row = el('div','item-row');
    row.appendChild(el('div','num',String(i+1)));
    const rb = makeRichBox(txt, placeholder, (html)=>{ items[i]=html; schedulePreview(); });
    row.appendChild(rb);
    const del = document.createElement('button');
    del.type='button'; del.className='btn danger'; del.innerHTML='✕';
    del.title='Excluir esta caixa de texto';
    del.style.padding='6px 10px'; del.style.marginTop='6px'; del.style.flexShrink='0';
    del.onclick = ()=>{ items.splice(i,1); onStructureChange(); };
    row.appendChild(del);
    wrap.appendChild(row);
  });
  frag.appendChild(wrap);

  const addWrap = el('div', null);
  addWrap.style.marginTop = '4px';
  const addBtn = document.createElement('button');
  addBtn.type='button'; addBtn.className='btn add'; addBtn.textContent='➕ Incluir novo espaço de texto';
  addBtn.onclick = ()=>{ items.push(''); onStructureChange(); };
  addWrap.appendChild(addBtn);
  frag.appendChild(addWrap);

  return frag;
}

function panelHeader(title, sub, resetKey){
  const wrap = document.createDocumentFragment();
  const headRow = el('div', null);
  headRow.style.display = 'flex';
  headRow.style.alignItems = 'flex-start';
  headRow.style.justifyContent = 'space-between';
  headRow.style.gap = '12px';
  headRow.style.flexWrap = 'wrap';

  const left = el('div', null);
  left.appendChild(el('h2', null, title));
  if(sub) left.appendChild(el('p','sub', sub));
  headRow.appendChild(left);

  if(resetKey){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn danger';
    btn.style.flexShrink = '0';
    btn.textContent = '🗑️ Limpar dados deste tópico';
    btn.onclick = ()=>{
      if(confirm('Tem certeza que deseja limpar todos os dados preenchidos neste tópico? Esta ação não pode ser desfeita.')){
        resetSection(resetKey);
      }
    };
    headRow.appendChild(btn);
  }

  wrap.appendChild(headRow);
  return wrap;
}

/* ---- 1. CAPA ---- */
function renderCapa(){
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Capa do Relatório', 'Slide 1 — dados gerais que aparecem na página de rosto.', 'capa'));
  const card = el('div','card');
  const row = el('div','row2');
  textField(row, 'Projeto', state.capa.projeto, v=>{state.capa.projeto=v; schedulePreview();});
  textField(row, 'Localidade', state.capa.localidade, v=>{state.capa.localidade=v; schedulePreview();});
  card.appendChild(row);
  const row2 = el('div','row3');
  textField(row2, 'Regional', state.capa.regional, v=>{state.capa.regional=v; schedulePreview();});
  textField(row2, 'Semana', state.capa.semana, v=>{state.capa.semana=v; schedulePreview();});
  textField(row2, 'Período', state.capa.periodo, v=>{state.capa.periodo=v; schedulePreview();});
  card.appendChild(row2);
  panel.appendChild(card);
  panel.appendChild(buildPreviewBlock('capa', ()=>buildSlideCapa(null)));
  return panel;
}

/* ---- 2. STATUS ---- */
function renderStatus(){
  const s = state.status;
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Relatório Semanal Fiscalização — Status do Projeto','Slide 2 — dados de cronograma, contatos e status.', 'status'));

  const c1 = el('div','card');
  c1.appendChild(el('h3','','Datas'));
  const r = el('div','row3');
  textField(r,'Data Energização Final "linha de base"', s.dataEnergBase, v=>{s.dataEnergBase=v;schedulePreview();});
  textField(r,'Data Energização Final "reprogramada"', s.dataEnergReprog, v=>{s.dataEnergReprog=v;schedulePreview();});
  textField(r,'Data Desmobilização Final', s.dataDesmob, v=>{s.dataDesmob=v;schedulePreview();});
  c1.appendChild(r);
  panel.appendChild(c1);

  const c2 = el('div','card');
  c2.appendChild(el('h3','','Escopo do Projeto'));
  richField(c2, 'Escopo do Projeto', s.escopo, v=>{s.escopo=v;schedulePreview();}, 'Descreva o escopo do projeto...');
  panel.appendChild(c2);

  const c3 = el('div','card');
  c3.appendChild(el('h3','','Contatos'));
  const r3a = el('div','row2');
  textField(r3a,'Contratadas', s.contratadas, v=>{s.contratadas=v;schedulePreview();});
  textField(r3a,'Gestor Projetos ISA ENERGIA BRASIL', s.gestorProjetosIsa, v=>{s.gestorProjetosIsa=v;schedulePreview();});
  textField(r3a,'Gestor Fiscalização ISA ENERGIA BRASIL', s.gestorFiscIsa, v=>{s.gestorFiscIsa=v;schedulePreview();});
  textField(r3a,'Fiscal ISA ENERGIA BRASIL', s.fiscalIsa, v=>{s.fiscalIsa=v;schedulePreview();});
  textField(r3a,'Gestor Fiscalização / Contratada', s.gestorFiscContratada, v=>{s.gestorFiscContratada=v;schedulePreview();});
  textField(r3a,'Fiscal / Contratada', s.fiscalContratada, v=>{s.fiscalContratada=v;schedulePreview();});
  textField(r3a,'Engenheiro Segurança ISA ENERGIA BRASIL', s.engSegIsa, v=>{s.engSegIsa=v;schedulePreview();});
  c3.appendChild(r3a);

  // Full-width note, not part of the 2-column grid — "Técnico Segurança" is a fixed
  // label with no value after it. Positioned right after Eng. Segurança, before Empresa/Nome.
  const tsNote = el('div','field');
  tsNote.style.marginTop = '4px';
  tsNote.appendChild(el('label',null,labelWithTag('Técnico Segurança','fixo — sem valor')));
  tsNote.appendChild(el('div','footer-note','Este campo sai apenas com o rótulo, sem texto na frente (conforme solicitado).'));
  c3.appendChild(tsNote);

  const r3b = el('div','row2');
  r3b.style.marginTop = '10px';
  textField(r3b,'Empresa', s.empresa, v=>{s.empresa=v;schedulePreview();});
  textField(r3b,'Nome', s.nome, v=>{s.nome=v;schedulePreview();});
  c3.appendChild(r3b);

  panel.appendChild(c3);

  const c4 = el('div','card');
  c4.appendChild(el('h3','','Status do Projeto'));
  const f = el('div','field');
  f.appendChild(el('label',null,labelWithTag('Situação atual','fixo')));
  const rg = el('div','radio-group');
  [['andamento','Em Andamento'],['paralisado','Paralisado'],['concluido','Concluído']].forEach(([v,txt])=>{
    const lab = document.createElement('label');
    const r = document.createElement('input');
    r.type='radio'; r.name='situacao'; r.checked=(s.situacao===v);
    r.onchange=()=>{ if(r.checked){ s.situacao=v; renderContent(); schedulePreview(); } };
    lab.appendChild(r); lab.appendChild(document.createTextNode(txt));
    rg.appendChild(lab);
  });
  f.appendChild(rg);
  c4.appendChild(f);

  if(s.situacao==='paralisado'){
    const fs = document.createElement('fieldset');
    fs.innerHTML = '<legend>Detalhes da paralisação</legend>';
    const r = el('div','row3');
    textField(r,'Data Paralisação', s.dataParalisacao, v=>{s.dataParalisacao=v;schedulePreview();}, {placeholder:'xx/xx/xxxx'});
    textField(r,'Previsão de Retorno', s.previsaoRetorno, v=>{s.previsaoRetorno=v;schedulePreview();});
    fs.appendChild(r);
    richField(fs,'Motivo', s.motivoParalisacao, v=>{s.motivoParalisacao=v;schedulePreview();}, 'Descreva o motivo da paralisação...');
    c4.appendChild(fs);
  }
  if(s.situacao==='concluido'){
    const fs = document.createElement('fieldset');
    fs.innerHTML = '<legend>Detalhes da conclusão</legend>';
    textField(fs,'Data de Conclusão', s.dataConclusao, v=>{s.dataConclusao=v;schedulePreview();});
    togglePair(fs,'Pendências', s.pendencias, v=>{s.pendencias=v; renderContent(); schedulePreview();});
    if(s.pendencias==='sim'){
      richField(fs,'Se Sim, descreva', s.seSimPendencias, v=>{s.seSimPendencias=v;schedulePreview();});
    }
    c4.appendChild(fs);
  }

  const r5 = el('div','row2');
  togglePair(r5, 'Vias físicas', s.viasFisicas, v=>{s.viasFisicas=v;schedulePreview();});
  togglePair(r5, 'Acesso Keep Control', s.acessoKeepControl, v=>{s.acessoKeepControl=v;schedulePreview();});
  c4.appendChild(el('h3','','Disponibilização de Projetos Executivos'));
  c4.appendChild(r5);

  panel.appendChild(c4);
  panel.appendChild(buildPreviewBlock('status', ()=>buildSlideStatus(null)));
  return panel;
}

/* ---- 3. DDS / MOMENTO SEGURANÇA ---- */
function renderDDS(){
  const d = state.dds;
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Momento Segurança','Slide 3 — temas de DDS da semana e registro de acidentes/incidentes.', 'dds'));

  const c1 = el('div','card');
  c1.appendChild(el('h3','','Temas de DDS'));
  d.dias.forEach((item,i)=>{
    const f = el('div','field');
    f.appendChild(el('label',null,labelWithTag(item.dia,'fixo')));
    const inp = document.createElement('input');
    inp.type='text'; inp.value=item.tema; inp.placeholder='Digite o tema do DDS...';
    inp.oninput=()=>{ item.tema=inp.value; schedulePreview(); };
    f.appendChild(inp);
    c1.appendChild(f);
  });
  panel.appendChild(c1);

  const c2 = el('div','card');
  c2.appendChild(el('h3','','Acidente ou Incidente na Semana'));
  c2.appendChild(buildEditableItemList(d.acidentes, 'Relatar e informar...', ()=>{ renderContent(); schedulePreview(); }));
  panel.appendChild(c2);

  panel.appendChild(buildFotoComentarioCard(d, 'foto', 'fotoComentario', {
    title:'\ud83d\udcf7 Foto do Momento de Seguran\u00e7a (opcional)',
    sub:'Insira uma foto da parada de seguran\u00e7a ou do treinamento da semana. Se preenchida, a foto e o coment\u00e1rio entram no slide 3, \u00e0 direita dos textos.',
    aspect: 3.6/2.7,
    label:'Inserir foto da parada de seguran\u00e7a / treinamento',
    commentPlaceholder:'Coment\u00e1rio sobre a parada de seguran\u00e7a ou treinamento (opcional)...'
  }));

  panel.appendChild(buildPreviewBlock('dds', ()=>buildSlideDDS(null)));
  return panel;
}

/* ---- 4. ATIVIDADES ---- */
function renderAtividades(){
  const a = state.atividades;
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Atividades Realizadas na Semana','Slide 4 — cronograma, curva S e desenergizações.', 'atividades'));

  const c1 = el('div','card');
  c1.appendChild(el('h3','','Atividades Realizadas na Semana'));
  togglePair(c1,'Realizadas', a.realizadas, v=>{a.realizadas=v; renderContent(); schedulePreview();});
  richField(c1,'Se não, por quê?', a.seNaoPorque, v=>{a.seNaoPorque=v;schedulePreview();});
  richField(c1,'Efetivo mobilizado atende as demandas previstas de atividades', a.efetivoAtende, v=>{a.efetivoAtende=v;schedulePreview();});
  panel.appendChild(c1);

  const c2 = el('div','card');
  c2.appendChild(el('h3','','Cronograma Integrado'));
  togglePair(c2,'Houve alteração de datas no Cronograma Integrado', a.houveAlteracaoCronograma, v=>{a.houveAlteracaoCronograma=v;schedulePreview();});
  richField(c2,'Data da última revisão', a.dataUltimaRevisaoCronograma, v=>{a.dataUltimaRevisaoCronograma=v;schedulePreview();});
  togglePair(c2,'Houve alteração da data DESENERGIZAÇÃO referente à semana anterior', a.houveAlteracaoDesenerg, v=>{a.houveAlteracaoDesenerg=v;schedulePreview();});
  panel.appendChild(c2);

  const c3 = el('div','card');
  c3.appendChild(el('h3','','Curva S'));
  togglePair(c3,'Revisada nesta semana', a.curvaSRevisada, v=>{a.curvaSRevisada=v;schedulePreview();});
  const r = el('div','row2');
  textField(r,'Data última revisão', a.curvaSData, v=>{a.curvaSData=v;schedulePreview();}, {placeholder:'xx/xx/xxxx'});
  textField(r,'Percentual de avanço (%)', a.curvaSPercentual, v=>{a.curvaSPercentual=v;schedulePreview();}, {placeholder:'xx'});
  c3.appendChild(r);
  panel.appendChild(c3);

  panel.appendChild(buildPreviewBlock('atividades', ()=>buildSlideAtividades(null)));
  return panel;
}

/* ---- 5. FATOS RELEVANTES (repeatable) ---- */
function renderFatos(){
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Fatos Relevantes / Pontos de Atenção','Slide 5 — repita este slide quantas vezes forem necessárias.', 'fatosSlides'));

  state.fatosSlides.forEach((block, idx)=>{
    const sb = el('div','slide-block');
    const head = el('div','slide-block-head');
    const pageNum = computePreviewPageNumber('fatos-'+block.id);
    head.appendChild(el('h3',null,`Slide — Fatos Relevantes #${idx+1} <span data-pagelabel="fatos-${block.id}" style="font-weight:400;color:#888;font-size:12px;">(página ${pageNum} do documento)</span>`));
    if(state.fatosSlides.length>1){
      const del = el('button','btn danger','Remover slide');
      del.type='button';
      del.onclick=()=>{ state.fatosSlides.splice(idx,1); renderContent(); schedulePreview(); };
      head.appendChild(del);
    }
    sb.appendChild(head);

    sb.appendChild(el('h3','','Fatos Relevantes'));
    sb.appendChild(buildEditableItemList(block.fatos, 'Descreva o fato relevante...', ()=>{ renderContent(); schedulePreview(); }));

    sb.appendChild(el('h3','','Pontos de Atenção'));
    sb.appendChild(buildEditableItemList(block.pontos, 'Descreva o ponto de atenção...', ()=>{ renderContent(); schedulePreview(); }));

    if(!block.foto) block.foto = {image:null};
    if(block.fotoComentario==null) block.fotoComentario = '';
    if(!Array.isArray(block.acompanhamento)) block.acompanhamento = [];

    sb.appendChild(buildFotoComentarioCard(block, 'foto', 'fotoComentario', {
      title:'\ud83d\udcf7 Foto do fato relevante (opcional)',
      sub:'Se preenchida, a foto e o coment\u00e1rio entram neste slide, \u00e0 direita dos textos.',
      aspect: 3.6/2.4,
      label:'Inserir foto (opcional)',
      commentPlaceholder:'Coment\u00e1rio sobre o fato relevante (opcional)...'
    }));

    sb.appendChild(buildAcompanhamentoCard(block.acompanhamento, {
      title:'\ud83d\udccc Quadro de acompanhamento dos itens (opcional)',
      sub:'Relate o status das cobran\u00e7as de cada tema. Se preenchido, um slide extra "Acompanhamento dos Itens" \u00e9 gerado logo ap\u00f3s este slide de Fatos Relevantes.'
    }));

    sb.appendChild(buildPreviewBlock('fatos-'+block.id, ()=>buildSlideFatos(block, null)));
    if(acompHasContent(block.acompanhamento)){
      sb.appendChild(buildPreviewBlock('fatos-acomp-'+block.id, ()=>null));
    }
    panel.appendChild(sb);
  });

  const addBtn = el('button','btn add','➕ Acrescentar novo slide de Fatos Relevantes');
  addBtn.type='button';
  addBtn.onclick = ()=>{
    state.fatosSlides.push({
      id: nextId('fatos'),
      fatos: Array(8).fill(''),
      pontos: Array(8).fill(''),
      foto: {image:null},
      fotoComentario: '',
      acompanhamento: []
    });
    renderContent(); schedulePreview();
  };
  panel.appendChild(addBtn);

  return panel;
}

/* ---- 6. ATRASOS ---- */
function renderAtrasos(){
  const a = state.atrasos;
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Histórico de Atraso de Obras','Slide 6 — atrasos da semana e atividades críticas futuras.', 'atrasos'));

  const c1 = el('div','card');
  c1.appendChild(el('h3','','Histórico de atraso de obras'));
  c1.appendChild(buildEditableItemList(a.itens, 'Descreva o atraso...', ()=>{ renderContent(); schedulePreview(); }));
  panel.appendChild(c1);

  const c2 = el('div','card');
  c2.appendChild(el('h3','','Previsão de Atividades Críticas Futuras'));
  c2.appendChild(buildEditableItemList(a.criticas, 'Descreva a atividade crítica futura...', ()=>{ renderContent(); schedulePreview(); }));
  panel.appendChild(c2);

  if(!a.foto) a.foto = {image:null};
  if(a.fotoComentario==null) a.fotoComentario = '';
  if(!Array.isArray(a.acompanhamento)) a.acompanhamento = [];

  panel.appendChild(buildFotoComentarioCard(a, 'foto', 'fotoComentario', {
    title:'\ud83d\udcf7 Foto (opcional)',
    sub:'Se preenchida, a foto e o coment\u00e1rio entram no slide 6, \u00e0 direita dos textos.',
    aspect: 3.6/2.4,
    label:'Inserir foto (opcional)',
    commentPlaceholder:'Coment\u00e1rio sobre o atraso / atividade cr\u00edtica (opcional)...'
  }));

  panel.appendChild(buildAcompanhamentoCard(a.acompanhamento, {
    title:'\ud83d\udccc Quadro de acompanhamento dos itens (opcional)',
    sub:'Relate o status das cobran\u00e7as de cada tema. Se preenchido, um slide extra "Acompanhamento dos Itens" \u00e9 gerado logo ap\u00f3s o slide 6.'
  }));

  panel.appendChild(buildPreviewBlock('atrasos', ()=>buildSlideAtrasos(null)));
  if(acompHasContent(a.acompanhamento)){
    panel.appendChild(buildPreviewBlock('atrasos-acomp', ()=>null));
  }
  return panel;
}

/* ---- 7. CURVA S (image) ---- */
function renderCurva(){
  const c = state.curva;
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Curva S','Slide 7 — dados e imagem do gráfico da Curva S.', 'curva'));
  const card = el('div','card');
  const r = el('div','row2');
  textField(r,'Data da última revisão da Curva S', c.data, v=>{c.data=v;schedulePreview();}, {placeholder:'xx/xx/xxxx'});
  textField(r,'Diferença entre o previsto e planejado (%)', c.diferenca, v=>{c.diferenca=v;schedulePreview();}, {placeholder:'xx'});
  card.appendChild(r);
  card.appendChild(buildImageUploader(c, 10.16/4.48, 'Inserir imagem da Curva S'));
  panel.appendChild(card);
  panel.appendChild(buildPreviewBlock('curva', ()=>buildSlideCurva(null)));
  return panel;
}

/* ---- 8. CRONOGRAMA (image) ---- */
function renderCronograma(){
  const c = state.cronograma;
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Cronograma','Slide 8 — data e imagem do cronograma (Gantt/MS Project).', 'cronograma'));
  const card = el('div','card');
  textField(card,'Data da última revisão', c.data, v=>{c.data=v;schedulePreview();}, {placeholder:'xx/xx/xxxx'});
  card.appendChild(buildImageUploader(c, 10.16/4.48, 'Inserir imagem do Cronograma'));
  panel.appendChild(card);
  panel.appendChild(buildPreviewBlock('cronograma', ()=>buildSlideCronograma(null)));
  return panel;
}

/* ---- 9. FOTOS (repeatable, 6 slots each) ---- */
function renderFotos(){
  const panel = el('div','panel active');
  panel.appendChild(panelHeader('Registros Fotográficos','Slides 9+ — grade de 6 fotos com legenda. Ajuste o enquadramento se necessário.', 'fotosSlides'));

  state.fotosSlides.forEach((block, idx)=>{
    const sb = el('div','slide-block');
    const head = el('div','slide-block-head');
    const pageNum = computePreviewPageNumber('fotos-'+block.id);
    head.appendChild(el('h3',null,`Slide — Registros Fotográficos #${idx+1} <span data-pagelabel="fotos-${block.id}" style="font-weight:400;color:#888;font-size:12px;">(página ${pageNum} do documento)</span>`));
    if(state.fotosSlides.length>1){
      const del = el('button','btn danger','Remover slide');
      del.type='button';
      del.onclick=()=>{ state.fotosSlides.splice(idx,1); renderContent(); schedulePreview(); };
      head.appendChild(del);
    }
    sb.appendChild(head);

    const grid = el('div','row3');
    block.photos.forEach((slot,i)=>{
      grid.appendChild(buildPhotoSlot(slot, `Foto ${i+1}`));
    });
    sb.appendChild(grid);

    sb.appendChild(buildPreviewBlock('fotos-'+block.id, ()=>buildSlideFotos(block, null)));
    panel.appendChild(sb);
  });

  const addBtn = el('button','btn add','➕ Acrescentar novo slide de Registros Fotográficos');
  addBtn.type='button';
  addBtn.onclick = ()=>{
    state.fotosSlides.push({
      id: nextId('fotos'),
      photos: Array(6).fill(null).map(()=>({image:null, legenda:'', zoom:1, x:0.5, y:0.5}))
    });
    renderContent(); schedulePreview();
  };
  panel.appendChild(addBtn);

  return panel;
}

/* ---------------------------------------------------------------------------
   IMAGE UPLOAD + CROP/PAN/ZOOM WIDGET (generic, used for Curva S / Cronograma)
--------------------------------------------------------------------------- */
/* Converts an uploaded File into {dataUrl, natW, natH}. Supports normal
   image files directly, and PDF files by rendering the first page to a
   canvas via pdf.js (so users can upload a JPEG or a PDF export from
   MS Project / Power BI / Excel indistinctly). */
function fileToImageData(file){
  const isPdf = (file.type === 'application/pdf') || /\.pdf$/i.test(file.name || '');
  if(!isPdf){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = (e)=>{
        const dataUrl = e.target.result;
        const tmp = new Image();
        tmp.onload = ()=> resolve({dataUrl, natW: tmp.naturalWidth, natH: tmp.naturalHeight});
        tmp.onerror = reject;
        tmp.src = dataUrl;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  // PDF: render first page to canvas at high resolution, then export as PNG data URL
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = async (e)=>{
      try{
        if(!window['pdfjsLib']) throw new Error('pdf.js não carregado');
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({data: typedArray}).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({scale: 2.5});
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        await page.render({canvasContext: ctx, viewport}).promise;
        resolve({dataUrl: canvas.toDataURL('image/png'), natW: canvas.width, natH: canvas.height});
      } catch(err){ reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function buildImageUploader(target, aspect, label){
  const wrap = el('div','photo-slot');
  wrap.appendChild(el('h4',null,label));
  const crop = el('div','photo-crop is-empty');
  crop.style.aspectRatio = aspect.toFixed(4);
  const hint = el('div','hint','Nenhuma imagem selecionada');
  crop.appendChild(hint);
  wrap.appendChild(crop);

  const controls = el('div','photo-controls');
  const zoomLbl = el('span',null,'Zoom');
  const zoomRange = document.createElement('input');
  zoomRange.type='range'; zoomRange.min='1'; zoomRange.max='3'; zoomRange.step='0.01';
  zoomRange.value = (target.image && target.image.zoom) ? target.image.zoom : 1;
  controls.appendChild(zoomLbl); controls.appendChild(zoomRange);
  wrap.appendChild(controls);

  const fileInput = document.createElement('input');
  fileInput.type='file'; fileInput.accept='image/*,application/pdf,.pdf'; fileInput.style.marginTop='8px';
  wrap.appendChild(fileInput);
  const fmtNote = el('div','footer-note','Aceita imagem (JPEG/PNG) ou PDF (a 1ª página do PDF é usada).');
  wrap.appendChild(fmtNote);

  let imgEl = null, natW=0, natH=0;
  let panX = (target.image && target.image.panX!=null) ? target.image.panX : 0.5;
  let panY = (target.image && target.image.panY!=null) ? target.image.panY : 0.5;
  let zoom = (target.image && target.image.zoom) ? target.image.zoom : 1;
  let dragging=false, lastX=0, lastY=0;

  function applyTransform(){
    if(!imgEl) return;
    const cropW = crop.clientWidth, cropH = crop.clientHeight;
    const coverScale = Math.max(cropW/natW, cropH/natH) * zoom;
    const dispW = natW*coverScale, dispH = natH*coverScale;
    const maxX = Math.max(0, dispW-cropW), maxY = Math.max(0, dispH-cropH);
    const left = -maxX*panX, top = -maxY*panY;
    imgEl.style.width = dispW+'px'; imgEl.style.height = dispH+'px';
    imgEl.style.left = left+'px'; imgEl.style.top = top+'px';
  }

  // Restore an already-uploaded image when this panel is rebuilt (e.g. switching tabs)
  // instead of showing "Nenhuma imagem selecionada" and losing the visual preview.
  if(target.image && target.image.dataUrl){
    hint.remove();
    crop.classList.remove('is-empty');
    imgEl = document.createElement('img');
    imgEl.src = target.image.dataUrl;
    crop.appendChild(imgEl);
    natW = target.image.natW; natH = target.image.natH;
    imgEl.onload = applyTransform;
    setTimeout(applyTransform, 50);
  }

  async function loadFile(file){
    hint.textContent = 'Processando arquivo...';
    try{
      const { dataUrl, natW: w, natH: h } = await fileToImageData(file);
      natW = w; natH = h;
      hint.remove();
      crop.classList.remove('is-empty');
      if(imgEl) imgEl.remove();
      imgEl = document.createElement('img');
      imgEl.src = dataUrl;
      crop.appendChild(imgEl);
      panX=0.5; panY=0.5; zoom=1; zoomRange.value='1';
      applyTransform();
      target.image = {dataUrl, natW, natH, zoom, panX, panY};
      schedulePreview();
    } catch(err){
      console.error(err);
      hint.textContent = 'Não foi possível processar o arquivo.';
    }
  }

  fileInput.onchange = ()=>{ if(fileInput.files[0]) loadFile(fileInput.files[0]); };

  // Clicar no quadradinho também abre o seletor de arquivo (além do botão
  // "Escolher arquivo" abaixo) — só não conflita com o arrastar pra reenquadrar
  // porque um clique de verdade não move o ponteiro mais que alguns pixels.
  let clickDownX=0, clickDownY=0;
  crop.addEventListener('mousedown', (e)=>{
    clickDownX=e.clientX; clickDownY=e.clientY;
    if(!imgEl) return;
    dragging=true; lastX=e.clientX; lastY=e.clientY; crop.style.cursor='grabbing';
  });
  crop.addEventListener('click', (e)=>{
    if(Math.abs(e.clientX-clickDownX) > 4 || Math.abs(e.clientY-clickDownY) > 4) return;
    fileInput.click();
  });
  window.addEventListener('mousemove',(e)=>{
    if(!dragging || !imgEl) return;
    const cropW = crop.clientWidth, cropH = crop.clientHeight;
    const coverScale = Math.max(cropW/natW, cropH/natH) * zoom;
    const dispW = natW*coverScale, dispH = natH*coverScale;
    const maxX = Math.max(1, dispW-cropW), maxY = Math.max(1, dispH-cropH);
    const dx = (e.clientX-lastX)/maxX, dy = (e.clientY-lastY)/maxY;
    panX = Math.min(1, Math.max(0, panX - dx));
    panY = Math.min(1, Math.max(0, panY - dy));
    lastX=e.clientX; lastY=e.clientY;
    applyTransform();
    target.image.zoom=zoom; target.image.panX=panX; target.image.panY=panY;
  });
  window.addEventListener('mouseup', ()=>{ if(dragging){ dragging=false; crop.style.cursor='grab'; schedulePreview(); } });

  zoomRange.oninput = ()=>{
    zoom = parseFloat(zoomRange.value);
    applyTransform();
    if(target.image){ target.image.zoom=zoom; }
    schedulePreview();
  };

  return wrap;
}

/* photo slot for the 6-photo grid (adds legend field) */
function buildPhotoSlot(slot, title){
  const wrap = el('div','photo-slot');
  wrap.appendChild(el('h4',null,title));
  const uploaderCard = buildImageUploaderForSlot(slot);
  wrap.appendChild(uploaderCard);
  const capField = el('div','caption-field');
  const lab = el('label',null,labelWithTag('Legenda','só o texto digitado é impresso · máx. 60 caracteres'));
  lab.style.fontSize='12px'; lab.style.fontWeight='600'; lab.style.display='block'; lab.style.marginBottom='4px';
  capField.appendChild(lab);
  const inp = document.createElement('input');
  inp.type='text'; inp.value = slot.legenda||''; inp.placeholder='Descrição da foto...'; inp.maxLength = 60;
  inp.style.width='100%'; inp.style.padding='7px 9px'; inp.style.border='1px solid #cdd5df'; inp.style.borderRadius='6px'; inp.style.fontSize='13px';
  const counter = el('div','footer-note', `${(slot.legenda||'').length}/60`);
  inp.oninput = ()=>{ slot.legenda = inp.value.slice(0,60); inp.value = slot.legenda; counter.textContent = `${slot.legenda.length}/60`; schedulePreview(); };
  capField.appendChild(inp);
  capField.appendChild(counter);
  wrap.appendChild(capField);
  return wrap;
}

/* ---------------------------------------------------------------------------
   OPTIONAL PHOTO + COMMENT CARD (slides 3, 5 e 6)
--------------------------------------------------------------------------- */
function buildFotoComentarioCard(holder, fotoKey, comKey, opts){
  opts = opts || {};
  const card = el('div','card');
  card.appendChild(el('h3','', opts.title || '\ud83d\udcf7 Foto (opcional)'));
  if(opts.sub) card.appendChild(el('p','sub', opts.sub));
  card.appendChild(buildImageUploader(holder[fotoKey], opts.aspect || (4/3), opts.label || 'Inserir foto (opcional)'));
  if(holder[fotoKey] && holder[fotoKey].image){
    const rm = document.createElement('button');
    rm.type='button'; rm.className='btn danger'; rm.textContent='\ud83d\uddd1 Remover foto';
    rm.style.marginTop='8px';
    rm.onclick = ()=>{ holder[fotoKey].image = null; renderContent(); schedulePreview(); };
    card.appendChild(rm);
  }
  const f = el('div','field');
  f.style.marginTop='10px';
  f.appendChild(el('label',null,labelWithTag('Coment\u00e1rio','opcional \u00b7 m\u00e1x. 300 caracteres')));
  const ta = document.createElement('textarea');
  ta.value = holder[comKey]||'';
  ta.placeholder = opts.commentPlaceholder || 'Escreva um coment\u00e1rio (opcional)...';
  ta.maxLength = 300; ta.rows = 3;
  ta.style.width='100%'; ta.style.padding='8px 10px'; ta.style.border='1px solid #cdd5df';
  ta.style.borderRadius='6px'; ta.style.fontSize='13px'; ta.style.fontFamily='inherit'; ta.style.resize='vertical';
  const counter = el('div','footer-note', `${(holder[comKey]||'').length}/300`);
  ta.oninput = ()=>{ holder[comKey]=ta.value.slice(0,300); counter.textContent=`${holder[comKey].length}/300`; schedulePreview(); };
  f.appendChild(ta); f.appendChild(counter);
  card.appendChild(f);
  return card;
}

/* ---------------------------------------------------------------------------
   QUADRO DE ACOMPANHAMENTO (status de cobran\u00e7as) - slides 5 e 6
   Se ao menos um item for preenchido, um slide extra de acompanhamento
   \u00e9 gerado logo ap\u00f3s o slide correspondente.
--------------------------------------------------------------------------- */
const ACOMP_STATUS = [
  {v:'pendente',  label:'Pendente',      color:'E67E22'},
  {v:'andamento', label:'Em andamento',  color:'2980B9'},
  {v:'concluido', label:'Conclu\u00eddo',     color:'27AE60'},
  {v:'atrasado',  label:'Atrasado',      color:'C0392B'}
];
function acompStatusInfo(v){ return ACOMP_STATUS.find(s=>s.v===v) || ACOMP_STATUS[0]; }
function acompHasContent(list){ return Array.isArray(list) && list.some(r => (r.tema||'').trim() || (r.obs||'').trim()); }

function buildAcompanhamentoCard(list, opts){
  opts = opts || {};
  const card = el('div','card');
  card.appendChild(el('h3','', opts.title || '\ud83d\udccc Quadro de acompanhamento dos itens (opcional)'));
  card.appendChild(el('p','sub', opts.sub || 'Use para relatar o status das cobran\u00e7as/tratativas de cada tema. Se preenchido, um slide extra de acompanhamento \u00e9 gerado logo ap\u00f3s este slide.'));

  const inpStyle = (inp)=>{
    inp.style.width='100%'; inp.style.padding='7px 9px'; inp.style.border='1px solid #cdd5df';
    inp.style.borderRadius='6px'; inp.style.fontSize='13px'; inp.style.fontFamily='inherit';
  };

  list.forEach((row,i)=>{
    const rw = el('div','item-row');
    rw.style.alignItems='flex-start';
    rw.appendChild(el('div','num',String(i+1)));

    const grid = el('div',null);
    grid.style.flex='1'; grid.style.display='grid'; grid.style.gridTemplateColumns='1fr 170px'; grid.style.gap='8px';

    const inpTema = document.createElement('input');
    inpTema.type='text'; inpTema.value=row.tema||''; inpTema.placeholder='Tema / item em cobran\u00e7a...';
    inpStyle(inpTema);
    inpTema.oninput=()=>{ row.tema=inpTema.value; schedulePreview(); };

    const sel = document.createElement('select');
    ACOMP_STATUS.forEach(s=>{ const o=document.createElement('option'); o.value=s.v; o.textContent=s.label; sel.appendChild(o); });
    sel.value = row.status || 'pendente';
    inpStyle(sel);
    sel.onchange=()=>{ row.status=sel.value; schedulePreview(); };

    const inpObs = document.createElement('input');
    inpObs.type='text'; inpObs.value=row.obs||''; inpObs.placeholder='Observa\u00e7\u00e3o / \u00faltima tratativa (opcional)...';
    inpObs.style.gridColumn='1 / -1';
    inpStyle(inpObs);
    inpObs.oninput=()=>{ row.obs=inpObs.value; schedulePreview(); };

    grid.appendChild(inpTema); grid.appendChild(sel); grid.appendChild(inpObs);
    rw.appendChild(grid);

    const del = document.createElement('button');
    del.type='button'; del.className='btn danger'; del.innerHTML='\u2715'; del.title='Excluir este item';
    del.style.padding='6px 10px'; del.style.marginTop='6px'; del.style.flexShrink='0';
    del.onclick=()=>{ list.splice(i,1); renderContent(); schedulePreview(); };
    rw.appendChild(del);
    card.appendChild(rw);
  });

  const addBtn = document.createElement('button');
  addBtn.type='button'; addBtn.className='btn add'; addBtn.textContent='\u2795 Incluir item de acompanhamento';
  addBtn.style.marginTop='4px';
  addBtn.onclick=()=>{ list.push({tema:'', status:'pendente', obs:''}); renderContent(); schedulePreview(); };
  card.appendChild(addBtn);
  return card;
}

function buildImageUploaderForSlot(slot){
  const wrap = document.createDocumentFragment();
  const box = el('div', null);
  const aspect = 8/4.23; // cm: 8 largura x 4,23 altura
  const crop = el('div','photo-crop is-empty');
  crop.style.aspectRatio = aspect.toFixed(4);
  crop.style.maxWidth = '260px';
  const hint = el('div','hint','Sem imagem');
  crop.appendChild(hint);
  box.appendChild(crop);

  const controls = el('div','photo-controls');
  controls.style.maxWidth='260px';
  controls.appendChild(el('span',null,'Zoom'));
  const zoomRange = document.createElement('input');
  zoomRange.type='range'; zoomRange.min='1'; zoomRange.max='3'; zoomRange.step='0.01'; zoomRange.value=slot.zoom||1;
  controls.appendChild(zoomRange);
  box.appendChild(controls);

  const fileInput = document.createElement('input');
  fileInput.type='file'; fileInput.accept='image/*'; fileInput.style.marginTop='6px';
  box.appendChild(fileInput);

  let imgEl=null, natW=0, natH=0, dragging=false,lastX=0,lastY=0;
  let zoom = slot.zoom||1, panX = slot.x!=null?slot.x:0.5, panY = slot.y!=null?slot.y:0.5;

  function applyTransform(){
    if(!imgEl) return;
    const cropW=crop.clientWidth, cropH=crop.clientHeight;
    const coverScale = Math.max(cropW/natW, cropH/natH)*zoom;
    const dispW=natW*coverScale, dispH=natH*coverScale;
    const maxX=Math.max(0,dispW-cropW), maxY=Math.max(0,dispH-cropH);
    imgEl.style.width=dispW+'px'; imgEl.style.height=dispH+'px';
    imgEl.style.left=(-maxX*panX)+'px'; imgEl.style.top=(-maxY*panY)+'px';
  }

  if(slot.image && slot.image.dataUrl){
    hint.remove();
    crop.classList.remove('is-empty');
    imgEl = document.createElement('img');
    imgEl.src = slot.image.dataUrl;
    crop.appendChild(imgEl);
    natW = slot.image.natW; natH = slot.image.natH;
    imgEl.onload = applyTransform;
    setTimeout(applyTransform, 50);
  }

  function loadFile(file){
    const reader = new FileReader();
    reader.onload = (e)=>{
      const dataUrl = e.target.result;
      const tmp = new Image();
      tmp.onload = ()=>{
        natW = tmp.naturalWidth; natH = tmp.naturalHeight;
        hint.remove();
        crop.classList.remove('is-empty');
        if(imgEl) imgEl.remove();
        imgEl = document.createElement('img');
        imgEl.src = dataUrl;
        crop.appendChild(imgEl);
        zoom=1; panX=0.5; panY=0.5; zoomRange.value='1';
        applyTransform();
        slot.image = {dataUrl, natW, natH};
        slot.zoom=zoom; slot.x=panX; slot.y=panY;
        schedulePreview();
      };
      tmp.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }
  fileInput.onchange=()=>{ if(fileInput.files[0]) loadFile(fileInput.files[0]); };

  // Clicar no quadradinho também abre o seletor de arquivo (além do botão
  // "Escolher arquivo" abaixo) — só não conflita com o arrastar pra reenquadrar
  // porque um clique de verdade não move o ponteiro mais que alguns pixels.
  let clickDownX=0, clickDownY=0;
  crop.addEventListener('mousedown',(e)=>{
    clickDownX=e.clientX; clickDownY=e.clientY;
    if(!imgEl) return; dragging=true; lastX=e.clientX; lastY=e.clientY; crop.style.cursor='grabbing';
  });
  crop.addEventListener('click', (e)=>{
    if(Math.abs(e.clientX-clickDownX) > 4 || Math.abs(e.clientY-clickDownY) > 4) return;
    fileInput.click();
  });
  window.addEventListener('mousemove',(e)=>{
    if(!dragging||!imgEl) return;
    const cropW=crop.clientWidth, cropH=crop.clientHeight;
    const coverScale = Math.max(cropW/natW, cropH/natH)*zoom;
    const dispW=natW*coverScale, dispH=natH*coverScale;
    const maxX=Math.max(1,dispW-cropW), maxY=Math.max(1,dispH-cropH);
    const dx=(e.clientX-lastX)/maxX, dy=(e.clientY-lastY)/maxY;
    panX=Math.min(1,Math.max(0,panX-dx)); panY=Math.min(1,Math.max(0,panY-dy));
    lastX=e.clientX; lastY=e.clientY;
    applyTransform();
    slot.x=panX; slot.y=panY;
  });
  window.addEventListener('mouseup',()=>{ if(dragging){dragging=false; crop.style.cursor='grab'; schedulePreview();} });

  zoomRange.oninput=()=>{ zoom=parseFloat(zoomRange.value); applyTransform(); slot.zoom=zoom; schedulePreview(); };

  wrap.appendChild(box);
  return wrap;
}

/* ---------------------------------------------------------------------------
   PREVIEW (lightweight HTML approximation of the slide)
--------------------------------------------------------------------------- */
function buildPreviewBlock(group, _legacy){
  const wrap = el('div','preview-wrap');
  wrap.dataset.group = group;
  wrap.appendChild(el('div',null,'<strong style="font-size:12px;color:#666;">Prévia do slide</strong>'));
  wrap.appendChild(el('div','preview-pages'));
  wrap.appendChild(el('div','footer-note','A prévia é uma aproximação fiel do espaço disponível. Se o texto não couber, uma página de continuação é criada automaticamente — no mesmo padrão — e ela também aparece aqui.'));
  requestAnimationFrame(()=>refreshPreviewGroup(wrap));
  return wrap;
}

/* Redesenha todas as páginas (inclusive as de continuação) de um bloco. */
function refreshPreviewGroup(wrap){
  const group  = wrap.dataset.group;
  const holder = wrap.querySelector('.preview-pages');
  if(!holder) return;
  const pages = getPagePlan().filter(x => x.group === group);
  holder.innerHTML = '';
  pages.forEach((p,i)=>{
    if(pages.length > 1){
      holder.appendChild(el('div','pv-page-label',
        `Página ${p.pageNo} do documento` + (i>0 ? ' <span class="pv-cont">— continuação criada automaticamente</span>' : '')));
    }
    const slideEl = el('div','preview-slide');
    holder.appendChild(slideEl);
    renderPagePreview(slideEl, p);
  });
}

function htmlToPlainLines(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = html||'';
  return tmp.innerText || tmp.textContent || '';
}

/* Número da página no documento final (primeira página do bloco). */
function computePreviewPageNumber(key){
  if(key==='capa') return null;
  const p = getPagePlan().find(x => x.group === key);
  return p ? p.pageNo : null;
}

/* Conversão pt -> unidade da prévia (cqw = 1% da largura do slide, 13,333").
   Usar a conversão exata faz a prévia refletir fielmente o que cabe no slide. */
function pvSize(sizePt){ return (sizePt/72)/SLIDE_W*100; }

function renderPagePreview(container, p){
  container.innerHTML = '';
  container.style.containerType = 'inline-size';
  const bgMap = {capa:1, status:2, dds:3, atividades:4, fatos:5, atrasos:6, curva:7, cronograma:8, fotos:9, thanks:11};
  const bgNum = (p.kind === 'acomp') ? p.bg : (bgMap[p.kind] || 2);
  container.style.backgroundImage = `url(${BG_IMAGES[bgNum]})`;

  function txt(x,y,w,h,html,opts){
    opts = opts||{};
    const d = document.createElement('div');
    d.className = 'pv-text';
    d.style.left   = (x/SLIDE_W*100)+'%';
    d.style.top    = (y/SLIDE_H*100)+'%';
    d.style.width  = (w/SLIDE_W*100)+'%';
    d.style.height = (h/SLIDE_H*100)+'%';
    d.style.fontSize   = (opts.size || pvSize(12.5)) + 'cqw';
    d.style.lineHeight = String(LINE_FACTOR*(opts.lsm||1));
    d.style.fontWeight = opts.bold ? '700' : '400';
    d.style.fontStyle  = opts.italic ? 'italic' : 'normal';
    d.style.color      = opts.color || '#000';
    d.style.fontFamily = opts.font || MEASURE_FONT;
    d.style.textAlign  = opts.align || 'left';
    d.innerHTML = html;
    container.appendChild(d);
  }

  function flowPreview(page, geom){
    page.regions.forEach((region,i)=>{
      if(!region) return;
      const g = geom.regions[i];
      const sec = region.section;
      txt(geom.x, g.titleY, geom.titleW, 0.4,
        esc(sec.title + (region.cont ? ' (continuação)' : '')),
        {size: pvSize(geom.titleSize), bold:true, color:'#'+BLUE1});
      const body = region.items.map(it => '<div>'+(sec.html(it)||'&nbsp;')+'</div>').join('');
      txt(geom.x, g.textY, region.w, g.h, body, {size: pvSize(sec.size), lsm: sec.lsm});
    });
  }

  function acompTableHtml(rows){
    return '<table style="width:100%;border-collapse:collapse;font-size:inherit;">' +
      '<tr>' + ['#','Tema / Item','Status','Observação / Última tratativa'].map(h=>
        `<th style="border:1px solid #9aa5b1;padding:2px 5px;background:#214C92;color:#fff;">${h}</th>`).join('') + '</tr>' +
      (rows||[]).map(r=>{
        const st = acompStatusInfo(r.status);
        return `<tr><td style="border:1px solid #9aa5b1;padding:2px 5px;text-align:center;">${r.__n}</td>`+
               `<td style="border:1px solid #9aa5b1;padding:2px 5px;">${esc(r.tema)}</td>`+
               `<td style="border:1px solid #9aa5b1;padding:2px 5px;text-align:center;color:#fff;background:#${st.color};font-weight:700;">${st.label}</td>`+
               `<td style="border:1px solid #9aa5b1;padding:2px 5px;">${esc(r.obs)}</td></tr>`;
      }).join('') + '</table>';
  }

  if(p.kind==='capa'){
    const c = state.capa;
    txt(0.68,5.45,6.5,1.7, `<b>Projeto: ${esc(c.projeto)}</b><br><b>Localidade: ${esc(c.localidade)}</b><br><b>Regional: ${esc(c.regional)}</b><br><b>Semana: ${esc(c.semana)}</b><br><b>Período: ${esc(c.periodo)}</b>`,
      {size: pvSize(14), color:'#fff', font:'Tahoma', lsm:1.3});

  } else if(p.kind==='status'){
    const s = state.status;
    txt(3.45,0.35,6.6,0.65, 'Relatório Semanal Fiscalização', {size:pvSize(28), bold:true, color:'#'+BLUE1});
    txt(0.75,1.30,5.4,1.75, `<b style="color:#${BLUE1}">Escopo do Projeto:</b> ${esc(htmlToPlainLines(s.escopo))}`, {size:pvSize(12.5), lsm:1.5});
    txt(0.75,2.85,5.4,3.5, [
      ['Contratadas', s.contratadas],['Gestor Projetos ISA', s.gestorProjetosIsa],['Gestor Fisc. ISA', s.gestorFiscIsa],
      ['Fiscal ISA', s.fiscalIsa],['Gestor Fisc./Contratada', s.gestorFiscContratada],['Fiscal/Contratada', s.fiscalContratada],
      ['Eng. Segurança ISA', s.engSegIsa],['Técnico Segurança', ''],['Empresa', s.empresa],['Nome', s.nome]
    ].map(([l,v])=>`<b style="color:#${BLUE1}">${l}:</b> ${esc(v)}`).join('<br>'), {size:pvSize(12.5), lsm:1.5});
    txt(7.1,1.35,5.9,1.0, [
      ['Data Energ. linha de base', s.dataEnergBase],['Data Energ. reprogramada', s.dataEnergReprog],['Data Desmobilização', s.dataDesmob]
    ].map(([l,v])=>`<b style="color:#${BLUE1}">${l}:</b> ${esc(v)}`).join('<br>'), {size:pvSize(12.5), lsm:1.5});
    let statusHtml = `<b style="color:#${BLUE1}">Status do Projeto:</b> ${s.situacao}`;
    if(s.situacao==='paralisado') statusHtml += `<br>Data: ${esc(s.dataParalisacao)} — ${esc(htmlToPlainLines(s.motivoParalisacao))}`;
    if(s.situacao==='concluido')  statusHtml += `<br>Conclusão: ${esc(s.dataConclusao)}`;
    txt(7.1,2.50,5.9,2.4, statusHtml, {size:pvSize(12.5), lsm:1.5});
    txt(7.1,5.30,5.9,1.3, `<b style="color:#${BLUE1}">Vias físicas:</b> ${s.viasFisicas} &nbsp; <b style="color:#${BLUE1}">Keep Control:</b> ${s.acessoKeepControl}`, {size:pvSize(12.5), lsm:1.5});

  } else if(p.kind==='dds'){
    const d = state.dds;
    txt(3.45,0.35,6.6,0.65, 'Momento Segurança', {size:pvSize(28), bold:true, color:'#'+BLUE1});
    flowPreview(p.page, GEOM_DDS);
    if(p.page.idx === 0){
      if(d.foto && d.foto.image) txt(9.0,1.7,3.6,2.7, `<img src="${d.foto.image.dataUrl}" style="width:100%;height:100%;object-fit:cover;border:1px solid #b9c2cc;">`);
      if((d.fotoComentario||'').trim()) txt(9.0,4.45,3.6,2.2, `<i>${esc(d.fotoComentario)}</i>`, {size:pvSize(10.5)});
    }

  } else if(p.kind==='atividades'){
    const a = state.atividades;
    txt(1.25,1.15,9,0.4, '✓ Atividades Realizadas na Semana:', {size:pvSize(16), bold:true, color:'#'+BLUE1});
    txt(1.25,1.65,10.5,1.4, `Realizadas: ${a.realizadas}<br>Se não, por que? ${esc(htmlToPlainLines(a.seNaoPorque))}<br><br>Efetivo mobilizado atende as demandas previstas: ${esc(htmlToPlainLines(a.efetivoAtende))}`, {size:pvSize(12.5), lsm:1.5});
    txt(1.25,3.15,10.5,0.4, '✓ Houve alteração de datas no Cronograma Integrado:', {size:pvSize(16), bold:true, color:'#'+BLUE1});
    txt(1.25,3.55,10.5,1.1, `${a.houveAlteracaoCronograma}<br>Data da última revisão: ${esc(htmlToPlainLines(a.dataUltimaRevisaoCronograma))}<br>Alteração da data DESENERGIZAÇÃO: ${a.houveAlteracaoDesenerg}`, {size:pvSize(12.5), lsm:1.5});
    txt(1.25,4.75,5,0.4, '✓ Curva S', {size:pvSize(16), bold:true, color:'#'+BLUE1});
    txt(1.25,5.15,6,0.8, `${a.curvaSRevisada}, data última revisão: ${esc(a.curvaSData)}<br>Percentual de avanço: ${esc(a.curvaSPercentual)} %`, {size:pvSize(12.5)});

  } else if(p.kind==='fatos'){
    flowPreview(p.page, GEOM_FATOS);
    if(p.page.idx === 0){
      const b = p.block;
      if(b.foto && b.foto.image) txt(9.0,1.5,3.6,2.4, `<img src="${b.foto.image.dataUrl}" style="width:100%;height:100%;object-fit:cover;border:1px solid #b9c2cc;">`);
      if((b.fotoComentario||'').trim()) txt(9.0,4.0,3.6,2.9, `<i>${esc(b.fotoComentario)}</i>`, {size:pvSize(10.5)});
    }

  } else if(p.kind==='atrasos'){
    flowPreview(p.page, GEOM_FATOS);
    if(p.page.idx === 0){
      const a = state.atrasos;
      if(a.foto && a.foto.image) txt(9.0,1.5,3.6,2.4, `<img src="${a.foto.image.dataUrl}" style="width:100%;height:100%;object-fit:cover;border:1px solid #b9c2cc;">`);
      if((a.fotoComentario||'').trim()) txt(9.0,4.0,3.6,2.9, `<i>${esc(a.fotoComentario)}</i>`, {size:pvSize(10.5)});
    }

  } else if(p.kind==='acomp'){
    txt(1.25,1.05,10.85,0.45, esc(p.title + (p.cont?' (continuação)':'')), {size:pvSize(20), bold:true, color:'#'+BLUE1});
    txt(1.25,1.70,10.85,ACOMP_MAXH, acompTableHtml(p.rows), {size:pvSize(11)});

  } else if(p.kind==='curva'){
    const c = state.curva;
    txt(1.25,1.34,10.9,0.62, `<b style="color:#${BLUE1}">CURVA S</b><br>Revisão: ${esc(c.data)} — Diferença: ${esc(c.diferenca)}%`, {size:pvSize(16)});
    if(c.image) txt(1.581,2.219,10.159,4.483, `<img src="${c.image.dataUrl}" style="width:100%;height:100%;object-fit:cover;">`);

  } else if(p.kind==='cronograma'){
    const c = state.cronograma;
    txt(1.25,1.34,10.9,0.62, `<b style="color:#${BLUE1}">CRONOGRAMA</b><br>Revisão: ${esc(c.data)}`, {size:pvSize(16)});
    if(c.image) txt(1.581,2.219,10.159,4.483, `<img src="${c.image.dataUrl}" style="width:100%;height:100%;object-fit:cover;">`);

  } else if(p.kind==='fotos'){
    const block = p.block;
    txt(3.44,0.82,6.5,0.6, 'Registros Fotográficos', {size:pvSize(32), bold:true, color:'#'+BLUE1, align:'center'});
    const PW = 8/2.54, PH = 4.23/2.54;
    const cols=[0.99,4.79,8.58], rowsY=[1.85,4.15], rowsCapY=[3.60,5.90];
    block.photos.forEach((slot,i)=>{
      const col=i%3, row=Math.floor(i/3);
      const x=cols[col], y=rowsY[row];
      if(slot.image) txt(x,y,PW,PH, `<img src="${slot.image.dataUrl}" style="width:100%;height:100%;object-fit:cover;">`);
      txt(x,rowsCapY[row],PW,0.5, esc(slot.legenda||''), {size:pvSize(10), align:'center'});
    });
  }

  // Badge do número da página (mesma posição/tamanho do arquivo gerado)
  if(p.kind !== 'capa' && p.kind !== 'thanks'){
    const n = String(p.pageNo);
    const dia = n.length >= 3 ? 0.400 : (n.length === 2 ? 0.360 : 0.3235);
    const cx = 12.865 + 0.3235/2, cy = 7.032 + 0.3235/2;
    const d = document.createElement('div');
    d.className = 'pv-text pv-pagenum';
    d.style.left   = ((cx-dia/2)/SLIDE_W*100)+'%';
    d.style.top    = ((cy-dia/2)/SLIDE_H*100)+'%';
    d.style.width  = (dia/SLIDE_W*100)+'%';
    d.style.height = (dia/SLIDE_H*100)+'%';
    d.style.fontSize = pvSize(n.length>=3 ? 9 : (n.length===2 ? 10.5 : 12)) + 'cqw';
    d.textContent = n;
    container.appendChild(d);
  }
}

function esc(s){
  if(s==null) return '';
  const d = document.createElement('div'); d.textContent=s; return d.innerHTML;
}

let previewTimer=null;
function schedulePreview(){
  scheduleAutosave();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(()=>{
    invalidatePlan();
    document.querySelectorAll('.preview-wrap[data-group]').forEach(refreshPreviewGroup);
    // mantém atualizado o "(página N do documento)" dos cabeçalhos dos blocos
    document.querySelectorAll('[data-pagelabel]').forEach(elm=>{
      const n = computePreviewPageNumber(elm.dataset.pagelabel);
      elm.textContent = n ? `(página ${n} do documento)` : '';
    });
  }, 250);
}

function renderAll(){
  invalidatePlan();
  renderTabsNav();
  renderContent();
}

document.getElementById('btnPreviewRefresh').onclick = schedulePreview;
document.getElementById('btnClearAll').onclick = ()=>{
  if(confirm('Tem certeza que deseja limpar TODOS os dados preenchidos em TODAS as abas? Esta ação não pode ser desfeita.')){
    resetAllData();
    clearAutosave();
    document.getElementById('exportStatus').textContent = 'Todos os dados foram limpos.';
  }
};

/* ---------------------------------------------------------------------------
   HTML -> pptxgenjs RICH TEXT RUN PARSER
   Converts the contenteditable innerHTML (bold/italic/color/lists) into an
   array of pptxgenjs text-run objects, preserving line breaks.
--------------------------------------------------------------------------- */
/* Returns true if a contenteditable HTML string has no visible text
   (used to hide the bullet dot in front of items the user left blank). */
function isHtmlEmpty(html){
  if(!html) return true;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = (tmp.innerText || tmp.textContent || '').replace(/\u00a0/g, ' ').trim();
  return text.length === 0;
}

function htmlToRuns(html, baseOpts){
  baseOpts = baseOpts || {};
  const runs = [];
  if(!html) return runs;
  const container = document.createElement('div');
  container.innerHTML = html;

  function pushText(text, opts){
    if(text==='') return;
    runs.push({text, options: Object.assign({}, baseOpts, opts)});
  }
  function pushBreak(){
    runs.push({text:'', options:{breakLine:true}});
  }

  function walk(node, opts){
    opts = opts || {};
    if(node.nodeType===3){ // text node
      pushText(node.textContent, opts);
      return;
    }
    if(node.nodeType!==1) return;
    const tag = node.tagName.toLowerCase();
    let childOpts = Object.assign({}, opts);
    if(tag==='b' || tag==='strong') childOpts.bold=true;
    if(tag==='i' || tag==='em') childOpts.italic=true;
    if(tag==='u') childOpts.underline=true;
    if(node.style && node.style.color){
      childOpts.color = rgbToHex(node.style.color);
    }
    if(tag==='font' && node.getAttribute('color')){
      childOpts.color = node.getAttribute('color').replace('#','').toUpperCase();
    }
    if(tag==='br'){ pushBreak(); return; }
    if(tag==='div' || tag==='p'){
      Array.from(node.childNodes).forEach(c=>walk(c, childOpts));
      pushBreak();
      return;
    }
    if(tag==='ul' || tag==='ol'){
      const items = Array.from(node.children).filter(c=>c.tagName.toLowerCase()==='li');
      items.forEach((li)=>{
        const prefix = (tag==='ol') ? `${Array.from(node.children).indexOf(li)+1}. ` : '•  ';
        pushText(prefix, childOpts);
        Array.from(li.childNodes).forEach(c=>walk(c, childOpts));
        pushBreak();
      });
      return;
    }
    if(tag==='li'){
      Array.from(node.childNodes).forEach(c=>walk(c, childOpts));
      return;
    }
    // generic inline element (span, font, etc.)
    Array.from(node.childNodes).forEach(c=>walk(c, childOpts));
  }

  Array.from(container.childNodes).forEach(c=>walk(c, {}));
  // trim trailing breakLine-only empty run
  while(runs.length && runs[runs.length-1].text==='' && runs[runs.length-1].options && runs[runs.length-1].options.breakLine){
    runs.pop();
  }
  return runs.length?runs:[{text:'', options: baseOpts}];
}

function rgbToHex(rgb){
  const m = rgb.match(/\d+/g);
  if(!m) return null;
  return m.slice(0,3).map(n=>parseInt(n).toString(16).padStart(2,'0')).join('').toUpperCase();
}

function run(text, opts){ return {text: text||'', options: Object.assign({}, opts||{})}; }
function br(){ return {text:'', options:{breakLine:true}}; }

/* ---------------------------------------------------------------------------
   MOTOR DE LAYOUT — MEDIÇÃO DE TEXTO, AUTO-AJUSTE E PAGINAÇÃO AUTOMÁTICA

   Objetivo: nenhum texto pode sobrepor outro nem passar do limite do slide.
   Quando o fiscal escreve mais do que cabe numa área, o conteúdo excedente
   passa automaticamente para a área seguinte e, se preciso, para uma nova
   página gerada no mesmo padrão visual (mesmo fundo, mesmos títulos, com a
   marcação "(continuação)").
--------------------------------------------------------------------------- */
const PX_PER_IN  = 96;     // conversão polegada -> pixel na medição
const LINE_FACTOR = 1.22;  // entrelinha simples do PowerPoint para Calibri
const FIT_SAFETY = 0.94;   // usa no máximo 94% da altura útil (margem de segurança)
const MEASURE_FONT = '"Calibri","Carlito",Arial,Helvetica,sans-serif';

let __measureEl = null;
function measureEl(){
  if(!__measureEl){
    __measureEl = document.createElement('div');
    __measureEl.id = '__rsfMeasure';
    __measureEl.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;'+
      'padding:0;margin:0;border:0;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;';
    document.body.appendChild(__measureEl);
  }
  return __measureEl;
}

/* Altura ocupada (em polegadas) por um bloco HTML dentro de uma caixa de
   largura wIn, na fonte/corpo informados. É a base de todo o controle. */
function measureHeightIn(html, wIn, sizePt, lsm){
  const m = measureEl();
  m.style.width      = (wIn*PX_PER_IN) + 'px';
  m.style.fontFamily = MEASURE_FONT;
  m.style.fontSize   = (sizePt*PX_PER_IN/72) + 'px';
  m.style.lineHeight = String(LINE_FACTOR*(lsm||1));
  m.innerHTML = html || '&nbsp;';
  return m.getBoundingClientRect().height / PX_PER_IN;
}

/* Escreve texto reduzindo o corpo da fonte apenas se ele realmente não couber
   na caixa declarada (última linha de defesa contra transbordo). */
function addTextFit(slide, content, opts){
  opts = opts || {};
  let size = opts.fontSize || 18;
  if(opts.w && opts.h){
    const html = (typeof content === 'string')
      ? esc(content)
      : (content||[]).map(r => (r && r.options && r.options.breakLine)
          ? (esc(r.text||'') + '<br>')
          : esc((r && r.text) || '')).join('');
    const lsm = opts.lineSpacingMultiple ||
                (opts.lineSpacing ? (opts.lineSpacing/(size*LINE_FACTOR)) : 1);
    let guard = 0;
    while(size > 8.5 && guard++ < 40 && measureHeightIn(html, opts.w, size, lsm) > opts.h){
      size -= 0.5;
    }
  }
  const o = Object.assign({}, opts, {fontSize: size});
  if(o.fit  === undefined) o.fit  = 'shrink';
  if(o.wrap === undefined) o.wrap = true;
  slide.addText(content, o);
}

/* ---------------------- Seções de conteúdo (listas) ---------------------- */
/* Cada seção sabe: como medir/exibir um item (html) e como convertê-lo em
   runs do pptxgenjs (runs). Assim prévia, medição e export usam a MESMA fonte
   de verdade e nunca ficam fora de sincronia. */
function secBullets(title, items, opts){
  opts = opts || {};
  return {
    title, items: items||[], size: opts.size||12.5, lsm: opts.lsm||1,
    html: (it)=> isHtmlEmpty(it) ? '' : ('•&nbsp;&nbsp;' + it),
    runs: (it)=> (isHtmlEmpty(it) ? [] : [run('•  ', {color:BLACK})]).concat(htmlToRuns(it, {color:BLACK}))
  };
}
function secDias(title, dias){
  return {
    title, items: dias||[], size:12.5, lsm:1,
    html: (it)=> '<b style="color:#'+BLUE1+'">'+esc(it.dia)+': </b>'+esc(it.tema||''),
    runs: (it)=> [run(it.dia+': ', {color:BLUE1}), run(it.tema||'', {color:BLACK})]
  };
}

/* Distribui as seções pelas regiões de texto das páginas, criando páginas
   novas sempre que o conteúdo não couber. */
function flowSections(sections, layout){
  const pages = [];
  const newPage = ()=>{ const p = {regions:[]}; pages.push(p); return p; };
  let pageIdx = 0, regionIdx = 0, cur = newPage();
  function advance(){
    regionIdx++;
    if(regionIdx >= layout.regionsPerPage){ regionIdx = 0; pageIdx++; cur = newPage(); }
  }
  sections.forEach(sec=>{
    let rest = (sec.items||[]).slice();
    let first = true;
    let guard = 0;
    while(guard++ < 200){
      const w = layout.width(pageIdx, regionIdx);
      const h = layout.height(pageIdx, regionIdx);
      const taken = [];
      while(rest.length){
        const test = taken.concat([rest[0]]);
        const html = test.map(it => '<div>'+(sec.html(it)||'&nbsp;')+'</div>').join('');
        if(taken.length && measureHeightIn(html, w, sec.size, sec.lsm) > h*FIT_SAFETY) break;
        taken.push(rest.shift());
      }
      cur.regions[regionIdx] = {section: sec, items: taken, cont: !first, w: w};
      first = false;
      advance();
      if(!rest.length) break;
    }
  });
  while(pages.length > 1 && pages[pages.length-1].regions.filter(Boolean).length === 0) pages.pop();
  pages.forEach((p,i)=>{ p.idx = i; p.total = pages.length; });
  return pages;
}

/* --------------------------- Geometrias fixas --------------------------- */
/* Áreas de texto de cada modelo de slide, em polegadas. A régua de segurança
   é y = 6.95 (logo acima do número da página, em 7.03). */
const GEOM_FATOS = {
  x: 1.25, regionsPerPage: 2, titleSize: 20, titleW: 10.5,
  regions: [ {titleY:1.05, textY:1.50, h:2.40}, {titleY:4.05, textY:4.50, h:2.40} ]
};
const GEOM_DDS = {
  x: 1.25, regionsPerPage: 2, titleSize: 16, titleW: 10.3,
  regions: [ {titleY:1.25, textY:1.70, h:1.95}, {titleY:3.75, textY:4.25, h:2.65} ]
};

function makeLayout(geom, wFirst, wRest){
  return {
    regionsPerPage: geom.regionsPerPage,
    width:  (pi)=> (pi === 0 ? wFirst : wRest),
    height: (pi, ri)=> geom.regions[ri].h
  };
}

/* --------------------------- Planos por slide --------------------------- */
function ddsPages(){
  const d = state.dds;
  const side = !!((d.foto && d.foto.image) || (d.fotoComentario||'').trim());
  const sections = [
    secDias('Temas de DDS:', d.dias),
    secBullets('Acidente ou Incidente na Semana', d.acidentes, {lsm:1.5})
  ];
  return flowSections(sections, makeLayout(GEOM_DDS, side ? 7.5 : 10.3, 10.3));
}
function fatosPages(block){
  const side = !!((block.foto && block.foto.image) || (block.fotoComentario||'').trim());
  const sections = [
    secBullets('Fatos Relevantes', block.fatos),
    secBullets('Pontos de Atenção', block.pontos)
  ];
  return flowSections(sections, makeLayout(GEOM_FATOS, side ? 7.4 : 10.5, 10.5));
}
function atrasosPages(){
  const a = state.atrasos;
  const side = !!((a.foto && a.foto.image) || (a.fotoComentario||'').trim());
  const sections = [
    secBullets('Histórico de atraso de obras', a.itens),
    secBullets('Previsão de Atividades Críticas Futuras', a.criticas)
  ];
  return flowSections(sections, makeLayout(GEOM_FATOS, side ? 7.4 : 10.5, 10.5));
}

/* Quadro de acompanhamento: quebra por linhas, medindo a altura real de cada
   linha (tema e observação podem ocupar várias linhas). */
const ACOMP_COLW = [0.55, 3.90, 1.90, 4.50];
const ACOMP_MAXH = 5.20;   // de y=1.70 até y=6.90
function acompRowHeight(r){
  const h1 = measureHeightIn(esc(r.tema||''), ACOMP_COLW[1]-0.2, 11, 1);
  const h2 = measureHeightIn(esc(r.obs ||''), ACOMP_COLW[3]-0.2, 11, 1);
  return Math.max(0.35, h1 + 0.10, h2 + 0.10);
}
function acompPages(list){
  const rows = (list||[]).filter(r => (r.tema||'').trim() || (r.obs||'').trim())
                         .map((r,i)=> Object.assign({}, r, {__n: i+1}));
  const pages = []; let cur = []; let h = 0.42;   // 0.42 = linha de cabeçalho
  rows.forEach(r=>{
    const rh = acompRowHeight(r);
    if(cur.length && (h + rh) > ACOMP_MAXH){ pages.push(cur); cur = []; h = 0.42; }
    cur.push(r); h += rh;
  });
  if(cur.length || !pages.length) pages.push(cur);
  return pages;
}

/* --------------------- Plano completo do documento ---------------------- */
/* Uma única lista ordenada de páginas, usada tanto pela prévia quanto pela
   exportação — por isso o número de página da prévia é sempre igual ao do
   arquivo gerado, mesmo com páginas de continuação. */
function buildPagePlan(){
  const plan = [];
  const add = (o)=>{ o.pageNo = plan.length + 1; plan.push(o); return o; };

  add({group:'capa', kind:'capa'});
  add({group:'status', kind:'status'});
  ddsPages().forEach(pg => add({group:'dds', kind:'dds', page:pg}));
  add({group:'atividades', kind:'atividades'});

  state.fatosSlides.forEach(block=>{
    fatosPages(block).forEach(pg => add({group:'fatos-'+block.id, kind:'fatos', block, page:pg}));
    if(acompHasContent(block.acompanhamento)){
      const gp = acompPages(block.acompanhamento);
      gp.forEach((rows,i)=> add({group:'fatos-acomp-'+block.id, kind:'acomp', bg:5, rows,
        title:'Fatos Relevantes — Acompanhamento dos Itens', cont:i>0}));
    }
  });

  atrasosPages().forEach(pg => add({group:'atrasos', kind:'atrasos', page:pg}));
  if(acompHasContent(state.atrasos.acompanhamento)){
    acompPages(state.atrasos.acompanhamento).forEach((rows,i)=> add({group:'atrasos-acomp', kind:'acomp', bg:6, rows,
      title:'Atrasos / Previsões — Acompanhamento dos Itens', cont:i>0}));
  }

  add({group:'curva', kind:'curva'});
  add({group:'cronograma', kind:'cronograma'});
  state.fotosSlides.forEach(block => add({group:'fotos-'+block.id, kind:'fotos', block}));
  add({group:'thanks', kind:'thanks'});
  return plan;
}

let __planCache = null;
function invalidatePlan(){ __planCache = null; }
function getPagePlan(){ if(!__planCache) __planCache = buildPagePlan(); return __planCache; }

/* Desenha as regiões de texto de uma página de fluxo dentro do slide. */
function renderFlowRegions(slide, page, geom){
  page.regions.forEach((region, i)=>{
    if(!region) return;
    const g = geom.regions[i];
    const sec = region.section;
    const title = sec.title + (region.cont ? ' (continuação)' : '');
    addTextFit(slide, title, {x:geom.x, y:g.titleY, w:geom.titleW, h:0.40,
      fontFace:FONT_BODY, fontSize:geom.titleSize, bold:true, color:BLUE1});
    const runs = [];
    region.items.forEach((it,k)=>{
      runs.push(...sec.runs(it));
      if(k < region.items.length-1) runs.push(br());
    });
    addTextFit(slide, runs.length ? runs : [run('')], {
      x:geom.x, y:g.textY, w:region.w, h:g.h,
      fontFace:FONT_BODY, fontSize:sec.size, valign:'top',
      lineSpacingMultiple:sec.lsm, wrap:true
    });
  });
}

/* ---------------------------------------------------------------------------
   PPTXGENJS SLIDE BUILDERS
   Each function adds one slide to the given pptx instance (or, if pptx is
   null, is only used by the HTML preview logic above via the same key names).
--------------------------------------------------------------------------- */
function addBgSlide(pptx, bgNum){
  const slide = pptx.addSlide();
  slide.addImage({data: BG_IMAGES[bgNum], x:0, y:0, w:SLIDE_W, h:SLIDE_H});
  return slide;
}

function buildSlideCapa(pptx){
  const slide = addBgSlide(pptx, 1);
  const c = state.capa;
  const runs = [];
  const rows = [['Projeto',c.projeto],['Localidade',c.localidade],['Regional',c.regional],['Semana',c.semana],['Período',c.periodo]];
  rows.forEach(([label,val],i)=>{
    runs.push(run(label+': ', {bold:true}));
    runs.push(run(val||'', {bold:true}));
    if(i<rows.length-1) runs.push(br());
  });
  addTextFit(slide, runs, {x:0.68,y:5.45,w:6.5,h:1.7, fontFace:FONT_TITLE, fontSize:14, color:WHITE, valign:'top', lineSpacing:22});
  return slide;
}

function buildSlideStatus(pptx){
  const slide = addBgSlide(pptx, 2);
  const s = state.status;

  // Title (fixed)
  addTextFit(slide, 'Relatório Semanal Fiscalização', {x:3.45,y:0.35,w:6.6,h:0.65, fontFace:FONT_BODY, fontSize:28, bold:true, color:BLUE1});

  // Escopo
  addTextFit(slide, [
    run('Escopo do Projeto: ', {bold:false, color:BLUE1}),
    ...htmlToRuns(s.escopo, {color:BLACK})
  ], {x:0.75,y:1.30,w:5.4,h:1.75, fontFace:FONT_BODY, fontSize:12.5, valign:'top', lineSpacingMultiple:1.5});

  // Contact list ("Técnico Segurança" is fixed-label only; no value is ever written after it)
  const contactRows = [
    ['Contratadas', s.contratadas],
    ['', ''],
    ['Gestor Projetos ISA ENERGIA BRASIL', s.gestorProjetosIsa],
    ['Gestor Fiscalização ISA ENERGIA BRASIL', s.gestorFiscIsa],
    ['Fiscal ISA ENERGIA BRASIL', s.fiscalIsa],
    ['Gestor Fiscalização / Contratada', s.gestorFiscContratada],
    ['Fiscal / Contratada', s.fiscalContratada],
    ['Engenheiro Segurança ISA ENERGIA BRASIL', s.engSegIsa],
    ['Técnico Segurança', null],
    ['Empresa', s.empresa],
    ['Nome', s.nome]
  ];
  const contactRuns = [];
  contactRows.forEach(([label,val],i)=>{
    if(label===''){ contactRuns.push(br()); return; }
    contactRuns.push(run(label+': ', {color:BLUE1}));
    if(val!==null) contactRuns.push(run(val||'', {color:BLACK}));
    if(i<contactRows.length-1) contactRuns.push(br());
  });
  addTextFit(slide, contactRuns, {x:0.75,y:2.85,w:5.4,h:3.5, fontFace:FONT_BODY, fontSize:12.5, valign:'top', lineSpacingMultiple:1.5});

  // divider line
  slide.addShape('line', {x:6.3,y:1.45,w:0,h:4.6, line:{color:'BFBFBF', width:1}});

  // Right column: dates
  addTextFit(slide, [
    run('Data Energização Final "linha de base": ', {color:BLUE1}), run(s.dataEnergBase||'', {color:BLACK}), br(),
    run('Data Energização Final "reprogramada": ', {color:BLUE1}), run(s.dataEnergReprog||'', {color:BLACK}), br(),
    run('Data Desmobilização Final: ', {color:BLUE1}), run(s.dataDesmob||'', {color:BLACK})
  ], {x:7.1,y:1.35,w:5.9,h:1.0, fontFace:FONT_BODY, fontSize:12.5, valign:'top', lineSpacingMultiple:1.5});

  // Status do projeto — spacing adapts so the sparser states (Em Andamento / Concluído
  // sem pendências) spread out and don't leave a big empty gap before "Disponibilização".
  const mark = (v)=> (s.situacao===v) ? 'x' : ' ';
  const gapMain = s.situacao==='paralisado' ? 0.30 : (s.situacao==='concluido' ? 0.30 : 0.55);

  // y=2.50 instead of 2.20 gives clear breathing room after the "Data Desmobilização
  // Final" block above, so its letters don't sit right up against this label.
  let y = 2.50;
  addTextFit(slide, 'Status do Projeto:', {x:7.1,y,w:5.9,h:0.32, fontFace:FONT_BODY, fontSize:12.5, bold:true, color:BLUE1});
  y += 0.40;

  addTextFit(slide, [
    run('(', {color:BLUE1}), run(mark('andamento'), {color:BLACK, bold:true}), run(') Em Andamento', {color:BLUE1})
  ], {x:7.45,y,w:5.5,h:0.3, fontFace:FONT_BODY, fontSize:12.5});
  y += gapMain;

  addTextFit(slide, [
    run('(', {color:BLUE1}), run(mark('paralisado'), {color:BLACK, bold:true}), run(') Paralisado', {color:BLUE1})
  ], {x:7.45,y,w:5.5,h:0.3, fontFace:FONT_BODY, fontSize:12.5});
  y += gapMain;

  if(s.situacao==='paralisado'){
    addTextFit(slide, [
      run('Data Paralisação: ', {color:BLUE1}), run(s.dataParalisacao||'', {color:BLACK}), br(),
      run('Motivo: ', {color:BLUE1}), ...htmlToRuns(s.motivoParalisacao, {color:BLACK}), br(),
      run('Previsão de Retorno: ', {color:BLUE1}), run(s.previsaoRetorno||'', {color:BLACK})
    ], {x:7.9,y,w:5.1,h:1.3, fontFace:FONT_BODY, fontSize:12.5, valign:'top', lineSpacingMultiple:1.5});
    y += 1.40;
  }

  addTextFit(slide, [
    run('(', {color:BLUE1}), run(mark('concluido'), {color:BLACK, bold:true}), run(') Concluído', {color:BLUE1})
  ], {x:7.03,y,w:5.5,h:0.3, fontFace:FONT_BODY, fontSize:12.5});
  y += gapMain;

  if(s.situacao==='concluido'){
    const pend = (s.pendencias==='sim') ? ['x',' '] : [' ','x'];
    const runsC = [
      run('Data de Conclusão: ', {color:BLUE1}), run(s.dataConclusao||'', {color:BLACK}), br(),
      run('Pendências: ', {color:BLUE1}), run('(', {color:BLUE1}), run(pend[0], {color:BLACK,bold:true}), run(') ', {color:BLUE1}), run('Sim ', {color:BLUE1}),
      run('(', {color:BLUE1}), run(pend[1], {color:BLACK,bold:true}), run(') ', {color:BLUE1}), run('Não', {color:BLUE1})
    ];
    let detailH = 0.70, advance = 0.80;
    if(s.pendencias==='sim'){
      runsC.push(br()); runsC.push(run('Se Sim: ', {color:BLUE1})); runsC.push(...htmlToRuns(s.seSimPendencias, {color:BLACK}));
      detailH = 1.25; advance = 1.35;
    }
    addTextFit(slide, runsC, {x:7.96,y,w:5.06,h:detailH, fontFace:FONT_BODY, fontSize:12.5, valign:'top', lineSpacingMultiple:1.5});
    y += advance;
  }

  // Disponibilizacao
  const vf = s.viasFisicas==='sim' ? ['x',' '] : [' ','x'];
  const kc = s.acessoKeepControl==='sim' ? ['x',' '] : [' ','x'];
  addTextFit(slide, [
    run('Disponibilização de Projetos Executivos:', {color:BLUE1}), br(),
    run('- Vias físicas: ', {color:BLUE1}), run('(', {color:BLUE1}), run(vf[0], {color:BLACK,bold:true}), run(') ', {color:BLUE1}), run('Sim ', {color:BLUE1}),
    run('(', {color:BLUE1}), run(vf[1], {color:BLACK,bold:true}), run(') ', {color:BLUE1}), run('Não', {color:BLUE1}), br(),
    run('- Acesso Keep Control: ', {color:BLUE1}), run('(', {color:BLUE1}), run(kc[0], {color:BLACK,bold:true}), run(') ', {color:BLUE1}), run('Sim ', {color:BLUE1}),
    run('(', {color:BLUE1}), run(kc[1], {color:BLACK,bold:true}), run(') ', {color:BLUE1}), run('Não', {color:BLUE1})
  ], {x:7.1,y,w:5.9,h:1.1, fontFace:FONT_BODY, fontSize:12.5, valign:'top', lineSpacingMultiple:1.5});

  return slide;
}

function buildSlideDDS(pptx, page){
  const slide = addBgSlide(pptx, 3);
  const d = state.dds;
  addTextFit(slide, 'Momento Segurança', {x:3.45,y:0.35,w:6.6,h:0.65, fontFace:FONT_BODY, fontSize:28, bold:true, color:BLUE1});

  renderFlowRegions(slide, page, GEOM_DDS);

  // Foto e comentário entram somente na primeira página do bloco.
  if(page.idx === 0){
    const ddsFoto = !!(d.foto && d.foto.image);
    const ddsCom  = !!((d.fotoComentario||'').trim());
    if(ddsFoto) addFramedImage(slide, d.foto.image, 9.0,1.7,3.6,2.7);
    if(ddsCom) addTextFit(slide, [run(d.fotoComentario,{color:BLACK,italic:true})],
      {x:9.0,y:4.45,w:3.6,h:2.2, fontFace:FONT_BODY, fontSize:10.5, valign:'top'});
  }
  return slide;
}

function buildSlideAtividades(pptx){
  const slide = addBgSlide(pptx, 4);
  const a = state.atividades;
  const rSim = a.realizadas==='sim' ? ['x',' '] : [' ','x'];
  const cSim = a.houveAlteracaoCronograma==='sim' ? ['x',' '] : [' ','x'];
  const dSim = a.houveAlteracaoDesenerg==='sim' ? ['x',' '] : [' ','x'];
  const curvaSim = a.curvaSRevisada==='sim' ? 'x' : ' ';

  addTextFit(slide, [run('✓ ',{bold:true,color:BLUE1}), run('Atividades Realizadas na Semana:',{bold:true,color:BLUE1})],
    {x:1.25,y:1.15,w:9,h:0.4, fontFace:FONT_BODY, fontSize:16});

  addTextFit(slide, [
    run('Realizadas: ',{color:BLUE1}), run('(',{color:BLUE1}), run(rSim[0],{color:BLACK,bold:true}), run(') ',{color:BLUE1}), run('Sim ',{color:BLUE1}),
    run('(',{color:BLUE1}), run(rSim[1],{color:BLACK,bold:true}), run(') ',{color:BLUE1}), run('Não',{color:BLUE1}), br(),
    run('Se não, por que? ',{color:BLUE1}), ...htmlToRuns(a.seNaoPorque,{color:BLACK}), br(), br(),
    run('Efetivo mobilizado atende as demandas previstas de atividades: ',{color:BLUE1}), ...htmlToRuns(a.efetivoAtende,{color:BLACK})
  ], {x:1.25,y:1.65,w:10.5,h:1.4, fontFace:FONT_BODY, fontSize:12.5, valign:'top', lineSpacingMultiple:1.5});

  addTextFit(slide, [run('✓ ',{bold:true,color:BLUE1}), run('Houve alteração de datas no Cronograma Integrado:',{bold:true,color:BLUE1})],
    {x:1.25,y:3.15,w:10.5,h:0.4, fontFace:FONT_BODY, fontSize:16});
  addTextFit(slide, [
    run('(',{color:BLUE1}), run(cSim[0],{color:BLACK,bold:true}), run(') ',{color:BLUE1}), run('Sim ',{color:BLUE1}),
    run('(',{color:BLUE1}), run(cSim[1],{color:BLACK,bold:true}), run(') ',{color:BLUE1}), run('Não',{color:BLUE1}), br(),
    run('Data da ultima revisão: ',{color:BLUE1}), ...htmlToRuns(a.dataUltimaRevisaoCronograma,{color:BLACK}), br(),
    run('Houve alteração da data DESENERGIZAÇÃO referente a semana anterior: ',{color:BLUE1}),
    run('(',{color:BLUE1}), run(dSim[0],{color:BLACK,bold:true}), run(') ',{color:BLUE1}), run('Sim ',{color:BLUE1}), run('(',{color:BLUE1}), run(dSim[1],{color:BLACK,bold:true}), run(') ',{color:BLUE1}), run('Não',{color:BLUE1})
  ], {x:1.25,y:3.55,w:10.5,h:1.1, fontFace:FONT_BODY, fontSize:12.5, valign:'top', lineSpacingMultiple:1.5});

  addTextFit(slide, [run('✓ ',{bold:true,color:BLUE1}), run('Curva S',{bold:true,color:BLUE1})],
    {x:1.25,y:4.75,w:5,h:0.4, fontFace:FONT_BODY, fontSize:16});
  addTextFit(slide, [
    run('(',{color:BLUE1}), run(curvaSim,{color:BLACK,bold:true}), run(') ',{color:BLUE1}), run('Sim, data última revisão: ',{color:BLUE1}), run(a.curvaSData||'',{color:BLACK}), br(),
    run('Percentual de avanço: ',{color:BLUE1}), run((a.curvaSPercentual||'')+' %',{color:BLACK})
  ], {x:1.25,y:5.15,w:6,h:0.8, fontFace:FONT_BODY, fontSize:12.5, valign:'top'});

  return slide;
}

function buildSlideFatos(pptx, block, page){
  const slide = addBgSlide(pptx, 5);
  renderFlowRegions(slide, page, GEOM_FATOS);
  if(page.idx === 0){
    const fFoto = !!(block.foto && block.foto.image);
    const fCom  = !!((block.fotoComentario||'').trim());
    if(fFoto) addFramedImage(slide, block.foto.image, 9.0,1.5,3.6,2.4);
    if(fCom) addTextFit(slide, [run(block.fotoComentario,{color:BLACK,italic:true})],
      {x:9.0,y:4.0,w:3.6,h:2.9, fontFace:FONT_BODY, fontSize:10.5, valign:'top'});
  }
  return slide;
}

/* Slide extra de acompanhamento (usado após Fatos Relevantes e Atrasos,
   somente quando o quadro de acompanhamento tem itens preenchidos). */
function buildSlideAcompanhamento(pptx, bgNum, title, rows, cont){
  const slide = addBgSlide(pptx, bgNum);
  addTextFit(slide, title + (cont ? ' (continuação)' : ''),
    {x:1.25,y:1.05,w:10.85,h:0.45, fontFace:FONT_BODY, fontSize:20, bold:true, color:BLUE1});
  const header = [
    {text:'#', options:{bold:true, color:'FFFFFF', fill:{color:'214C92'}, align:'center'}},
    {text:'Tema / Item', options:{bold:true, color:'FFFFFF', fill:{color:'214C92'}}},
    {text:'Status', options:{bold:true, color:'FFFFFF', fill:{color:'214C92'}, align:'center'}},
    {text:'Observação / Última tratativa', options:{bold:true, color:'FFFFFF', fill:{color:'214C92'}}}
  ];
  const tblRows = [header];
  (rows||[]).forEach((r,i)=>{
    const st = acompStatusInfo(r.status);
    tblRows.push([
      {text:String((r.__n!=null?r.__n:i+1)), options:{align:'center', color:BLACK, fill:{color:'FFFFFF'}}},
      {text:r.tema||'', options:{color:BLACK, fill:{color:'FFFFFF'}}},
      {text:st.label, options:{align:'center', bold:true, color:'FFFFFF', fill:{color:st.color}}},
      {text:r.obs||'', options:{color:BLACK, fill:{color:'FFFFFF'}}}
    ]);
  });
  slide.addTable(tblRows, {
    x:1.25, y:1.7, w:10.85, colW:ACOMP_COLW,
    fontFace:FONT_BODY, fontSize:11, valign:'middle', rowH:0.35,
    border:{type:'solid', color:'9AA5B1', pt:0.75}, autoPage:false
  });
  return slide;
}

function buildSlideAtrasos(pptx, page){
  const slide = addBgSlide(pptx, 6);
  const a = state.atrasos;
  renderFlowRegions(slide, page, GEOM_FATOS);
  if(page.idx === 0){
    const aFoto = !!(a.foto && a.foto.image);
    const aCom  = !!((a.fotoComentario||'').trim());
    if(aFoto) addFramedImage(slide, a.foto.image, 9.0,1.5,3.6,2.4);
    if(aCom) addTextFit(slide, [run(a.fotoComentario,{color:BLACK,italic:true})],
      {x:9.0,y:4.0,w:3.6,h:2.9, fontFace:FONT_BODY, fontSize:10.5, valign:'top'});
  }
  return slide;
}

function buildSlideCurva(pptx){
  const slide = addBgSlide(pptx, 7);
  const c = state.curva;
  addTextFit(slide, [
    run('CURVA S',{bold:true,color:BLUE1}), br(),
    run('Data da ultima revisão da Curva S: ',{color:BLUE1}), run((c.data||'')+'          ',{color:BLACK}),
    run('Diferença entre o previsto e planejado: ',{color:BLUE1}), run((c.diferenca||'')+' %',{color:BLACK})
  ], {x:1.25,y:1.34,w:10.9,h:0.62, fontFace:FONT_BODY, fontSize:16, valign:'top'});
  if(c.image) addFramedImage(slide, c.image, 1.581,2.219,10.159,4.483);
  return slide;
}

function buildSlideCronograma(pptx){
  const slide = addBgSlide(pptx, 8);
  const c = state.cronograma;
  addTextFit(slide, [
    run('CRONOGRAMA',{bold:true,color:BLUE1}), br(),
    run('Data da ultima revisão: ',{color:BLUE1}), run(c.data||'',{color:BLACK})
  ], {x:1.25,y:1.34,w:10.9,h:0.62, fontFace:FONT_BODY, fontSize:16, valign:'top'});
  if(c.image) addFramedImage(slide, c.image, 1.581,2.219,10.159,4.483);
  return slide;
}

function buildSlideFotos(block, pptx){
  const slide = addBgSlide(pptx, 9);
  addTextFit(slide, 'Registros Fotográficos', {x:3.44,y:0.82,w:6.5,h:0.6, fontFace:FONT_BODY, fontSize:32, bold:true, color:BLUE1, align:'center'});
  // Printed photo size fixed at 8 cm (largura) x 4,23 cm (altura)
  const PHOTO_W = 8/2.54, PHOTO_H = 4.23/2.54; // ~3.1496in x 1.6654in
  const cols=[0.99,4.79,8.58], rowsY=[1.85,4.15], rowsCapY=[3.60,5.90];
  block.photos.forEach((slot,i)=>{
    const col=i%3, row=Math.floor(i/3);
    const x=cols[col], y=rowsY[row];
    if(slot.image) addFramedImage(slide, slot.image, x,y,PHOTO_W,PHOTO_H);
    addTextFit(slide, [run(slot.legenda||'',{color:BLACK})],
      {x, y:rowsCapY[row], w:PHOTO_W, h:0.5, fontFace:FONT_BODY, fontSize:10, valign:'top', align:'center', fit:'shrink', wrap:true});
  });
  return slide;
}

function buildSlideThanks(pptx){
  return addBgSlide(pptx, 11);
}

/* Número da página: círculo azul no canto inferior direito.
   A caixa de texto é larga e com quebra de linha desativada, de modo que
   números de 2 ou 3 dígitos fiquem SEMPRE na mesma linha (antes o "10", "11"
   etc. empilhavam um dígito sobre o outro dentro da caixa estreita). */
function addPageNumber(slide, num){
  const n  = String(num);
  const cx = 12.865 + 0.3235/2;      // centro do badge original do modelo
  const cy = 7.032  + 0.3235/2;
  const d  = n.length >= 3 ? 0.400 : (n.length === 2 ? 0.360 : 0.3235);
  const fs = n.length >= 3 ? 9      : (n.length === 2 ? 10.5  : 12);
  const tw = 0.60, th = 0.32;
  slide.addShape('ellipse', {x:cx-d/2, y:cy-d/2, w:d, h:d, fill:{color:'214C92'}, line:{type:'none'}});
  slide.addText(n, {
    x:cx-tw/2, y:cy-th/2, w:tw, h:th,
    fontFace:FONT_BODY, fontSize:fs, bold:true, color:'FFFFFF',
    align:'center', valign:'middle', wrap:false, fit:'none', margin:0
  });
}

/* Monta o slide correspondente a uma entrada do plano de páginas. */
function buildPlanSlide(pptx, p){
  switch(p.kind){
    case 'capa':       return buildSlideCapa(pptx);
    case 'status':     return buildSlideStatus(pptx);
    case 'dds':        return buildSlideDDS(pptx, p.page);
    case 'atividades': return buildSlideAtividades(pptx);
    case 'fatos':      return buildSlideFatos(pptx, p.block, p.page);
    case 'atrasos':    return buildSlideAtrasos(pptx, p.page);
    case 'acomp':      return buildSlideAcompanhamento(pptx, p.bg, p.title, p.rows, p.cont);
    case 'curva':      return buildSlideCurva(pptx);
    case 'cronograma': return buildSlideCronograma(pptx);
    case 'fotos':      return buildSlideFotos(p.block, pptx);
    case 'thanks':     return buildSlideThanks(pptx);
  }
  return null;
}

/* Draw a pan/zoom-cropped image onto an offscreen canvas, matching the same
   "cover" transform used in the live preview, then embed as a flat PNG so
   the framing the user chose is exactly what ends up in the .pptx. */
function cropImageToDataUrl(imgInfo, targetWpx, targetHpx){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      canvas.width = targetWpx; canvas.height = targetHpx;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0,0,targetWpx,targetHpx);
      const natW = img.naturalWidth, natH = img.naturalHeight;
      const zoom = imgInfo.zoom||1;
      const panX = imgInfo.panX!=null?imgInfo.panX:0.5;
      const panY = imgInfo.panY!=null?imgInfo.panY:0.5;
      // tiny 0.5% overscale safety margin so rounding never leaves a hairline gap at the edges
      const coverScale = Math.max(targetWpx/natW, targetHpx/natH) * zoom * 1.005;
      const dispW = natW*coverScale, dispH = natH*coverScale;
      const maxX = Math.max(0, dispW-targetWpx), maxY = Math.max(0, dispH-targetHpx);
      const left = Math.round(-maxX*panX), top = Math.round(-maxY*panY);
      ctx.drawImage(img, left, top, Math.ceil(dispW), Math.ceil(dispH));
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = imgInfo.dataUrl;
  });
}

function addFramedImage(slide, imgInfo, x,y,w,h){
  // Synchronous placement using a pre-cropped data URL computed just before export (see prepareExport).
  slide.addImage({data: imgInfo._croppedDataUrl || imgInfo.dataUrl, x,y,w,h});
}

/* Precompute cropped images for every uploaded photo before building slides
   (pptxgenjs addImage needs synchronous data, but cropping is async). */
async function prepareExportImages(){
  const jobs = [];
  if(state.curva.image) jobs.push(cropImageToDataUrl(state.curva.image, 1016, 448).then(d=>state.curva.image._croppedDataUrl=d));
  if(state.dds.foto && state.dds.foto.image) jobs.push(cropImageToDataUrl(state.dds.foto.image, 720, 540).then(d=>state.dds.foto.image._croppedDataUrl=d));
  state.fatosSlides.forEach(block=>{
    if(block.foto && block.foto.image) jobs.push(cropImageToDataUrl(block.foto.image, 720, 480).then(d=>block.foto.image._croppedDataUrl=d));
  });
  if(state.atrasos.foto && state.atrasos.foto.image) jobs.push(cropImageToDataUrl(state.atrasos.foto.image, 720, 480).then(d=>state.atrasos.foto.image._croppedDataUrl=d));
  if(state.cronograma.image) jobs.push(cropImageToDataUrl(state.cronograma.image, 1016, 448).then(d=>state.cronograma.image._croppedDataUrl=d));
  state.fotosSlides.forEach(block=>{
    block.photos.forEach(slot=>{
      if(slot.image){
        // Pan/zoom for grid photos live on the slot itself (slot.zoom/slot.x/slot.y),
        // not on slot.image — merge them in so the user's framing is respected.
        // 100px/cm so the exported crop matches the printed 8cm x 4,23cm size exactly
        const imgInfo = Object.assign({}, slot.image, { zoom: slot.zoom, panX: slot.x, panY: slot.y });
        jobs.push(cropImageToDataUrl(imgInfo, 800, 423).then(d=>slot.image._croppedDataUrl=d));
      }
    });
  });
  await Promise.all(jobs);
}

/* ---------------------------------------------------------------------------
   EXPORT
--------------------------------------------------------------------------- */
async function exportPPTX(){
  const statusEl = document.getElementById('exportStatus');
  const btn = document.getElementById('btnExport');
  btn.disabled = true;

  if(typeof PptxGenJS === 'undefined'){
    statusEl.textContent = 'Erro: biblioteca de geração de PPTX não carregou. Recarregue a página (F5) e tente novamente.';
    btn.disabled = false;
    return;
  }

  // Slide 9 (Registros Fotográficos): don't allow generating if any photo slot is empty.
  for(let i=0; i<state.fotosSlides.length; i++){
    const block = state.fotosSlides[i];
    const missingIdx = block.photos.findIndex(p => !p.image);
    if(missingIdx !== -1){
      statusEl.textContent = `Não é possível gerar: falta uma foto no slide "Registros Fotográficos #${i+1}" (posição ${missingIdx+1} de 6). Adicione a foto ou remova o slide antes de gerar.`;
      btn.disabled = false;
      currentTab = 'fotos';
      renderAll();
      return;
    }
  }

  statusEl.textContent = 'Preparando imagens...';
  try{
    await prepareExportImages();
    statusEl.textContent = 'Montando apresentação...';
    invalidatePlan();
    const plan = getPagePlan();
    const pptx = new PptxGenJS();
    pptx.defineLayout({name:'RSF', width:SLIDE_W, height:SLIDE_H});
    pptx.layout = 'RSF';

    plan.forEach(p=>{
      const slide = buildPlanSlide(pptx, p);
      if(slide && p.kind !== 'capa' && p.kind !== 'thanks') addPageNumber(slide, p.pageNo);
    });

    // sanitize filename (strip diacritics first so accented names like "São Paulo" degrade
    // to "Sao_Paulo" instead of being mangled by the ASCII-only \w regex)
    const stripAccents = (s)=> s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const projeto = stripAccents(state.capa.projeto||'RSF').replace(/[^\w\-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40) || 'RSF';
    const semana = stripAccents(state.capa.semana||'').replace(/[^\w\-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,20);
    const fname = `RSF_${projeto}${semana?('_'+semana):''}.pptx`;

    statusEl.textContent = 'Gerando arquivo...';
    await pptx.writeFile({fileName: fname});
    statusEl.textContent = 'Apresentação gerada: ' + fname + ' (' + plan.length + ' páginas)' + ' — se o PowerPoint pedir para reparar o arquivo ou não abrir, tente recarregar esta página (F5) e gerar novamente.';
  } catch(err){
    console.error(err);
    statusEl.textContent = 'Erro ao gerar apresentação: ' + err.message + ' — recarregue a página (F5) e tente novamente.';
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('btnExport').onclick = exportPPTX;

/* ---------------------------------------------------------------------------
   INIT
--------------------------------------------------------------------------- */
const __restoreInfo = loadStateFromLocalStorage();
renderAll();

if(__restoreInfo.restored){
  const statusEl = document.getElementById('exportStatus');
  if(statusEl){
    statusEl.textContent = __restoreInfo.semFotos
      ? 'Rascunho anterior restaurado (os textos voltaram; as fotos precisam ser reenviadas — não coube no armazenamento local do navegador).'
      : 'Rascunho anterior restaurado automaticamente a partir do armazenamento local deste navegador.';
  }
}

// Sanity check: pptxgenjs is embedded directly in this file (no CDN dependency),
// but warn early if something still went wrong instead of only failing on export click.
if(typeof PptxGenJS === 'undefined'){
  const statusEl = document.getElementById('exportStatus');
  if(statusEl) statusEl.textContent = 'Atenção: a biblioteca de geração de PPTX não foi carregada corretamente. Tente baixar este arquivo HTML novamente.';
}
