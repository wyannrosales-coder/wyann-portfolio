'use strict';
const $ = selector => document.querySelector(selector);
const canvas=$('canvas'), ctx=canvas.getContext('2d'), keys=new Set();
const levels=[
  {name:'Neon Estuary',color:'#45f7d4',sky:'#18404a',boss:'The Skimmer',waves:[3,4,3,5]},
  {name:'Ember Fault',color:'#ff9c64',sky:'#542949',boss:'Split Comet',waves:[4,5,4,6]},
  {name:'Violet Citadel',color:'#c2a0ff',sky:'#38245b',boss:'Crown Engine',waves:[5,6,5,7]}
];
let state='title',level=0,score=0,shield=6,player={x:.5,y:.82},aim={x:.5,y:.4};
let enemies=[],bolts=[],traces=[],wave=0,clock=0,nextWave=1,shotDelay=0,invulnerable=0,held=false;
let steer={x:0,y:0},width,height,last=0,travel=0,bank=0,scores=[];
try { scores=JSON.parse(localStorage.getItem('vector-run-scores')||'[]').filter(row=>/^[A-Z]{3}$/.test(row.name)&&Number.isFinite(row.score)); } catch {}
function leaderboard(){
 const board=$('#board');board.replaceChildren();const label=document.createElement('small');label.textContent='HIGH SCORES · THIS DEVICE';board.append(label);
 const list=document.createElement('ol');for(const row of scores.slice(0,5)){const item=document.createElement('li');item.textContent=row.name+'   '+row.score.toString().padStart(6,'0');list.append(item);}board.append(list);
}
function overlay(title,brief,action,handler){
 $('section').hidden=false;$('h1').textContent=title;$('#brief').textContent=brief;$('#launch').textContent=action;$('#launch').onclick=handler;
 document.body.classList.remove('play');$('#pause').hidden=true;held=false;keys.clear();steer={x:0,y:0};
}
function resume(){state='flight';$('section').hidden=true;$('#pause').hidden=false;document.body.classList.add('play');last=performance.now();}
function startLevel(){wave=0;clock=0;nextWave=.6;enemies=[];bolts=[];traces=[];player={x:.5,y:.82};shield=Math.min(6,shield+2);invulnerable=1;resume();}
function restart(){level=0;score=0;shield=6;$('form').hidden=true;startLevel();}
function end(won){
 state='end';overlay(won?'Route cleared':'Flight over','Final score '+score+' · '+levels[level].name,'Fly again',restart);
 $('form').hidden=false;$('input').value='';leaderboard();
}
$('form').onsubmit=e=>{e.preventDefault();const name=$('input').value.toUpperCase();if(!/^[A-Z]{3}$/.test(name))return;
 scores.push({name,score});scores.sort((a,b)=>b.score-a.score);scores=scores.slice(0,10);try{localStorage.setItem('vector-run-scores',JSON.stringify(scores));}catch{}$('form').hidden=true;leaderboard();};
function pause(){if(state!=='flight')return;state='paused';overlay('Paused',levels[level].name,'Resume flight',resume);}
$('#pause').onclick=pause;window.addEventListener('blur',pause);
function spawn(){
 const boss=wave===levels[level].waves.length,count=boss?1:levels[level].waves[wave];
 for(let i=0;i<count;i++){const hp=boss?18+level*8:2;enemies.push({boss,hp,max:hp,center:(i+1)/(count+1),phase:i*.8,age:-i*.22,fire:1.6+i*.45,depth:0,x:.5,y:.3});}
 wave++;
}
function shoot(){
 shotDelay=.13;traces.push({x:aim.x,y:aim.y,life:.09});
 const hit=enemies.filter(e=>e.age>=0&&Math.hypot((e.x-aim.x)*width,(e.y-aim.y)*height)<radius(e)*1.3+6).sort((a,b)=>b.depth-a.depth)[0];
 if(hit){hit.hp--;score+=10;if(!hit.hp){score+=hit.boss?1200:90;enemies=enemies.filter(e=>e!==hit);}}
}
function radius(e){return Math.min(width,height)*(e.boss?.105:.039)*(.45+e.depth);}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function update(dt){
 clock+=dt;shotDelay-=dt;invulnerable-=dt;
 const dx=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+steer.x;
 const dy=Number(keys.has('KeyS'))-Number(keys.has('KeyW'))+steer.y;
 bank+=(dx*.28-bank)*Math.min(1,dt*9);player.x=clamp(player.x+dx*dt*.58,.06,.94);player.y=clamp(player.y+dy*dt*.58,.14,.93);
 if(!enemies.length){nextWave-=dt;if(nextWave<=0){
 if(wave>levels[level].waves.length){score+=shield*100;if(level===2){end(true);return;}level++;state='clear';overlay('Sector clear','Next sector · '+levels[level].name,'Continue flight',startLevel);return;}
 spawn();nextWave=1.35;}}
 for(const e of enemies){
 e.age+=dt;if(e.age<0)continue;e.depth=Math.min(.92,e.age*.14);
 e.x=.5+(e.center-.5)*(.2+e.depth)+Math.sin(e.age*(.8+level*.25)+e.phase)*(e.boss?.24:.075);
 e.y=.2+e.depth*.15+Math.sin(e.age+e.phase)*.085;e.fire-=dt;
 if(e.fire<=0){e.fire=(e.boss?.92:3.8)-level*.12;const angle=Math.atan2((player.y-e.y)*height,(player.x-e.x)*width);
 const spread=e.boss?level+1:0;for(let n=-spread;n<=spread;n++){const speed=Math.min(width,height)*(.31+level*.035);bolts.push({x:e.x,y:e.y,vx:Math.cos(angle+n*.19)*speed/width,vy:Math.sin(angle+n*.19)*speed/height});}}}
 if(held&&shotDelay<=0)shoot();
 for(const b of bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;if(invulnerable<=0&&Math.hypot((b.x-player.x)*width,(b.y-player.y)*height)<Math.min(width,height)*.025){shield--;invulnerable=1.2;b.y=2;if(!shield){end(false);return;}}}
 bolts=bolts.filter(b=>b.x>-.1&&b.x<1.1&&b.y>-.1&&b.y<1.1);for(const t of traces)t.life-=dt;traces=traces.filter(t=>t.life>0);
 $('output').textContent=levels[level].name+' · '+String(score).padStart(6,'0')+' · SHIELD '+shield;
}
function line(x,y,X,Y,color){ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke();}
function ship(x,y,size,color,angle){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size,size);
 for(const sign of [-1,1]){ctx.fillStyle=sign===1?color:'#8896ad';ctx.beginPath();ctx.moveTo(0,-1);ctx.lineTo(sign*.38,.12);ctx.lineTo(sign*1.45,.83);ctx.lineTo(sign*.25,.63);ctx.lineTo(0,.85);ctx.fill();}
 ctx.fillStyle='#20334e';ctx.beginPath();ctx.moveTo(0,-.48);ctx.lineTo(.18,.27);ctx.lineTo(-.18,.27);ctx.fill();ctx.fillStyle='#79ffeb';ctx.fillRect(-.14,.7,.28,.31);ctx.restore();
}
function draw(){
 const stage=levels[level],horizon=height*.38,gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#06081b');gradient.addColorStop(.4,stage.sky);gradient.addColorStop(1,'#080c21');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 for(let i=1;i<90;i++){const z=((i*.073+travel*.12)%1);ctx.fillStyle='#cadbfc';ctx.fillRect(width*(.5+Math.sin(i*78)*z),height*(.38+Math.cos(i*41)*z),1+z,1+z);}
 ctx.globalAlpha=.34;for(let i=-9;i<=9;i++)line(width*.5,horizon,width*(.5+i*.24),height,stage.color);
 for(let i=0;i<17;i++){const depth=((i/17+travel*.13)%1)**2;line(0,horizon+depth*(height-horizon),width,horizon+depth*(height-horizon),stage.color);}ctx.globalAlpha=1;
 for(const e of enemies){if(e.age<0)continue;ship(e.x*width,e.y*height,radius(e),e.boss?stage.color:'#ff8998',Math.PI);if(e.boss){ctx.fillStyle=stage.color;ctx.fillRect(width*.25,height*.12,width*.5*e.hp/e.max,4);ctx.textAlign='center';ctx.fillText(stage.boss,width*.5,height*.12-6);}}
 ctx.fillStyle='#ffb45c';for(const b of bolts){ctx.beginPath();ctx.arc(b.x*width,b.y*height,5,0,Math.PI*2);ctx.fill();}
 for(const t of traces)line(player.x*width,player.y*height,t.x*width,t.y*height,'#a1ffec');
 if(invulnerable<=0||Math.floor(invulnerable*9)%2)ship(player.x*width,player.y*height,Math.min(width,height)*.044,'#e4f9ff',bank);
 if(state==='flight'){ctx.strokeStyle='#affff0';ctx.beginPath();ctx.arc(aim.x*width,aim.y*height,12,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(aim.x*width-1,aim.y*height-1,3,3);}
}
function resize(){width=innerWidth;height=innerHeight;const d=Math.min(devicePixelRatio,2);canvas.width=width*d;canvas.height=height*d;ctx.setTransform(d,0,0,d,0,0);}
window.addEventListener('resize',resize);resize();
function frame(time){const dt=Math.min(.04,(time-last)/1000);last=time;if(state==='flight'){travel+=dt;update(dt);}draw();requestAnimationFrame(frame);}
window.addEventListener('keydown',e=>{if(state==='flight'){keys.add(e.code);if(e.code==='Escape')pause();}});
window.addEventListener('keyup',e=>keys.delete(e.code));
function point(e){aim={x:e.clientX/width,y:e.clientY/height};}
canvas.onpointermove=point;canvas.onpointerdown=e=>{if(state!=='flight'||e.button!==0)return;point(e);held=true;canvas.setPointerCapture(e.pointerId);if(shotDelay<=0)shoot();};
canvas.onlostpointercapture=canvas.onpointercancel=canvas.onpointerup=()=>{held=false;};
const stick=$('#stick');function moveStick(e){const r=stick.getBoundingClientRect();steer={x:clamp((e.clientX-r.left-r.width/2)/32,-1,1),y:clamp((e.clientY-r.top-r.height/2)/32,-1,1)};}
stick.onpointerdown=e=>{stick.setPointerCapture(e.pointerId);moveStick(e);};stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))moveStick(e);};stick.onlostpointercapture=()=>{steer={x:0,y:0};};
overlay('Vector Run','Fly three sectors and defeat their guardians. WASD to steer, mouse to aim, hold left click to fire. On touchscreens, steer with the pad and hold a target to fire.','Launch flight',restart);
leaderboard();requestAnimationFrame(frame);
