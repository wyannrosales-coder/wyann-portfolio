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
let audioContext, muted=false, pickups=[], sparks=[], kills=0, rapid=0, beat=0;
function tone(from,to,duration,type='triangle',volume=.045){
 if(muted||!audioContext||audioContext.state!=='running')return;
 const time=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();
 osc.type=type;osc.frequency.setValueAtTime(from,time);osc.frequency.exponentialRampToValueAtTime(to,time+duration);
 gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 osc.connect(gain);gain.connect(audioContext.destination);osc.start(time);osc.stop(time+duration);
}
function enableAudio(){try{audioContext??=new AudioContext();audioContext.resume().catch(()=>{});}catch{}}
$('#audio').onclick=()=>{muted=!muted;$('#audio').textContent=muted?'Sound off':'Sound on';if(!muted)enableAudio();};
function explode(enemy){
 for(let i=0;i<18;i++){const angle=Math.random()*Math.PI*2;sparks.push({x:enemy.x,y:enemy.y,vx:Math.cos(angle)*.12,vy:Math.sin(angle)*.18,life:.5+Math.random()*.4});}
 tone(160,32,.27,'sawtooth');kills++;
 if(!enemy.boss&&kills%4===0)pickups.push({x:enemy.x,y:enemy.y,type:kills%8===0?'SHIELD':'RAPID'});
}
function effects(dt){
 rapid=Math.max(0,rapid-dt);beat-=dt;
 if(beat<=0){beat=.36;tone([98,123,147,185][Math.floor(clock/.36)%4],65,.14,'triangle',.018);}
 for(const spark of sparks){spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;spark.life-=dt;}
 sparks=sparks.filter(s=>s.life>0);
 pickups=pickups.filter(p=>{p.y+=dt*.15;if(Math.hypot((player.x-p.x)*width,(player.y-p.y)*height)<Math.min(width,height)*.073){
 if(p.type==='SHIELD')shield=Math.min(6,shield+2);else rapid=8;tone(420,1200,.24);score+=50;return false;}return p.y<1.05;});
}
function leaderboard(){
 const board=$('#board');board.replaceChildren();const label=document.createElement('small');label.textContent='HIGH SCORES · THIS DEVICE';board.append(label);
 $('#record').textContent='HI SCORE '+String(scores[0]?.score||0).padStart(6,'0')+(scores.length?' · '+scores[0].name:'');
 if(!scores.length){const empty=document.createElement('p');empty.textContent='No scores yet. Finish a run and enter your initials.';board.append(empty);}
 const list=document.createElement('ol');for(const row of scores.slice(0,5)){const item=document.createElement('li');item.textContent=row.name+'   '+row.score.toString().padStart(6,'0');list.append(item);}board.append(list);
}
function overlay(title,brief,action,handler){
 $('section').hidden=false;$('h1').textContent=title;$('#brief').textContent=brief;$('#launch').textContent=action;$('#launch').onclick=handler;
 document.body.classList.remove('play');$('#pause').hidden=true;held=false;keys.clear();steer={x:0,y:0};
}
function resume(){state='flight';$('section').hidden=true;$('#pause').hidden=false;document.body.classList.add('play');last=performance.now();}
function startLevel(){rockets=[];blasts=[];lastDraft=-1;wave=0;clock=0;pickups=[];sparks=[];rapid=0;nextWave=.6;enemies=[];bolts=[];traces=[];player={x:.5,y:.82};shield=Math.min(6,shield+2);invulnerable=1;resume();}
function restart(){Object.keys(mods).forEach(k=>mods[k]=0);missiles=3;enableAudio();kills=0;level=0;score=0;shield=6;$('form').hidden=true;startLevel();}
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
 for(let i=0;i<count;i++){const hp=boss?18+level*8:2;enemies.push({boss,hp,max:hp,center:(i+1)/(count+1),pattern:(wave+level)%3,phase:i*.8,age:-i*.22,fire:1.6+i*.45,depth:0,x:.5,y:.3});}
 wave++;
}
const mods={laser:0,triple:0,bounce:0};
let missiles=3, rockets=[], blasts=[], lastDraft=-1;
const upgrades=[
 ['laser','Pulse laser','Pierces targets and increases beam damage.'],
 ['triple','Triple shot','Adds two side beams. Additional ranks widen the spread.'],
 ['bounce','Ricochet','Chains a hit to another nearby target per rank.'],
 ['missiles','Missile rack','Reload three blast missiles.']
];
function draftUpgrade(){
 state='draft';overlay('Choose an upgrade','Your loadout lasts for this run.','',()=>{});
 $('#launch').hidden=true;const choices=[...upgrades];
 while(choices.length>3)choices.splice(Math.floor(Math.random()*choices.length),1);
 for(const [id,name,info] of choices){const button=document.createElement('button');button.textContent=name+' — '+info;
 button.onclick=()=>{if(id==='missiles')missiles+=3;else mods[id]++;$('#upgrades').replaceChildren();$('#launch').hidden=false;resume();};
 $('#upgrades').append(button);}
}
function damage(enemy,amount){
 if(!enemies.includes(enemy))return;
 enemy.hp-=amount;score+=10;
 if(enemy.hp<=0){explode(enemy);score+=enemy.boss?1200:90;enemies=enemies.filter(e=>e!==enemy);}
}
function shoot(){
 shotDelay=rapid>0?.065:.16;tone(mods.laser?1120:840,160,.09,'square',.019);
 const spread=mods.triple?[-1,0,1]:[0];
 for(const side of spread){
 const x=aim.x+side*(.045+.012*mods.triple),y=aim.y;
 traces.push({x,y,life:.10,color:mods.laser?'#ff9de9':'#a1ffec'});
 const hits=enemies.filter(e=>e.age>=0&&Math.hypot((e.x-x)*width,(e.y-y)*height)<radius(e)*1.3+6).sort((a,b)=>b.depth-a.depth);
 for(const target of hits.slice(0,1+mods.laser)){
 damage(target,1+mods.laser);let from=target;const visited=new Set([target]);
 for(let n=0;n<mods.bounce;n++){const near=enemies.filter(e=>e.age>=0&&!visited.has(e)).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];
 if(!near||Math.hypot(near.x-from.x,near.y-from.y)>.4)break;
 traces.push({sx:from.x,sy:from.y,x:near.x,y:near.y,color:'#ffda70',life:.16});damage(near,1);visited.add(near);from=near;}
 }}
}
function missile(){if(state!=='flight'||missiles<=0)return;missiles--;rockets.push({sx:player.x,sy:player.y,x:aim.x,y:aim.y,t:0});tone(270,55,.28,'sawtooth');}
canvas.oncontextmenu=e=>e.preventDefault();$('#missile').onclick=missile;
function updateMissiles(dt){
 for(const r of rockets){r.t+=dt/.32;if(r.t>=1){const radiusPx=Math.min(width,height)*.22;
 blasts.push({x:r.x,y:r.y,life:.35,radius:radiusPx});tone(140,28,.3,'sawtooth');
 for(const enemy of [...enemies])if(enemy.age>=0&&Math.hypot((enemy.x-r.x)*width,(enemy.y-r.y)*height)<=radiusPx)damage(enemy,7);}}
 rockets=rockets.filter(r=>r.t<1);for(const b of blasts)b.life-=dt;blasts=blasts.filter(b=>b.life>0);
}
function radius(e){return Math.min(width,height)*(e.boss?.105:.039)*(.45+e.depth);}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function update(dt){
 clock+=dt;effects(dt);updateMissiles(dt);shotDelay-=dt;invulnerable-=dt;
 const dx=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+steer.x;
 const dy=Number(keys.has('KeyS'))-Number(keys.has('KeyW'))+steer.y;
 bank+=(dx*.28-bank)*Math.min(1,dt*9);player.x=clamp(player.x+dx*dt*.58,.06,.94);player.y=clamp(player.y+dy*dt*.58,.14,.93);
 if(!enemies.length){nextWave-=dt;if(nextWave<=0){
 if(wave>levels[level].waves.length){score+=shield*100;if(level===2){end(true);return;}level++;state='clear';overlay('Sector clear','Next sector · '+levels[level].name,'Continue flight',startLevel);return;}
 if(wave>0&&wave%2===0&&lastDraft!==wave){lastDraft=wave;draftUpgrade();return;}
 spawn();nextWave=1.35;}}
 for(const e of enemies){
 e.age+=dt;if(e.age<0)continue;e.depth=Math.min(.92,e.age*.14);
 e.x=.5+(e.center-.5)*(.2+e.depth)+Math.sin(e.age*(.8+level*.25)+e.phase)*(e.boss?.24:.075);
 e.y=.2+e.depth*.15+Math.sin(e.age+e.phase)*.085;if(!e.boss&&e.pattern===1){e.y+=Math.abs(e.center-.5)*.35;e.x+=Math.sin(e.age*1.8)*.08;}
 if(!e.boss&&e.pattern===2){e.x=.5+Math.cos(e.age*.75+e.phase)*.31;e.y=.33+Math.sin(e.age*.75+e.phase)*.15;}
 e.fire-=dt;
 if(e.fire<=0){e.fire=(e.boss?.92:3.8)-level*.12;const angle=Math.atan2((player.y-e.y)*height,(player.x-e.x)*width);
 const spread=e.boss?level+1:0;for(let n=-spread;n<=spread;n++){const speed=Math.min(width,height)*(.31+level*.035);bolts.push({x:e.x,y:e.y,vx:Math.cos(angle+n*.19)*speed/width,vy:Math.sin(angle+n*.19)*speed/height});}}}
 if(held&&shotDelay<=0)shoot();
 for(const b of bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;if(invulnerable<=0&&Math.hypot((b.x-player.x)*width,(b.y-player.y)*height)<Math.min(width,height)*.025){shield--;tone(95,28,.3,'sawtooth');invulnerable=1.2;b.y=2;if(!shield){end(false);return;}}}
 bolts=bolts.filter(b=>b.x>-.1&&b.x<1.1&&b.y>-.1&&b.y<1.1);for(const t of traces)t.life-=dt;traces=traces.filter(t=>t.life>0);
 $('output').textContent=levels[level].name+' · '+String(score).padStart(6,'0')+' · SHIELD '+shield+' · MSL '+missiles+(rapid>0?' · RAPID '+Math.ceil(rapid):'');
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
 // Faceted ridges and a banded planet give each sector its own skyline.
 const sunX=width*(.72-level*.18),sunY=horizon*.58,r=Math.min(width,height)*.09;
 ctx.save();ctx.beginPath();ctx.arc(sunX,sunY,r,0,Math.PI*2);ctx.clip();
 const planet=ctx.createLinearGradient(0,sunY-r,0,sunY+r);planet.addColorStop(0,stage.color);planet.addColorStop(1,stage.sky);
 ctx.fillStyle=planet;ctx.fillRect(sunX-r,sunY-r,2*r,2*r);
 ctx.fillStyle='#090d223f';for(let j=0;j<6;j++)ctx.fillRect(sunX-r,sunY+j*r/7,2*r,2+j*.4);ctx.restore();
 const span=width/9,shift=travel*9%span;
 for(let i=-1;i<11;i++){const x=i*span-shift,peak=horizon-height*(.04+.09*Math.abs(Math.sin((i+Math.floor(travel*9/span))*4.3+level)));
 for(let side=0;side<2;side++){ctx.fillStyle=side?stage.sky:'#101729';ctx.beginPath();ctx.moveTo(x+span*.54,peak);ctx.lineTo(x+span*(side?.54:0),horizon);ctx.lineTo(x+span*(side?1:.54),horizon);ctx.fill();}}
 ctx.globalAlpha=.34;for(let i=-9;i<=9;i++)line(width*.5,horizon,width*(.5+i*.24),height,stage.color);
 for(let i=0;i<17;i++){const depth=((i/17+travel*.13)%1)**2;line(0,horizon+depth*(height-horizon),width,horizon+depth*(height-horizon),stage.color);}ctx.globalAlpha=1;
 for(const e of enemies){if(e.age<0)continue;ship(e.x*width,e.y*height,radius(e),e.boss?stage.color:'#ff8998',Math.PI);if(e.boss){ctx.fillStyle=stage.color;ctx.fillRect(width*.25,height*.12,width*.5*e.hp/e.max,4);ctx.textAlign='center';ctx.fillText(stage.boss,width*.5,height*.12-6);}}
 ctx.fillStyle='#ffb45c';for(const b of bolts){ctx.beginPath();ctx.arc(b.x*width,b.y*height,5,0,Math.PI*2);ctx.fill();}
 for(const r of rockets){const x=r.sx+(r.x-r.sx)*r.t,y=r.sy+(r.y-r.sy)*r.t;ctx.fillStyle='#ffcd68';ctx.fillRect(x*width-4,y*height-5,8,10);}
 for(const b of blasts){ctx.strokeStyle='#ffc069';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x*width,b.y*height,b.radius*(1-b.life/.35),0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
 for(const t of traces)line((t.sx??player.x)*width,(t.sy??player.y)*height,t.x*width,t.y*height,t.color);
 for(const p of pickups){const x=p.x*width,y=p.y*height;ctx.save();ctx.translate(x,y);ctx.strokeStyle='#f7edaa';ctx.rotate(Math.PI/4);ctx.strokeRect(-9,-9,18,18);ctx.restore();ctx.fillStyle='#fff3a6';ctx.textAlign='center';ctx.fillText(p.type,x,y-16);}
 for(const s of sparks){ctx.globalAlpha=Math.min(1,s.life*2);ctx.fillStyle=stage.color;ctx.fillRect(s.x*width,s.y*height,4,3);}ctx.globalAlpha=1;
 if(invulnerable<=0||Math.floor(invulnerable*9)%2)ship(player.x*width,player.y*height,Math.min(width,height)*.044,'#e4f9ff',bank);
 if(state==='flight'){ctx.strokeStyle='#affff0';ctx.beginPath();ctx.arc(aim.x*width,aim.y*height,12,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(aim.x*width-1,aim.y*height-1,3,3);}
}
function resize(){width=innerWidth;height=innerHeight;const d=Math.min(devicePixelRatio,2);canvas.width=width*d;canvas.height=height*d;ctx.setTransform(d,0,0,d,0,0);}
window.addEventListener('resize',resize);resize();
function frame(time){const dt=Math.min(.04,(time-last)/1000);last=time;if(state==='flight'){travel+=dt;update(dt);}draw();requestAnimationFrame(frame);}
window.addEventListener('keydown',e=>{if(state==='flight'){keys.add(e.code);}});
window.addEventListener('keyup',e=>keys.delete(e.code));
function point(e){aim={x:e.clientX/width,y:e.clientY/height};}
canvas.onpointermove=point;canvas.onpointerdown=e=>{if(state!=='flight')return;point(e);if(e.button===2){e.preventDefault();missile();return;}if(e.button!==0)return;held=true;canvas.setPointerCapture(e.pointerId);if(shotDelay<=0)shoot();};
canvas.onlostpointercapture=canvas.onpointercancel=canvas.onpointerup=()=>{held=false;};
const stick=$('#stick'),stickKnob=stick.querySelector('span');
function moveStick(e){
 const r=stick.getBoundingClientRect(),x=clamp((e.clientX-r.left-r.width/2)/(r.width*.34),-1,1),y=clamp((e.clientY-r.top-r.height/2)/(r.height*.34),-1,1);
 steer={x,y};stickKnob.style.transform=`translate(${x*24}px,${y*24}px)`;
}
function releaseStick(){steer={x:0,y:0};stickKnob.style.transform='translate(0,0)';}
stick.onpointerdown=e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);moveStick(e);};
stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))moveStick(e);};
stick.onlostpointercapture=stick.onpointercancel=stick.onpointerup=releaseStick;
const fire=$('#fire');
fire.onpointerdown=e=>{e.preventDefault();fire.setPointerCapture(e.pointerId);held=true;if(shotDelay<=0)shoot();};
fire.onlostpointercapture=fire.onpointercancel=fire.onpointerup=()=>{held=false;};
overlay('Vector Run','Fly three sectors and defeat their guardians. WASD to steer, mouse to aim, hold left click to fire, right-click for a blast missile. On touchscreens, steer with the pad and hold a target to fire.','Launch flight',restart);
leaderboard();requestAnimationFrame(frame);

requestAnimationFrame(()=>requestAnimationFrame(()=>$('#boot').hidden=true));

installGameExit(document.querySelector('nav a'), () => {
 const flying = state === 'flight';
 if (flying) state = 'confirm-exit';
 keys.clear(); held = false; steer = {x:0,y:0};
 return () => { if (flying) resume(); };
});
