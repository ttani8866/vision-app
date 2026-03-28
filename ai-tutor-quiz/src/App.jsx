import { useState, useMemo, useCallback } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import questionsData from './data/questions.json';
import './App.css';

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

// --- Screens ---

function StartScreen({ onStart }) {
  return (
    <div className="screen start-screen">
      <div className="start-card">
        <div className="start-icon">📝</div>
        <h1>AIチューター認定試験</h1>
        <div className="start-info">
          <div className="info-item">
            <span className="info-label">出題数</span>
            <span className="info-value">12問</span>
          </div>
          <div className="info-item">
            <span className="info-label">形式</span>
            <span className="info-value">4択選択式</span>
          </div>
          <div className="info-item">
            <span className="info-label">合格ライン</span>
            <span className="info-value">9問以上正解（75%）</span>
          </div>
        </div>
        <p className="start-desc">
          5つのカテゴリー（基礎知識・心構え・ヒアリング・業務分析・提案）から
          難易度順に出題されます。全100問の中からランダムに12問が選ばれます。
        </p>
        <button className="btn-primary btn-large" onClick={onStart}>
          試験を開始する
        </button>
      </div>
    </div>
  );
}

function QuizScreen({ questions, answers, currentIndex, onSelect, onNext, onPrev }) {
  const q = questions[currentIndex];
  const catConfig = CATEGORY_CONFIG.find(c => c.rank === q.rank);
  const selected = answers[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <div className="screen quiz-screen">
      <div className="quiz-header">
        <div className="progress-info">
          <span className="category-badge" data-rank={q.rank}>
            {catConfig.label}
          </span>
          <span className="progress-text">{currentIndex + 1} / {questions.length}</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="quiz-body">
        <p className="question-text">
          <span className="question-number">Q{q.id}</span>
          {q.question}
        </p>

        <div className="choices">
          {q.choices.map((choice, idx) => (
            <button
              key={idx}
              className={`choice-btn ${selected === idx ? 'selected' : ''}`}
              onClick={() => onSelect(currentIndex, idx)}
            >
              <span className="choice-label">{['A', 'B', 'C', 'D'][idx]}</span>
              <span className="choice-text">{choice}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-footer">
        {!isFirst && (
          <button className="btn-secondary" onClick={onPrev}>
            ← 前へ
          </button>
        )}
        <div className="spacer" />
        <button className="btn-primary" onClick={onNext}>
          {isLast ? '結果を見る' : '次へ →'}
        </button>
      </div>
    </div>
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

  return (
    <div className="screen result-screen">
      {/* Score Summary */}
      <div className={`result-summary ${passed ? 'passed' : 'failed'}`}>
        <div className="result-badge">
          {passed ? '🎉 合格' : '📚 不合格'}
        </div>
        <div className="score-display">
          <span className="score-big">{totalScore}</span>
          <span className="score-unit">/ 12 点</span>
        </div>
        <div className="level-display">
          チューターレベル：<strong>レベル {level}</strong>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="result-section">
        <h2>カテゴリー別スコア</h2>
        <div className="radar-container">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 12, fill: '#555' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#999' }}
                tickCount={6}
              />
              <Radar
                name="理想"
                dataKey="fullMark"
                stroke="#c8e6c9"
                fill="#c8e6c9"
                fillOpacity={0.2}
              />
              <Radar
                name="あなたのスコア"
                dataKey="score"
                stroke="#1976d2"
                fill="#1976d2"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Detail Table */}
      <div className="result-section">
        <h2>カテゴリー別詳細</h2>
        <div className="category-table">
          {categoryScores.map(cs => (
            <div key={cs.key} className={`cat-row ${cs.rate <= 50 ? 'weak' : ''}`}>
              <span className="cat-label">{cs.label}</span>
              <span className="cat-score">{cs.score} / {cs.maxScore}</span>
              <div className="cat-bar-container">
                <div className="cat-bar" style={{ width: `${cs.rate}%` }} />
              </div>
              <span className="cat-rate">{cs.rate}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Commentary */}
      <div className="result-section">
        <h2>講評</h2>
        <div className="commentary">
          {commentary.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      {/* Question Details */}
      <div className="result-section">
        <h2>問題別結果一覧</h2>
        <div className="question-results">
          {results.map((r, i) => {
            const catLabel = CATEGORY_CONFIG.find(c => c.rank === r.question.rank)?.label;
            return (
              <div key={i} className="question-result-item">
                <button
                  className={`question-result-header ${r.correct ? 'correct' : 'incorrect'}`}
                  onClick={() => toggle(i)}
                >
                  <span className="qr-status">{r.correct ? '○' : '×'}</span>
                  <span className="qr-category">{catLabel}</span>
                  <span className="qr-question">Q{r.question.id}: {r.question.question.slice(0, 50)}...</span>
                  <span className="qr-toggle">{openItems[i] ? '▲' : '▼'}</span>
                </button>
                {openItems[i] && (
                  <div className="question-result-body">
                    <p className="qr-full-question">{r.question.question}</p>
                    <div className="qr-choices">
                      {r.question.choices.map((c, ci) => {
                        let cls = 'qr-choice';
                        if (ci === r.question.correct_index) cls += ' qr-correct';
                        if (ci === r.selected && !r.correct) cls += ' qr-wrong';
                        if (ci === r.selected && r.correct) cls += ' qr-correct';
                        return (
                          <div key={ci} className={cls}>
                            <span className="qr-choice-label">{['A', 'B', 'C', 'D'][ci]}</span>
                            {c}
                            {ci === r.question.correct_index && <span className="qr-mark">← 正解</span>}
                            {ci === r.selected && ci !== r.question.correct_index && <span className="qr-mark wrong">← あなたの回答</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="qr-answer">
                      <strong>正解解説：</strong>{r.question.answer}
                    </div>
                    {r.question.note && (
                      <div className="qr-note">
                        <strong>補足：</strong>{r.question.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="result-footer">
        <button className="btn-primary btn-large" onClick={onRetry}>
          もう一度挑戦する
        </button>
      </div>
    </div>
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
    } else {
      setPhase('result');
      window.scrollTo(0, 0);
    }
  }, [currentIndex, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  if (phase === 'start') return <StartScreen onStart={handleStart} />;
  if (phase === 'quiz') {
    return (
      <QuizScreen
        questions={questions}
        answers={answers}
        currentIndex={currentIndex}
        onSelect={handleSelect}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    );
  }
  return (
    <ResultScreen
      questions={questions}
      answers={answers}
      onRetry={handleStart}
    />
  );
}
