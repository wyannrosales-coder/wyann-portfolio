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
const portraits = Array.from({length: 9}, (_, index) => {
  const image = new Image();
  image.src = 'portrait-' + index + '.webp';
  return image;
});
const face = document.createElement('img');
face.alt = '';
face.draggable = false;
face.src = portraits[3].src;
picture.append(face);
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
  const yaw = (bodyX - 4) / 4;
  const pitch = (bodyY - 4) / 4;
  face.style.transform = `translateX(${yaw * .55}%) rotate(${yaw * .85}deg) scaleY(${1 - pitch * .006})`;
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
