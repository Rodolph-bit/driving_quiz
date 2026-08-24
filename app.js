(() => {
  const rules = [
    ['إشارات السير والصور', q => q.image],
    ['الإضاءة والقيادة الليلية', q => /ضوء|اضواء|أضواء|إضاءة|الليل|ليلاً|نهاراً|نفق/.test(q.question)],
    ['السائق والتركيز والسلامة', q => /نعاس|إرهاق|كحول|دواء|أدوية|هاتف|تركيز|حزام|مسند|مقعد|مرايا|صحيفة|راديو/.test(q.question)],
    ['المركبة والفحص والصيانة', q => /مركبة|محرك|وقود|إطار|اطار|زيت|فرامل|مكابح|حمولة|ميكانيك|صيانة/.test(q.question)],
    ['التقاطعات والإشارات الضوئية', q => /تقاطع|اشارة|إشارة|شرطي|أحمر|اخضر|أخضر|أصفر/.test(q.question)],
    ['السرعة ومسافة الأمان', q => /سرعة|مسافة|توقف|كبح|فرملة/.test(q.question)],
    ['التجاوز وتغيير الاتجاه', q => /تجاوز|انعطاف|إنعطاف|مسرب|طريق|يمين|يسار/.test(q.question)],
    ['المشاة ومستخدمي الطريق', q => /مشاة|طفل|أطفال|دراج|دراجة|باص|شاحنة/.test(q.question)],
    ['قواعد القيادة العامة', () => true]
  ];

  const tagged = window.QUESTIONS.map((q, original) => {
    const section = rules.findIndex(([, match]) => match(q));
    return {...q, original, section, sectionName: rules[section][0]};
  });
  // Topic order first; original order is preserved inside each topic so variants stay together.
  const allQuestions = tagged.sort((a,b) => a.section-b.section || a.original-b.original);
  const STORAGE_KEY = 'drivingQuizProgressV3';
  let questions = [...allQuestions], index = 0, selected = [], answered = false, reviewMode = false;
  let answerStates = {};

  const $ = id => document.getElementById(id);
  const els = {quiz:$('quizView'),results:$('resultView'),counter:$('counter'),section:$('sectionName'),correctCount:$('correctCount'),incorrectCount:$('incorrectCount'),bar:$('progressBar'),text:$('questionText'),choices:$('choices'),feedback:$('feedback'),confirm:$('confirmBtn'),next:$('nextBtn'),imageWrap:$('imageWrap'),image:$('signImage'),score:$('resultScore'),picker:$('questionPicker'),grid:$('questionGrid'),saved:$('savedStatus')};

  const questionKey = q => String(q.original);
  const correctAnswers = q => q.correctIndices || [q.correctIndex];
  const allStates = () => Object.values(answerStates);
  const score = () => allStates().filter(state => state.correct).length;
  const incorrect = () => allStates().filter(state => !state.correct).length;

  function saveProgress(){
    if(reviewMode)return;
    localStorage.setItem(STORAGE_KEY,JSON.stringify({index,answerStates}));
    els.saved.textContent='تم حفظ التقدّم';
  }

  function loadProgress(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(!saved)return;
      answerStates=saved.answerStates||{};
      index=Math.min(Math.max(Number(saved.index)||0,0),allQuestions.length-1);
    }catch(_){ localStorage.removeItem(STORAGE_KEY); }
  }

  function updateScoreboard(){
    els.correctCount.textContent=score();
    els.incorrectCount.textContent=incorrect();
  }

  function render(){
    const q=questions[index], state=answerStates[questionKey(q)];
    selected=state ? [...state.selected] : []; answered=Boolean(state);
    els.counter.textContent=`السؤال ${index+1} من ${questions.length}`;
    updateScoreboard();
    els.section.textContent=q.sectionName;
    els.bar.style.width=`${((index+1)/questions.length)*100}%`;
    els.bar.parentElement.setAttribute('aria-valuenow',index+1);
    els.bar.parentElement.setAttribute('aria-valuemax',questions.length);
    const required=correctAnswers(q);
    els.text.textContent=(q.question || 'ما معنى إشارة السير التالية؟')+(required.length>1?` (اختر ${required.length} إجابتين)`:``);
    if(q.image){els.image.src=q.image;els.imageWrap.hidden=false}else{els.image.removeAttribute('src');els.imageWrap.hidden=true}
    els.choices.innerHTML=''; els.feedback.textContent=''; els.feedback.className='feedback'; els.confirm.disabled=true; els.next.disabled=true;
    q.choices.forEach((choice,i)=>{
      const btn=document.createElement('button'); btn.className='choice'; btn.type='button'; btn.setAttribute('role',required.length>1?'checkbox':'radio'); btn.setAttribute('aria-checked','false'); btn.textContent=choice;
      btn.addEventListener('click',()=>select(i)); els.choices.appendChild(btn);
    });
    if(state){
      [...els.choices.children].forEach((btn,i)=>{btn.disabled=true;btn.setAttribute('aria-checked',state.selected.includes(i));if(required.includes(i))btn.classList.add('correct');if(state.selected.includes(i)&&!required.includes(i))btn.classList.add('wrong')});
      els.feedback.textContent=state.correct?'إجابة صحيحة':`الإجابة الصحيحة: ${required.map(i=>q.choices[i]).join(' + ')}`;
      els.feedback.classList.add(state.correct?'good':'bad');
      els.next.disabled=false;
    }
    saveProgress();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function select(i){if(answered)return;const required=correctAnswers(questions[index]);if(required.length>1){selected=selected.includes(i)?selected.filter(n=>n!==i):[...selected,i]}else{selected=[i]}[...els.choices.children].forEach((b,n)=>{const chosen=selected.includes(n);b.classList.toggle('selected',chosen);b.setAttribute('aria-checked',chosen)});els.confirm.disabled=!selected.length}
  function confirm(){if(!selected.length||answered)return;answered=true;const q=questions[index],required=correctAnswers(q),chosen=[...selected].sort(),expected=[...required].sort(),isCorrect=chosen.length===expected.length&&chosen.every((value,i)=>value===expected[i]),buttons=[...els.choices.children];answerStates[questionKey(q)]={selected:[...selected],correct:isCorrect};buttons.forEach((b,i)=>{b.disabled=true;if(required.includes(i))b.classList.add('correct');if(selected.includes(i)&&!required.includes(i))b.classList.add('wrong')});if(isCorrect){els.feedback.textContent='إجابة صحيحة';els.feedback.classList.add('good')}else{els.feedback.textContent=`الإجابة الصحيحة: ${required.map(i=>q.choices[i]).join(' + ')}`;els.feedback.classList.add('bad')}updateScoreboard();saveProgress();els.confirm.disabled=true;els.next.disabled=false;els.next.focus()}
  function next(){if(!answered)return;if(index<questions.length-1){index++;render()}else finish()}
  function finish(){const answeredCount=allStates().length;els.quiz.hidden=true;els.results.hidden=false;els.score.textContent=`أجبت عن ${answeredCount} سؤال — ${score()} صحيحة و${incorrect()} خاطئة`;$('reviewBtn').hidden=!incorrect();window.scrollTo(0,0)}
  function reset(list,isReview=false){questions=[...list];index=0;selected=[];answered=false;reviewMode=isReview;els.results.hidden=true;els.quiz.hidden=false;if(!isReview){answerStates={};localStorage.removeItem(STORAGE_KEY)}render()}

  function openPicker(){
    els.grid.innerHTML='';
    allQuestions.forEach((q,i)=>{
      const state=answerStates[questionKey(q)],btn=document.createElement('button');
      btn.type='button';btn.textContent=i+1;btn.className='question-number';
      if(state)btn.classList.add(state.correct?'is-correct':'is-incorrect');
      if(!reviewMode&&questions[index]===q)btn.classList.add('is-current');
      btn.setAttribute('aria-label',`السؤال ${i+1}${state?(state.correct?'، إجابة صحيحة':'، إجابة خاطئة'):'، لم تتم الإجابة'}`);
      btn.addEventListener('click',()=>{questions=[...allQuestions];reviewMode=false;index=i;els.results.hidden=true;els.quiz.hidden=false;els.picker.close();render()});
      els.grid.appendChild(btn);
    });
    els.picker.showModal();
  }
  els.confirm.addEventListener('click',confirm);els.next.addEventListener('click',next);$('restartBtn').addEventListener('click',()=>reset(allQuestions));$('reviewBtn').addEventListener('click',()=>reset(allQuestions.filter(q=>answerStates[questionKey(q)]&&!answerStates[questionKey(q)].correct),true));
  $('questionPickerBtn').addEventListener('click',openPicker);$('closePickerBtn').addEventListener('click',()=>els.picker.close());els.picker.addEventListener('click',e=>{if(e.target===els.picker)els.picker.close()});
  document.addEventListener('keydown',e=>{if(['1','2','3','4'].includes(e.key)&&!answered){const i=Number(e.key)-1;if(i<questions[index].choices.length)select(i)}else if(e.key==='Enter'){answered?next():confirm()}});
  loadProgress();render();
})();
