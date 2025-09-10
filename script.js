// ============================
// Chat Lab — Missão II (Cobrança) — v1.6.7 (compacto + toggles grid)
// ============================
const $ = (sel) => document.querySelector(sel);
const state = {
  currentClientName: "",
  playerName: "",
  caseIndex: 0,
  scores: { empatia: 0, conducao: 0, agilidade: 0 },
  timings: [],
  verifying: false,
  timeLeft: 0,
  totalTime: 0,
  timerId: null,
  answered: false,
  bonusAgilidade: 0,
  cadOk: false,
};

// ---------- Utilidades ----------
function addClient(text){ addMsg('client', text); }
function addUser(text){ addMsg('user', text); }
function addSystem(text){ addMsg('system', text); }
function addMsg(role,text){
  const chat = $('#chat');
  const row = document.createElement('div');
  row.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}
function toggleModal(sel,show){ const el=$(sel); if(!el) return; el.classList.toggle('hidden', !show); }
function downloadReport(){
  const last = localStorage.getItem('chatlab:lastScore');
  const report = { title:'Chat Lab — Missão II', when:new Date().toISOString(), result:last?JSON.parse(last):null, version:'1.6.7' };
  const blob = new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='chatlab-missao-ii-relatorio.json'; a.click(); URL.revokeObjectURL(a.href);
}
const _norm = (s) => (s || '').replace(/\s+/g,' ').trim();
const onlyDigits = (s) => (s || '').replace(/\D+/g,'');
function formatCPF(v){ v=onlyDigits(v).slice(0,11); if(v.length<=3) return v; if(v.length<=6) return v.slice(0,3)+'.'+v.slice(3); if(v.length<=9) return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6); return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9); }
function isValidCPF(cpf){ cpf=onlyDigits(cpf); if(cpf.length!==11) return false; if(/^(\d)\1{10}$/.test(cpf)) return false; let sum=0; for(let i=0;i<9;i++) sum+= parseInt(cpf[i])*(10-i); let d1 = 11 - (sum % 11); d1 = (d1>9)?0:d1; if(d1!==parseInt(cpf[9])) return false; sum=0; for(let i=0;i<10;i++) sum+= parseInt(cpf[i])*(11-i); let d2 = 11 - (sum % 11); d2 = (d2>9)?0:d2; return d2===parseInt(cpf[10]); }
const _randClientName = () => ['Ana','Carlos','Mariana','João','Beatriz','Rafael','Luciana','Pedro','Fernanda','Gustavo','Camila','Bruno','Aline','Thiago','Patrícia','Gabriel','Larissa','Eduardo','Julia','André'][Math.floor(Math.random()*20)];
const _getPlayerName = () => localStorage.getItem('chatlab:playerName') || 'Agente';
const _getPlayerCPF = () => localStorage.getItem('chatlab:playerCPF') || '';
function setPlayerNameCPF(name, cpf){ if(name) localStorage.setItem('chatlab:playerName', name); if(cpf) localStorage.setItem('chatlab:playerCPF', onlyDigits(cpf)); }

// ---------- Cenários ----------
const scenarios = [
  { id:1, message:"Oi, recebi uma cobrança e não entendi do que se trata.", time:18, goal:['comunicacao','conducao'], options:[
    { text:"Claro! Posso te explicar o que identifiquei e, se preferir, já te envio as formas de pagamento.", tags:['comunicacao','conducao'], tip:"Esclarece primeiro e encaminha sem exigir dados logo de início." },
    { text:"Entendo. Posso verificar o histórico e te resumir os pontos principais agora, tudo bem?", tags:['comunicacao','empatia','conducao'], tip:"Boa prática: resumo objetivo antes de propor ação." },
    { text:"Se tiver à mão o número do contrato, agiliza a consulta; se não, posso localizar aqui e te retorno em seguida.", tags:['conducao'], tip:"Nº do contrato apenas como atalho opcional, sem travar o atendimento." },
    { text:"É sobre um débito pendente. Precisamos resolver hoje mesmo, certo?", tags:['frio','conducao'], tip:"Pressiona sem informar; pode gerar resistência." },
  ]},
  { id:2, message:"Estou com dificuldades financeiras, não consigo pagar tudo agora.", time:20, goal:['empatia','conducao'], options:[
    { text:"Obrigado por compartilhar. Vamos ajustar a negociação: posso montar opções com parcelas menores e te apresentar agora.", tags:['empatia','conducao'], tip:"Valida e propõe caminho sem travar no dado." },
    { text:"Entendo. Para ficar viável, avaliamos prazo, entrada e parcela máxima que cabe hoje e seguimos com a proposta.", tags:['conducao','comunicacao'], tip:"Conduz a estrutura de negociação com transparência." },
    { text:"Se não pagar, a situação complica; melhor resolver isso hoje, combinado?", tags:['frio'], tip:"Ameaça direta tende a travar a conversa." },
    { text:"Tem que quitar do jeito que está; não há o que fazer.", tags:['frio'], tip:"Rigidez e falta de alternativas." },
  ]},
  { id:3, message:"Quero pagar, mas não sei como gerar o boleto.", time:16, goal:['comunicacao','conducao'], options:[
    { text:"Eu gero para você agora e te envio com o passo a passo para pagamento. Pode me informar o número do contrato?", tags:['comunicacao','conducao'], tip:"Aqui o nº do contrato é pertinente para localizar e emitir corretamente." },
    { text:"Te explico o processo e já deixo o link pronto; se preferir, envio também Pix com instruções detalhadas.", tags:['comunicacao','conducao'], tip:"Encaminha sem travar na coleta de dado; pode pedir depois se necessário." },
    { text:"Olha no site que você encontra.", tags:['frio'], tip:"Empurra responsabilidade sem apoio prático." },
    { text:"Posso te mandar depois por e-mail quando der tempo.", tags:['comunicacao'], tip:"Promessa vaga gera frustração." },
  ]},
  { id:4, message:"Consegue verificar minha situação para negociar um acordo?", time:15, goal:['conducao'], options:[
    { text:"Estou consultando no sistema agora; te atualizo em instantes, por favor aguarde.", tags:['conducao'], tip:"Sinaliza verificação e ajusta expectativa (use 📎)." },
    { text:"Um instante, por favor. Vou verificar os detalhes e já retorno com as possibilidades.", tags:['conducao'], tip:"Comunica ação e próximo passo." },
    { text:"Calma aí.", tags:['frio'], tip:"Tom impaciente e pouco profissional." },
    { text:"Vejo sim, mas pode levar bastante tempo, ok?", tags:['comunicacao'], tip:"Transparência é bem‑vinda; evite exageros." },
  ]},
  { id:5, message:"Se eu pagar hoje, consigo algum desconto?", time:14, goal:['comunicacao','conducao'], options:[
    { text:"Ótima notícia: posso verificar condições de abatimento para pagamento à vista e te apresentar as opções agora mesmo.", tags:['conducao','comunicacao'], tip:"Conduz sem burocracia; dados podem ser confirmados depois." },
    { text:"Posso simular as alternativas elegíveis e já te envio a proposta com valores e prazos.", tags:['conducao','comunicacao'], tip:"Objetivo e pró‑ativo." },
    { text:"Depende do sistema; talvez não tenha.", tags:['comunicacao'], tip:"Vago e pouco útil." },
    { text:"Hoje não costuma ter desconto.", tags:['frio'], tip:"Fecha a porta antes de avaliar." },
  ]},
  { id:6, message:"O valor está alto por causa dos juros. Dá para melhorar?", time:16, goal:['empatia','comunicacao','conducao'], options:[
    { text:"Entendo a sua preocupação. Posso recalcular dentro das regras e te mostrar opções com redução de encargos, se houver elegibilidade.", tags:['empatia','comunicacao','conducao'], tip:"Valida e abre caminho concreto sem prometer o impossível." },
    { text:"Juros são assim mesmo; não tem muito o que fazer.", tags:['frio'], tip:"Seco e desmotivador." },
    { text:"Consigo melhorar sim! Garanto um ótimo desconto para você hoje.", tags:['comunicacao','desvio'], tip:"Promessa arriscada sem verificar políticas." },
    { text:"Você prefere analisar proposta à vista com ajuste de encargos ou parcelar mantendo parcelas menores?", tags:['conducao','pergunta_fechada'], tip:"Ajuda a decidir, sem coletar dado desnecessário." },
  ]},
  { id:7, message:"Consigo pagar parte hoje e o restante no mês que vem?", time:18, goal:['comunicacao','conducao'], options:[
    { text:"Podemos sim. Me diga qual valor cabe hoje e uma data segura para o restante; eu já estruturo a proposta com essas datas.", tags:['comunicacao','conducao'], tip:"Coleta informações essenciais para viabilizar o acordo." },
    { text:"Dá para fazer, mas só se você pagar metade agora.", tags:['desvio'], tip:"Imposição sem diagnóstico." },
    { text:"Tem que quitar tudo hoje, senão complica.", tags:['frio'], tip:"Rigidez sem explorar alternativas." },
    { text:"Se preferir, organizo Pix da parte de hoje e o boleto do restante para o dia 10.", tags:['conducao','pergunta_fechada'], tip:"Encaminha com proposta concreta e datas." },
  ]},
  { id:8, message:"Quero evitar novos atrasos. Como posso organizar melhor?", time:16, goal:['comunicacao','empatia'], options:[
    { text:"Boa iniciativa! Posso agendar lembretes e ajustar a data de vencimento conforme as regras; te explico como fica cada opção.", tags:['empatia','comunicacao','conducao'], tip:"Reconhece e oferece medidas práticas." },
    { text:"É só não esquecer de pagar.", tags:['frio'], tip:"Minimiza a necessidade do cliente." },
    { text:"Coloca no débito automático e pronto.", tags:['comunicacao'], tip:"Sugere solução única, sem entender contexto." },
    { text:"Prefere receber o boleto por e‑mail, WhatsApp ou ambos, para evitar perder o prazo?", tags:['conducao','pergunta_fechada'], tip:"Fecha preferência de canal para reduzir atrasos." },
  ]},
];

// ---------- Lifecycle ----------
document.addEventListener('DOMContentLoaded', () => {
  $('#caseTotal').textContent = String(scenarios.length);
  bindUI();
  applyPrefsFromStorage();
  const skip = localStorage.getItem('chatlab:skipIntro') === '1';
  if(skip){ toggleModal('#modalIntro', false); startGame(); } else { toggleModal('#modalIntro', true); }
});

function bindUI(){
  $('#btnVerify').addEventListener('click', onVerify);
  $('#btnNext').addEventListener('click', nextCase);
  $('#prefLargeUI').addEventListener('change', onToggleLargeUI);
  $('#prefDarkMode').addEventListener('change', onToggleDark);

  const ot = $('#btnOpenTyping'); if(ot){ ot.addEventListener('click', ()=> openTypingWithText(randomTypingSeed())); }

  // Mini game modal
  $('#btnTypingClose').addEventListener('click', ()=> toggleModal('#modalTyping', false));
  $('#btnTypingStart').addEventListener('click', ()=> startTypingChallenge(window.__seedTypingText || null));
  const btnSubmit = document.querySelector('#btnTypingSubmit'); if(btnSubmit){ btnSubmit.addEventListener('click', onTypingSubmit); }

  // Result modal
  const btnRestart = document.querySelector('#btnRestart'); if(btnRestart){ btnRestart.addEventListener('click', ()=>{ toggleModal('#modalResult', false); startGame(true); }); }
  const btnDownload = document.querySelector('#btnDownload'); if(btnDownload){ btnDownload.addEventListener('click', downloadReport); }

  // Intro form
  const btnStart = $('#btnStart');
  const inName=$('#inPlayerName'); const inCPF=$('#inPlayerCPF');
  const savedName=localStorage.getItem('chatlab:playerName') || ''; const savedCPF=_getPlayerCPF();
  if(inName) inName.value=savedName; if(inCPF){ inCPF.value = savedCPF? formatCPF(savedCPF):''; }
  function updateStartEnabled(){ const nameOk = (inName && inName.value.trim().length>=2); const cpfOk = (inCPF && isValidCPF(inCPF.value)); if(btnStart) btnStart.disabled = !(nameOk && cpfOk); }
  if(inCPF){ inCPF.addEventListener('input', ()=>{ inCPF.value = formatCPF(inCPF.value); updateStartEnabled(); }); }
  if(inName){ inName.addEventListener('input', updateStartEnabled); }
  updateStartEnabled();
  if(btnStart){ btnStart.addEventListener('click', ()=>{ setPlayerNameCPF(inName?inName.value.trim():'', inCPF?inCPF.value:''); toggleModal('#modalIntro', false); startGame(); }); }
  const skipIntro = $('#tgSkipIntro'); if(skipIntro){ skipIntro.addEventListener('change', e=> localStorage.setItem('chatlab:skipIntro', e.target.checked ? '1':'0')); skipIntro.checked = localStorage.getItem('chatlab:skipIntro')==='1'; }

  // --- Botão de recolher/expandir painel de alternativas ---
  const fb = document.querySelector('.footer-actions') || document.querySelector('.footerbar');
  if (fb) {
    const btnToggleOpt = document.createElement('button');
    btnToggleOpt.id = 'btnToggleOptions';
    btnToggleOpt.className = 'btn secondary';
    btnToggleOpt.textContent = 'Alternativas ⌄';
    fb.appendChild(btnToggleOpt);
    btnToggleOpt.addEventListener('click', toggleOptionsPanel);
  }

  // Atalhos de teclado
  document.addEventListener('keydown', (e)=>{
    const typingOpen = !$('#modalTyping').classList.contains('hidden');
    if(typingOpen) return; // não interferir no mini‑game
    const k = e.key.toLowerCase();
    if(k==='v') onVerify();
    if(k==='n') nextCase();
    if(k==='o') toggleOptionsPanel();
  });
}

function toggleOptionsPanel(){
  const box = document.getElementById('options');
  const btn = document.getElementById('btnToggleOptions');
  if (!box || !btn) return;
  box.classList.toggle('collapsed');
  const collapsed = box.classList.contains('collapsed');
  btn.textContent = collapsed ? 'Alternativas ⌃' : 'Alternativas ⌄';
}

function onToggleLargeUI(e){ document.body.classList.toggle('large-ui', e.target.checked); localStorage.setItem('prefLargeUI', e.target.checked?'1':'0'); }
function onToggleDark(e){ document.body.classList.toggle('dark', e.target.checked); localStorage.setItem('prefDarkMode', e.target.checked?'1':'0'); }
function applyPrefsFromStorage(){ const large = localStorage.getItem('prefLargeUI')==='1'; const dark = localStorage.getItem('prefDarkMode')==='1'; $('#prefLargeUI').checked=large; $('#prefDarkMode').checked=dark; document.body.classList.toggle('large-ui', large); document.body.classList.toggle('dark', dark); }

function startGame(){
  state.caseIndex=0; state.scores={empatia:0,conducao:0,agilidade:0}; state.timings=[]; state.bonusAgilidade=Number(localStorage.getItem('typingBonus')||0); state.cadOk=false;
  $('#scoreEmpatia').textContent=0; $('#scoreConducao').textContent=0; $('#scoreAgilidade').textContent=0; $('#chat').innerHTML=''; $('#options').innerHTML=''; $('#btnNext').disabled=true; $('#caseIndex').textContent=1;
  addSystem('Bem-vindo(a)! Aplique Empatia, Condução e Agilidade na negociação.');
  state.currentClientName=_randClientName(); state.playerName=_getPlayerName();
  addUser(`Olá, ${state.currentClientName}. Sou o(a) ${state.playerName} do Santander e estou aqui para te ajudar`);
  setTimeout(()=> playCase(scenarios[0]), 400);
}

function playCase(sc){ state.answered=false; $('#options').innerHTML=''; addClient(sc.message); renderOptions(sc); startTimer(sc.time); }
function shuffle(array){ for(let i=array.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]]; } return array; }
function renderOptions(sc){ const box=$('#options'); box.innerHTML=''; const opts = shuffle(sc.options.map(o=>({...o}))); opts.forEach(opt=>{ const btn=document.createElement('button'); btn.className='opt-btn'; btn.textContent = opt.text; btn.addEventListener('click', ()=> onSelectOption(sc,opt)); box.appendChild(btn); }); }

function startTimer(seconds){ clearInterval(state.timerId); state.totalTime=seconds; state.timeLeft=seconds; updateTimerUI(); state.timerId=setInterval(()=>{ if(!state.verifying){ state.timeLeft-=0.1; if(state.timeLeft<=0){ state.timeLeft=0; clearInterval(state.timerId); if(!state.answered){ addSystem('⏱️ Tempo esgotado. Tente responder com mais agilidade!'); $('#btnNext').disabled=false; state.timings.push(state.totalTime); } } updateTimerUI(); } },100); }
function updateTimerUI(){ const pct=Math.max(0,Math.min(1,state.timeLeft/state.totalTime)); $('#timeBar').style.width=`${pct*100}%`; $('#timeLabel').textContent=`${Math.ceil(state.timeLeft)}s`; }

function onVerify(){ if(state.verifying||state.answered) return; state.verifying=true; addUser('Estou consultando no sistema, só um instante por favor.'); addSystem('✅ Verificação sinalizada. Tempo pausado por 5s.'); const btn=$('#btnVerify'); if(btn) btn.disabled=true; setTimeout(()=>{ state.verifying=false; if(btn) btn.disabled=false; },5000); }

function onSelectOption(sc,opt){ if(state.answered) return; state.answered=true; const text=opt.text; addUser(text);
  // Mini‑game com a frase escolhida
  openTypingWithText(text);
  if(sc && sc.id===4 && !(opt.tags||[]).includes('frio')){ state.cadOk = true; }
  const tGasto=Math.max(0,state.totalTime-state.timeLeft); const pts=scoreChoice(sc,opt,tGasto); state.scores.empatia+=pts.empatia; state.scores.conducao+=pts.conducao; state.scores.agilidade+=pts.agilidade; $('#scoreEmpatia').textContent=state.scores.empatia; $('#scoreConducao').textContent=state.scores.conducao; $('#scoreAgilidade').textContent=state.scores.agilidade; addSystem(`💡 ${opt.tip}`); addSystem(`📊 (+${pts.empatia} Empatia, +${pts.conducao} Condução, +${pts.agilidade} Agilidade)`); clearInterval(state.timerId); state.timings.push(tGasto); $('#btnNext').disabled=false; }

function scoreChoice(sc,opt,timeSpent){ const want=new Set(sc.goal); const has=new Set(opt.tags||[]); let emp=0, con=0, agi=0; if(has.has('empatia')) emp+=10; if(has.has('frio')) emp-=6; if(has.has('conducao')) con+=10; if(has.has('pergunta_fechada')) con+=6; if(has.has('comunicacao')) con+=4; if(has.has('desvio')) con-=6; if([...has].some(t=> want.has(t))){ emp+=2; con+=2; } const maxAgi=10; const pctTempo=Math.max(0,1-(timeSpent/Math.max(1,state.totalTime))); agi+=Math.round(maxAgi*pctTempo); return { empatia:Math.max(-10,emp), conducao:Math.max(-10,con), agilidade:Math.max(0,agi) } }

function nextCase(){ $('#btnNext').disabled=true; state.caseIndex++; $('#caseIndex').textContent=state.caseIndex+1; if(state.caseIndex>=scenarios.length){ endGame(); return;} playCase(scenarios[state.caseIndex]); }

function endGame(){ if(state.bonusAgilidade>0){ state.scores.agilidade+=state.bonusAgilidade; addSystem(`⚡ Bônus de agilidade aplicado: +${state.bonusAgilidade}`); } const avg= state.timings.length? (state.timings.reduce((a,b)=>a+b,0)/state.timings.length):0; $('#resEmpatia').textContent=state.scores.empatia; $('#resConducao').textContent=state.scores.conducao; $('#resAgilidade').textContent=state.scores.agilidade; $('#resTempoMedio').textContent=`${avg.toFixed(1)}s`; $('#medals').innerHTML=renderMedals(state.scores); const snapshot={ when:new Date().toISOString(), scores:state.scores, avgTime:Number(avg.toFixed(2)), cases:scenarios.length }; localStorage.setItem('chatlab:lastScore', JSON.stringify(snapshot)); if(state.cadOk){ addSystem('✅ CadOk'); } toggleModal('#modalResult', true); }

function renderMedals(sc){ const medals=[]; const mEmp = sc.empatia>=40?'🥇': sc.empatia>=28?'🥈': sc.empatia>=16?'🥉':'🎗️'; const mCon = sc.conducao>=40?'🥇': sc.conducao>=28?'🥈': sc.conducao>=16?'🥉':'🎗️'; const mAgi = sc.agilidade>=45?'🥇': sc.agilidade>=30?'🥈': sc.agilidade>=18?'🥉':'🎗️'; medals.push(`<span class=\"medal\" title=\"Empatia\">${mEmp}</span>`); medals.push(`<span class=\"medal\" title=\"Condução\">${mCon}</span>`); medals.push(`<span class=\"medal\" title=\"Agilidade\">${mAgi}</span>`); const total=sc.empatia+sc.conducao+sc.agilidade; const crown = total>=120?'👑 Excelente': total>=90?'🏆 Muito bom': total>=60?'🎖️ Bom':'🎗️ Aprendizado'; medals.push(`<span class=\"medal badge\" title=\"Pontuação total\">${crown}</span>`); return medals.join(''); }

// ---------- Mini‑game: Digitação 30s ----------
const typingTextPool=[
 'No atendimento de cobrança, valide a situação do cliente e conduza para uma alternativa viável.',
 'Ofereça opções claras (à vista/parcelado) e explique regras com transparência.',
 'Agilidade é importante: responda com rapidez sem perder a qualidade e o respeito.',
];
let typingState={active:false,timeLeft:30,text:'',timerId:null,typed:'',wpm:0,acc:0};
function randomTypingSeed(){ return typingTextPool[Math.floor(Math.random()*typingTextPool.length)]; }
function openTypingWithText(text){ toggleModal('#modalTyping', true); window.__seedTypingText = (text || ''); $('#typingText').textContent = window.__seedTypingText || randomTypingSeed(); $('#typingInput').value = ''; $('#typingInput').disabled = true; $('#typingBar').style.width = '100%'; $('#typingTime').textContent = '30s'; $('#typingWPM').textContent = '0'; $('#typingACC').textContent = '0%'; const btnSubmit2 = document.querySelector('#btnTypingSubmit'); if (btnSubmit2) btnSubmit2.disabled = true; }
function startTypingChallenge(seedText){ if(typingState.active) return; typingState.active=true; const btnSubmit3 = document.querySelector('#btnTypingSubmit'); if(btnSubmit3) btnSubmit3.disabled = true; typingState.timeLeft=30; typingState.text = (seedText && seedText.trim()) ? seedText : randomTypingSeed(); typingState.typed=''; $('#typingText').textContent=typingState.text; $('#typingInput').value=''; $('#typingInput').disabled=false; $('#typingInput').focus(); $('#typingBar').style.width='100%'; $('#typingTime').textContent='30s'; $('#typingWPM').textContent='0'; $('#typingACC').textContent='0%'; clearInterval(typingState.timerId);
  // garantir que não acumulamos listeners
  const inputEl = document.querySelector('#typingInput');
  inputEl.removeEventListener('input', onTypingInput);
  inputEl.addEventListener('input', onTypingInput);
  typingState.timerId=setInterval(()=>{ typingState.timeLeft-=1; if(typingState.timeLeft<=0){ typingState.timeLeft=0; clearInterval(typingState.timerId); finishTypingChallenge(); } $('#typingBar').style.width=`${(typingState.timeLeft/30)*100}%`; $('#typingTime').textContent=`${typingState.timeLeft}s`; },1000);
}
function onTypingInput(e){ typingState.typed=e.target.value; const chars=typingState.typed.length; const minutes=(30-typingState.timeLeft)/60; const wpm=minutes>0? Math.round((chars/5)/minutes):0; const acc=accuracy(typingState.typed, typingState.text); typingState.wpm=wpm; typingState.acc=acc; $('#typingWPM').textContent=String(wpm); $('#typingACC').textContent=`${acc}%`; const btnSubmit = document.querySelector('#btnTypingSubmit'); if (btnSubmit){ btnSubmit.disabled = _norm(typingState.typed) !== _norm(typingState.text); } }
function accuracy(a,b){ const len=Math.max(a.length,b.length); if(len===0) return 100; let correct=0; for(let i=0;i<Math.min(a.length,b.length);i++){ if(a[i]===b[i]) correct++; } const acc=Math.round((correct/len)*100); return Math.max(0,Math.min(100,acc)); }
function finishTypingChallenge(){ const btnSubmit = document.querySelector('#btnTypingSubmit'); if(btnSubmit) btnSubmit.disabled = false; $('#typingInput').disabled=true; typingState.active=false; const w=typingState.wpm; const acc=typingState.acc; const bonus=Math.min(20, Math.round((w * (acc/100)) / 2)); localStorage.setItem('typingBonus', String(bonus)); $('#typingWPM').textContent=String(w); $('#typingACC').textContent=`${acc}%`; const msg = bonus > 0 ? `⚡ Desafio concluído! Bônus de agilidade: +${bonus} pts (aplicado ao final da missão).` : `Desafio concluído! Sem bônus desta vez.`; addSystem(msg); }
function onTypingSubmit(){ if(typingState.active){ clearInterval(typingState.timerId); finishTypingChallenge(); } addSystem('✅ Resposta enviada. O bônus de agilidade será considerado no resultado final.'); toggleModal('#modalTyping', false); }

setTimeout(()=>{ document.body.classList.add('ready'); }, 400);
