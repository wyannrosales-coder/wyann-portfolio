const screen = document.querySelector('.screen');
const dialog = document.querySelector('dialog');
const title = document.querySelector('#panel-title');
const description = document.querySelector('#panel-description');
const actions = document.querySelector('#panel-actions');
const draft = document.querySelector('#draft');
const message = document.querySelector('#message');
const status = document.querySelector('#copy-status');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

const panels = {
  'My process': ['I start with user research, map the key flows, and test ideas through high-fidelity prototypes. For Dwell, I worked with developers through launch and tracked adoption to guide improvements.'],
  Playground: ['Choose an effect to try on the portrait.'],
  Labs: ['A space for creative coding and web experiments.'],
  Studio: ['Wyann is a creative designer and developer.', 'Pitch us an idea'],
  Openings: ['Have a role or collaboration in mind? Draft a note to introduce yourself.', 'Come work here'],
  Shop: ['There are no products listed in this preview.'],
  'Get in touch': ['Choose how you’d like to start the conversation.', 'Pitch us an idea', 'Send a brief hello'],
  'Pitch us an idea': ['Draft a short note about what you want to make. Copy it when you’re ready to share.'],
  'Come work here': ['Draft a short introduction. Copy it when you’re ready to share.'],
  'Send a brief hello': ['Draft a quick hello. Copy it when you’re ready to share.'],
};

const drafts = new Map();
const draftingPanels = new Set(['Pitch us an idea', 'Come work here', 'Send a brief hello']);

function openPanel(name) {
  if(name === "My process" && window.openProcess){window.openProcess();return;}
  const [copy, ...links] = panels[name];
  title.textContent = name;
  description.textContent = copy;
  actions.replaceChildren(...links.map((link) => {
    const button = document.createElement('button');
    button.className = 'pill';
    button.dataset.panel = link;
    button.textContent = link;
    return button;
  }));
  draft.hidden = !draftingPanels.has(name);
  message.value = drafts.get(name) ?? '';
  status.textContent = '';
  if (!dialog.open) dialog.showModal();
  if (!draft.hidden) message.focus();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-panel]');
  if (button) openPanel(button.dataset.panel);
});

message.addEventListener('input', () => drafts.set(title.textContent, message.value));
document.querySelector('#copy-message').addEventListener('click', async () => {
  if (!message.value.trim()) {
    status.textContent = 'Write a message first.';
    message.focus();
    return;
  }
  try {
    await navigator.clipboard.writeText(message.value);
    status.textContent = 'Message copied.';
  } catch {
    message.select();
    status.textContent = 'Your message is selected. Use your keyboard to copy it.';
  }
});

const picture = document.querySelector('.picture');
const portraits = Array.from({length: 9}, (_, index) => {
  const image = new Image();
  image.src = 'portrait-' + index + '.webp?v=subtle2';
  return image;
});
const face = document.createElement('img');
face.alt = '';
face.draggable = false;
face.src = portraits[3].src;
const band = document.createElement('div');
band.className = 'glitch-band';
const slice = face.cloneNode();
band.append(slice);
picture.append(face, band);
let x = 0, y = 4, bodyX = 0, bodyY = 4;
let targetX = x, targetY = y, last = 0, frame = 0;
let column = 0, row = 1;
function sector(value, previous) {
  if (Math.abs(value - previous * 4) < 2.35) return previous;
  return Math.round(value / 4);
}
function paint() {
  column = sector(x, column);
  row = sector(y, row);
  const portrait = portraits[row * 3 + column];
  if (portrait.complete && portrait.naturalWidth && face.src !== portrait.src) face.src = portrait.src;
  syncSlice();
  const yaw = (bodyX - 4) / 4;
  const pitch = (bodyY - 4) / 4;
  face.style.transform = `translateX(${yaw * .55}%) rotate(${yaw * .85}deg) scaleY(${1 - pitch * .006})`;
  slice.style.transform = face.style.transform;
}
function render(now) {
  const dt = Math.min(50, now-last || 16);
  last = now;
  const head = motion.matches ? 1 : -Math.expm1(-dt/63);
  const torso = motion.matches ? 1 : -Math.expm1(-dt/115);
  x += (targetX-x)*head; y += (targetY-y)*head;
  bodyX += (x-bodyX)*torso; bodyY += (y-bodyY)*torso;
  paint();
  frame = Math.max(Math.abs(targetX-bodyX),Math.abs(targetY-bodyY),
    Math.abs(targetX-x),Math.abs(targetY-y)) > .003 ? requestAnimationFrame(render) : 0;
}
function schedule() {
  if (!frame) { last = performance.now()-16; frame = requestAnimationFrame(render); }
}
portraits.forEach(portrait => portrait.addEventListener('load', schedule));
function turn(col,row) { targetX=col; targetY=row; schedule(); }
function follow(event) {
  if (screen.querySelector('.thought.aimed')) return;
  const b = picture.getBoundingClientRect();
  const dx = (event.clientX-b.left-b.width*.5)/(b.width*.34);
  const dy = (event.clientY-b.top-b.height*.235)/(b.height*.28);
  turn(4+4*Math.tanh(dx),4+4*Math.tanh(dy));
}
screen.addEventListener('pointerdown', event => {
  follow(event);
  if (event.pointerType === 'touch' && event.target === picture)
    picture.setPointerCapture(event.pointerId);
});
screen.addEventListener('pointermove', follow);
screen.addEventListener('pointerleave', event => {
  if (event.pointerType !== 'touch') turn(0, 4);
});

// Mobile motion parallax. Browsers with implicit permission start immediately;
// iOS requests access on the visitor's first gesture, then stays enabled.
function gyroMove(event){
  if(innerWidth>900 || motion.matches || event.gamma == null || event.beta == null) return;
  const gx=Math.max(-1,Math.min(1,event.gamma/28));
  const gy=Math.max(-1,Math.min(1,(event.beta-42)/32));
  screen.style.setProperty('--gyro-bg-x',`${gx*12}px`);
  screen.style.setProperty('--gyro-bg-y',`${gy*9}px`);
  screen.style.setProperty('--gyro-x',gx.toFixed(3));
  screen.style.setProperty('--gyro-y',gy.toFixed(3));
  picture.style.setProperty('--pan-x',`${gx*7}px`);
  picture.style.setProperty('--pan-y',`${gy*5}px`);
  if(!screen.querySelector('.thought.aimed')&&!screen.classList.contains('in-about')&&!screen.classList.contains('in-portfolio')) turn(4+gx*4,4+gy*4);
  document.dispatchEvent(new CustomEvent('wyann:gyro',{detail:{x:gx,y:gy}}));
}
function startGyro(){window.addEventListener('deviceorientation',gyroMove,{passive:true});}
startGyro();
document.addEventListener('pointerdown',async function askMotion(){
  if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
    try{if(await DeviceOrientationEvent.requestPermission()==='granted')startGyro();}catch{}
  }
},{once:true,passive:true});

let glitchTimer;
const variants = {};
for (const effect of ['grain', 'bleed']) {
  variants[effect] = portraits.map((_, index) => {
    const image = new Image();
    image.src = effect + '-' + index + '.webp?v=subtle2';
    return image;
  });
}
function syncSlice() {
  const index = portraits.findIndex(portrait => portrait.src === face.src);
  const url = variants[band.dataset.effect]?.[index]?.src || face.src;
  if (slice.src !== url) slice.src = url;
}
const effects = [];
function nextEffect() {
  if (!effects.length) {
    const remaining = ['tear','grain','bleed'];
    while (remaining.length) effects.push(remaining.splice(Math.floor(Math.random()*remaining.length),1)[0]);
  }
  return effects.pop();
}
function glitch() {
  if (motion.matches || document.hidden) return;
  const effect = nextEffect();
  const top = 8 + Math.random() * 73;
  const height = effect === 'grain' ? 11 : 5 + Math.random() * 4;
  band.style.clipPath = `inset(${top}% 0 ${100-top-height}% 0)`;
  band.style.setProperty('--tear', Math.random() < .5 ? '-12px' : '12px');
  band.dataset.effect = effect;
  syncSlice();
  glitchTimer = setTimeout(() => {
    band.removeAttribute('data-effect');
    glitchTimer = setTimeout(glitch, 650 + Math.random() * 3000);
  }, 170 + Math.random() * 250);
}
function restartGlitches() {
  clearTimeout(glitchTimer);
  band.removeAttribute('data-effect');
  if (!motion.matches && !document.hidden)
    glitchTimer = setTimeout(glitch, 400 + Math.random() * 800);
}
motion.addEventListener('change', restartGlitches);
document.addEventListener('visibilitychange', restartGlitches);
restartGlitches();

const channel = document.querySelector('#channel');
function tuneBackground() {
  screen.style.setProperty('--channel-art', `url(channel-${channel.value}.webp)`);
}
channel.value='0';
tuneBackground();
channel.addEventListener('change', () => {
  tuneBackground();
  try { localStorage.setItem('inframe-channel',channel.value); } catch {}
});

const about = document.querySelector('#about');
const copy = document.querySelector('.copy');
const switcher = document.querySelector('.section-switch');
const poses = Array.from({length:3}, (_,i) => {
  const image = new Image();
  image.className = 'pose'; image.alt = ''; image.src = 'chin-' + i + '.webp?v=center4';
  picture.append(image); return image;
});
let showingAbout = false, poseTimer, wheelLock = 0;
let introChannel = channel.value, aboutChannel;
function showPose(i) {
  poses.forEach((pose,index) => pose.classList.toggle('visible',index === i));
}
function changeSection(open) {
  if (open === showingAbout) return;
  showingAbout = open;
  document.querySelector('.home-back').hidden = !open;
  if (!open) window.scrollTo({top:0, behavior:'instant'});
  document.querySelector('.thoughts').inert = open;
  clearTimeout(poseTimer);
  screen.classList.toggle('in-about',open);
  about.inert = !open; copy.inert = open;
  switcher.textContent = open ? '← Intro' : 'About me →';
  switcher.setAttribute('aria-expanded',String(open));
  if (open) {
    about.scrollTop = 0;
    about.focus({preventScroll:true});
    introChannel = channel.value;
    channel.value = '1';
    screen.classList.add('posing');
    let step = motion.matches ? 2 : 0;
    function lift() {
      showPose(step);
      if (step < 2) {
        const delay = step === 0 ? 280 : 190;
        step++;
        poseTimer = setTimeout(lift, delay);
      } else if (!motion.matches) {
        poses[2].animate([
          {transform:'translateY(-0.7%) rotate(-0.65deg)'},
          {transform:'translateY(0) rotate(0deg)'}
        ], {duration:360, easing:'cubic-bezier(.18,.72,.22,1)'});
      }
    }
    lift();
  } else {
    aboutChannel=channel.value; channel.value=introChannel;
    screen.classList.remove('posing'); showPose(-1);
    document.querySelector('#open-about').focus({preventScroll:true});
  }
  tuneBackground();
}
switcher.addEventListener('click',()=>changeSection(!showingAbout));
screen.addEventListener('wheel',event=>{
  if (screen.classList.contains('in-portfolio') || screen.classList.contains('in-process') || event.ctrlKey || event.target.closest('select,dialog')) return;
  const horizontal=Math.abs(event.deltaX)>Math.abs(event.deltaY);
  if (showingAbout && !horizontal) {
    if (!about.contains(event.target)) {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? about.clientHeight : 1;
      about.scrollTop += event.deltaY * unit;
    }
    return;
  }
  if (!horizontal && (innerWidth<=760 || document.documentElement.scrollHeight>innerHeight+8)) return;
  const delta=horizontal ? event.deltaX : event.deltaY;
  if (Math.abs(delta)<3) return;
  if (!showingAbout) return; // scrolling on home never opens About me
  event.preventDefault();
  const now=performance.now();
  if(now>wheelLock) changeSection(delta>0);
  wheelLock=now+180;
},{passive:false});
let swipeStart;
screen.addEventListener('touchstart',event=>{
  swipeStart=event.target.closest('select,button,a,.picture') ? null : event.changedTouches[0];
},{passive:true});
screen.addEventListener('touchend',event=>{
  if (!swipeStart || screen.classList.contains('in-portfolio') || screen.classList.contains('in-process')) return;
  const end=event.changedTouches[0], dx=end.clientX-swipeStart.clientX;
  if(Math.abs(dx)>55 && Math.abs(dx)>1.6*Math.abs(end.clientY-swipeStart.clientY) && (showingAbout || dx>0)) changeSection(dx<0); // swiping on home never opens About me
  swipeStart=null;
},{passive:true});

const thoughts = document.querySelector('.thoughts');
let navigationTimer;
thoughts.addEventListener('click', event => {
  const bubble = event.target.closest('.thought');
  if (!bubble || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  clearTimeout(navigationTimer);
  thoughts.querySelector('.aimed')?.classList.remove('aimed');
  bubble.classList.add('aimed');
  const bounds = bubble.getBoundingClientRect();
  const portrait = picture.getBoundingClientRect();
  const dx = bounds.left + bounds.width / 2 - portrait.left - portrait.width / 2;
  const dy = bounds.top + bounds.height / 2 - portrait.top - portrait.height * .235;
  turn(Math.abs(dx) < 15 ? 4 : dx < 0 ? 0 : 8, Math.abs(dy) < 20 ? 4 : dy < 0 ? 0 : 8);
  navigationTimer = setTimeout(() => {
    bubble.classList.remove('aimed');
    if (bubble.id === 'open-about') changeSection(true);
    else if (bubble.id === 'open-portfolio') window.openPortfolio();
    else if (bubble.href) location.assign(bubble.href);
    else if (bubble.id === 'playground') location.assign('playground.html');
    else openPanel(bubble.dataset.panel);
  }, motion.matches ? 60 : 420);
});
document.addEventListener('pointerdown', event => {
  const tools = document.querySelector('.prototype-tools');
  if (!tools.contains(event.target)) tools.open = false;
});
about.addEventListener('scroll', () => {
  about.classList.toggle('cv-scrolled', about.scrollTop > 20);
}, {passive:true});

document.querySelector('.home-back').addEventListener('click', () => changeSection(false));
document.querySelector('.back-bottom').addEventListener('click', () => changeSection(false));
