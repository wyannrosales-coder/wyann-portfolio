(() => {
 const panel=document.querySelector('#portfolio'), gallery=panel.querySelector('.work-gallery'), study=panel.querySelector('.case-study');
 const tiles=panel.querySelector('.work-tiles'), preview=panel.querySelector('.work-preview'), photo=panel.querySelector('#work-image');
 let projects=[], active=0, serial=0, ready, entering=false;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 function render(i){
  active=i;const p=projects[i];photo.src=p.cover;photo.alt=p.name+' — '+p.subtitle;
  panel.querySelector('#work-title').textContent=p.name;
  panel.querySelector('#work-subtitle').textContent=p.subtitle+' '+p.scope;
  panel.querySelector('#work-role').textContent=p.role;
  panel.querySelector('#work-count').textContent=String(i+1).padStart(2,'0')+' / 05 · '+p.scope;
  [...tiles.children].forEach((t,j)=>{t.setAttribute('aria-pressed',String(i===j));});
 }
 async function select(i){
  if(i===active)return;const ticket=++serial;
  const img=new Image();img.src=projects[i].cover;try{await img.decode();}catch{}
  if(ticket!==serial)return;
  preview.getAnimations().forEach(a=>a.cancel());
  gallery.querySelectorAll('.departing-project').forEach(n=>n.remove());
  const old=preview.cloneNode(true);old.className+=' departing-project';old.removeAttribute('aria-label');old.setAttribute('aria-hidden','true');old.inert=true;old.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  preview.parentElement.append(old);render(i);
  if(reduced()){old.remove();return;}
  const timing={duration:1100,easing:'cubic-bezier(.65,0,.25,1)',fill:'both'};
  const out=old.animate([{transform:'perspective(1200px) translateY(0) rotateX(0deg) scale(1)'},{transform:'perspective(1200px) translateY(-105%) rotateX(60deg) scale(.78)'}],timing);
  const incoming=preview.animate([{transform:'perspective(1200px) translateY(105%) rotateX(-60deg) scale(.78)'},{transform:'perspective(1200px) translateY(0) rotateX(0deg) scale(1)'}],timing);
  await Promise.all([out.finished.catch(()=>{}),incoming.finished.catch(()=>{})]);old.remove();if(ticket===serial)incoming.cancel();
 }
 ready=fetch('projects.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
  projects=data;
  projects.forEach((p,i)=>{const b=el('button',null,'work-tile');b.type='button';b.setAttribute('aria-label','Show '+p.name);const img=el('img');img.src=p.cover;img.alt='';const label=el('span',String(i+1).padStart(2,'0')+' / '+p.name);b.append(label);b.onclick=()=>select(i);tiles.append(b);});render(0);
 }).catch(()=>{panel.querySelector('.work-error').hidden=false;});
 window.openPortfolio=async()=>{
  if(entering || screen.classList.contains('in-portfolio'))return;
  entering=true;await ready;
  if(showingAbout)changeSection(false);
  let viewport, homeSheet;
  if(!reduced()){
   const bounds=screen.getBoundingClientRect();viewport=el('div',null,'transition-viewport');viewport.style.cssText=`left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px`;
   homeSheet=screen.cloneNode(true);homeSheet.classList.add('home-sheet');homeSheet.inert=true;homeSheet.setAttribute('aria-hidden','true');
   homeSheet.querySelectorAll('#portfolio,header,.home-back,.section-switch,.tracking-ripple').forEach(n=>n.remove());
   homeSheet.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
   viewport.append(homeSheet);document.body.append(viewport);
  }
  panel.hidden=false;panel.inert=false;screen.classList.add('in-portfolio');copy.inert=true;thoughts.inert=true;document.querySelector('.home-back').hidden=false;
  if(viewport){
   const duration=1400,easing='cubic-bezier(.55,.05,.2,1)';
   const leave=homeSheet.animate([
    {transform:'perspective(1200px) translate3d(0,0,0) rotateX(0) rotateZ(0) scale(1)'},
    {transform:'perspective(1200px) translate3d(-8%,-48%,-160px) rotateX(38deg) rotateZ(-7deg) scale(.83)',offset:.55},
    {transform:'perspective(1200px) translate3d(-15%,-125%,-250px) rotateX(60deg) rotateZ(-10deg) scale(.7)'}
   ],{duration,easing,fill:'forwards'});
   const arrive=preview.animate([
    {transform:'perspective(1200px) translate3d(12%,145%,-200px) rotateX(-42deg) rotateZ(9deg) scale(.8)'},
    {transform:'perspective(1200px) translate3d(0,0,0) rotateX(0) rotateZ(0) scale(1)'}
   ],{duration:1500,easing,fill:'both'});
   tiles.animate([{opacity:0,transform:'translateY(25px)'},{opacity:1,transform:'none'}],{duration:600,delay:650,fill:'backwards'});
   await Promise.all([leave.finished.catch(()=>{}),arrive.finished.catch(()=>{})]);viewport.remove();arrive.cancel();
  }
  entering=false;panel.querySelector('#view-project').focus({preventScroll:true});
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
 const noise=screen.querySelector('.tracking-ripple'), ctx=noise.getContext('2d');
 let timer,noiseFrame;
 function staticBurst(){
  const w=noise.width=Math.round(screen.clientWidth),h=noise.height=Math.round(screen.clientHeight);
  const started=performance.now(),duration=240+Math.random()*320,center=h*(.2+Math.random()*.6),thickness=20+Math.random()*55;
  screen.classList.add('tracking-fritz');
  function draw(now){
   ctx.clearRect(0,0,w,h);
   const y=center+(now-started)*-.14;
   for(let i=0;i<650;i++){
    const yy=y+(Math.random()-.5)*thickness,xx=Math.random()*w;
    ctx.fillStyle=Math.random()>.25?`rgba(224,243,255,${.15+Math.random()*.65})`:`rgba(25,15,45,${Math.random()*.6})`;
    ctx.fillRect(xx,yy,2+Math.random()*34,Math.random()>.8?2:1);
   }
   for(let i=0;i<22;i++){ctx.fillStyle='rgba(230,244,255,.35)';ctx.fillRect(Math.random()*w,Math.random()*h,6+Math.random()*50,1);}
   if(now-started<duration&&!reduced()&&!document.hidden)noiseFrame=requestAnimationFrame(draw);
   else {ctx.clearRect(0,0,w,h);screen.classList.remove('tracking-fritz');scheduleFritz();}
  }
  noiseFrame=requestAnimationFrame(draw);
 }
 function scheduleFritz(){clearTimeout(timer);cancelAnimationFrame(noiseFrame);screen.classList.remove('tracking-fritz');ctx.clearRect(0,0,noise.width,noise.height);if(reduced()||document.hidden)return;timer=setTimeout(staticBurst,4500+Math.random()*11500);}
 motion.addEventListener('change',scheduleFritz);document.addEventListener('visibilitychange',scheduleFritz);scheduleFritz();
})();
