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
let x = 0, y = 4, startX = x, startY = y, targetX = x, targetY = y;
let began = 0, frame = 0;
function render(now) {
  const t = motion.matches ? 1 : Math.min(1, (now - began) / 180);
  const ease = t * (2 - t);
  x = startX + (targetX - startX) * ease;
  y = startY + (targetY - startY) * ease;
  const strip = strips[Math.round(y)];
  if (strip.naturalWidth) {
    picture.style.backgroundImage = 'url(' + strip.src + ')';
    picture.style.backgroundSize = '900% 100%';
    picture.style.backgroundPosition = (Math.round(x) * 12.5) + '% center';
  }
  frame = t < 1 ? requestAnimationFrame(render) : 0;
}
strips.forEach(strip => strip.addEventListener('load', () => {
  if (!frame) render(performance.now());
}));
function turn(col, row) {
  if (col === targetX && row === targetY) return;
  startX = x; startY = y;
  targetX = col; targetY = row;
  began = performance.now();
  if (!frame) frame = requestAnimationFrame(render);
}
function follow(event) {
  const b = picture.getBoundingClientRect();
  const dx = event.clientX - b.left - b.width * .5;
  const dy = event.clientY - b.top - b.height * .235;
  if (Math.hypot(dx, dy) < b.width * .07) return turn(4, 4);
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4;
  turn(4 + 4 * Math.round(Math.cos(angle)), 4 + 4 * Math.round(Math.sin(angle)));
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
