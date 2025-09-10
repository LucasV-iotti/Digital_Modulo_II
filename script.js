// ============================
// Chat Lab — Missão II (Cobrança) — v1.6.1
// ============================
const $=(s)=>document.querySelector(s);
const state={currentClientName:"",playerName:"",caseIndex:0,scores:{empatia:0,conducao:0,agilidade:0},timings:[],verifying:false,timeLeft:0,totalTime:0,timerId:null,answered:false,bonusAgilidade:0,cadOk:false};
function addMsg(role,text){const c=$('#chat');const r=document.createElement('div');r.className=`msg ${role}`;const b=document.createElement('div');b.className='bubble';b.textContent=text;r.appendChild(b);c.appendChild(r);c.scrollTop=c.scrollHeight}
const addClient=(t)=>addMsg('client',t),addUser=(t)=>addMsg('user',t),addSystem=(t)=>addMsg('system',t);
function toggleModal(sel,show){const el=$(sel);if(!el)return;if(show){el.classList.remove('hidden')}else{el.classList.add('hidden')}}
function downloadReport(){const last=localStorage.getItem('chatlab:lastScore');const report={title:'Chat Lab — Missão II',when:new Date().toISOString(),result:last?JSON.parse(last):null,version:'1.6.1'};const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='chatlab-missao-ii-relatorio.json';a.click();URL.revokeObjectURL(a.href)}
function _norm(s){return (s||'').replace(/\s+/g,' ').trim()}
function onlyDigits(s){return (s||'').replace(/\D+/g,'')}
function formatCPF(v){v=onlyDigits(v).slice(0,11);if(v.length<=3)return v;if(v.length<=6)return v.slice(0,3)+'.'+v.slice(3);if(v.length<=9)return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9)}
function isValidCPF(cpf){cpf=onlyDigits(cpf);if(cpf.length!==11)return false;if(/^(\d){10}$/.test(cpf))return false;let s=0;for(let i=0;i<9;i++)s+=parseInt(cpf[i])*(10-i);let d1=11-(s%11);d1=(d1>9)?0:d1;if(d1!==parseInt(cpf[9]))return false;s=0;for(let i=0;i<10;i++)s+=parseInt(cpf[i])*(11-i);let d2=11-(s%11);d2=(d2>9)?0:d2;return d2===parseInt(cpf[10])}
function _randClientName(){const list=['Ana','Carlos','Mariana','João','Beatriz','Rafael','Luciana','Pedro','Fernanda','Gustavo','Camila','Bruno','Aline','Thiago','Patrícia','Gabriel','Larissa','Eduardo','Julia','André'];return list[Math.floor(Math.random()*list.length)]}
function _getPlayerName(){return localStorage.getItem('chatlab:playerName')||'Agente'}
function _getPlayerCPF(){return localStorage.getItem('chatlab:playerCPF')||''}
function setPlayerNameCPF(name,cpf){if(name)localStorage.setItem('chatlab:playerName',name);if(cpf)localStorage.setItem('chatlab:playerCPF',onlyDigits(cpf))}

// Cenários de cobrança com Nº do contrato
const scenarios=[
 {id:1,message:"Oi, recebi uma cobrança e não entendi do que se trata.",time:18,goal:["conducao","comunicacao"],options:[
  {text:"Claro! Pode me informar o número do contrato para eu consultar os detalhes da cobrança?",tags:["conducao","comunicacao"],tip:"Solicitar o número do contrato conduz a negociação."},
  {text:"Você está devendo, por isso recebeu.",tags:["frio"],tip:"Evite tom acusatório; prejudica o acordo."},
  {text:"Me informa o número do aviso de cobrança, por favor.",tags:["conducao"],tip:"Direciona a verificação, mas sem empatia."},
  {text:"Qual é o seu e-mail?",tags:["comunicacao"],tip:"Pode ser útil depois, mas comece pelo número do contrato."},
 ]},
 {id:2,message:"Estou com dificuldades financeiras, não consigo pagar tudo agora.",time:20,goal:["empatia","conducao"],options:[
  {text:"Entendo sua situação. Posso verificar uma proposta de parcelamento que caiba no seu orçamento?",tags:["empatia","conducao"],tip:"Valida e direciona para alternativa viável."},
  {text:"Se não pagar hoje, seu nome vai ser negativado.",tags:["frio"],tip:"Ameaça direta tende a travar a negociação."},
  {text:"Tem que pagar de qualquer jeito.",tags:["frio"],tip:"Falta empatia e flexibilidade."},
  {text:"O que você consegue pagar agora?",tags:["conducao","pergunta_fechada"],tip:"Induz decisão; confirme políticas antes de amarrar valores."},
 ]},
 {id:3,message:"Quero pagar, mas não sei como gerar o boleto.",time:16,goal:["comunicacao","conducao"],options:[
  {text:"Posso gerar o boleto ou Pix para você agora. Pode me informar o número do contrato?",tags:["comunicacao","conducao"],tip:"Clareza + número do contrato para seguir."},
  {text:"Prefere receber por e-mail ou WhatsApp?",tags:["conducao","pergunta_fechada"],tip:"Boa condução, mas confirme o número do contrato primeiro."},
  {text:"Você que precisa procurar no site.",tags:["frio"],tip:"Evite transferir responsabilidade sem orientar."},
  {text:"Me passa seu e-mail que eu mando depois.",tags:["comunicacao"],tip:"Promessa vaga pode gerar frustração."},
 ]},
 {id:4,message:"Consegue verificar minha situação para negociar um acordo?",time:15,goal:["conducao"],options:[
  {text:"Estou consultando no sistema, só um instante por favor.",tags:["conducao"],tip:"Sinalize verificação e ajuste a expectativa (use 📎 para pausar o tempo)."},
  {text:"Um instante, por favor. Vou verificar e já retorno.",tags:["conducao"],tip:"Boa prática: comunicar o passo de checagem."},
  {text:"Calma aí.",tags:["frio"],tip:"Tom impaciente e pouco profissional."},
  {text:"Posso ver, mas pode demorar bastante.",tags:["comunicacao"],tip:"Transparência é importante, sem exagerar o prazo."},
 ]},
 {id:5,message:"Se eu pagar hoje, consigo algum desconto?",time:14,goal:["conducao","comunicacao"],options:[
  {text:"Ótimo! Vou verificar uma proposta de desconto para pagamento à vista. Pode me informar o número do contrato?",tags:["conducao","comunicacao"],tip:"Direciona com incentivo, pedindo o número do contrato."},
  {text:"Desconto depende do sistema.",tags:["comunicacao"],tip:"Explica, mas não conduz a ação."},
  {text:"Não sei se tem desconto.",tags:["frio"],tip:"Falta clareza e iniciativa."},
  {text:"Prefere Pix ou Boleto para pagar hoje?",tags:["conducao","pergunta_fechada"],tip:"Fecha decisão de meio de pagamento; valide políticas antes de ofertar."},
 ]},
 {id:6,message:"O valor está alto por causa dos juros. Dá para melhorar?",time:16,goal:["empatia","comunicacao","conducao"],options:[
  {text:"Entendo a sua preocupação. Posso simular uma proposta com redução de encargos conforme as regras. Pode me informar o número do contrato?",tags:["empatia","comunicacao","conducao"],tip:"Valida e encaminha dentro das políticas."},
  {text:"Juros são assim mesmo.",tags:["frio"],tip:"Seco e pouco colaborativo."},
  {text:"Não tem como mudar o valor.",tags:["frio"],tip:"Fecha a negociação sem explorar alternativas."},
  {text:"Você prefere parcelar em 6x ou 12x?",tags:["conducao","pergunta_fechada"],tip:"Ajuda na decisão; confirme elegibilidade."},
 ]},
 {id:7,message:"Consigo pagar parte hoje e o restante no mês que vem?",time:18,goal:["comunicacao","conducao"],options:[
  {text:"Podemos avaliar sim. Qual valor consegue pagar hoje para eu montar a proposta?",tags:["comunicacao","conducao"],tip:"Coleta informação objetiva para estruturar o acordo."},
  {text:"Tem que quitar tudo hoje.",tags:["frio"],tip:"Rigidez sem explorar alternativas."},
  {text:"Amanhã talvez dê para ver isso.",tags:["frio"],tip:"Adia sem necessidade e perde o ritmo da negociação."},
  {text:"Prefere gerar Pix agora e boleto do restante para dia 10?",tags:["conducao","pergunta_fechada"],tip:"Encaminha com proposta concreta e data."},
 ]},
 {id:8,message:"Quero evitar novos atrasos. Como posso organizar melhor?",time:16,goal:["comunicacao","empatia"],options:[
  {text:"Boa iniciativa! Posso te enviar lembretes e ajustar a data de vencimento conforme as regras. Posso verificar isso para você?",tags:["empatia","comunicacao","conducao"],tip:"Reconhece atitude e oferece medidas práticas."},
  {text:"É só não esquecer de pagar.",tags:["frio"],tip:"Minimiza a necessidade do cliente."},
  {text:"Coloca no débito automático e pronto.",tags:["comunicacao"],tip:"Sugere solução única, sem entender contexto."},
  {text:"Quer receber o boleto sempre por e-mail ou WhatsApp?",tags:["conducao","pergunta_fechada"],tip:"Fecha preferência de canal para reduzir atrasos."},
 ]}
];

document.addEventListener('DOMContentLoaded',()=>{ $('#caseTotal').textContent=scenarios.length; bindUI(); applyPrefsFromStorage(); const skip=localStorage.getItem('chatlab:skipIntro')==='1'; if(skip){toggleModal('#modalIntro',false); startGame();} else {toggleModal('#modalIntro',true);} });
function bindUI(){ $('#btnVerify').addEventListener('click', onVerify); $('#btnNext').addEventListener('click', nextCase); $('#prefLargeUI').addEventListener('change', onToggleLargeUI); $('#prefDarkMode').addEventListener('change', onToggleDark); $('#btnTypingClose').addEventListener('click', ()=>toggleModal('#modalTyping',false)); $('#btnTypingStart').addEventListener('click', ()=> startTypingChallenge(window.__seedTypingText||null)); const btnSubmit=document.querySelector('#btnTypingSubmit'); if(btnSubmit){btnSubmit.addEventListener('click', onTypingSubmit);} const btnRestart=document.querySelector('#btnRestart'); if(btnRestart){btnRestart.addEventListener('click', ()=>{ toggleModal('#modalResult',false); startGame(true);}); } const btnDownload=document.querySelector('#btnDownload'); if(btnDownload){btnDownload.addEventListener('click', downloadReport);} const btnStart=$('#btnStart'); const inName=$('#inPlayerName'); const inCPF=$('#inPlayerCPF'); const savedName=localStorage.getItem('chatlab:playerName')||''; const savedCPF=_getPlayerCPF(); if(inName) inName.value=savedName; if(inCPF){ inCPF.value = savedCPF? formatCPF(savedCPF):''; } function updateStartEnabled(){ const nameOk=(inName&&inName.value.trim().length>=2); const cpfOk=(inCPF&&isValidCPF(inCPF.value)); if(btnStart) btnStart.disabled=!(nameOk&&cpfOk);} if(inCPF){ inCPF.addEventListener('input', ()=>{ inCPF.value=formatCPF(inCPF.value); updateStartEnabled();}); } if(inName){ inName.addEventListener('input', updateStartEnabled);} updateStartEnabled(); if(btnStart){ btnStart.addEventListener('click', ()=>{ setPlayerNameCPF(inName?inName.value.trim():'', inCPF?inCPF.value:''); toggleModal('#modalIntro',false); startGame();}); } const skipIntro=$('#tgSkipIntro'); if(skipIntro){ skipIntro.addEventListener('change', e=> localStorage.setItem('chatlab:skipIntro', e.target.checked?'1':'0')); skipIntro.checked=localStorage.getItem('chatlab:skipIntro')==='1'; } }
function onToggleLargeUI(e){ document.body.classList.toggle('large-ui',e.target.checked); localStorage.setItem('prefLargeUI', e.target.checked?'1':'0'); }
function onToggleDark(e){ document.body.classList.toggle('dark',e.target.checked); localStorage.setItem('prefDarkMode', e.target.checked?'1':'0'); }
function applyPrefsFromStorage(){ const large=localStorage.getItem('prefLargeUI')==='1'; const dark=localStorage.getItem('prefDarkMode')==='1'; $('#prefLargeUI').checked=large; $('#prefDarkMode').checked=dark; document.body.classList.toggle('large-ui',large); document.body.classList.toggle('dark',dark); }
function startGame(){ state.caseIndex=0; state.scores={empatia:0,conducao:0,agilidade:0}; state.timings=[]; state.bonusAgilidade=Number(localStorage.getItem('typingBonus')||0); state.cadOk=false; $('#scoreEmpatia').textContent=0; $('#scoreConducao').textContent=0; $('#scoreAgilidade').textContent=0; $('#chat').innerHTML=''; $('#options').innerHTML=''; $('#btnNext').disabled=true; $('#caseIndex').textContent=1; addSystem('Bem-vindo(a)! Aplique Empatia, Condução e Agilidade na negociação.'); state.currentClientName=_randClientName(); state.playerName=_getPlayerName(); addUser(`Olá, ${state.currentClientName}. Sou o(a) ${state.playerName} do Santander e estou aqui para te ajudar`); setTimeout(()=> playCase(scenarios[0]), 500); }
function playCase(sc){ state.answered=false; $('#options').innerHTML=''; addClient(sc.message); renderOptions(sc); startTimer(sc.time); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function renderOptions(sc){ const box=$('#options'); box.innerHTML=''; const opts=shuffle(sc.options.map(o=>({...o}))); opts.forEach(opt=>{ const btn=document.createElement('button'); btn.className='opt-btn'; btn.innerHTML=`<div>${opt.text}</div>`; btn.addEventListener('click', ()=> onSelectOption(sc,opt)); box.appendChild(btn); }); }
function startTimer(s){ clearInterval(state.timerId); state.totalTime=s; state.timeLeft=s; updateTimerUI(); state.timerId=setInterval(()=>{ if(!state.verifying){ state.timeLeft-=0.1; if(state.timeLeft<=0){ state.timeLeft=0; clearInterval(state.timerId); if(!state.answered){ addSystem('⏱️ Tempo esgotado. Tente responder com mais agilidade!'); $('#btnNext').disabled=false; state.timings.push(state.totalTime); } } updateTimerUI(); } },100); }
function updateTimerUI(){ const pct=Math.max(0,Math.min(1,state.timeLeft/state.totalTime)); $('#timeBar').style.width=`${pct*100}%`; $('#timeLabel').textContent=`${Math.ceil(state.timeLeft)}s`; }
function onVerify(){ if(state.verifying||state.answered) return; state.verifying=true; addUser('Estou consultando no sistema, só um instante por favor.'); addSystem('✅ Verificação sinalizada. Tempo pausado por 5s.'); setTimeout(()=>{ state.verifying=false; },5000); }
function scoreChoice(sc,opt,timeSpent){ const want=new Set(sc.goal); const has=new Set(opt.tags||[]); let emp=0,con=0,agi=0; if(has.has('empatia')) emp+=10; if(has.has('frio')) emp-=6; if(has.has('conducao')) con+=10; if(has.has('pergunta_fechada')) con+=6; if(has.has('comunicacao')) con+=4; if(has.has('desvio')) con-=6; if([...has].some(t=> want.has(t))){ emp+=2; con+=2; } const maxAgi=10; const pctTempo=Math.max(0,1-(timeSpent/Math.max(1,state.totalTime))); agi+=Math.round(maxAgi*pctTempo); return {empatia:Math.max(-10,emp),conducao:Math.max(-10,con),agilidade:Math.max(0,agi)} }
function onSelectOption(sc,opt){ if(state.answered) return; state.answered=true; const text=opt.text; addUser(text); openTypingWithText(text); if(sc && sc.id===4 && !(opt.tags||[]).includes('frio')){ state.cadOk = true; } const tGasto=Math.max(0,state.totalTime-state.timeLeft); const pts=scoreChoice(sc,opt,tGasto); state.scores.empatia+=pts.empatia; state.scores.conducao+=pts.conducao; state.scores.agilidade+=pts.agilidade; $('#scoreEmpatia').textContent=state.scores.empatia; $('#scoreConducao').textContent=state.scores.conducao; $('#scoreAgilidade').textContent=state.scores.agilidade; addSystem(`💡 ${opt.tip}`); addSystem(`📊 (+${pts.empatia} Empatia, +${pts.conducao} Condução, +${pts.agilidade} Agilidade)`); clearInterval(state.timerId); state.timings.push(tGasto); $('#btnNext').disabled=false; }
function nextCase(){ $('#btnNext').disabled=true; state.caseIndex++; $('#caseIndex').textContent=state.caseIndex+1; if(state.caseIndex>=scenarios.length){ endGame(); return;} playCase(scenarios[state.caseIndex]); }
function endGame(){ if(state.bonusAgilidade>0){ state.scores.agilidade+=state.bonusAgilidade; addSystem(`⚡ Bônus de agilidade aplicado: +${state.bonusAgilidade}`);} const avg= state.timings.length?(state.timings.reduce((a,b)=>a+b,0)/state.timings.length):0; $('#resEmpatia').textContent=state.scores.empatia; $('#resConducao').textContent=state.scores.conducao; $('#resAgilidade').textContent=state.scores.agilidade; $('#resTempoMedio').textContent=`${avg.toFixed(1)}s`; $('#medals').innerHTML=renderMedals(state.scores); const snapshot={when:new Date().toISOString(),scores:state.scores,avgTime:Number(avg.toFixed(2)),cases:scenarios.length}; localStorage.setItem('chatlab:lastScore', JSON.stringify(snapshot)); if(state.cadOk){ addSystem('✅ CadOk'); } toggleModal('#modalResult', true); }
function renderMedals(sc){ const medals=[]; const mEmp=sc.empatia>=40?'🥇':sc.empatia>=28?'🥈':sc.empatia>=16?'🥉':'🎗️'; const mCon=sc.conducao>=40?'🥇':sc.conducao>=28?'🥈':sc.conducao>=16?'🥉':'🎗️'; const mAgi=sc.agilidade>=45?'🥇':sc.agilidade>=30?'🥈':sc.agilidade>=18?'🥉':'🎗️'; medals.push(`<span class="medal" title="Empatia">${mEmp}</span>`); medals.push(`<span class="medal" title="Condução">${mCon}</span>`); medals.push(`<span class="medal" title="Agilidade">${mAgi}</span>`); const total=sc.empatia+sc.conducao+sc.agilidade; const crown= total>=120?'👑 Excelente': total>=90?'🏆 Muito bom': total>=60?'🎖️ Bom':'🎗️ Aprendizado'; medals.push(`<span class="medal badge" title="Pontuação total">${crown}</span>`); return medals.join(''); }

// Mini-game de Digitação
const typingTextPool=[
  'No atendimento de cobrança, valide a situação do cliente e conduza para uma alternativa viável.',
  'Ofereça opções claras (à vista/parcelado) e explique regras com transparência.',
  'Agilidade é importante: responda com rapidez sem perder a qualidade e o respeito.',
];
let typingState={active:false,timeLeft:30,text:'',timerId:null,typed:'',wpm:0,acc:0};
function openTypingWithText(text){ toggleModal('#modalTyping',true); $('#typingText').textContent=text||''; $('#typingInput').value=''; $('#typingInput').disabled=true; $('#typingBar').style.width='100%'; $('#typingTime').textContent='30s'; $('#typingWPM').textContent='0'; $('#typingACC').textContent='0%'; window.__seedTypingText=text||''; const btnSubmit=document.querySelector('#btnTypingSubmit'); if(btnSubmit) btnSubmit.disabled=true; }
function startTypingChallenge(seedText){ if(typingState.active) return; typingState.active=true; const btnSubmit=document.querySelector('#btnTypingSubmit'); if(btnSubmit) btnSubmit.disabled=true; typingState.timeLeft=30; typingState.text= seedText && seedText.trim()? seedText: typingTextPool[Math.floor(Math.random()*typingTextPool.length)]; typingState.typed=''; $('#typingText').textContent=typingState.text; $('#typingInput').value=''; $('#typingInput').disabled=false; $('#typingInput').focus(); $('#typingBar').style.width='100%'; $('#typingTime').textContent='30s'; $('#typingWPM').textContent='0'; $('#typingACC').textContent='0%'; clearInterval(typingState.timerId); typingState.timerId=setInterval(()=>{ typingState.timeLeft-=1; if(typingState.timeLeft<=0){ typingState.timeLeft=0; clearInterval(typingState.timerId); finishTypingChallenge(); } $('#typingBar').style.width=`${(typingState.timeLeft/30)*100}%`; $('#typingTime').textContent=`${typingState.timeLeft}s`; },1000); $('#typingInput').addEventListener('input', onTypingInput); }
function onTypingInput(e){ typingState.typed=e.target.value; const chars=typingState.typed.length; const minutes=(30-typingState.timeLeft)/60; const wpm=minutes>0? Math.round((chars/5)/minutes):0; const acc=accuracy(typingState.typed,typingState.text); typingState.wpm=wpm; typingState.acc=acc; $('#typingWPM').textContent=String(wpm); $('#typingACC').textContent=`${acc}%`; const btnSubmit=document.querySelector('#btnTypingSubmit'); if(btnSubmit){ btnSubmit.disabled = _norm(typingState.typed) !== _norm(typingState.text); } }
function accuracy(a,b){ const len=Math.max(a.length,b.length); if(len===0) return 100; let correct=0; for(let i=0;i<Math.min(a.length,b.length);i++){ if(a[i]===b[i]) correct++; } const acc=Math.round((correct/len)*100); return Math.max(0,Math.min(100,acc)); }
function finishTypingChallenge(){ const btnSubmit=document.querySelector('#btnTypingSubmit'); if(btnSubmit) btnSubmit.disabled=false; $('#typingInput').disabled=true; typingState.active=false; const w=typingState.wpm; const acc=typingState.acc; const bonus=Math.min(20, Math.round((w*(acc/100))/2)); localStorage.setItem('typingBonus', String(bonus)); $('#typingWPM').textContent=String(w); $('#typingACC').textContent=`${acc}%`; const msg= bonus>0? `⚡ Desafio concluído! Bônus de agilidade: +${bonus} pts (aplicado ao final da missão).`: `Desafio concluído! Sem bônus desta vez.`; addSystem(msg); }
function onTypingSubmit(){ if(typingState.active){ clearInterval(typingState.timerId); finishTypingChallenge(); } addSystem('✅ Resposta enviada. O bônus de agilidade será considerado no resultado final.'); toggleModal('#modalTyping', false); }
setTimeout(()=>{ document.body.classList.add('ready'); },400);
