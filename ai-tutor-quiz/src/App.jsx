import { useState, useEffect, useCallback } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import questionsData from './data/questions.json';

// ============================================================
// ロジック（出題・採点・講評）。v2 デザイン適用時も変更していません
// ============================================================

// --- Constants ---
const CATEGORY_CONFIG = [
  { rank: 1, label: '基礎知識', key: 'A', count: 2 },
  { rank: 2, label: '心構え', key: 'B', count: 2 },
  { rank: 3, label: 'ヒアリング', key: 'C', count: 3 },
  { rank: 4, label: '業務分析', key: 'D', count: 3 },
  { rank: 5, label: '提案・高度知識', key: 'E', count: 2 },
];

const LEVEL_MAP = [0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 10];

// --- Utility ---
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectQuestions() {
  const selected = [];
  for (const cat of CATEGORY_CONFIG) {
    const pool = questionsData.filter(q => q.rank === cat.rank);
    const picked = shuffle(pool).slice(0, cat.count);
    selected.push(...shuffle(picked));
  }
  return selected;
}

function getLevel(score) {
  return LEVEL_MAP[Math.min(score, 12)];
}

function getCommentary(level, categoryScores) {
  const lines = [];

  // Overall
  if (level === 10) {
    lines.push('全問正解、素晴らしい成績です。AIチューターとして即戦力のレベルです。');
  } else if (level >= 8) {
    lines.push('合格です。AIチューターとして必要な知識とスキルを十分に備えています。');
  } else if (level >= 6) {
    lines.push('あと一歩で合格です。基礎力はありますが、いくつかの領域で強化が必要です。');
  } else if (level >= 4) {
    lines.push('基本的な知識は身についていますが、実践的なスキルに課題があります。');
  } else {
    lines.push('基礎からの学び直しをお勧めします。カリキュラムの復習から始めましょう。');
  }

  // Strengths
  for (const cs of categoryScores) {
    if (cs.rate === 100) {
      lines.push(`【${cs.label}】は満点です。この領域の理解は完璧です。`);
    }
  }

  // Weaknesses
  const weakMap = {
    '基礎知識': 'AI・LLMの基本概念（マトリョーシカ構造、Transformer、ハルシネーション等）を復習してください。',
    '心構え': 'チューターの伴走姿勢や心理的安全性の5原則を再確認してください。',
    'ヒアリング': 'ヒアリングの5ステップと質問技法（オープン質問・限定質問・深掘り質問）を重点的に学習してください。',
    '業務分析': '4ステップ思考法、ボトルネック3視点とAI代替3軸の使い分け、ムダ・ムリ・ムラの判定を強化してください。',
    '提案・高度知識': 'プロンプトエンジニアリング5原則、LLMの学習3ステップ、RAGの仕組みと限界を復習してください。',
  };
  for (const cs of categoryScores) {
    if (cs.rate <= 50) {
      lines.push(weakMap[cs.label] || '');
    }
  }

  // Next step
  if (level >= 8) {
    lines.push('認定おめでとうございます。次は実際の現場でのヒアリングと改善提案に取り組みましょう。');
  } else {
    lines.push('弱点カテゴリーを中心にカリキュラムを復習し、再チャレンジしてください。');
  }

  return lines.filter(Boolean);
}

// ============================================================
// 見た目（v2）。ここから下がデザイン層
// ============================================================

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];
const CAT_HEX = { 1: '#7c6cf6', 2: '#ffb224', 3: '#22c58b', 4: '#4c8dff', 5: '#fc6044' };
const CAT_TOKEN = { 1: 'bg-cat-1', 2: 'bg-cat-2', 3: 'bg-cat-3', 4: 'bg-cat-4', 5: 'bg-cat-5' };
const INK = '#141a2e';

const BTN_PRIMARY =
  'sticker sticker-lift inline-flex h-[60px] items-center justify-center gap-3 rounded-full bg-brand px-8 text-[17px] font-black text-white shadow-[5px_5px_0_var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:h-16 lg:px-9 lg:text-lg';
const BTN_SECONDARY =
  'sticker sticker-lift inline-flex h-[60px] items-center justify-center gap-3 rounded-full bg-white px-7 text-[17px] font-black text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:h-16 lg:text-lg';

function ArrowIcon({ dir = 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === 'right' ? <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></> : <><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></>}
    </svg>
  );
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (reducedMotion()) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// --- Header ---
function AppHeader({ progress, status, inverted = false }) {
  return (
    <header className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-8">
      <span className={'inline-flex h-9 items-center gap-2 rounded-full pl-2.5 pr-3.5 text-sm font-black ' + (inverted ? 'bg-white text-ink' : 'bg-ink text-white')}>
        <span aria-hidden="true" className="size-4 rounded-full bg-brand" />
        AI TUTOR
      </span>
      {progress && (
        <span aria-label={`進捗 ${progress.index + 1}問目 / ${progress.total}問`} className="inline-flex h-9 items-center gap-2 rounded-full border-2 border-ink bg-white px-3 text-[13px] font-bold text-ink">
          <span aria-hidden="true" className="flex items-center gap-1">
            {Array.from({ length: progress.total }, (_, i) => {
              const s = i < progress.index ? 'bg-ink' : i === progress.index ? 'bg-brand border-brand ring-2 ring-brand ring-offset-2 ring-offset-white' : 'bg-white';
              return <span key={i} className={`size-2 rounded-full border-2 border-ink sm:size-2.5 ${s}`} />;
            })}
          </span>
          {progress.index + 1} / {progress.total}
        </span>
      )}
      {status && (
        <span className={'ml-auto hidden h-9 items-center rounded-full border-2 px-3.5 text-[13px] font-bold sm:inline-flex ' + (inverted ? 'border-white text-white' : 'border-ink bg-white text-ink')}>
          {status}
        </span>
      )}
    </header>
  );
}

// --- Scene (カテゴリ別の幾何学図形) ---
function Scene({ rank, className = '' }) {
  const label = rank ? `${CATEGORY_CONFIG.find(c => c.rank === rank)?.label}を表す図形` : '5つの分野を表す図形';
  return (
    <div role="img" aria-label={label} className={'relative overflow-hidden rounded-3xl border-2 border-ink bg-[var(--scene)] shadow-[5px_5px_0_var(--color-ink)] lg:rounded-[40px] lg:shadow-[8px_8px_0_var(--color-ink)] ' + className}>
      <svg viewBox="0 0 520 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 size-full">
        {rank === 1 && (<>
          <g stroke="#fff" strokeWidth="4" fill="none"><path d="M110 120 L230 330 L370 160 L440 360" /><path d="M110 120 L370 160" /></g>
          <circle cx="110" cy="120" r="30" fill="#ffb224" stroke={INK} strokeWidth="4" />
          <circle cx="230" cy="330" r="38" fill="#ffb224" stroke={INK} strokeWidth="4" className="motion-safe:animate-float" />
          <circle cx="370" cy="160" r="46" fill="#fff" stroke={INK} strokeWidth="4" /><circle cx="370" cy="160" r="16" fill={INK} />
          <circle cx="440" cy="360" r="30" fill="#fc6044" stroke={INK} strokeWidth="4" />
        </>)}
        {rank === 2 && (<>
          <circle cx="260" cy="230" r="150" fill="#fc6044" stroke={INK} strokeWidth="4" className="motion-safe:animate-float" />
          <circle cx="260" cy="230" r="96" fill="#fff1d6" stroke={INK} strokeWidth="4" /><circle cx="260" cy="230" r="40" fill={INK} />
          <path d="M60 470 Q 260 380 460 470" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <circle cx="90" cy="110" r="18" fill="#fff" stroke={INK} strokeWidth="4" /><circle cx="440" cy="420" r="26" fill="#7c6cf6" stroke={INK} strokeWidth="4" />
        </>)}
        {rank === 3 && (<>
          <path d="M120 300 a140 140 0 0 1 280 0" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          <path d="M170 300 a90 90 0 0 1 180 0" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          <circle cx="260" cy="300" r="40" fill="#ffb224" stroke={INK} strokeWidth="4" className="motion-safe:animate-float" />
          <rect x="90" y="360" width="340" height="60" rx="30" fill="#fff" stroke={INK} strokeWidth="4" />
          <circle cx="130" cy="390" r="12" fill={INK} /><circle cx="170" cy="390" r="12" fill={INK} /><circle cx="210" cy="390" r="12" fill={INK} />
          <circle cx="430" cy="110" r="26" fill="#fc6044" stroke={INK} strokeWidth="4" />
        </>)}
        {rank === 4 && (<>
          <rect x="90" y="90" width="150" height="150" rx="24" fill="#fff" stroke={INK} strokeWidth="4" />
          <rect x="280" y="90" width="150" height="150" rx="24" fill="#ffb224" stroke={INK} strokeWidth="4" />
          <rect x="90" y="280" width="150" height="150" rx="24" fill="#fc6044" stroke={INK} strokeWidth="4" />
          <rect x="280" y="280" width="150" height="150" rx="24" fill="#fff" stroke={INK} strokeWidth="4" className="motion-safe:animate-float" />
          <path d="M240 165 h40 M165 240 v40 M355 240 v40 M240 355 h40" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <circle cx="355" cy="355" r="30" fill={INK} />
        </>)}
        {rank === 5 && (<>
          <rect x="70" y="330" width="90" height="150" rx="18" fill="#fff" stroke={INK} strokeWidth="4" />
          <rect x="190" y="250" width="90" height="230" rx="18" fill="#ffb224" stroke={INK} strokeWidth="4" />
          <rect x="310" y="150" width="90" height="330" rx="18" fill="#7c6cf6" stroke={INK} strokeWidth="4" />
          <g className="motion-safe:animate-float"><circle cx="430" cy="100" r="40" fill="#fff" stroke={INK} strokeWidth="4" /><path d="M412 100 l18 -18 l18 18 M430 82 l0 40" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></g>
          <path d="M60 110 Q 180 60 300 110" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" strokeDasharray="2 16" />
        </>)}
        {!rank && (<>
          <circle cx="170" cy="190" r="120" fill="#ffb224" stroke={INK} strokeWidth="4" className="motion-safe:animate-float" />
          <rect x="300" y="300" width="60" height="180" rx="14" fill="#22c58b" stroke={INK} strokeWidth="4" />
          <rect x="376" y="240" width="60" height="240" rx="14" fill="#22c58b" stroke={INK} strokeWidth="4" />
          <rect x="452" y="170" width="60" height="310" rx="14" fill="#22c58b" stroke={INK} strokeWidth="4" />
          <g stroke="#fff" strokeWidth="4"><line x1="120" y1="430" x2="230" y2="370" /><line x1="120" y1="430" x2="190" y2="500" /><line x1="230" y1="370" x2="190" y2="500" /></g>
          <g fill="#7c6cf6" stroke={INK} strokeWidth="4"><circle cx="120" cy="430" r="26" /><circle cx="230" cy="370" r="26" /><circle cx="190" cy="500" r="26" /></g>
          <circle cx="440" cy="110" r="22" fill="#4c8dff" stroke={INK} strokeWidth="4" />
        </>)}
      </svg>
    </div>
  );
}

// --- Screens ---

function StartScreen({ onStart }) {
  return (
    <main className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-center gap-5 px-4 pb-10 pt-2 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-14 lg:pt-6">
      <Scene className="order-first h-[190px] lg:order-last lg:aspect-square lg:h-auto lg:max-h-[560px]" />
      <div className="flex flex-col gap-5 lg:gap-6">
        <span className="inline-flex items-center gap-2 text-[13px] font-bold tracking-wider text-brand sm:text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.4 5.7 20.8 8 13.6 2 9.2h7.6z" /></svg>
          全12問 ・ 4択 ・ 約12分
        </span>
        <h1 className="text-4xl font-black leading-[1.15] tracking-tight lg:text-[56px]">AIチューター<br />認定試験</h1>
        <p className="text-[15px] leading-[1.85] text-ink-soft lg:text-[17px]">
          5つのカテゴリー（基礎知識・心構え・ヒアリング・業務分析・提案）から難易度順に出題されます。全100問の中からランダムに12問が選ばれます。
        </p>

        <ul className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
          {CATEGORY_CONFIG.map(c => (
            <li key={c.rank} className="sticker flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-[3px_3px_0_var(--color-ink)] lg:gap-2.5 lg:px-4">
              <b className="flex items-center gap-2 text-[14px] font-black">
                <span aria-hidden="true" className={`size-3 rounded-[4px] border-2 border-ink ${CAT_TOKEN[c.rank]}`} />
                {c.label}
              </b>
              <span className="ml-auto text-xs font-bold text-ink-muted lg:ml-0">{c.count}問</span>
            </li>
          ))}
        </ul>

        <ol className="flex flex-col gap-2">
          {[
            '選択肢を選んで「次へ」。前の問題にも戻れます。',
            '合格ラインは12問中9問以上（75%）。',
            '終了後にスコア・レベル・カテゴリー別の結果と講評を表示します。',
          ].map((r, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-[1.7] text-ink-soft lg:text-[15px]">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-black text-white">{i + 1}</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>

        <div>
          <button type="button" onClick={onStart} className={BTN_PRIMARY + ' w-full lg:w-auto'}>
            試験を開始する<ArrowIcon />
          </button>
        </div>
      </div>
    </main>
  );
}

function QuizScreen({ questions, answers, currentIndex, onSelect, onNext, onPrev }) {
  const q = questions[currentIndex];
  const catConfig = CATEGORY_CONFIG.find(c => c.rank === q.rank);
  const selected = answers[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <main className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-start gap-4 px-4 pb-10 pt-1 lg:grid-cols-[1.1fr_.9fr] lg:gap-12 lg:px-8 lg:pb-14 lg:pt-4">
      <div key={q.id} className="flex flex-col gap-4 motion-safe:animate-rise lg:gap-[22px]">
        <div className="flex items-end gap-3 lg:gap-4">
          <div className="text-6xl font-black leading-[.9] tracking-[-.04em] lg:text-[88px]">
            Q{currentIndex + 1}
            <span className="ml-1 text-lg font-bold tracking-normal text-ink-soft lg:text-[22px]">/ {questions.length}</span>
          </div>
          <span className="mb-2 inline-flex h-8 items-center gap-2 rounded-full bg-ink px-3 text-xs font-bold text-white lg:mb-2.5 lg:h-9 lg:px-3.5 lg:text-[13px]">
            <span aria-hidden="true" className={`size-2.5 rounded-full ${CAT_TOKEN[q.rank]}`} />
            {catConfig.label}
          </span>
        </div>

        <p id="question-text" className="text-xl font-bold leading-[1.6] lg:text-[26px] lg:tracking-tight">{q.question}</p>

        <div role="group" aria-labelledby="question-text" className="flex flex-col gap-3 lg:gap-3.5">
          {q.choices.map((choice, idx) => {
            const isSel = selected === idx;
            return (
              <button
                key={idx}
                type="button"
                aria-pressed={isSel}
                onClick={() => onSelect(currentIndex, idx)}
                className={
                  'flex w-full items-start gap-3 rounded-2xl border-2 border-ink px-3.5 py-3.5 text-left text-base leading-relaxed min-h-[58px] cursor-pointer transition-[transform,box-shadow,background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:min-h-16 lg:gap-4 lg:rounded-[20px] lg:px-5 lg:py-4 lg:text-[17px] ' +
                  (isSel
                    ? 'bg-ink text-white -translate-x-0.5 -translate-y-0.5 shadow-[5px_5px_0_var(--cat)]'
                    : 'bg-white text-ink shadow-[3px_3px_0_var(--color-ink)] sticker-lift lg:shadow-[4px_4px_0_var(--color-ink)]')
                }
              >
                <span className={'flex size-8 shrink-0 items-center justify-center rounded-[10px] border-2 text-sm font-black lg:size-9 lg:rounded-xl lg:text-[15px] ' + (isSel ? 'border-white bg-white text-ink' : 'border-ink text-ink')}>
                  {CHOICE_LABELS[idx]}
                </span>
                <span className="min-w-0 flex-1 pt-0.5 lg:pt-1">{choice}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!isFirst ? (
            <button type="button" onClick={onPrev} className={BTN_SECONDARY + ' w-full sm:w-auto'}>
              <ArrowIcon dir="left" />前へ
            </button>
          ) : <span />}
          <button type="button" onClick={onNext} disabled={selected === null} className={BTN_PRIMARY + ' w-full disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-0 sm:w-auto sm:min-w-[220px]'}>
            {isLast ? '結果を見る' : '次へ'}<ArrowIcon />
          </button>
        </div>
        {selected === null && <p className="text-xs font-bold text-ink-soft lg:text-[13px]">選択肢をひとつ選ぶと「次へ」に進めます。</p>}
      </div>
      <Scene rank={q.rank} className="order-first h-[150px] lg:sticky lg:top-6 lg:order-last lg:aspect-[1/1.05] lg:h-auto lg:max-h-[520px]" />
    </main>
  );
}

function ResultScreen({ questions, answers, onRetry }) {
  // Scoring
  const results = questions.map((q, i) => ({
    question: q,
    selected: answers[i],
    correct: answers[i] === q.correct_index,
  }));

  const totalScore = results.filter(r => r.correct).length;
  const level = getLevel(totalScore);
  const passed = level >= 8;

  // Category scores
  const categoryScores = CATEGORY_CONFIG.map(cat => {
    const catResults = results.filter(r => r.question.rank === cat.rank);
    const catScore = catResults.filter(r => r.correct).length;
    return {
      ...cat,
      score: catScore,
      maxScore: cat.count,
      rate: Math.round((catScore / cat.count) * 100),
    };
  });

  const radarData = categoryScores.map(cs => ({
    category: cs.label,
    score: cs.rate,
    fullMark: 100,
  }));

  const commentary = getCommentary(level, categoryScores);

  // Accordion
  const [openItems, setOpenItems] = useState({});
  const toggle = (i) => setOpenItems(prev => ({ ...prev, [i]: !prev[i] }));

  const shown = useCountUp(totalScore);
  const done = shown === totalScore;
  const rate = Math.round((totalScore / questions.length) * 100);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-12 pt-2 text-white lg:gap-12 lg:px-8 lg:pb-16 lg:pt-4">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-5 lg:gap-[26px]">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-black tracking-[.12em] text-on-ink-link lg:text-sm">RESULT</div>
            <h1 className="text-[32px] font-black leading-[1.1] tracking-tight lg:text-[52px]">おつかれさまでした</h1>
          </div>
          <div className="flex items-end gap-3 lg:gap-4">
            <div aria-label={`スコア ${totalScore}点`} className="text-[128px] font-black leading-[.85] tracking-[-.06em] tabular-nums lg:text-[168px]">{shown}</div>
            <div className="pb-2.5 text-xl font-bold text-on-ink-link lg:pb-3.5 lg:text-[28px]">/ {questions.length}点</div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-[15px] font-black lg:h-11 lg:text-base">正答率 {rate}%</span>
            <span className="inline-flex h-10 items-center rounded-full border-2 border-white px-4 text-[15px] font-black lg:h-11 lg:text-base">チューターレベル {level}</span>
          </div>
          <span className={`inline-flex h-14 items-center gap-2.5 self-start rounded-full border-2 border-ink pl-2.5 pr-5 text-[21px] font-black text-ink shadow-[4px_4px_0_#fff] lg:h-16 lg:pl-3 lg:pr-6 lg:text-2xl lg:shadow-[5px_5px_0_#fff] ${passed ? 'bg-ok' : 'bg-white'} ` + (done ? 'motion-safe:animate-pop' : 'opacity-0')}>
            <span className="flex size-9 items-center justify-center rounded-full bg-ink text-white lg:size-10">
              {passed
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>}
            </span>
            {passed ? '合格' : '不合格 ・ 再挑戦へ'}
          </span>
          <div className="flex flex-col gap-2 text-[15px] leading-[1.85] text-on-ink lg:text-[17px]">
            {commentary.map((line, i) => <p key={i} className="m-0">{line}</p>)}
          </div>
          <div>
            <button type="button" onClick={onRetry} className={BTN_PRIMARY + ' w-full lg:w-auto'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
              もう一度挑戦する
            </button>
          </div>
        </div>

        <section aria-labelledby="cat-title" className="flex flex-col gap-5 rounded-3xl border-2 border-ink bg-white p-4 text-ink shadow-[5px_5px_0_var(--color-brand)] lg:gap-6 lg:rounded-[32px] lg:p-8 lg:shadow-[8px_8px_0_var(--color-brand)]">
          <h2 id="cat-title" className="m-0 text-base font-black lg:text-lg">カテゴリー別スコア</h2>
          <div className="-mx-2">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="64%">
                <PolarGrid stroke="#dfe3ee" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: INK, fontWeight: 700 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} tickCount={6} />
                <Radar name="理想" dataKey="fullMark" stroke="#eef0f7" fill="#eef0f7" fillOpacity={0.6} />
                <Radar name="あなたのスコア" dataKey="score" stroke="#fc6044" strokeWidth={3} fill="#fc6044" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {categoryScores.map((cs, i) => (
              <li key={cs.key} className="grid grid-cols-[108px_1fr_56px] items-center gap-2.5 lg:grid-cols-[140px_1fr_84px] lg:gap-3.5">
                <span className="flex items-center gap-1.5 text-[13px] font-black lg:gap-2 lg:text-[15px]">
                  <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-[3px] border-2 border-ink lg:size-3 ${CAT_TOKEN[cs.rank]}`} />
                  {cs.label}
                </span>
                <div role="img" aria-label={`${cs.label} ${cs.maxScore}問中${cs.score}問正解`} className="h-5 overflow-hidden rounded-full border-2 border-ink bg-track lg:h-[22px]">
                  <div className={`h-full rounded-full motion-safe:animate-grow ${cs.rate < 100 && cs.rate > 0 ? 'border-r-2 border-ink' : ''}`} style={{ width: `${cs.rate}%`, backgroundColor: CAT_HEX[cs.rank], animationDelay: `${300 + i * 100}ms` }} />
                </div>
                <span className="text-right text-[17px] font-black lg:text-lg">{cs.score} <small className="text-xs font-bold text-ink-muted">/ {cs.maxScore}</small></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="qr-title" className="flex flex-col gap-4 rounded-3xl border-2 border-ink bg-white p-4 text-ink shadow-[5px_5px_0_var(--color-brand)] lg:gap-5 lg:rounded-[32px] lg:p-8 lg:shadow-[8px_8px_0_var(--color-brand)]">
        <h2 id="qr-title" className="m-0 text-base font-black lg:text-lg">問題別結果一覧</h2>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {results.map((r, i) => {
            const catLabel = CATEGORY_CONFIG.find(c => c.rank === r.question.rank)?.label;
            const open = !!openItems[i];
            return (
              <li key={i} className="overflow-hidden rounded-2xl border-2 border-ink">
                <button type="button" aria-expanded={open} onClick={() => toggle(i)} className="flex w-full items-center gap-3 bg-white px-3.5 py-3 text-left text-sm font-bold text-ink hover:bg-track lg:px-5 lg:text-[15px]">
                  <span aria-label={r.correct ? '正解' : '不正解'} className={'flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white ' + (r.correct ? 'bg-ok' : 'bg-ng')}>
                    {r.correct
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>}
                  </span>
                  <span className="hidden shrink-0 rounded-full bg-ink px-2.5 py-0.5 text-xs text-white sm:inline">{catLabel}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">Q{i + 1}. {r.question.question}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={'shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {open && (
                  <div className="flex flex-col gap-4 border-t-2 border-ink bg-track px-3.5 py-4 lg:px-5 lg:py-5">
                    <p className="m-0 text-[15px] font-bold leading-[1.7]">{r.question.question}</p>
                    <div className="flex flex-col gap-2">
                      {r.question.choices.map((c, ci) => {
                        const isCorrect = ci === r.question.correct_index;
                        const isWrongPick = ci === r.selected && !isCorrect;
                        const cls = isCorrect ? 'bg-ok text-white border-ok' : isWrongPick ? 'bg-ng text-white border-ng' : 'bg-white text-ink border-ink opacity-60';
                        return (
                          <div key={ci} className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-sm leading-relaxed ${cls}`}>
                            <span className={'flex size-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-black ' + (isCorrect || isWrongPick ? 'border-white bg-white ' + (isCorrect ? 'text-ok' : 'text-ng') : 'border-ink')}>{CHOICE_LABELS[ci]}</span>
                            <span className="min-w-0 flex-1">{c}</span>
                            {isCorrect && <span className="shrink-0 self-center rounded-full border-2 border-white px-2 py-0.5 text-[11px] font-black">{ci === r.selected ? '正解 ・ あなたの回答' : '正解'}</span>}
                            {isWrongPick && <span className="shrink-0 self-center rounded-full border-2 border-white px-2 py-0.5 text-[11px] font-black">あなたの回答</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-col gap-3 rounded-2xl bg-ink p-4 text-[15px] leading-[1.85] text-on-ink">
                      <div><span className="mr-2 text-[11px] font-black tracking-[.1em] text-on-ink-faint">解説</span>{r.question.answer}</div>
                      {r.question.note && <div><span className="mr-2 text-[11px] font-black tracking-[.1em] text-on-ink-faint">補足</span>{r.question.note}</div>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

// --- Main App ---
export default function App() {
  const [phase, setPhase] = useState('start'); // start | quiz | result
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleStart = useCallback(() => {
    const selected = selectQuestions();
    setQuestions(selected);
    setAnswers(new Array(selected.length).fill(null));
    setCurrentIndex(0);
    setPhase('quiz');
    window.scrollTo(0, 0);
  }, []);

  const handleSelect = useCallback((qIndex, choiceIndex) => {
    setAnswers(prev => {
      const next = [...prev];
      next[qIndex] = choiceIndex;
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      window.scrollTo(0, 0);
    } else {
      setPhase('result');
      window.scrollTo(0, 0);
    }
  }, [currentIndex, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      window.scrollTo(0, 0);
    }
  }, [currentIndex]);

  const theme = phase === 'start' ? 'start' : phase === 'result' ? 'result' : `cat-${questions[currentIndex]?.rank ?? 1}`;
  const answeredCount = answers.filter(a => a !== null).length;
  const status = phase === 'quiz' ? `回答済 ${answeredCount} / ${questions.length}問` : phase === 'result' ? `全${questions.length}問 回答済み` : '社内研修 ・ AIチューター候補者向け';

  return (
    <div data-theme={theme} className="flex min-h-dvh flex-col bg-[var(--bg)] transition-colors duration-[400ms]">
      <AppHeader progress={phase === 'quiz' ? { index: currentIndex, total: questions.length } : undefined} status={status} inverted={phase === 'result'} />
      {phase === 'start' && <StartScreen onStart={handleStart} />}
      {phase === 'quiz' && (
        <QuizScreen questions={questions} answers={answers} currentIndex={currentIndex} onSelect={handleSelect} onNext={handleNext} onPrev={handlePrev} />
      )}
      {phase === 'result' && <ResultScreen questions={questions} answers={answers} onRetry={handleStart} />}
    </div>
  );
}
