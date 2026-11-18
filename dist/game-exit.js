// Both games supply a callback that freezes play and returns its matching resume action.
function installGameExit(link, suspend) {
  const prompt = document.createElement('dialog');
  prompt.className = 'exit-game';
  prompt.setAttribute('aria-labelledby', 'exit-title');
  prompt.innerHTML = '<h2 id="exit-title">Leave this game?</h2><p>You’ll return to Playground. Any unfinished run will end.</p><div><button type="button" autofocus>Keep playing</button><button type="button">Leave game</button></div>';
  document.body.append(prompt);
  let restore;
  function ask() {
    if (prompt.open) return;
    restore = suspend();
    prompt.showModal();
  }
  prompt.addEventListener('close', () => { restore?.(); restore = null; });
  const [stay, leave] = prompt.querySelectorAll('button');
  stay.onclick = () => prompt.close();
  leave.onclick = () => location.replace(link.href);
  link.addEventListener('click', event => { event.preventDefault(); ask(); });
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (prompt.open) prompt.close(); else ask();
  }, true);
  function guardBack() {
    if (!history.state?.arcadeGuard) history.pushState({arcadeGuard:true}, '', location.href);
  }
  guardBack();
  window.addEventListener('popstate', () => { guardBack(); ask(); });
}
