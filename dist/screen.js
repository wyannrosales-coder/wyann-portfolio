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
  Labs: ['A space for creative coding and web experiments.'],
  Studio: ['Jules is a creative designer and developer.', 'Pitch us an idea'],
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
const strips = Array.from({length: 9}, (_, i) => {
  const image = new Image();
  image.src = 'gaze-' + i + '.webp';
  return image;
});
// Blend the four surrounding photographed poses at the display refresh rate.
const canvas = document.createElement('canvas');
const blend = document.createElement('canvas');
const size = 400;
for (const surface of [canvas, blend]) surface.width = surface.height = size;
picture.append(canvas);
const output = canvas.getContext('2d');
const buffer = blend.getContext('2d');
let x = 0, y = 4, bodyX = 0, bodyY = 4;
let targetX = x, targetY = y, last = 0, frame = 0;
function paint() {
  const row = Math.floor(y), col = Math.floor(x);
  const fx = x - col, fy = y - row;
  const weights = [(1-fx)*(1-fy), fx*(1-fy), (1-fx)*fy, fx*fy];
  if (!strips[row].naturalWidth || !strips[Math.min(8,row+1)].naturalWidth) return;
  buffer.clearRect(0,0,size,size);
  buffer.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    if (!weights[i]) continue;
    buffer.globalAlpha = weights[i];
    buffer.drawImage(strips[Math.min(8,row+(i>>1))], Math.min(8,col+(i%2))*size,0,size,size,0,0,size,size);
  }
  // Pivot at the base of the torso. The far shoulder narrows and drops
  // slightly while the near shoulder rises with the delayed body turn.
  output.clearRect(0,0,size,size);
  const yaw = (bodyX-4)/4, pitch = (bodyY-4)/4;
  for (let sy = 0; sy < size; sy += 4) {
    const v = sy/size;
    const shoulder = Math.exp(-Math.pow((v-.66)/.31,2));
    const offset = yaw * (3*(1-v) + 9*shoulder);
    const width = 1 - .025*Math.abs(yaw)*shoulder;
    output.setTransform(width, yaw*.023*shoulder, 0, 1,
      offset + (1-width)*size/2, pitch*4*shoulder - yaw*.023*shoulder*size/2);
    output.drawImage(blend,0,sy,size,Math.min(5,size-sy),0,sy,size,Math.min(5,size-sy));
  }
  output.resetTransform();
  canvas.style.opacity = '1';
  picture.style.backgroundImage = 'none';
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
strips.forEach(strip => strip.addEventListener('load',schedule));
function turn(col,row) { targetX=col; targetY=row; schedule(); }
function follow(event) {
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
