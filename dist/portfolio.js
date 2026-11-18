(() => {
 const panel=document.querySelector('#portfolio'), gallery=panel.querySelector('.work-gallery'), study=panel.querySelector('.case-study');
 const caseShell=document.createElement('section');caseShell.className='case-shell';caseShell.hidden=true;caseShell.setAttribute('role','dialog');caseShell.setAttribute('aria-modal','true');caseShell.setAttribute('aria-label','Project case study');
 const stars=document.createElement('div');stars.className='case-stars';stars.setAttribute('aria-hidden','true');
 for(let i=0;i<52;i++){const star=document.createElement('i');star.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;--duration:${3+Math.random()*6}s;--delay:${-Math.random()*9}s`;stars.append(star);}
 const caseNav=document.createElement('nav');caseNav.className='case-nav';caseNav.innerHTML='<button class="pill close-case">← All projects</button><span>WYANN ROSALES / SELECTED WORK</span><button class="pill case-home">Home ↗</button>';
 study.querySelectorAll('.close-case').forEach(n=>n.remove());caseShell.append(stars,caseNav,study);document.body.append(caseShell);
 const tiles=panel.querySelector('.work-tiles'), preview=panel.querySelector('.work-preview'), photo=panel.querySelector('#work-image');
 let projects=[], active=0, serial=0, ready, entering=false, switching=false;
 const nextPeek=document.createElement('button');nextPeek.className='work-preview next-project';nextPeek.type='button';nextPeek.innerHTML='<div class="project-panorama"><img alt=""></div>';preview.parentElement.append(nextPeek);
 const rest='perspective(1200px) translate3d(0,0,0) rotateX(0) rotateZ(0) scale(1)';
 const below='perspective(1200px) translate3d(12%,108%,-200px) rotateX(-42deg) rotateZ(9deg) scale(.8)';
 const departure=[{transform:rest},{transform:'perspective(1200px) translate3d(-8%,-48%,-160px) rotateX(38deg) rotateZ(-7deg) scale(.83)',offset:.55},{transform:'perspective(1200px) translate3d(-15%,-125%,-250px) rotateX(60deg) rotateZ(-10deg) scale(.7)'}];
 const arrival=[{transform:below},{transform:rest}];
 const transitionTiming={duration:1500,easing:'cubic-bezier(.55,.05,.2,1)',fill:'both'};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 function render(i){
  active=i;const p=projects[i];photo.src=p.cover;photo.alt=p.name+' — '+p.subtitle;
  panel.querySelector('#work-title').textContent=p.name;
  panel.querySelector('#work-subtitle').textContent=p.subtitle+' '+p.scope;
  panel.querySelector('#work-role').textContent=p.role;
  panel.querySelector('#work-count').textContent=String(i+1).padStart(2,'0')+' / 05 · '+p.scope;
  const next=projects[(i+1)%projects.length];nextPeek.querySelector('img').src=next.cover;nextPeek.setAttribute('aria-label','Next project: '+next.name);
  [...tiles.children].forEach((t,j)=>{t.setAttribute('aria-pressed',String(i===j));});
 }
 async function select(i,direction=i<active?-1:1){
  if(i===active||switching||entering||!projects.length)return;switching=true;const ticket=++serial;
  const img=new Image();img.src=projects[i].cover;try{await img.decode();}catch{}
  if(ticket!==serial)return;
  preview.getAnimations().forEach(a=>a.cancel());
  gallery.querySelectorAll('.departing-project').forEach(n=>n.remove());
  const old=preview.cloneNode(true);old.className+=' departing-project';old.removeAttribute('aria-label');old.setAttribute('aria-hidden','true');old.inert=true;old.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  preview.parentElement.append(old);render(i);
  if(reduced()){old.remove();switching=false;return;}
  const reverse=direction<0;
  const out=old.animate(reverse?[...arrival].reverse():departure,transitionTiming);
  const incoming=preview.animate(reverse?departure.map(k=>({...k,offset:k.offset===undefined?undefined:1-k.offset})).reverse():arrival,transitionTiming);
  nextPeek.getAnimations().forEach(a=>a.cancel());
  if(!reverse)nextPeek.animate([{transform:'perspective(1200px) translate3d(24%,190%,-300px) rotateX(-48deg) rotateZ(14deg) scale(.7)'},{transform:below}],{...transitionTiming,fill:'none'});
  await Promise.all([out.finished.catch(()=>{}),incoming.finished.catch(()=>{})]);old.remove();if(ticket===serial)incoming.cancel();switching=false;nextPeek.classList.remove('waiting');

 }
 ready=fetch('projects.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(async data=>{
  projects=data;
  await Promise.all(projects.map(async p=>{const image=new Image();image.src=p.cover;try{await image.decode();}catch{}p.preloadedCover=image;}));
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
   homeSheet.querySelectorAll('#about,#portfolio,header,.home-back,.section-switch,.tracking-ripple').forEach(n=>n.remove());
   homeSheet.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
   viewport.append(homeSheet);document.body.append(viewport);
  }
  panel.hidden=false;panel.inert=false;screen.classList.add('in-portfolio');copy.inert=true;thoughts.inert=true;document.querySelector('.home-back').hidden=false;
  if(viewport){
   const leave=homeSheet.animate(departure,transitionTiming);
   const arrive=preview.animate(arrival,transitionTiming);
   tiles.animate([{opacity:0,transform:'translateY(25px)'},{opacity:1,transform:'none'}],{duration:600,delay:650,fill:'backwards'});
   await Promise.all([leave.finished.catch(()=>{}),arrive.finished.catch(()=>{})]);viewport.remove();arrive.cancel();
  }
  entering=false;panel.querySelector('#view-project').focus({preventScroll:true});
 };
 function closeStudy(){caseShell.hidden=true;study.hidden=true;document.querySelector('.set').inert=false;document.body.classList.remove('reading-project');gallery.hidden=false;panel.scrollTop=0;clearTimeout(crawlTimer);study.classList.remove('crawling');panel.querySelector('#view-project').focus({preventScroll:true});}
 async function home(){
  if(!screen.classList.contains('in-portfolio')||entering)return;
  if(!caseShell.hidden)closeStudy();
  entering=true;serial++;switching=false;
  gallery.querySelectorAll('.departing-project').forEach(n=>n.remove());preview.getAnimations().forEach(a=>a.cancel());
  let viewport,sheet;
  if(!reduced()){
   const bounds=screen.getBoundingClientRect();viewport=el('div',null,'transition-viewport');viewport.style.cssText=`left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px`;
   sheet=screen.cloneNode(true);sheet.classList.remove('in-portfolio','in-about','posing');sheet.classList.add('home-sheet');sheet.inert=true;sheet.setAttribute('aria-hidden','true');
   sheet.querySelectorAll('#about,#portfolio,header,.home-back,.section-switch,.tracking-ripple').forEach(n=>n.remove());sheet.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));viewport.append(sheet);document.body.append(viewport);
   const reverse=departure.map(k=>({...k,offset:k.offset===undefined?undefined:1-k.offset})).reverse();
   const returnHome=sheet.animate(reverse,transitionTiming),leave=preview.animate([...arrival].reverse(),transitionTiming);
   await Promise.all([returnHome.finished.catch(()=>{}),leave.finished.catch(()=>{})]);leave.cancel();
  }
  screen.classList.remove('in-portfolio');panel.hidden=true;panel.inert=true;copy.inert=false;thoughts.inert=false;document.querySelector('.home-back').hidden=true;viewport?.remove();entering=false;document.querySelector('#open-portfolio').focus({preventScroll:true});
 }
 document.querySelector('.home-back').addEventListener('click',home);
 function openStudy(){
  if(!projects.length||switching||entering)return;const p=projects[active],content=study.querySelector('#case-content');content.replaceChildren();
  const heading=el('div',null,'case-intro');heading.append(el('p','CASE STUDY / '+String(active+1).padStart(2,'0'),'eyebrow'),el('h2',p.name),el('p',p.subtitle,'case-deck'));
  const meta=el('div',null,'case-meta');for(const [label,value] of [['MY ROLE',p.role],['THE WORK',p.scope]]){const cell=el('div');cell.append(el('small',label),el('p',value));meta.append(cell);}heading.append(meta);content.append(heading);
  const hero=el('img');hero.src=p.cover;hero.alt=p.name+' project overview';hero.className='case-hero';content.append(hero);
  let section=el('section',null,'case-chapter'),prose=el('div',null,'chapter-copy'),chapter=0,imageIndex=0;
  function flush(){if(!prose.childNodes.length)return;section.append(prose);const visuals=el('div',null,'chapter-images');for(let k=0;k<2&&imageIndex<p.images.length;k++){const im=el('img');im.src=p.images[imageIndex++];im.alt=p.name+' design detail '+imageIndex;im.loading='lazy';visuals.append(im);}section.append(visuals);content.append(section);section=el('section',null,'case-chapter');prose=el('div',null,'chapter-copy');}
  for(const [tag,raw] of p.content){
   let text=raw.replace(/\[([\d.]+)\]/g,'$1').trim();if(text===p.name)continue;
   const headingLike=tag!=='p'||(text.length<60&&text.endsWith(':'));
   if(headingLike){if(prose.querySelector('p,ul'))flush();if(!prose.children.length){chapter++;prose.append(el('small',String(chapter).padStart(2,'0'),'chapter-number'));}prose.append(el('h3',text.replace(/:$/,'')));continue;}
   if(/^(?:[-•]|\d+\.)\s/.test(text)){let list=prose.lastElementChild;if(!list||list.tagName!=='UL'){list=el('ul');prose.append(list);}list.append(el('li',text.replace(/^(?:[-•]|\d+\.)\s*/,'')));continue;}
   const paragraph=el('p');const colon=text.indexOf(':');if(colon>0&&colon<65){paragraph.append(el('strong',text.slice(0,colon+1)),document.createTextNode(' '+text.slice(colon+1).trim()));}else paragraph.textContent=text;prose.append(paragraph);
  }
  flush();
  let firstGallery=true;
  while(imageIndex<p.images.length){const more=el('section',null,'case-gallery');if(firstGallery){more.append(el('h3','A closer look'));firstGallery=false;}const images=el('div',null,'chapter-images');for(let i=0;i<2&&imageIndex<p.images.length;i++){const im=el('img');im.src=p.images[imageIndex++];im.alt=p.name+' interface detail '+imageIndex;im.loading='lazy';images.append(im);}more.append(images);content.append(more);}
  const footer=el('footer',null,'case-end');footer.append(el('p','Thanks for taking a closer look.'));const source=el('a','Original case study ↗');source.href=p.source;source.target='_blank';source.rel='noopener';const back=el('button','← Back to selected work','pill');back.onclick=closeStudy;footer.append(source,back);content.append(footer);
  gallery.hidden=true;caseShell.hidden=false;study.hidden=false;study.scrollTop=0;document.querySelector('.set').inert=true;document.body.classList.add('reading-project');study.focus({preventScroll:true});
  if(!reduced())content.animate([{opacity:0,translate:'0 24px'},{opacity:1,translate:'0 0'}],{duration:500,easing:'ease-out'});
 }
 let crawlTimer,crawlFrame;
 function crawl(){
  if(reduced()||study.hidden)return;
  study.classList.add('crawling');const origin=study.scrollTop+study.clientHeight*.82;
  for(const child of study.querySelector('#case-content').children){const y=child.offsetTop;const visible=y+child.offsetHeight>study.scrollTop-study.clientHeight&&y<study.scrollTop+study.clientHeight*2;child.style.setProperty('--crawl-origin',(origin-y)+'px');child.classList.toggle('crawl-active',visible);}
  clearTimeout(crawlTimer);crawlTimer=setTimeout(()=>study.classList.remove('crawling'),180);
 }
 study.addEventListener('scroll',()=>{cancelAnimationFrame(crawlFrame);crawlFrame=requestAnimationFrame(crawl);},{passive:true});
 motion.addEventListener('change',()=>{clearTimeout(crawlTimer);study.classList.remove('crawling');});
 caseNav.querySelector('.close-case').onclick=closeStudy;caseNav.querySelector('.case-home').onclick=home;
 caseShell.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const items=[...caseShell.querySelectorAll('button,a[href],[tabindex="0"]')].filter(n=>!n.disabled);const first=items[0],last=items.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===study)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 preview.onclick=openStudy;panel.querySelector('#view-project').onclick=openStudy;
 caseShell.querySelectorAll('.close-case').forEach(b=>b.onclick=closeStudy);
 document.addEventListener('keydown',e=>{if(!screen.classList.contains('in-portfolio')||dialog.open)return;if(e.key==='Escape'){study.hidden?home():closeStudy();}if(study.hidden&&projects.length&&!e.target.closest('select,details')){if(e.key==='ArrowRight'){e.preventDefault();select((active+1)%projects.length);}if(e.key==='ArrowLeft'){e.preventDefault();select((active+projects.length-1)%projects.length,-1);}}});
 nextPeek.onclick=()=>select((active+1)%projects.length);
 let lastWheel=0,wheelAmount=0,wheelConsumed=false;
 screen.addEventListener('wheel',event=>{
  if(!screen.classList.contains('in-portfolio')||!study.hidden||event.ctrlKey||event.target.closest('select,details,dialog,.work-tiles'))return;
  event.preventDefault();const now=performance.now(),gap=now-lastWheel;lastWheel=now;
  if(gap>=180){wheelAmount=0;wheelConsumed=false;}
  if(entering||switching){wheelConsumed=true;return;}
  if(wheelConsumed)return;
  wheelAmount+=(event.deltaMode===1?16:1)*event.deltaY;
  if(Math.abs(wheelAmount)>45){const direction=wheelAmount>0?1:-1;wheelConsumed=true;select((active+direction+projects.length)%projects.length,direction);}
 },{passive:false});
 let start;
 gallery.addEventListener('touchstart',e=>{start=e.target.closest('.work-tiles')?null:e.changedTouches[0];},{passive:true});
 gallery.addEventListener('touchmove',e=>{if(start&&Math.abs(e.touches[0].clientY-start.clientY)>12)e.preventDefault();},{passive:false});
 gallery.addEventListener('touchend',e=>{if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.clientX,dy=t.clientY-start.clientY;const delta=Math.abs(dy)>Math.abs(dx)?dy:dx;if(Math.abs(delta)>45){e.preventDefault();select((active+(delta<0?1:projects.length-1))%projects.length,delta<0?1:-1);}start=null;},{passive:false});
 let parallaxFrame=0,px=0,py=0,tx=0,ty=0;
 function parallax(){px+=(tx-px)*.09;py+=(ty-py)*.09;gallery.style.setProperty('--drift-x',px+'px');gallery.style.setProperty('--drift-y',py+'px');gallery.style.setProperty('--tilt-x',(-py*.18)+'deg');gallery.style.setProperty('--tilt-y',(px*.15)+'deg');parallaxFrame=Math.abs(tx-px)+Math.abs(ty-py)>.05?requestAnimationFrame(parallax):0;}
 function drift(x,y){tx=x;ty=y;if(!parallaxFrame)parallaxFrame=requestAnimationFrame(parallax);}
 screen.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||reduced()||!screen.classList.contains('in-portfolio')||!study.hidden)return;const b=screen.getBoundingClientRect();drift(((e.clientX-b.left)/b.width-.5)*18,((e.clientY-b.top)/b.height-.5)*12);});
 screen.addEventListener('pointerleave',()=>drift(0,0));motion.addEventListener('change',()=>drift(0,0));
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
