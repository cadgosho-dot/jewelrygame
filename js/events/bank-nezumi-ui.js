// Frozen approved bank event UI runs in its own document, isolated from other events.
const CHANNEL = 'jxj-bank-nezumi';
const root = document.getElementById('root');
let phase = 'waiting';
let playerName = 'あなた';
let line = 0;
let buying = false;
let finished = false;
const send = (type, payload = {}) => parent.postMessage({ channel:CHANNEL, type, ...payload }, location.origin);
const sound = (key) => send('sound', { key });
const layout = () => {
  const html = document.documentElement;
  const w = innerWidth, h = innerHeight;
  const orientation = h >= w ? 'portrait' : 'landscape';
  const short = Math.min(w, h), long = Math.max(w, h);
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const device = touch && short <= 620 && long <= 1100 ? 'phone' : touch && short <= 900 ? 'tablet' : 'desktop';
  html.dataset.deviceClass = device;
  html.dataset.orientation = orientation;
  html.dataset.layoutProfile = `${device}-${orientation}`;
  html.style.setProperty('--jwj-layout-width', `${w}px`);
  html.style.setProperty('--jwj-layout-height', `${h}px`);
  html.style.setProperty('--jwj-ui-scale', device === 'phone' ? Math.min(1.08, Math.max(.84, (orientation === 'landscape' ? h : w) / 390)) : 1);
};
layout();
addEventListener('resize', layout);

function stopMovie() {
  const video = document.querySelector('#preview-movie video');
  video?.pause();
  document.getElementById('preview-movie')?.remove();
}
function finish() {
  if (finished || buying) return;
  finished = true;
  stopMovie();
  send('finish');
}
document.getElementById('preview-event-end').onclick = () => { sound('select'); finish(); };

function dialogue(text, onNext) {
  root.innerHTML = '<main class="screen-shell event-shell-no-header"><section class="screen-content"><main class="main-screen kappa-jade-event-screen"><section class="visit-character-event kappa-jade-event"><div class="visit-character-area" aria-hidden="true"><img class="visit-character kappa-character" alt="ネズミ" draggable="false" src="./assets/images/events/bank-nezumi.png"></div><button type="button" id="next" class="event-dialogue-card visit-event-dialogue glass-panel"><small>ネズミ</small><strong></strong><span>タップして進む</span></button></section></main></section></main>';
  document.querySelector('#next > strong').textContent = text;
  document.getElementById('next').onclick = () => { sound('select'); onNext(); };
}
function greeting() {
  stopMovie();
  send('video-end');
  phase = 'greeting';
  const lines = [`なんだ、、、${playerName}か、、、`, '金、経験、暇つぶし、時間、、、、、', '今日は何の用だ？、、、、金か、、、'];
  dialogue(lines[line], () => { if (++line < lines.length) greeting(); else finish(); });
}
function movie() {
  phase = 'movie';
  send('video-start');
  const container = document.createElement('div');
  container.id = 'preview-movie';
  container.innerHTML = '<video playsinline preload="auto" src="./assets/videos/bank-nezumi.mp4"></video><button type="button" id="movie-skip">MOVIEスキップ</button>';
  document.body.append(container);
  const video = container.querySelector('video');
  video.onended = greeting;
  video.onerror = greeting;
  container.querySelector('button').onclick = () => { send('video-end'); sound('select'); greeting(); };
  video.play().catch(() => { if (phase === 'movie') video.controls = true; });
}
function offer() {
  phase = 'offer';
  dialogue('そうだ、、、頼まれていたものが手に入ったが、、、、どうする？、、、', purchase);
}
function purchase() {
  phase = 'purchase';
  root.innerHTML = '<main class="screen-shell event-shell-no-header"><section class="screen-content"><main class="main-screen kappa-jade-event-screen"><section class="visit-character-event kappa-jade-event is-reward"><button type="button" id="capsule-buy" class="kappa-jade-reward-button" aria-label="紫のカプセルを100万円で購入する"><span class="special-item-glow kappa-jade-glow" aria-hidden="true"></span><img src="./assets/images/items/purple-capsule.png" alt="紫のカプセル" draggable="false"><strong>紫のカプセル</strong><strong>1,000,000円</strong><small>タップして購入</small></button></section></main></section></main>';
  document.getElementById('capsule-buy').onclick = () => {
    if (buying || phase !== 'purchase') return;
    buying = true;
    document.getElementById('capsule-buy').disabled = true;
    send('buy');
  };
}
addEventListener('message', (event) => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== CHANNEL) return;
  const data = event.data;
  if (data.type === 'init' && phase === 'waiting') {
    playerName = String(data.playerName || 'あなた');
    if (data.mode === 'purchase') offer(); else movie();
  } else if (data.type === 'purchase-result' && buying) {
    buying = false;
    if (!data.result?.ok) { finish(); return; }
    phase = 'farewell';
    sound('coin');
    dialogue('わかってると思うが酒とは飲むなよ、、、、じゃあな、、、、', finish);
    const feedback = document.createElement('div');
    feedback.id = 'purchase-money';
    feedback.className = 'header-money money-change-active money-loss';
    feedback.innerHTML = '<span class="header-money-value"></span><span class="header-money-change loss">−1,000,000円</span>';
    feedback.firstElementChild.textContent = `${Number(data.result.money).toLocaleString('ja-JP')}円`;
    document.body.append(feedback);
    setTimeout(() => feedback.remove(), 1250);
    setTimeout(() => { if (!finished) sound('success'); }, 180);
  }
});
send('ready');
