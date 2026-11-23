// Contact form modal: every "Get in touch" button opens this short form.
// Delivery: Web3Forms (https://web3forms.com) emails each message to hello@wyannrosales.com.
// Until WEB3FORMS_KEY is set, "Send" opens the visitor's email app with the message pre-filled instead.
(() => {
  'use strict';
  const TO = 'hello@wyannrosales.com';
  const WEB3FORMS_KEY = '';              // paste the access key emailed to hello@wyannrosales.com
  const ENDPOINT = 'https://api.web3forms.com/submit';

  const TOPICS = {
    job:    { label:'Job opportunity',  msg:'The role, the team, where it is based (or remote) and what the next steps look like.',
              extraLabel:'Location & salary', extraHint:'e.g. Melbourne, hybrid, AU$140–160k', extraType:'text' },
    work:   { label:'Project or freelance', msg:'What you would like to make, who it is for, and anything you already have (research, designs, a brief).',
              extraLabel:'Timeline & budget', extraHint:'e.g. launch in March, AU$10–15k', extraType:'text' },
    collab: { label:'Collaboration',    msg:'What is the idea, and how would you like us to work together?',
              extraLabel:'Link', extraHint:'A link to your work or idea', extraType:'url' },
    hello:  { label:'Just saying hi',   msg:'Say hello. I would love to hear from you.', extraLabel:null },
  };

  const dialog = document.createElement('dialog');
  dialog.className = 'contact-room';
  dialog.setAttribute('aria-labelledby', 'contact-title');
  dialog.innerHTML = `
    <button type="button" class="contact-close" aria-label="Close">×</button>
    <form novalidate>
      <p class="eyebrow">Get in touch</p>
      <h2 id="contact-title">Let’s talk.</h2>
      <p class="contact-sub">A few details help me reply properly. It only takes a minute.</p>

      <fieldset aria-describedby="err-topic">
        <legend>What’s this about?</legend>
        <div class="contact-topics">
          ${Object.entries(TOPICS).map(([id, t]) => `<label><input type="radio" name="topic" value="${id}"><span>${t.label}</span></label>`).join('')}
        </div>
        <span class="err" id="err-topic" role="alert"></span>
      </fieldset>

      <div class="contact-grid">
        <label><span>Your name</span><input type="text" name="name" autocomplete="name" placeholder="Jane Smith" aria-describedby="err-name"><span class="err" id="err-name"></span></label>
        <label><span>Email</span><input type="email" name="email" autocomplete="email" inputmode="email" placeholder="jane@company.com" aria-describedby="err-email"><span class="err" id="err-email"></span></label>
        <label class="company"><span>Company <i>optional</i></span><input type="text" name="company" autocomplete="organization" placeholder="Where you work"></label>
        <label class="contact-extra" hidden><span><b class="extra-label"></b> <i>optional</i></span><input type="text" name="extra"></label>
      </div>

      <label><span>Your message</span><textarea name="message" rows="4" aria-describedby="err-message" placeholder="Tell me a little about it"></textarea><span class="err" id="err-message"></span></label>

      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">

      <div class="contact-foot">
        <button type="submit" class="pill primary">Send message →</button>
        <p class="contact-note">Prefer email? <a href="mailto:${TO}">${TO}</a></p>
      </div>
      <p class="contact-status" role="status" aria-live="polite"></p>
    </form>

    <div class="contact-done" hidden tabindex="-1">
      <div class="tick" aria-hidden="true">✓</div>
      <h2>Message sent.</h2>
      <p class="done-copy"></p>
      <div class="row"><button type="button" class="pill primary done-close">Close</button><button type="button" class="pill done-copy-btn" hidden>Copy message</button></div>
    </div>`;
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const done = dialog.querySelector('.contact-done');
  const status = dialog.querySelector('.contact-status');
  const submit = form.querySelector('button[type=submit]');
  const grid = form.querySelector('.contact-grid');
  const extraWrap = form.querySelector('.contact-extra');
  const extraInput = extraWrap.querySelector('input');
  const message = form.elements.message;
  let opener = null, fallbackText = '';

  const err = (name, text) => {
    const box = dialog.querySelector('#err-' + name); if (box) box.textContent = text || '';
    const field = form.elements[name];
    const els = field && field.length && !field.tagName ? [...field] : field ? [field] : [];
    els.forEach(f => f.setAttribute('aria-invalid', text ? 'true' : 'false'));
  };
  const clearErrors = () => { ['topic','name','email','message'].forEach(n => err(n, '')); status.textContent = ''; };

  function setTopic(id) {
    const t = TOPICS[id];
    if (!t) return;
    message.placeholder = t.msg;
    if (t.extraLabel) {
      extraWrap.hidden = false; grid.classList.add('has-extra');
      extraWrap.querySelector('.extra-label').textContent = t.extraLabel;
      extraInput.type = t.extraType; extraInput.placeholder = t.extraHint;
      extraInput.autocomplete = t.extraType === 'url' ? 'url' : 'off';
    } else {
      extraWrap.hidden = true; extraInput.value = ''; grid.classList.remove('has-extra');
    }
  }
  form.addEventListener('change', e => { if (e.target.name === 'topic') { setTopic(e.target.value); err('topic', ''); } });
  form.addEventListener('input', e => { if (e.target.name && e.target.getAttribute('aria-invalid') === 'true') err(e.target.name, ''); });

  function validate() {
    clearErrors();
    const bad = [];
    const topic = form.elements.topic.value;
    const name = form.elements.name.value.trim(), email = form.elements.email.value.trim(), text = message.value.trim();
    if (!topic) { err('topic', 'Pick the one that fits best.'); bad.push(form.querySelector('input[name=topic]')); }
    if (name.length < 2) { err('name', 'Please add your name.'); bad.push(form.elements.name); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err('email', 'Please use a valid email so I can reply.'); bad.push(form.elements.email); }
    if (text.length < 10) { err('message', 'A sentence or two is plenty, but I need a little more to go on.'); bad.push(message); }
    if (extraInput.type === 'url' && extraInput.value.trim() && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(extraInput.value.trim())) {
      extraInput.value = ''; // not a link: ignore rather than block a good message
    }
    if (bad.length) { bad[0].focus(); return null; }
    const t = TOPICS[topic];
    return {
      topic: t.label, name, email, message: text,
      company: form.elements.company.value.trim(),
      extraLabel: t.extraLabel || '', extra: extraInput.value.trim(),
    };
  }

  const plain = d => [
    `Topic: ${d.topic}`, `Name: ${d.name}`, `Email: ${d.email}`,
    d.company && `Company: ${d.company}`, d.extra && `${d.extraLabel}: ${d.extra}`,
  ].filter(Boolean).join('\n') + '\n\n' + d.message;

  async function deliver(d) {
    const subject = `${d.topic} from ${d.name} (portfolio)`;
    if (!WEB3FORMS_KEY) {
      // No form service connected yet: hand the message to the visitor's email app.
      fallbackText = plain(d);
      location.href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fallbackText)}`;
      return 'mailto';
    }
    const res = await fetch(ENDPOINT, {
      method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY, subject, from_name: 'Portfolio contact form', replyto: d.email,
        name: d.name, email: d.email, topic: d.topic, company: d.company || '—',
        [d.extraLabel || 'details']: d.extra || '—', message: d.message,
        page: location.href, botcheck: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || 'Request failed');
    return 'sent';
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submit.disabled) return;
    if (form.elements.website.value) { showDone('sent', { name:'there', email:'' }); return; }   // honeypot: act as if sent
    const data = validate();
    if (!data) return;
    submit.disabled = true; submit.textContent = 'Sending…'; status.textContent = '';
    try {
      const how = await deliver(data);
      showDone(how, data);
      form.reset(); extraWrap.hidden = true; grid.classList.remove('has-extra'); message.placeholder = 'Tell me a little about it';
    } catch (error) {
      status.innerHTML = `Sorry, that didn’t go through. Please try again, or email <a href="mailto:${TO}?subject=${encodeURIComponent(data.topic)}&body=${encodeURIComponent(plain(data))}" style="color:#fff">${TO}</a> directly.`;
    } finally {
      submit.disabled = false; submit.textContent = 'Send message →';
    }
  });

  function showDone(how, d) {
    const first = d.name.split(/\s+/)[0];
    const copy = done.querySelector('.done-copy'), copyBtn = done.querySelector('.done-copy-btn');
    if (how === 'mailto') {
      done.querySelector('h2').textContent = 'Almost there.';
      copy.textContent = `Your email app should open with the message ready to send to ${TO}. If nothing opened, copy it below and send it from any email account.`;
      copyBtn.hidden = false;
    } else {
      done.querySelector('h2').textContent = 'Message sent.';
      copy.textContent = d.email ? `Thanks, ${first}. I’ll reply to ${d.email} as soon as I can.` : 'Thanks! I’ll reply as soon as I can.';
      copyBtn.hidden = true;
    }
    form.hidden = true; done.hidden = false; done.focus({ preventScroll:true });
  }
  done.querySelector('.done-close').addEventListener('click', () => dialog.close());
  done.querySelector('.done-copy-btn').addEventListener('click', async e => {
    try { await navigator.clipboard.writeText(`To: ${TO}\n\n${fallbackText}`); e.target.textContent = 'Copied ✓'; }
    catch { e.target.textContent = 'Select and copy manually'; }
  });

  function open() {
    opener = document.activeElement;
    form.hidden = false; done.hidden = true; clearErrors();
    if (!dialog.open) dialog.showModal();
    (form.elements.topic.value ? form.elements.name : form.querySelector('input[name=topic]')).focus();
  }
  dialog.querySelector('.contact-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });     // click the backdrop to close
  dialog.addEventListener('close', () => { opener && opener.focus && opener.focus({ preventScroll:true }); });

  // Take over every "Get in touch" button (home pill and the end of My process) before the old menu sees it
  window.addEventListener('click', e => {
    const btn = e.target.closest('[data-panel="Get in touch"]');
    if (!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open();
  }, true);
  window.openContact = open;
})();
