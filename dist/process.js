(() => {
 const steps=[
  ['Discover','Start with people, not assumptions.','Understand the people, the problem and the context before deciding what to build. Research and conversations reveal the needs that matter.','User interviews · Research synthesis · Opportunity mapping','#b4edeb'],
  ['Define','Make the right problem clear.','Turn what we learn into a focused direction. Align user needs with business goals, map the key journeys and agree on what success looks like.','Problem framing · User journeys · Success measures','#ffe684'],
  ['Design','Make ideas tangible.','Explore flows and interactions, then bring the strongest ideas into prototypes. Build a visual language and reusable patterns that make the experience feel coherent.','User flows · Prototypes · Design systems','#e6c8ff'],
  ['Validate','Learn before committing.','Put the experience in front of people. Watch where they hesitate, test the important assumptions and refine the design around evidence.','Usability testing · Iteration · Accessibility review','#ff98bc'],
  ['Deliver','Launch is a beginning.','Work closely with developers to preserve intent through implementation. After launch, use feedback and adoption data to guide the next improvements.','Developer collaboration · Design QA · Product analytics','#b5ef77']
 ];
 const modal=document.createElement('dialog');modal.className='process-room';modal.setAttribute('aria-labelledby','process-title');
 modal.innerHTML='<nav class="process-nav"><button type="button" class="pill process-back">← Home</button><span>WYANN ROSALES / MY PROCESS</span><button type="button" class="pill brain-pause" aria-pressed="false">Pause motion</button></nav><div class="process-layout"><header class="process-heading"><p class="eyebrow">FROM CURIOSITY TO CLARITY</p><h2 id="process-title">Good design starts<br>with a little thought.</h2><p>A connected process. A human perspective.</p></header><div class="brain-stage"><canvas aria-label="Animated particle brain. Each process step highlights a different region." role="img"></canvas><p class="brain-caption">01 / DISCOVER</p></div><div class="process-details"><div class="process-tabs" role="tablist" aria-label="Design process steps"></div><article role="tabpanel" id="process-step" tabindex="0"><p class="process-number"></p><h3></h3><p class="process-description"></p><p class="process-deliverables"></p></article><button type="button" class="pill process-next">Next: Define →</button></div></div>';
 document.body.append(modal);
 const canvas=modal.querySelector('canvas'),ctx=canvas.getContext('2d'),tabs=modal.querySelector('.process-tabs'),panel=modal.querySelector('article');
 let active=0,frame=0,paused=false,elapsed=0,lastTime=0,opener=null,rotation=.35;
 steps.forEach((step,i)=>{const b=document.createElement('button');b.type='button';b.id='process-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls','process-step');b.textContent=String(i+1).padStart(2,'0')+' '+step[0];b.onclick=()=>choose(i);tabs.append(b);});
 function choose(i){active=i;const s=steps[i];modal.style.setProperty('--process-accent',s[4]);[...tabs.children].forEach((b,j)=>{b.setAttribute('aria-selected',String(j===i));b.tabIndex=j===i?0:-1;});panel.setAttribute('aria-labelledby','process-tab-'+i);panel.querySelector('.process-number').textContent=String(i+1).padStart(2,'0')+' / '+s[0].toUpperCase();panel.querySelector('h3').textContent=s[1];panel.querySelector('.process-description').textContent=s[2];panel.querySelector('.process-deliverables').textContent=s[3];modal.querySelector('.brain-caption').textContent=String(i+1).padStart(2,'0')+' / '+s[0].toUpperCase();modal.querySelector('.process-next').textContent=i===4?'Back to Discover ↺':'Next: '+steps[i+1][0]+' →';if(modal.open){tabs.children[i].scrollIntoView({block:'nearest',inline:'nearest',behavior:motion.matches?'instant':'smooth'});if(paused||motion.matches)draw(performance.now());}}
 tabs.addEventListener('keydown',e=>{let next=active;if(e.key==='ArrowRight')next=(active+1)%5;else if(e.key==='ArrowLeft')next=(active+4)%5;else if(e.key==='Home')next=0;else if(e.key==='End')next=4;else return;e.preventDefault();choose(next);tabs.children[next].focus();});
 modal.querySelector('.process-next').onclick=()=>choose((active+1)%5);
 const points=[];let seed=31;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 // Two folded hemispheres, a central fissure and a small brainstem.
 for(let side of [-1,1])for(let i=0;i<1100;i++){
  const u=rand()*Math.PI*2,v=Math.acos(2*rand()-1),fold=1+.055*Math.sin(u*13+Math.sin(v*9)*2)*Math.sin(v*15);
  const x=side*(.2+Math.abs(Math.sin(v)*Math.cos(u))*.64*fold),y=Math.cos(v)*.83*fold,z=Math.sin(v)*Math.sin(u)*.67*fold;
  const region=y<-.33?0:z>.22?1:y>.3?4:x<0?2:3;
  points.push({x,y,z,region,size:.65+rand(),scatter:[(rand()-.5)*4,(rand()-.5)*3,(rand()-.5)*4],phase:rand()*6.28});
 }
 for(let i=0;i<150;i++){const t=rand(),a=rand()*6.28;points.push({x:Math.cos(a)*.11,y:.68+t*.5,z:-.12-t*.2+Math.sin(a)*.11,region:4,size:.8,scatter:[(rand()-.5)*4,(rand()-.5)*3,(rand()-.5)*4],phase:rand()*6.28});}
 function resize(){const b=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(modal.open&&(paused||motion.matches))draw(performance.now());}
 function draw(now){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  const dt=Math.min(40,now-lastTime||16);lastTime=now;if(!paused&&!motion.matches){elapsed+=dt;rotation+=dt*.000045;}
  ctx.clearRect(0,0,w,h);const scale=Math.min(w*.43,h*.39),assemble=motion.matches?1:Math.min(1,elapsed/1500),scatter=(1-assemble)**3,angle=rotation,ca=Math.cos(angle),sa=Math.sin(angle);
  const mobile=innerWidth<=760,projected=[];
  for(let i=0;i<points.length;i+=mobile?2:1){const p=points[i],breathe=motion.matches?1:1+Math.sin(elapsed*.0008+p.phase)*.008;
   const x=p.x*breathe+p.scatter[0]*scatter,y=p.y*breathe+p.scatter[1]*scatter,z=p.z+p.scatter[2]*scatter;
   const rx=x*ca+z*sa,rz=-x*sa+z*ca,depth=3.5/(3.5-rz);
   projected.push({x:w/2+rx*scale*depth,y:h*.47+y*scale*depth,z:rz,size:p.size*depth,region:p.region});
  }
  projected.sort((a,b)=>a.z-b.z);
  for(const p of projected){const lit=p.region===active;ctx.globalAlpha=(lit?.8:.22)+Math.max(0,p.z)*.2;ctx.strokeStyle=lit?steps[active][4]:'#cbd8f3';ctx.lineWidth=lit?.85:.6;const s=p.size*(lit?2:1.5);ctx.beginPath();ctx.moveTo(p.x,p.y-s);ctx.lineTo(p.x+s*.85,p.y+s*.6);ctx.lineTo(p.x-s*.85,p.y+s*.6);ctx.closePath();ctx.stroke();}
  ctx.globalAlpha=1;
 }
 function tick(now){frame=0;if(!modal.open||document.hidden)return;draw(now);if(!paused&&!motion.matches)frame=requestAnimationFrame(tick);}
 function start(){cancelAnimationFrame(frame);lastTime=performance.now();if(modal.open)frame=requestAnimationFrame(tick);}
 const pause=modal.querySelector('.brain-pause');pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-pressed',String(paused));start();};
 window.openProcess=()=>{opener=document.activeElement;elapsed=0;rotation=.35;modal.showModal();document.querySelector('.set').inert=true;choose(active);resize();start();modal.querySelector('.process-back').focus();};
 modal.querySelector('.process-back').onclick=()=>modal.close();
 modal.addEventListener('close',()=>{cancelAnimationFrame(frame);document.querySelector('.set').inert=false;opener?.focus({preventScroll:true});});
 new ResizeObserver(resize).observe(canvas);document.addEventListener('visibilitychange',start);motion.addEventListener('change',start);choose(0);
})();
