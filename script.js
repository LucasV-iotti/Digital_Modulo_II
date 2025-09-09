// ============================
// Chat Lab — Missão II (Hard Mode, v1.5.4)
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
  cadOk: false, // ✅ será indicado no fim da missão
};

// ---------- Utilidades ----------
function addClient(text){ addMsg('client', text); } function addUser(text){ addMsg('user', text); } function addSystem(text){ addMsg('system', text); }
function addMsg(role,text){ const chat=$('#chat'); const row=document.createElement('div'); row.className=`msg ${role}`; const bubble=document.createElement('div'); bubble.className='bubble'; bubble.textContent=text; row.appendChild(bubble); chat.appendChild(row); chat.scrollTop=chat.scrollHeight; }
function toggleModal(sel,show){ const el=$(sel); if(!el) return; if(show){ el.classList.remove('hidden'); } else { el.classList.add('hidden'); } }
function downloadReport(){ const last=localStorage.getItem('chatlab:lastScore'); const report={ title:'Chat Lab — Missão II', when:new Date().toISOString(), result:last?JSON.parse(last):null, version:'1.5.4' }; const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='chatlab-missao-ii-relatorio.json'; a.click(); URL.revokeObjectURL(a.href); }
function _norm(s){ return (s||'').replace(/\s+/g,' ').trim(); }
function onlyDigits(s){ return (s||'').replace(/\D+/g,''); }
function formatCPF(v){ v=onlyDigits(v).slice(0,11); if(v.length<=3) return v; if(v.length<=6) return v.slice(0,3)+'.'+v.slice(3); if(v.length<=9) return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6); return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9); }
function isValidCPF(cpf){ cpf=onlyDigits(cpf); if(cpf.length!==11) return false; if(/^(\d)\1{10}$/.test(cpf)) return false; let sum=0; for(let i=0;i<9;i++) sum+= parseInt(cpf[i])*(10-i); let d1 = 11 - (sum % 11); d1 = (d1>9)?0:d1; if(d1!==parseInt(cpf[9])) return false; sum=0; for(let i=0;i<10;i++) sum+= parseInt(cpf[i])*(11-i); let d2 = 11 - (sum % 11); d2 = (d2>9)?0:d2; return d2===parseInt(cpf[10]); }
function _randClientName(){ const list=['Ana','Carlos','Mariana','João','Beatriz','Rafael','Luciana','Pedro','Fernanda','Gustavo','Camila','Bruno','Aline','Thiago','Patrícia','Gabriel','Larissa','Eduardo','Julia','André']; return list[Math.floor(Math.random()*list.length)]; }
function _getPlayerName(){ return localStorage.getItem('chatlab:playerName')||'Agente'; }
function _getPlayerCPF(){ return localStorage.getItem('chatlab:playerCPF')||''; }
function setPlayerNameCPF(name, cpf){ if(name) localStorage.setItem('chatlab:playerName', name); if(cpf) localStorage.setItem('chatlab:playerCPF', onlyDigits(cpf)); }

// ---------- Cenários (alternativas parecidas + pegadinhas) ----------
const scenarios = [
  { id:1, message:"Oi! Preciso do documento da proposta. Não sei se vai por e-mail ou WhatsApp. Pode me ajudar?", time:18, goal:["conducao","pergunta_fechada","comunicacao"], options:[
    { text:"Você prefere receber o documento por e-mail ou pelo WhatsApp?", tags:["conducao","pergunta_fechada","comunicacao"], tip:"Oferece duas vias claras e pede a decisão do cliente (fechada)." },
    { text:"Posso te enviar por e-mail ou WhatsApp agora — qual prefere?", tags:["conducao","pergunta_fechada"], tip:"Boa condução; cuidado com promessa de envio imediato antes da confirmação." },
    { text:"Me confirma seu e-mail e WhatsApp para eu já enviar nos dois.", tags:["conducao"], tip:"Coleta dados sem necessidade e foge do pedido de preferência." },
    { text:"Qual é o seu e-mail?", tags:["conducao"], tip:"Objetivo, mas não resolve a dúvida de canal preferido." },
  ]},
  { id:2, message:"Estou bem chateado. Fizeram uma cobrança indevida e ninguém resolve.", time:20, goal:["empatia","comunicacao"], options:[
    { text:"Sinto muito pela situação, entendo o incômodo. Vou te ajudar a resolver da melhor forma, combinado?", tags:["empatia","comunicacao"], tip:"Valida o sentimento e demonstra compromisso, sem prometer o impossível." },
    { text:"Entendo. Para avançarmos, pode me informar o número do contrato?", tags:["empatia","conducao"], tip:"Mostra empatia e direciona o próximo passo." },
    { text:"Calma, vamos ver isso, mas preciso do contrato imediatamente.", tags:["conducao","frio"], tip:"Pressiona e minimiza o sentimento do cliente." },
    { text:"Vamos resolver isso agora!", tags:["comunicacao"], tip:"Transmite energia, mas é promessa arriscada sem checagem." },
  ]},
  { id:3, message:"Eu queria saber sobre o plano, mas antes: você torce pra qual time?", time:16, goal:["conducao"], options:[
    { text:"Para avançarmos, preciso confirmar seu CPF e nome completo. Pode me informar, por favor?", tags:["conducao","comunicacao"], tip:"Retoma o foco e solicita identificação com clareza." },
    { text:"Sou do [seu time]! E podemos falar do plano depois do seu CPF, tudo bem?", tags:["desvio","conducao"], tip:"Cria vínculo, mas alimenta o desvio antes de retomar." },
    { text:"CPF, por favor.", tags:["frio","conducao"], tip:"Direto demais e sem rapport." },
    { text:"Vamos por partes: qual plano você quer e seu CPF?", tags:["conducao"], tip:"Duas demandas ao mesmo tempo confundem o cliente." },
  ]},
  { id:4, message:"Consegue ver se meu cadastro já foi aprovado?", time:15, goal:["conducao"], options:[
    { text:"Estou consultando no sistema, só um instante por favor.", tags:["conducao"], tip:"Sinaliza verificação e ajusta expectativa; use o botão 📎 para pausar o tempo." },
    { text:"Um instante, por favor. Vou verificar e já retorno.", tags:["conducao"], tip:"Boa prática; lembre-se de sinalizar que está verificando." },
    { text:"Calma aí.", tags:["frio"], tip:"Tom impaciente e pouco profissional." },
    { text:"Vejo sim, mas pode demorar bastante.", tags:["comunicacao"], tip:"Transparência é importante, porém exagera no tempo e desalinha a experiência." },
  ]},
  { id:5, message:"Obrigado, deu tudo certo então!", time:12, goal:["finalizacao","empatia"], options:[
    { text:"Que bom! Fico feliz em ajudar. Se precisar, é só chamar. Tenha um ótimo dia!", tags:["finalizacao","empatia"], tip:"Cordial, positiva e deixa porta aberta." },
    { text:"Disponha! Posso apoiar em mais alguma coisa agora?", tags:["finalizacao","comunicacao"], tip:"Boa prática: confirmação de encerramento com oferta de ajuda." },
    { text:"Encerrando atendimento. Bom dia.", tags:["finalizacao"], tip:"Fecha sem calor humano e sem checar necessidades finais." },
    { text:"Tá 👍", tags:["frio"], tip:"Informal demais e pouco profissional." },
  ]},
  { id:6, message:"Qual o prazo para a entrega do serviço?", time:14, goal:["comunicacao","conducao"], options:[
    { text:"O prazo é de 2 dias úteis. Posso abrir sua solicitação agora?", tags:["comunicacao","conducao","pergunta_fechada"], tip:"Clareza + encaminhamento com decisão fechada." },
    { text:"O prazo padrão é 2 a 3 dias úteis, tudo bem?", tags:["comunicacao"], tip:"Informativo, porém sem condução para o próximo passo." },
    { text:"Depende do volume, mas costuma ser rápido.", tags:["comunicacao"], tip:"Vago e sujeito a frustração." },
    { text:"É rápido, quer seguir?", tags:["conducao","pergunta_fechada"], tip:"Conduz, porém sem transparência de prazo." },
  ]},
  { id:7, message:"Tive um problema, posso explicar melhor?", time:18, goal:["empatia","comunicacao"], options:[
    { text:"Claro! Pode me contar o que aconteceu? Se puder, inclua data e qualquer mensagem de erro que apareceu.", tags:["empatia","comunicacao"], tip:"Mostra interesse e guia objetivamente o relato." },
    { text:"Pode mandar um áudio explicando?", tags:["frio"], tip:"Nem sempre é adequado ao canal e dificulta registro." },
    { text:"Resume em duas linhas, por favor.", tags:["desvio"], tip:"Restringe o cliente antes de entender o contexto." },
    { text:"Antes, me informa CPF e protocolo.", tags:["conducao"], tip:"Antecipar dados pode travar o relato inicial." },
  ]},
  { id:8, message:"Tenho urgência. Consegue resolver ainda hoje?", time:16, goal:["comunicacao","conducao","empatia"], options:[
    { text:"Entendo a urgência! Posso priorizar para hoje ou agendamos para amanhã cedo — qual prefere?", tags:["empatia","conducao","pergunta_fechada"], tip:"Valida sentimento e oferece alternativas viáveis." },
    { text:"Vou tentar agilizar para hoje, tudo bem?", tags:["comunicacao"], tip:"Boa intenção, mas vago e sem alternativa." },
    { text:"Hoje não é possível.", tags:["comunicacao"], tip:"Transparente, mas sem oferecer caminho alternativo." },
    { text:"Consegue esperar até amanhã?", tags:["pergunta_fechada"], tip:"Pergunta fechada, porém ignora a urgência do cliente." },
  ]},
];

// ---------- Lifecycle ----------
document.addEventListener('DOMContentLoaded', () => {
  $('#caseTotal').textContent = scenarios.length;
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

  // Mini game modal buttons
  $('#btnTypingClose').addEventListener('click', ()=> toggleModal('#modalTyping', false));
  $('#btnTypingStart').addEventListener('click', ()=> startTypingChallenge(window.__seedTypingText||null));
  const btnSubmit = document.querySelector('#btnTypingSubmit'); if(btnSubmit){ btnSubmit.addEventListener('click', onTypingSubmit); }

  // Result modal
  $('#btnRestart').addEventListener('click', ()=> { toggleModal('#modalResult', false); startGame(true); });
  $('#btnDownload').addEventListener('click', downloadReport);

  const btnStart = $('#btnStart');
  const inName=$('#inPlayerName'); const inCPF=$('#inPlayerCPF');
  const savedName=localStorage.getItem('chatlab:playerName')||''; const savedCPF=_getPlayerCPF();
  if(inName) inName.value=savedName; if(inCPF){ inCPF.value = savedCPF? formatCPF(savedCPF):''; }
  function updateStartEnabled(){ const nameOk = (inName && inName.value.trim().length>=2); const cpfOk = (inCPF && isValidCPF(inCPF.value)); if(btnStart) btnStart.disabled = !(nameOk && cpfOk); }
  if(inCPF){ inCPF.addEventListener('input', ()=>{ inCPF.value = formatCPF(inCPF.value); updateStartEnabled(); }); }
  if(inName){ inName.addEventListener('input', updateStartEnabled); }
  updateStartEnabled();
  if(btnStart){ btnStart.addEventListener('click', ()=>{ setPlayerNameCPF(inName?inName.value.trim():'', inCPF?inCPF.value:''); toggleModal('#modalIntro', false); startGame(); }); }

  const skipIntro = $('#tgSkipIntro'); if(skipIntro){ skipIntro.addEventListener('change', e=> localStorage.setItem('chatlab:skipIntro', e.target.checked ? '1':'0')); skipIntro.checked = localStorage.getItem('chatlab:skipIntro')==='1'; }
}

function onToggleLargeUI(e){ document.body.classList.toggle('large-ui', e.target.checked); localStorage.setItem('prefLargeUI', e.target.checked?'1':'0'); }
function onToggleDark(e){ document.body.classList.toggle('dark', e.target.checked); localStorage.setItem('prefDarkMode', e.target.checked?'1':'0'); }
function applyPrefsFromStorage(){ const large = localStorage.getItem('prefLargeUI')==='1'; const dark = localStorage.getItem('prefDarkMode')==='1'; $('#prefLargeUI').checked=large; $('#prefDarkMode').checked=dark; document.body.classList.toggle('large-ui', large); document.body.classList.toggle('dark', dark); }

function startGame(){
  state.caseIndex=0; state.scores={empatia:0,conducao:0,agilidade:0}; state.timings=[]; state.bonusAgilidade=Number(localStorage.getItem('typingBonus')||0); state.cadOk=false;
  $('#scoreEmpatia').textContent=0; $('#scoreConducao').textContent=0; $('#scoreAgilidade').textContent=0; $('#chat').innerHTML=''; $('#options').innerHTML=''; $('#btnNext').disabled=true; $('#caseIndex').textContent=1;
  addSystem('Bem-vindo(a)! Aplique Empatia, Condução e Agilidade em cada caso. Boa sorte!');
  state.currentClientName=_randClientName(); state.playerName=_getPlayerName();
  addUser(`Olá, ${state.currentClientName}. Sou o(a) ${state.playerName} do Santander e estou aqui para te ajudar`);
  setTimeout(()=> playCase(scenarios[0]), 500);
}

function playCase(sc){ state.answered=false; $('#options').innerHTML=''; addClient(sc.message); renderOptions(sc); startTimer(sc.time); }
function shuffle(array){ for(let i=array.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]]; } return array; }
function renderOptions(sc){ const box=$('#options'); box.innerHTML=''; const opts = shuffle(sc.options.map(o=>({...o}))); opts.forEach(opt=>{ const btn=document.createElement('button'); btn.className='opt-btn'; btn.innerHTML=`<div>${opt.text}</div>`; btn.addEventListener('click', ()=> onSelectOption(sc,opt)); box.appendChild(btn); }); }

function startTimer(seconds){ clearInterval(state.timerId); state.totalTime=seconds; state.timeLeft=seconds; updateTimerUI(); state.timerId=setInterval(()=>{ if(!state.verifying){ state.timeLeft-=0.1; if(state.timeLeft<=0){ state.timeLeft=0; clearInterval(state.timerId); if(!state.answered){ addSystem('⏱️ Tempo esgotado. Tente responder com mais agilidade!'); $('#btnNext').disabled=false; state.timings.push(state.totalTime); } } updateTimerUI(); } },100); }
function updateTimerUI(){ const pct=Math.max(0,Math.min(1,state.timeLeft/state.totalTime)); $('#timeBar').style.width=`${pct*100}%`; $('#timeLabel').textContent=`${Math.ceil(state.timeLeft)}s`; }

function onVerify(){ if(state.verifying||state.answered) return; state.verifying=true; addUser('Estou consultando no sistema, só um instante por favor.'); addSystem('✅ Verificação sinalizada. Tempo pausado por 5s.'); setTimeout(()=>{ state.verifying=false; },5000); }

function onSelectOption(sc,opt){ if(state.answered) return; state.answered=true; const text=opt.text; addUser(text);
  // abre desafio de digitação com a frase escolhida
  openTypingWithText(text);
  if(sc && sc.id===4 && !(opt.tags||[]).includes('frio')){ state.cadOk = true; } // ✅ marca CadOk no caso de cadastro adequado
  const tGasto=Math.max(0,state.totalTime-state.timeLeft); const pts=scoreChoice(sc,opt,tGasto); state.scores.empatia+=pts.empatia; state.scores.conducao+=pts.conducao; state.scores.agilidade+=pts.agilidade; $('#scoreEmpatia').textContent=state.scores.empatia; $('#scoreConducao').textContent=state.scores.conducao; $('#scoreAgilidade').textContent=state.scores.agilidade; addSystem(`💡 ${opt.tip}`); addSystem(`📊 (+${pts.empatia} Empatia, +${pts.conducao} Condução, +${pts.agilidade} Agilidade)`); clearInterval(state.timerId); state.timings.push(tGasto); $('#btnNext').disabled=false; }

function scoreChoice(sc,opt,timeSpent){ const want=new Set(sc.goal); const has=new Set(opt.tags||[]); let emp=0, con=0, agi=0; if(has.has('empatia')) emp+=10; if(has.has('frio')) emp-=6; if(has.has('conducao')) con+=10; if(has.has('pergunta_fechada')) con+=6; if(has.has('comunicacao')) con+=4; if(has.has('desvio')) con-=6; if([...has].some(t=> want.has(t))){ emp+=2; con+=2; } const maxAgi=10; const pctTempo=Math.max(0,1-(timeSpent/Math.max(1,state.totalTime))); agi+=Math.round(maxAgi*pctTempo); return { empatia:Math.max(-10,emp), conducao:Math.max(-10,con), agilidade:Math.max(0,agi) } }

function nextCase(){ $('#btnNext').disabled=true; state.caseIndex++; $('#caseIndex').textContent=state.caseIndex+1; if(state.caseIndex>=scenarios.length){ endGame(); return;} playCase(scenarios[state.caseIndex]); }

function endGame(){ if(state.bonusAgilidade>0){ state.scores.agilidade+=state.bonusAgilidade; addSystem(`⚡ Bônus de agilidade aplicado: +${state.bonusAgilidade}`); } const avg= state.timings.length? (state.timings.reduce((a,b)=>a+b,0)/state.timings.length):0; $('#resEmpatia').textContent=state.scores.empatia; $('#resConducao').textContent=state.scores.conducao; $('#resAgilidade').textContent=state.scores.agilidade; $('#resTempoMedio').textContent=`${avg.toFixed(1)}s`; $('#medals').innerHTML=renderMedals(state.scores); const snapshot={ when:new Date().toISOString(), scores:state.scores, avgTime:Number(avg.toFixed(2)), cases:scenarios.length }; localStorage.setItem('chatlab:lastScore', JSON.stringify(snapshot)); if(state.cadOk){ addSystem('✅ CadOk'); } toggleModal('#modalResult', true); }

function renderMedals(sc){ const medals=[]; const mEmp = sc.empatia>=40?'🥇': sc.empatia>=28?'🥈': sc.empatia>=16?'🥉':'🎗️'; const mCon = sc.conducao>=40?'🥇': sc.conducao>=28?'🥈': sc.conducao>=16?'🥉':'🎗️'; const mAgi = sc.agilidade>=45?'🥇': sc.agilidade>=30?'🥈': sc.agilidade>=18?'🥉':'🎗️'; medals.push(`<span class="medal" title="Empatia">${mEmp}</span>`); medals.push(`<span class="medal" title="Condução">${mCon}</span>`); medals.push(`<span class="medal" title="Agilidade">${mAgi}</span>`); const total=sc.empatia+sc.conducao+sc.agilidade; const crown = total>=120?'👑 Excelente': total>=90?'🏆 Muito bom': total>=60?'🎖️ Bom':'🎗️ Aprendizado'; medals.push(`<span class="medal badge" title="Pontuação total">${crown}</span>`); return medals.join(''); }

// ---------- Mini-game: Digitação 30s (abre com a frase escolhida) ----------
const typingTextPool=[
  'No atendimento digital, a empatia aparece na linguagem e no tom. Valide o sentimento do cliente e conduza a conversa com clareza.',
  'Use perguntas fechadas para facilitar decisões. Sinalize quando estiver verificando algo e finalize com cordialidade.',
  'Agilidade importa: responda com rapidez, mas sem perder a qualidade. Mantenha foco e objetividade ao longo da conversa.',
];
let typingState={active:false,timeLeft:30,text:'',timerId:null,typed:'',wpm:0,acc:0};
function openTypingWithText(text){ toggleModal('#modalTyping', true); document.querySelector('#typingText').textContent = text || ''; document.querySelector('#typingInput').value = ''; document.querySelector('#typingInput').disabled = true; document.querySelector('#typingBar').style.width = '100%'; document.querySelector('#typingTime').textContent = '30s'; document.querySelector('#typingWPM').textContent = '0'; document.querySelector('#typingACC').textContent = '0%'; window.__seedTypingText = text || ''; const btnSubmit2 = document.querySelector('#btnTypingSubmit'); if (btnSubmit2) btnSubmit2.disabled = true; }
function startTypingChallenge(seedText){ if(typingState.active) return; typingState.active=true; const btnSubmit3 = document.querySelector('#btnTypingSubmit'); if(btnSubmit3) btnSubmit3.disabled = true; typingState.timeLeft=30; typingState.text = seedText && seedText.trim() ? seedText : typingTextPool[Math.floor(Math.random()*typingTextPool.length)]; typingState.typed=''; document.querySelector('#typingText').textContent=typingState.text; document.querySelector('#typingInput').value=''; document.querySelector('#typingInput').disabled=false; document.querySelector('#typingInput').focus(); document.querySelector('#typingBar').style.width='100%'; document.querySelector('#typingTime').textContent='30s'; document.querySelector('#typingWPM').textContent='0'; document.querySelector('#typingACC').textContent='0%'; clearInterval(typingState.timerId); typingState.timerId=setInterval(()=>{ typingState.timeLeft-=1; if(typingState.timeLeft<=0){ typingState.timeLeft=0; clearInterval(typingState.timerId); finishTypingChallenge(); } document.querySelector('#typingBar').style.width=`${(typingState.timeLeft/30)*100}%`; document.querySelector('#typingTime').textContent=`${typingState.timeLeft}s`; },1000); document.querySelector('#typingInput').addEventListener('input', onTypingInput, {once:false}); }
function onTypingInput(e){ typingState.typed=e.target.value; const chars=typingState.typed.length; const minutes=(30-typingState.timeLeft)/60; const wpm=minutes>0? Math.round((chars/5)/minutes):0; const acc=accuracy(typingState.typed, typingState.text); typingState.wpm=wpm; typingState.acc=acc; document.querySelector('#typingWPM').textContent=String(wpm); document.querySelector('#typingACC').textContent=`${acc}%`; const btnSubmit = document.querySelector('#btnTypingSubmit'); if (btnSubmit){ btnSubmit.disabled = _norm(typingState.typed) !== _norm(typingState.text); } }
function accuracy(a,b){ const len=Math.max(a.length,b.length); if(len===0) return 100; let correct=0; for(let i=0;i<Math.min(a.length,b.length);i++){ if(a[i]===b[i]) correct++; } const acc=Math.round((correct/len)*100); return Math.max(0,Math.min(100,acc)); }
function finishTypingChallenge(){ const btnSubmit = document.querySelector('#btnTypingSubmit'); if(btnSubmit) btnSubmit.disabled = false; document.querySelector('#typingInput').disabled=true; typingState.active=false; const w=typingState.wpm; const acc=typingState.acc; const bonus=Math.min(20, Math.round((w * (acc/100)) / 2)); localStorage.setItem('typingBonus', String(bonus)); document.querySelector('#typingWPM').textContent=String(w); document.querySelector('#typingACC').textContent=`${acc}%`; const msg = bonus > 0 ? `⚡ Desafio concluído! Bônus de agilidade: +${bonus} pts (aplicado ao final da missão).` : `Desafio concluído! Sem bônus desta vez.`; addSystem(msg); }
function onTypingSubmit(){ if(typingState.active){ clearInterval(typingState.timerId); finishTypingChallenge(); } addSystem('✅ Resposta enviada. O bônus de agilidade será considerado no resultado final.'); toggleModal('#modalTyping', false); }

setTimeout(()=>{ document.body.classList.add('ready'); }, 400);
