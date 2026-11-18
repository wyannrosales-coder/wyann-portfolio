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
const poses = Array.from({ length: 9 }, (_, index) => {
  const frame = new Image();
  frame.src = 'pose-' + index + '.webp';
  return frame;
});
let current = 3;
function showPose(index) {
  if (current === index) return;
  current = index;
  picture.style.backgroundImage = 'url(' + poses[index].src + ')';
  if (!motion.matches) {
    picture.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    picture.animate([
      {transform:'translateX(4px)',clipPath:'inset(20% 0 77%)'},
      {transform:'translateX(-2px)',clipPath:'inset(64% 0 32%)'}
    ], {duration:80, easing:'steps(2)', pseudoElement:'::after'});
  }
}
function follow(event) {
  const box = picture.getBoundingClientRect();
  const horizontal = event.clientX - (box.left + box.width / 2);
  const vertical = event.clientY - (box.top + box.height * .36);
  const radius = Math.hypot(horizontal, vertical);
  const center = box.width * (current === 4 ? .095 : .075);
  if (radius < center) return showPose(4);
  const directions = [5, 8, 7, 6, 3, 0, 1, 2];
  const angle = Math.atan2(vertical, horizontal) / (Math.PI / 4);
  const previous = directions.indexOf(current);
  if (previous >= 0 && Math.abs(((angle - previous + 12) % 8) - 4) < .58) return;
  showPose(directions[(Math.round(angle) + 8) % 8]);
}
screen.addEventListener('pointermove', follow);
screen.addEventListener('pointerdown', follow);
screen.addEventListener('pointerleave', event => {
  if (event.pointerType !== 'touch') showPose(3);
});
