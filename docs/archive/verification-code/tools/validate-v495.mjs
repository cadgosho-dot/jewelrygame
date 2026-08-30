import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { VERSION, DEFAULT_BIRTHDAY, initialState, migrateState } from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const gameHtml = fs.readFileSync(path.join(root, 'game.html'), 'utf8');
const kaitenzushiEmbeddedModule = fs.readFileSync(path.join(root, 'js/kaitenzushi-embedded.js'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  if (!match) throw new Error(`${name}が見つかりません`);
  const bodyStart = match.index + match[0].lastIndexOf('{');
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, i + 1);
    }
  }
  throw new Error(`${name}の終端が見つかりません`);
}

assert(VERSION === '0.10.495', `VERSIONが0.10.495ではありません: ${VERSION}`);
assert(DEFAULT_BIRTHDAY === '04-01', '誕生日の既定値が4月1日ではありません');
assert(sw.includes("const VERSION = '0.10.495'"), 'Service WorkerのVERSIONが古いです');
assert(indexHtml.includes('game.html?v=0.10.495'), 'index.htmlの読込番号が古いです');
assert(gameHtml.includes('js/app.js?v=0.10.495'), 'game.htmlの読込番号が古いです');
assert(app.includes("./daily-gems.js?v=0.10.495"), 'daily-gemsの読込番号が古いです');
const stylesV489 = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert(stylesV489.includes('v0.10.485: 縦画面の上部バー1を大型文字・縦中央・低余白へ調整'), '上部バー1のv0.10.489スタイルがありません');
assert(stylesV489.includes('--jwj-two-bar-info-height:clamp(46px'), '上部バー1の高さ圧縮指定がありません');
assert(stylesV489.includes('font-size:clamp(12px,3.55vw,14.5px)!important'), '上部バー1の文字拡大指定がありません');
assert(stylesV489.includes('justify-content:center!important'), '上部バー1の縦中央指定がありません');
assert(stylesV489.includes('v0.10.486: 原石研磨完成画面の石と結果枠をさらに縮小'), '原石研磨完了画面のv0.10.489スタイルがありません');
assert(stylesV489.includes('width:min(330px,calc(100vw - 36px))'), '通常画面の結果枠縮小指定がありません');
assert(stylesV489.includes('width:min(286px,calc(100vw - 40px))'), '携帯縦画面の結果枠縮小指定がありません');
assert(stylesV489.includes('width:min(112px,28vw,18dvh)'), '通常画面の完成ルース縮小指定がありません');
assert(stylesV489.includes('width:min(88px,28vw,16dvh)'), '携帯縦画面の完成ルース縮小指定がありません');
assert(stylesV489.includes('width:min(92px,18vw,34dvh)'), '低い横画面の完成ルース縮小指定がありません');

assert(stylesV489.includes('v0.10.488 全イベント共通の緊急終了導線：画面上端・左端へ控えめに配置'), 'イベント終了ボタンのv0.10.489スタイルがありません');
assert(stylesV489.includes('top:env(safe-area-inset-top,0px)'), 'イベント終了ボタンが画面上端に配置されていません');
assert(stylesV489.includes('left:env(safe-area-inset-left,0px)'), 'イベント終了ボタンが左詰めではありません');
assert(stylesV489.includes('right:auto'), 'イベント終了ボタンの右寄せ指定が残っています');
assert(stylesV489.includes('min-height:17px'), '携帯用イベント終了ボタンが十分小さくありません');
assert(stylesV489.includes('font-size:7.5px'), '携帯用イベント終了ボタンの文字が小型化されていません');
assert(stylesV489.includes('opacity:.46'), 'イベント終了ボタンが控えめな表示ではありません');


// v0.10.489: meal image returns to the earlier compact direct layout.
assert(!app.includes('<span class="meal-eating-center">'), '食事中画面に大きく表示される一体型ラッパーが残っています');
assert(app.includes('<strong>もぐもぐもぐ...</strong>'), '食事中の「もぐもぐもぐ...」がありません');
assert(app.includes('class="meal-food-display"'), '食事中の料理画像枠がありません');
assert(stylesV489.includes('v0.10.489: 食事中の料理画像を以前のコンパクト表示へ戻し'), '食事中画像のv0.10.489スタイルがありません');
assert(!stylesV489.includes('v0.10.478: 食事画像と「もぐもぐもぐ...」を食事枠の縦横中央へまとめて配置'), '旧一体型食事レイアウトCSSが残っています');
assert(stylesV489.includes('width:min(72vw,320px)!important'), '携帯縦画面の料理画像幅制限がありません');
assert(stylesV489.includes('height:min(28dvh,220px)!important'), '携帯縦画面の料理画像高さ制限がありません');
assert(stylesV489.includes('height:min(34dvh,170px)!important'), '低い横画面の料理画像高さ制限がありません');
assert(stylesV489.includes('transform:none!important'), '料理画像の拡大変形が解除されていません');
assert(stylesV489.includes('.meal-eating-panel > strong'), '「もぐもぐもぐ...」の直接表示指定がありません');

// v0.10.493: meal header and all meal content are structurally isolated in separate grid rows.
assert(app.includes("shellClass: 'meal-eating-shell'"), '食事中画面に専用シェルクラスがありません');
assert(app.includes("String(options.shellClass || '').trim()"), 'shellが画面固有シェルクラスを受け取れません');
assert(app.includes("shellEl.classList.contains('meal-eating-shell')"), '食事中の通常フロー配置を動的余白処理が認識していません');
assert(stylesV489.includes('v0.10.493: 食事中は上部バーと全表示を通常フローの別行へ分離'), '食事画面の構造的な重なり防止CSSがありません');
assert(stylesV489.includes('grid-template-rows:auto minmax(0,1fr)!important'), '食事中の上部バーと本文が別行になっていません');
assert(stylesV489.includes('.meal-eating-shell > .game-header'), '食事中の上部バー専用配置がありません');
assert(stylesV489.includes('position:relative!important'), '食事中の上部バーが通常フローへ戻されていません');
assert(stylesV489.includes('.meal-eating-shell > .meal-eating-screen-content'), '食事中本文の専用配置がありません');
assert(stylesV489.includes('grid-row:2!important'), '食事中本文が上部バーの次の行に固定されていません');

const kaitenzushiHtmlV490 = fs.readFileSync(path.join(root, 'assets/minigames/kaitenzushi/game/index.html'), 'utf8');
assert(app.includes("from './kaitenzushi-embedded.js?v=0.10.495'"), '回転寿司の埋め込み文書モジュールを読み込んでいません');
assert(app.includes('frame.srcdoc = kaitenzushiEmbeddedDocument()'), '回転寿司をsrcdocで直接起動していません');
assert(app.includes("if ('srcdoc' in frame)"), 'srcdoc対応判定がありません');
assert(app.includes('frame.src = kaitenzushiFrameSource()'), '古いブラウザ向けURLフォールバックがありません');
assert(app.includes("message.type === 'ready'"), '回転寿司の起動完了通知処理がありません');
assert(app.includes('12000'), '回転寿司の起動完了待機時間が短いままです');
assert(gameHtml.includes("'nonce-jxj-kaitenzushi'"), 'srcdoc内スクリプトを許可するCSP nonceがありません');
assert(sw.includes("'./js/kaitenzushi-embedded.js?v=0.10.495'"), 'Service Workerのコアキャッシュに埋め込み文書モジュールがありません');
assert(kaitenzushiEmbeddedModule.includes('nonce=\\\"jxj-kaitenzushi\\\"'), '埋め込み文書のscriptにnonceがありません');
assert(kaitenzushiEmbeddedModule.includes('__JXJ_CONFIG__'), '埋め込み文書の設定プレースホルダーがありません');
assert(kaitenzushiEmbeddedModule.includes('./assets/minigames/kaitenzushi/assets/'), '埋め込み文書のアセットパスが親ゲーム基準へ変換されていません');
assert(!kaitenzushiEmbeddedModule.includes('../assets/'), '埋め込み文書に元の相対アセットパスが残っています');
assert(kaitenzushiHtmlV490.includes('document.documentElement.dataset.jxjConfig || window.location.hash'), '静的文書とsrcdocの両方で設定を受け取れません');
assert(kaitenzushiHtmlV490.includes('data-jxj-kaitenzushi="1"'), '回転寿司文書の識別マーカーがありません');
assert(kaitenzushiHtmlV490.includes('sendIntegrationMessage("ready")'), '回転寿司の起動完了通知がありません');
assert(!kaitenzushiHtmlV490.includes('onerror="'), 'CSPで停止するインラインイベント属性が残っています');
assert(sw.includes('async function kaitenzushiDocumentNetworkFirst(request)'), '古いブラウザ向けService Worker取得処理がありません');


// v0.10.494: store staff entries in the daily result are rendered one staff per line.
assert(app.includes('class="day-result-store-staff"'), '1日の結果に店舗スタッフ専用行がありません');
assert(app.includes('class="day-result-staff-list"'), '店舗スタッフの縦一覧コンテナがありません');
assert(app.includes('class="day-result-staff-entry"'), 'スタッフごとの改行要素がありません');
assert(app.includes(".join('') : '<span class=\"day-result-staff-entry\">なし</span>'"), '複数スタッフが読点連結のままです');
assert(stylesV489.includes('v0.10.494 1日の結果・店舗スタッフをスタッフごとに改行'), '店舗スタッフ改行用CSSがありません');
assert(stylesV489.includes('.day-result-staff-list{'), '店舗スタッフ一覧のCSSがありません');
assert(stylesV489.includes('display:grid;'), '店舗スタッフ一覧が縦配置ではありません');



// v0.10.495: compact labels prevent upper-bar text collisions on narrow phones.
assert(app.includes('class="header-compact-label"'), '小型端末用の短縮ラベルがありません');
assert(app.includes('${currentDate.getMonth() + 1}/${currentDate.getDate()}'), '日付の短縮表示がありません');
assert(app.includes('<span class="header-compact-label">空腹 </span>'), '空腹度の短縮表示がありません');
assert(stylesV489.includes('v0.10.495: 小型携帯で上部バー1の文字が重ならない可変コンパクト表示'), '小型端末用の上部バー1 CSSがありません');
assert(stylesV489.includes('(max-width:360px)'), '360px以下の小型端末条件がありません');
assert(stylesV489.includes('grid-template-columns:minmax(0,1fr) minmax(68px,31vw)'), '小型端末の情報・所持金領域配分がありません');
assert(stylesV489.includes('text-overflow:ellipsis'), '長い名前・所持金の省略処理がありません');

assert(initialState().migrations.illnessPaymentBirthdayOverlapV481 === true, '新規データにv481移行済み印がありません');
assert(initialState().migrations.illnessPaymentBirthdayOverlapV481PaymentPending === false, '新規データの支払い再確認待ちがfalseではありません');

function stoppedSave({
  startDate = '2027-01-01', day = 1, minutes = 540, hunger = 0,
  transitionPhase = 'morningPending', toDay = 1, birthdayActive = true,
  birthdayStage = 'greeting', birthdayCompletedYear = 2027, illness = true,
} = {}) {
  const saved = initialState();
  saved.version = '0.10.480';
  saved.game.startDate = startDate;
  saved.game.day = day;
  saved.game.minutes = minutes;
  saved.game.screen = birthdayActive ? 'birthdaySleepEvent' : 'main';
  saved.game.dayTransition = {
    phase: transitionPhase,
    fromDay: transitionPhase === 'settling' ? Math.max(1, day - 1) : 0,
    toDay,
    startedDateKey: '',
    morningDateKey: transitionPhase === 'morningPending' ? startDate : '',
    overlapRecoveryCount: 0,
  };
  saved.settings.birthday = '04-01';
  saved.wellbeing.hunger = hunger;
  saved.events.winterColdEvent = {
    active: illness,
    stage: illness ? 'sick' : 'idle',
    seasonKey: '2026-2027',
    lastCompletedSeason: '',
    lastCheckedDate: startDate,
    startDay: day,
    daysCompleted: illness ? 1 : 0,
    totalTriggered: illness ? 1 : 0,
    recoveryNoticePending: false,
  };
  saved.events.birthdaySleepEvent = {
    active: birthdayActive,
    stage: birthdayStage,
    eventYear: birthdayCompletedYear,
    lastCompletedYear: birthdayCompletedYear,
  };
  saved.migrations = { ...saved.migrations, birthdayDefaultAprilV480: true };
  delete saved.migrations.illnessPaymentBirthdayOverlapV481;
  return saved;
}

// 1月1日＋月初支払い日＋体調不良＋旧誕生日イベント＋朝処理中。
{
  const saved = stoppedSave();
  saved.business.lastProcessedMonth = '2026-12';
  const migrated = migrateState(saved);
  assert(migrated.migrations.illnessPaymentBirthdayOverlapV481 === true, 'v481移行済み印が付きません');
  assert(migrated.game.screen === 'main', '停止画面からメインへ戻りません');
  assert(migrated.game.dayTransition.phase === 'idle', 'morningPendingが解除されません');
  assert(migrated.game.minutes === 540, '翌朝9時へ正規化されません');
  assert(migrated.wellbeing.hunger === 7, '翌朝の空腹度が7へ戻りません');
  assert(migrated.events.winterColdEvent.active && migrated.events.winterColdEvent.stage === 'sick', '療養状態が維持されません');
  assert(!migrated.events.birthdaySleepEvent.active && migrated.events.birthdaySleepEvent.stage === 'idle', '旧誕生日イベントが待機状態へ戻りません');
  assert(migrated.events.birthdaySleepEvent.lastCompletedYear === 0, '旧1月1日の完了年が4月1日を妨げます');
  assert(migrated.business.lastProcessedMonth === '2026-12', '固定費の処理済みキーを変更しています');
  assert(migrated.migrations.illnessPaymentBirthdayOverlapV481PaymentPending === true, '翌朝の支払い再確認待ちが保存されません');
}

// 旧誕生日が完了扱いだけ残った停止データも4月1日を塞がない。
{
  const saved = stoppedSave({ transitionPhase: 'idle', birthdayActive: false, birthdayStage: 'completed' });
  const migrated = migrateState(saved);
  assert(migrated.events.birthdaySleepEvent.stage === 'idle', '1月1日の古い完了状態を解除できません');
  assert(migrated.events.birthdaySleepEvent.lastCompletedYear === 0, '古い完了年を解除できません');
}

// 日付が進む前に中断した場合は、日付・時刻・空腹度を変更しない。
{
  const saved = stoppedSave({ day: 10, startDate: '2027-01-01', minutes: 1140, hunger: 0, transitionPhase: 'settling', toDay: 11 });
  const migrated = migrateState(saved);
  assert(migrated.game.day === 10, '日付進行前の保存を翌日に進めています');
  assert(migrated.game.minutes === 1140, '日付進行前の時刻を変更しています');
  assert(migrated.wellbeing.hunger === 0, '日付進行前の空腹度を変更しています');
  assert(migrated.game.dayTransition.phase === 'idle', '日付進行前のロックを解除できません');
}

// 正常な療養中データは変更しない。
{
  const saved = stoppedSave({ startDate: '2027-01-02', transitionPhase: 'idle', birthdayActive: false, birthdayStage: 'idle', birthdayCompletedYear: 0, hunger: 3 });
  const migrated = migrateState(saved);
  assert(migrated.wellbeing.hunger === 3, '正常な療養中の空腹度を変更しています');
  assert(migrated.events.winterColdEvent.stage === 'sick', '正常な療養状態を変更しています');
}

// 祝日・支払日だけで体調不良ではないデータは変更しない。
{
  const saved = stoppedSave({ illness: false, birthdayActive: false, birthdayStage: 'idle', birthdayCompletedYear: 0, transitionPhase: 'idle', hunger: 0 });
  const migrated = migrateState(saved);
  assert(migrated.wellbeing.hunger === 0, '体調不良でないデータを誤復旧しています');
}

for (const marker of [
  'function resetStaleBirthdayEventForIllness',
  'function reconcileMorningPaymentsIdempotently',
  'function repairIllnessPaymentBirthdayOverlapV481',
  'repairIllnessPaymentBirthdayOverlapV481({ save: true });',
  'completeMorningTransition({ save: true });',
  'state.migrations.illnessPaymentBirthdayOverlapV481 = true;',
]) assert(app.includes(marker), `実装マーカーが不足しています: ${marker}`);
assert((app.match(/repairIllnessPaymentBirthdayOverlapV481/g) || []).length >= 7, '読み込み・描画・翌日処理への接続が不足しています');

function runtimeContext({ phase = 'morningPending', day = 1, toDay = 1, minutes = 540, hunger = 0, birthdayActive = true, birthdayStage = 'greeting', lastCompletedYear = 2027, paymentPending = false } = {}) {
  let monthlyCalls = 0;
  let homeCalls = 0;
  let saves = 0;
  const transition = { phase, fromDay: phase === 'settling' ? Math.max(1, day - 1) : 0, toDay, startedDateKey: '', morningDateKey: '', overlapRecoveryCount: 0 };
  const birthday = { active: birthdayActive, stage: birthdayStage, eventYear: 2027, lastCompletedYear };
  const state = {
    game: { day, minutes, screen: birthdayActive ? 'birthdaySleepEvent' : 'main', dayTransition: transition },
    wellbeing: { hunger, maxHunger: 7 },
    settings: { birthday: '04-01' },
    events: {
      winterColdEvent: { active: true, stage: 'sick', daysCompleted: 1 },
      birthdaySleepEvent: birthday,
    },
    migrations: { illnessPaymentBirthdayOverlapV481PaymentPending: paymentPending },
  };
  const context = {
    state,
    screen: state.game.screen,
    screenData: { x: 1 },
    navigation: [{}],
    sleepTransitioning: false,
    DAY_START_MINUTES: 540,
    DEFAULT_BIRTHDAY: '04-01',
    ILLNESS_SUPPRESSED_EVENT_SCREENS: new Set(['birthdaySleepEvent']),
    illnessEventSuppressionActive: () => true,
    dayTransitionState: () => transition,
    birthdaySleepEventState: () => birthday,
    gameDate: () => new Date(2027, 0, 1, 12),
    birthdayMatchesDate: () => false,
    configuredBirthday: () => '04-01',
    clearTransientEventRuntime() {},
    suppressAllTransientEventsForIllness() { return 1; },
    processMonthlyFixedCosts() { monthlyCalls += 1; },
    processHomeRent() { homeCalls += 1; },
    completeMorningTransition() {
      transition.phase = 'idle'; transition.fromDay = 0; transition.toDay = 0; transition.startedDateKey = ''; transition.morningDateKey = '';
      return true;
    },
    saveGame() { saves += 1; return Promise.resolve(); },
    console,
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, 'resetStaleBirthdayEventForIllness'),
    extractFunction(app, 'reconcileMorningPaymentsIdempotently'),
    extractFunction(app, 'repairIllnessPaymentBirthdayOverlapV481'),
  ].join('\n'), context);
  return { context, stats: () => ({ monthlyCalls, homeCalls, saves }) };
}

// 実行時復旧：支払いは冪等関数を1回だけ確認し、誕生日と朝ロックを解除。
{
  const { context, stats } = runtimeContext();
  assert(context.repairIllnessPaymentBirthdayOverlapV481({ save: true }) === true, '実行時の重複停止を復旧できません');
  assert(context.screen === 'main' && context.state.game.screen === 'main', '実行時復旧後にメインへ戻りません');
  assert(context.state.wellbeing.hunger === 7, '実行時復旧後の空腹度が7ではありません');
  assert(context.state.game.dayTransition.phase === 'idle', '実行時復旧後に朝ロックが残ります');
  assert(context.state.events.birthdaySleepEvent.stage === 'idle' && context.state.events.birthdaySleepEvent.lastCompletedYear === 0, '4月1日を妨げる誕生日状態が残ります');
  assert(context.state.migrations.illnessPaymentBirthdayOverlapV481PaymentPending === false, '支払い再確認待ちが解除されません');
  assert(stats().monthlyCalls === 1 && stats().homeCalls === 1, '支払いの冪等確認回数が不正です');
  assert(context.repairIllnessPaymentBirthdayOverlapV481({ save: true }) === false, '復旧処理が二重実行されます');
  assert(stats().monthlyCalls === 1 && stats().homeCalls === 1, '再実行で支払い処理を呼び出しています');
}


// 移行時に日付境界だけ先に解除した保存も、支払い再確認待ちから一度だけ整合させる。
{
  const { context, stats } = runtimeContext({ phase: 'idle', birthdayActive: false, birthdayStage: 'idle', lastCompletedYear: 0, paymentPending: true });
  context.screen = 'main';
  context.state.game.screen = 'main';
  assert(context.repairIllnessPaymentBirthdayOverlapV481({ save: true }) === true, '支払い再確認待ちの復旧に失敗しました');
  assert(stats().monthlyCalls === 1 && stats().homeCalls === 1, '支払い再確認待ちで冪等処理を呼べません');
  assert(context.state.migrations.illnessPaymentBirthdayOverlapV481PaymentPending === false, '支払い再確認待ちが残ります');
  assert(context.repairIllnessPaymentBirthdayOverlapV481() === false, '支払い再確認待ちを二重処理しています');
  assert(stats().monthlyCalls === 1 && stats().homeCalls === 1, '支払い再確認を二重実行しています');
}

// 日付進行前の実行時復旧では支払い・空腹回復を行わない。
{
  const { context, stats } = runtimeContext({ phase: 'settling', day: 10, toDay: 11, minutes: 1140, hunger: 0 });
  assert(context.repairIllnessPaymentBirthdayOverlapV481() === true, '日付進行前の実行時復旧に失敗しました');
  assert(context.state.game.minutes === 1140 && context.state.wellbeing.hunger === 0, '日付進行前の状態を変更しています');
  assert(stats().monthlyCalls === 0 && stats().homeCalls === 0, '日付進行前に支払いを再確認しています');
}

// v0.10.489: 12月23日〜1月3日は体調不良イベントを発生させない。
{
  const context = { Date };
  vm.createContext(context);
  vm.runInContext(extractFunction(app, 'winterColdBlackoutDate'), context);
  assert(context.winterColdBlackoutDate(new Date(2026, 11, 22, 12)) === false, '12月22日が停止期間に含まれています');
  assert(context.winterColdBlackoutDate(new Date(2026, 11, 23, 12)) === true, '12月23日が停止期間に含まれていません');
  assert(context.winterColdBlackoutDate(new Date(2026, 11, 31, 12)) === true, '12月31日が停止期間に含まれていません');
  assert(context.winterColdBlackoutDate(new Date(2027, 0, 1, 12)) === true, '1月1日が停止期間に含まれていません');
  assert(context.winterColdBlackoutDate(new Date(2027, 0, 3, 12)) === true, '1月3日が停止期間に含まれていません');
  assert(context.winterColdBlackoutDate(new Date(2027, 0, 4, 12)) === false, '1月4日が停止期間に含まれています');
}

function coldBlackoutRuntime(date, { active = false, stage = 'idle' } = {}) {
  let saveCalls = 0;
  let effectCalls = 0;
  let setScreenCalls = 0;
  const cold = {
    active,
    stage,
    seasonKey: '2026-2027',
    lastCompletedSeason: '',
    lastCheckedDate: '',
    startDay: 88,
    daysCompleted: stage === 'sick' ? 1 : 0,
    totalTriggered: active ? 1 : 0,
    recoveryNoticePending: true,
  };
  const context = {
    Date,
    state: { game: { screen: stage === 'idle' ? 'main' : 'winterColdEvent' }, events: { winterColdEvent: cold } },
    screen: stage === 'idle' ? 'main' : 'winterColdEvent',
    screenData: { stale: true },
    navigation: [{ screen: 'main' }],
    winterColdMorningBriefPending: true,
    sleepCurtainEl: { classList: { remove() {} } },
    gameDate: () => date,
    dateKey: (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`,
    winterColdEventState: () => cold,
    scheduleWinterColdTextEffect: () => { effectCalls += 1; },
    saveGame: () => { saveCalls += 1; return Promise.resolve(); },
    isAlienAbducted: () => false,
    illnessEventSuppressionActive: () => cold.active && cold.stage === 'sick',
    resumeWinterColdEvent: () => false,
    DAY_START_MINUTES: 540,
    winterColdSeasonKey: () => '2026-2027',
    winterColdRemainingDays: () => 30,
    setScreen() { setScreenCalls += 1; },
    playSfx() {},
    setTimeout() {},
    vibrate() {},
    console,
  };
  context.state.game.minutes = 540;
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, 'winterColdBlackoutDate'),
    extractFunction(app, 'cancelWinterColdDuringBlackout'),
    extractFunction(app, 'maybeStartWinterColdEvent'),
  ].join('\n'), context);
  return { context, cold, stats: () => ({ saveCalls, effectCalls, setScreenCalls }) };
}

// 停止期間中は抽選値が0でも新規発生しない。
{
  const { context, cold, stats } = coldBlackoutRuntime(new Date(2026, 11, 23, 12));
  assert(context.maybeStartWinterColdEvent(0) === false, '12月23日に体調不良イベントが発生します');
  assert(cold.active === false && cold.totalTriggered === 0, '停止期間中に発生回数が増えています');
  assert(stats().setScreenCalls === 0, '12月23日にイベント画面へ遷移しています');
}
{
  const { context, cold, stats } = coldBlackoutRuntime(new Date(2027, 0, 3, 12));
  assert(context.maybeStartWinterColdEvent(0) === false, '1月3日に体調不良イベントが発生します');
  assert(cold.active === false, '1月3日に体調不良状態になっています');
  assert(stats().setScreenCalls === 0, '1月3日にイベント画面へ遷移しています');
}

// 旧保存や12月22日開始分が停止期間へ持ち越された場合も、その場で解除する。
{
  const { context, cold, stats } = coldBlackoutRuntime(new Date(2027, 0, 1, 12), { active: true, stage: 'sick' });
  assert(context.cancelWinterColdDuringBlackout({ save: true }) === true, '停止期間中の既存体調不良を解除できません');
  assert(cold.active === false && cold.stage === 'idle', '停止期間中に体調不良状態が残ります');
  assert(cold.daysCompleted === 0 && cold.startDay === 0, '停止期間中の療養進行が残ります');
  assert(cold.lastCompletedSeason === '', '停止期間による解除を季節完了扱いにしています');
  assert(context.screen === 'main' && context.state.game.screen === 'main', '体調不良画面からメインへ戻りません');
  assert(stats().saveCalls === 1 && stats().effectCalls === 1, '解除後の保存または表示復旧が実行されません');
}

// 期間外は既存の抽選処理を維持する。
{
  const { context, cold, stats } = coldBlackoutRuntime(new Date(2027, 0, 4, 12));
  assert(context.maybeStartWinterColdEvent(0) === true, '1月4日に通常抽選が再開しません');
  assert(cold.active === true && cold.stage === 'intro' && cold.totalTriggered === 1, '期間外の体調不良イベント発生処理が壊れています');
  assert(stats().setScreenCalls === 1, '1月4日にイベント画面へ遷移しません');
}

assert(app.includes('cancelWinterColdDuringBlackout();\n  repairIllnessBirthdayDeadlock();'), '翌日処理開始時の停止期間解除がありません');
assert(app.includes('const cancelledForBlackout = cancelWinterColdDuringBlackout();'), '翌朝の日付確定後に停止期間を再確認していません');

console.log('v0.10.495 年末年始の体調不良停止期間検査: OK');
console.log('- 12月23日〜1月3日を両端含みで抽選対象外');
console.log('- 停止期間へ持ち越された既存のintro／sick状態も自動解除');
console.log('- 1月4日以降は通常の冬季抽選を再開');
console.log('- v0.10.481の1月1日・支払い・誕生日重複停止復旧を維持');


// v0.10.493: all 19 user-provided tool images must be physically present and packaged.
const toolImagesV493 = [
  'piercing-saw.png','nipper.png','electronic-scale.png','wood-block.png','dividers.png','milgrain-tool.png',
  'rolling-mill.png','file.png','pliers.png','torch.png','hammer.png','magnifier.png','bench-peg.png','graver.png',
  'engraving-block.png','stamps.png','rotary-tool.png','buffer.png','ultrasonic-cleaner.png',
];
const gameDataTextV493 = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
for (const filename of toolImagesV493) {
  const assetPath = path.join(root, 'assets/images/tools', filename);
  assert(fs.existsSync(assetPath), `工具画像がありません: ${filename}`);
  const bytes = fs.readFileSync(assetPath);
  assert(bytes.length > 32, `工具画像が空です: ${filename}`);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `PNGではありません: ${filename}`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  assert(width > 0 && height > 0, `画像寸法が不正です: ${filename}`);
  assert(bitDepth === 8 && colorType === 6, `RGBA PNGではありません: ${filename}`);
  assert(sw.includes(`./assets/images/tools/${filename}`), `Service Worker参照がありません: ${filename}`);
  assert(gameDataTextV493.includes(`./assets/images/tools/${filename}`), `データ参照がありません: ${filename}`);
}
console.log(`v0.10.495 validation passed: ${toolImagesV493.length} tool images implemented including buffer.png.`);
