'use strict';
const wall=new URLSearchParams(location.search).get('game')==='wall';
document.body.classList.add(wall?'wall-game':'blocks-game');
const rotateNotice=document.createElement('div');
rotateNotice.className='cabinet-rotate';
rotateNotice.textContent='Rotate your phone to portrait to play';
rotateNotice.setAttribute('role','status');
document.body.append(rotateNotice);
const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
canvas.width=wall?400:240;canvas.height=480;
const title=wall?'Wall Rally':'Block Drop';
document.title=title+' · Playground';document.querySelector('h1').textContent=title;
document.querySelector('p').textContent=wall?'Move the paddle with your pointer or arrow keys. Crack every brick.':'← → move · ↑ rotate · ↓ descend · Space drops the piece.';
const colors=['#000','#91f6ee','#ffba67','#cfa2ff','#a6f682','#ff8ba5','#83acff','#ffe675'];
const shapes=['1111','11/11','010/111','110/011','011/110','100/111','001/111'];
let board,piece,bag,px,py,paddle,ball,bricks,lives,score,lines,timer,last=0,state='ready';
const keys=new Set();
function report(message=''){document.querySelector('.status').textContent='Score '+score+' · '+(wall?'Lives '+lives:'Lines '+lines)+(message?' · '+message:'');}
function finish(message){state='over';report(message);document.querySelector('#play').textContent='Play again';}
function fits(shape,x,y){return shape.every((row,j)=>row.every((v,i)=>!v||(x+i>=0&&x+i<10&&y+j<20&&!board[y+j]?.[x+i])));}
function spawnPiece(){if(!bag.length){bag=shapes.map((_,i)=>i);for(let i=6;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}
 const id=bag.pop();piece=shapes[id].split('/').map(r=>Array.from(r,v=>Number(v)*(id+1)));px=3;py=0;if(!fits(piece,px,py))finish('Stack full');}
function fall(){if(fits(piece,px,py+1)){py++;return true;}piece.forEach((r,j)=>r.forEach((v,i)=>{if(v)board[j+py][i+px]=v;}));
 board=board.filter(row=>row.includes(0));const cleared=20-board.length;lines+=cleared;score+=10+[0,100,300,500,800][cleared];while(board.length<20)board.unshift(Array(10).fill(0));report();spawnPiece();return false;}
function serve(){ball={x:paddle,y:412,vx:Math.random()<.5?-115:115,vy:-235};}
function reset(){score=lines=timer=0;lives=3;bag=[];paddle=200;serve();bricks=Array.from({length:40},(_,i)=>1+Math.floor(i/8)%3);board=Array.from({length:20},()=>Array(10).fill(0));spawnPiece();report();}
function action(code){if(state!=='play')return;if(wall){paddle=Math.max(32,Math.min(368,paddle+(code==='ArrowLeft'?-18:18)));return;}
 if(code==='Space'){while(fall())score++;}else if(code==='ArrowDown')fall();else if(code==='ArrowUp'){const rotated=piece[0].map((_,i)=>piece.map(r=>r[i]).reverse());for(const offset of [0,-1,1,-2,2])if(fits(rotated,px+offset,py)){piece=rotated;px+=offset;break;}}else{const x=px+(code==='ArrowLeft'?-1:1);if(fits(piece,x,py))px=x;}}
function rally(dt){paddle=Math.max(32,Math.min(368,paddle+dt*330*(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))));const oldY=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
 if(ball.x<6||ball.x>394){ball.x=Math.max(6,Math.min(394,ball.x));ball.vx*=-1;}if(ball.y<6){ball.y=6;ball.vy=Math.abs(ball.vy);}
 if(ball.vy>0&&oldY<=426&&ball.y>=426&&Math.abs(ball.x-paddle)<38){ball.vx=(ball.x-paddle)*5;ball.vy=-245;}
 if(ball.y>490){if(!--lives){finish('Game over');return;}serve();report();}
 for(let i=0;i<bricks.length;i++){const x=4+i%8*49,y=36+Math.floor(i/8)*25;if(bricks[i]&&ball.x>x-5&&ball.x<x+50&&ball.y>y-5&&ball.y<y+25){bricks[i]--;score+=25;if(oldY<=y-5||oldY>=y+25){ball.vy*=-1;ball.y=oldY;}else{ball.vx*=-1;ball.x=ball.vx<0?x-6:x+51;}report();if(!bricks.some(Boolean))finish('Wall cleared');break;}}}
function tile(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x+1,y+1,w-2,h-2);ctx.fillStyle='#ffffff55';ctx.fillRect(x+2,y+2,w-4,2);}
function draw(){ctx.clearRect(0,0,canvas.width,480);if(wall){bricks.forEach((v,i)=>{if(v)tile(4+i%8*49,36+Math.floor(i/8)*25,46,21,colors[v]);});tile(paddle-32,432,64,12,colors[1]);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.x,ball.y,6,0,Math.PI*2);ctx.fill();}else{board.forEach((r,j)=>r.forEach((v,i)=>tile(i*24,j*24,24,24,v?colors[v]:'#10192d')));piece.forEach((r,j)=>r.forEach((v,i)=>{if(v)tile((px+i)*24,(py+j)*24,24,24,colors[v]);}));}}
function frame(now){const dt=Math.min(.025,(now-last)/1000);last=now;if(state==='play'){if(wall)rally(dt);else if((timer+=dt)>Math.max(.1,.65-lines*.015)){fall();timer=0;}}draw();requestAnimationFrame(frame);}
const bindings=wall?['ArrowLeft','ArrowRight']:['ArrowLeft','ArrowRight','ArrowUp','Space'];
for(const code of bindings){const b=document.createElement('button');b.dataset.control=code;b.textContent=({ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↻ Rotate',Space:'⇊ Drop'})[code];b.onclick=()=>action(code);document.querySelector('.controls').append(b);}
onkeydown=e=>{if(state==='play'&&bindings.includes(e.code)){e.preventDefault();keys.add(e.code);if(!wall)action(e.code);}};onkeyup=e=>keys.delete(e.code);
function aimPaddle(e){if(wall){const r=canvas.getBoundingClientRect();paddle=Math.max(32,Math.min(368,(e.clientX-r.left)*400/r.width));}}
canvas.onpointermove=canvas.onpointerdown=aimPaddle;
const play=document.querySelector('#play');play.onclick=()=>{if(state==='play'){state='paused';play.textContent='Resume';}else{if(state!=='paused')reset();state='play';play.textContent='Pause';}};
onblur=()=>{keys.clear();if(state==='play')play.click();};reset();requestAnimationFrame(frame);

installGameExit(document.querySelector('.back'), () => {
 const playing = state === 'play';
 if (playing) state = 'confirm-exit';
 keys.clear();
 return () => { if (playing) { state = 'play'; last = performance.now(); } };
});
// Support held movement and soft drop on the on-screen controls.
document.querySelectorAll('.controls button').forEach((button, index) => {
 const code = bindings[index];
 if (!['ArrowLeft','ArrowRight','ArrowDown'].includes(code)) return;
 let delay, repeat;
 function stop(){clearTimeout(delay);clearInterval(repeat);}
 button.onpointerdown = event => {
   if(event.button !== 0) return;
   stop();button.setPointerCapture(event.pointerId);action(code);
   delay=setTimeout(()=>{repeat=setInterval(()=>action(code),80);},230);
 };
 button.onlostpointercapture=button.onpointercancel=button.onpointerup=stop;
 button.onclick=event=>{if(!event.detail)action(code);};
});
