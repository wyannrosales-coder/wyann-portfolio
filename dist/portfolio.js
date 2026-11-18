(() => {
 const panel=document.querySelector('#portfolio'), gallery=panel.querySelector('.work-gallery'), study=panel.querySelector('.case-study');
 const tiles=panel.querySelector('.work-tiles'), preview=panel.querySelector('.work-preview'), photo=panel.querySelector('#work-image');
 let projects=[], active=0, serial=0, ready, entering=false;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 function render(i){
  active=i;const p=projects[i];photo.src=p.cover;photo.alt=p.name+' — '+p.subtitle;
  panel.querySelector('#work-title').textContent=p.name;
  panel.querySelector('#work-subtitle').textContent=p.subtitle;
  panel.querySelector('#work-count').textContent=String(i+1).padStart(2,'0')+' / 05 · '+p.scope;
  [...tiles.children].forEach((t,j)=>{t.setAttribute('aria-pressed',String(i===j));});
 }
 async function select(i){
  if(i===active)return;const ticket=++serial;
  const img=new Image();img.src=projects[i].cover;try{await img.decode();}catch{}
  if(ticket!==serial)return;
  preview.getAnimations().forEach(a=>a.cancel());
  if(!reduced())await preview.animate([{transform:'perspective(1100px) rotateY(0) scale(1)',opacity:1},{transform:'perspective(1100px) rotateY(-16deg) translateX(-12%) scale(.88)',opacity:0}],{duration:240,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
  if(ticket!==serial)return;render(i);preview.getAnimations().forEach(a=>a.cancel());
  if(!reduced())preview.animate([{transform:'perspective(1100px) rotateY(16deg) translateX(14%) scale(.88)',opacity:0},{transform:'perspective(1100px) rotateY(0) translateX(0) scale(1)',opacity:1}],{duration:540,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 ready=fetch('projects.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
  projects=data;
  projects.forEach((p,i)=>{const b=el('button',null,'work-tile');b.type='button';b.setAttribute('aria-label','Show '+p.name);const img=el('img');img.src=p.cover;img.alt='';const label=el('span',String(i+1).padStart(2,'0')+' / '+p.name);b.append(img,label);b.onclick=()=>select(i);tiles.append(b);});render(0);
 }).catch(()=>{panel.querySelector('.work-error').hidden=false;});
 window.openPortfolio=async()=>{
  if(entering || screen.classList.contains('in-portfolio'))return;
  entering=true;
  if(showingAbout)changeSection(false);
  if(!reduced()){const exits=[picture,thoughts,copy].map(n=>n.animate([{transform:'perspective(1100px) rotateX(0) scale(1)',opacity:1},{transform:'perspective(1100px) rotateX(12deg) translateY(-18%) scale(.86)',opacity:0}],{duration:320,easing:'ease-in'}));await Promise.all(exits.map(a=>a.finished.catch(()=>{})));}
  entering=false;
  panel.hidden=false;panel.inert=false;screen.classList.add('in-portfolio');copy.inert=true;thoughts.inert=true;document.querySelector('.home-back').hidden=false;
  if(!reduced())gallery.animate([{transform:'perspective(1100px) rotateX(-12deg) translateY(22%) scale(.88)',opacity:0},{transform:'none',opacity:1}],{duration:750,easing:'cubic-bezier(.16,1,.3,1)'});
  await ready;panel.querySelector('#view-project').focus({preventScroll:true});
 };
 function closeStudy(){study.hidden=true;gallery.hidden=false;panel.scrollTop=0;panel.querySelector('#view-project').focus({preventScroll:true});}
 function home(){if(!screen.classList.contains('in-portfolio'))return;serial++;preview.getAnimations().forEach(a=>a.cancel());screen.classList.remove('in-portfolio');panel.hidden=true;panel.inert=true;copy.inert=false;thoughts.inert=false;document.querySelector('.home-back').hidden=true;closeStudy();document.querySelector('#open-portfolio').focus({preventScroll:true});}
 document.querySelector('.home-back').addEventListener('click',home);
 function openStudy(){
  if(!projects.length)return;const p=projects[active],content=panel.querySelector('#case-content');content.replaceChildren();
  content.append(el('p',p.role,'eyebrow'),el('h2',p.name),el('p',p.subtitle,'case-deck'));
  const hero=el('img');hero.src=p.cover;hero.alt=p.name+' project overview';hero.className='case-hero';content.append(hero);
  const copyBlock=el('div',null,'case-copy');
  p.content.forEach(([tag,text])=>{if(text===p.name)return;copyBlock.append(el(tag==='p'?'p':'h3',text));});content.append(copyBlock);
  const images=el('div',null,'case-images');p.images.forEach((url,i)=>{const im=el('img');im.src=url;im.alt=p.name+' design detail '+(i+1);im.loading='lazy';images.append(im);});content.append(images);
  const source=el('a','Original case study ↗');source.href=p.source;source.target='_blank';source.rel='noopener';content.append(source);
  gallery.hidden=true;study.hidden=false;panel.scrollTop=0;study.focus({preventScroll:true});
  if(!reduced())study.animate([{opacity:0,transform:'translateY(35px)'},{opacity:1,transform:'none'}],{duration:450,easing:'ease-out'});
 }
 preview.onclick=openStudy;panel.querySelector('#view-project').onclick=openStudy;
 panel.querySelectorAll('.close-case').forEach(b=>b.onclick=closeStudy);
 document.addEventListener('keydown',e=>{if(!screen.classList.contains('in-portfolio')||dialog.open)return;if(e.key==='Escape'){study.hidden?home():closeStudy();}if(study.hidden&&projects.length&&!e.target.closest('select,details')){if(e.key==='ArrowRight'){e.preventDefault();select((active+1)%projects.length);}if(e.key==='ArrowLeft'){e.preventDefault();select((active+projects.length-1)%projects.length);}}});
 let start;preview.addEventListener('touchstart',e=>{start=e.changedTouches[0];},{passive:true});
 preview.addEventListener('touchend',e=>{if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.clientX;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(t.clientY-start.clientY)){e.preventDefault();select((active+(dx<0?1:projects.length-1))%projects.length);}start=null;},{passive:false});
 let timer;function scheduleFritz(){clearTimeout(timer);screen.classList.remove('tracking-fritz');if(reduced()||document.hidden)return;timer=setTimeout(()=>{screen.style.setProperty('--tracking-y',(15+Math.random()*65)+'%');screen.classList.add('tracking-fritz');timer=setTimeout(scheduleFritz,220+Math.random()*230);},5000+Math.random()*12000);}
 motion.addEventListener('change',scheduleFritz);document.addEventListener('visibilitychange',scheduleFritz);scheduleFritz();
})();
