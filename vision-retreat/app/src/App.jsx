import { useMemo, useState } from 'react'
import Particles from './Particles.jsx'
import RadarChart from './RadarChart.jsx'
import {
  DOMAINS,
  DOMAIN_ORDER,
  QUESTIONS,
  STRENGTH_SURVEY_TOTAL,
  GIFT_BASE,
  GIFT_CAP,
  RISK_FLOOR,
  computeGiftScores,
  applyRiskPenalties,
  detectProfileArchetype,
  buildInspiringSummary,
  maxPrimaryWeightForDomain,
  questionsWhereDomainCannotBePrimary,
  CATEGORIES,
  CATEGORY_ORDER,
  extractProfileFromAnswers,
  GIFT_FIELD
} from './data.js'
import { proposeGoals, generateImagePrompt, generateUnifiedImagePrompt, generateVisionCommentary } from './api.js'

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // フォーカス・許可・iframe 等で失敗した場合は execCommand にフォールバック
    }
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function newScores() {
  return { executing: 0, influencing: 0, relationship: 0, thinking: 0 }
}

function newRiskPenalty() {
  return { executing: 0, influencing: 0, relationship: 0, thinking: 0 }
}

function rankDomains(scores) {
  return [...DOMAIN_ORDER]
    .map((id, orderIdx) => ({ id, orderIdx, s: scores[id] ?? 0 }))
    .sort((a, b) => b.s - a.s || a.orderIdx - b.orderIdx)
    .map(x => x.id)
}

export default function App() {
  const [step, setStep] = useState(1)
  const [qIndex, setQIndex] = useState(0)
  const [scores, setScores] = useState(newScores())
  const [roughGoals, setRoughGoals] = useState({ biz: '', ppl: '', self: '', gift: '' })
  const [proposed, setProposed] = useState([])
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [imagePrompt, setImagePrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [answerLog, setAnswerLog] = useState([])
  const [riskPenalty, setRiskPenalty] = useState(newRiskPenalty)
  const [showCover, setShowCover] = useState(true)
  const [gender, setGender] = useState('male')
  const [commentary, setCommentary] = useState('')

  const ranking = useMemo(() => rankDomains(scores), [scores])
  const topId = ranking[0]
  const secondId = ranking[1]
  const top = DOMAINS[topId]
  const second = DOMAINS[secondId]

  const pickOption = (option) => {
    const q = QUESTIONS[qIndex]
    const w = q.weight ?? 1
    if (option.domain) {
      setScores(prev => ({
        ...prev,
        [option.domain]: (prev[option.domain] ?? 0) + w
      }))
    }
    if (option.risks) {
      setRiskPenalty(prev => {
        const next = { ...prev }
        for (const id of DOMAIN_ORDER) {
          const delta = option.risks[id]
          if (typeof delta === 'number') {
            next[id] = (next[id] || 0) + delta
          }
        }
        return next
      })
    }
    setAnswerLog(prev => [...prev, {
      qIndex,
      qText: q.q,
      selectedLabel: option.label,
      primaryDomain: option.domain || null,
      weight: w,
      risksApplied: option.risks || null,
      attribute: q.attribute || null,
      attrValue: option.value || null
    }])
    if (qIndex + 1 < QUESTIONS.length) {
      setQIndex(qIndex + 1)
    } else {
      setTimeout(() => setStep(2), 350)
    }
  }

  const restartDiagnosis = () => {
    setScores(newScores())
    setRiskPenalty(newRiskPenalty())
    setAnswerLog([])
    setQIndex(0)
    setStep(1)
    setShowCover(true)
  }

  const goToRoughGoals = () => setStep(3)

  const requestProposal = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const baseGifts = computeGiftScores(scores)
      const giftScores = applyRiskPenalties(baseGifts, riskPenalty)
      const { results } = await proposeGoals({
        topDomain: topId,
        topLabel: top.label,
        topTraits: top.traits,
        secondDomain: secondId,
        scores,
        giftScores,
        riskPenalty,
        goals: roughGoals
      })
      setProposed(results)
      setStep(4)
    } catch (err) {
      setErrorMsg(`提案の処理に失敗しました。(${err.message})`)
    } finally {
      setLoading(false)
    }
  }

  const updateProposedGoal = (catIdx, goalIdx, field, value) => {
    setProposed(prev => prev.map((c, i) => {
      if (i !== catIdx) return c
      return {
        ...c,
        goals: c.goals.map((g, j) => j === goalIdx ? { ...g, [field]: value } : g)
      }
    }))
  }

  const chooseGoal = async (category, goal) => {
    setSelectedGoal({ category, ...goal })
    setLoading(true)
    setImagePrompt('')
    setCommentary('')
    setErrorMsg('')
    try {
      const profile = extractProfileFromAnswers(answerLog)
      const gift = roughGoals.gift || ''
      const prompt = await generateImagePrompt({
        topDomain: top.id,
        secondDomain: second?.id,
        topLabel: top.label,
        topTraits: top.traits,
        category,
        title: goal.title,
        desc: goal.desc,
        gender,
        profile,
        gift
      })
      const note = await generateVisionCommentary({
        topLabel: top.label,
        secondLabel: second?.label,
        proposed: [{ category, goals: [goal] }],
        gender,
        profile,
        gift
      })
      setImagePrompt(prompt)
      setCommentary(note)
      setStep(5)
    } catch (err) {
      setErrorMsg(`画像プロンプト生成に失敗しました。(${err.message})`)
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  const chooseAllGoals = async () => {
    setSelectedGoal({ category: '人生の集大成', title: '人生の護符', desc: '来歴・縁・職業観・強み・使命を1枚絵に封じる' })
    setLoading(true)
    setImagePrompt('')
    setCommentary('')
    setErrorMsg('')
    try {
      const profile = extractProfileFromAnswers(answerLog)
      const gift = roughGoals.gift || ''
      const prompt = await generateUnifiedImagePrompt({
        topDomain: top.id,
        secondDomain: second?.id,
        topLabel: top.label,
        topTraits: top.traits,
        proposed,
        gender,
        profile,
        gift
      })
      const note = await generateVisionCommentary({
        topLabel: top.label,
        secondLabel: second?.label,
        proposed,
        gender,
        profile,
        gift
      })
      setImagePrompt(prompt)
      setCommentary(note)
      setStep(5)
    } catch (err) {
      setErrorMsg(`画像プロンプト生成に失敗しました。(${err.message})`)
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  const regenerateImagePrompt = async (overrides = {}) => {
    if (!selectedGoal) return
    setLoading(true)
    setErrorMsg('')
    try {
      const isUnified = selectedGoal.category === '人生の集大成'
      const profile = extractProfileFromAnswers(answerLog)
      const gift = roughGoals.gift || ''
      const prompt = isUnified
        ? await generateUnifiedImagePrompt({
            topDomain: top.id,
            secondDomain: second?.id,
            topLabel: top.label,
            topTraits: top.traits,
            proposed,
            gender,
            profile,
            gift,
            ...overrides
          })
        : await generateImagePrompt({
            topDomain: top.id,
            secondDomain: second?.id,
            topLabel: top.label,
            topTraits: top.traits,
            category: selectedGoal.category,
            title: selectedGoal.title,
            desc: selectedGoal.desc,
            gender,
            profile,
            gift,
            ...overrides
          })
      const note = await generateVisionCommentary({
        topLabel: top.label,
        secondLabel: second?.label,
        proposed: isUnified ? proposed : [{ category: selectedGoal.category, goals: [selectedGoal] }],
        gender,
        profile,
        gift,
        ...overrides
      })
      setImagePrompt(prompt)
      setCommentary(note)
    } catch (err) {
      setErrorMsg(`再生成に失敗しました。(${err.message})`)
    } finally {
      setLoading(false)
    }
  }

  const onGenderChange = (g) => {
    setGender(g)
    if (selectedGoal) regenerateImagePrompt({ gender: g })
  }

  const copyPrompt = async () => {
    const ok = await copyTextToClipboard(imagePrompt)
    if (ok) {
      setErrorMsg('')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setErrorMsg('クリップボードコピーに失敗しました。下のテキストを手動でコピーしてください。')
    }
  }

  return (
    <div className="app">
      <Particles />
      <main className="stage">
        {loading && step !== 4 && step !== 5 && <LoadingView label={top?.label} />}
        {!loading && step === 1 && showCover && (
          <CoverScreen totalQuestions={STRENGTH_SURVEY_TOTAL} onStart={() => setShowCover(false)} />
        )}
        {!loading && step === 1 && !showCover && (
          <Q1Screen qIndex={qIndex} onPick={pickOption} />
        )}
        {step === 2 && !loading && (
          <ResultScreen
            scores={scores}
            answerLog={answerLog}
            riskPenalty={riskPenalty}
            top={top}
            second={second}
            onNext={goToRoughGoals}
            onRestart={restartDiagnosis}
          />
        )}
        {step === 3 && !loading && (
          <RoughGoalsScreen
            roughGoals={roughGoals}
            onChange={setRoughGoals}
            onSubmit={requestProposal}
            onBack={() => setStep(2)}
            errorMsg={errorMsg}
          />
        )}
        {loading && (step === 1 || step === 3) && (
          <div />
        )}
        {loading && step === 3 && <div />}
        {step === 4 && !loading && (
          <ProposedGoalsScreen
            proposed={proposed}
            top={top}
            onEdit={updateProposedGoal}
            onChooseAll={chooseAllGoals}
            onBack={() => setStep(3)}
            errorMsg={errorMsg}
          />
        )}
        {step === 5 && !loading && (
          <ImagePromptScreen
            selectedGoal={selectedGoal}
            prompt={imagePrompt}
            commentary={commentary}
            top={top}
            copied={copied}
            onCopy={copyPrompt}
            onRegenerate={() => regenerateImagePrompt()}
            onBack={() => setStep(4)}
            errorMsg={errorMsg}
            gender={gender}
            onGenderChange={onGenderChange}
          />
        )}
        {loading && (step === 3 || step === 4) && (
          <ProposingOverlay label={top?.label} />
        )}
      </main>
    </div>
  )
}

function CoverScreen({ totalQuestions, onStart }) {
  return (
    <section className="fade-in cover-screen" aria-label="アプリ表紙">
      <p className="cover-brand-en" lang="en">Strength Vision</p>
      <h1 className="cover-title-main">強みと目標の羅針盤</h1>
      <p className="cover-subtitle">ギフト診断から、ビジョンまでをひとつながりに</p>
      <div className="cover-divider" aria-hidden="true" />
      <p className="cover-event-name">経営者ビジョン合宿</p>
      <p className="cover-lead">
        背景の星座のように、四つの才能の軸が交差する場所にあなたのギフトがあります。直感で答える{totalQuestions}問のあと、プロフィールと目標のたたきへ進みます。
      </p>
      <p className="cover-meta">GIFT DISCOVERY · {totalQuestions} QUESTIONS</p>
      <button className="btn-primary btn-cover-start" type="button" onClick={onStart}>
        診断をはじめる
      </button>
    </section>
  )
}

function LoadingView({ label }) {
  return (
    <section className="fade-in centered">
      <div className="proposing">
        <div className="float-row">
          <span className="float-icon">◆</span>
          <span className="float-icon">◈</span>
          <span className="float-icon">◇</span>
        </div>
        <h2>AIがあなたの強みを活かした目標を設計しています</h2>
        <p className="pulse">{label ? `${label}の力を最大化する目標へ…` : '準備中…'}</p>
      </div>
    </section>
  )
}

function ProposingOverlay({ label }) {
  return (
    <section className="fade-in centered overlay">
      <div className="proposing">
        <div className="float-row">
          <span className="float-icon">◆</span>
          <span className="float-icon">◈</span>
          <span className="float-icon">◇</span>
        </div>
        <h2>AIがあなたの強みを活かした目標を設計しています</h2>
        <p className="pulse">{label ? `${label}の力を最大化する目標へ…` : '準備中…'}</p>
      </div>
    </section>
  )
}

function Q1Screen({ qIndex, onPick }) {
  const q = QUESTIONS[qIndex]
  const progress = ((qIndex) / QUESTIONS.length) * 100
  const isDeep = (q.weight ?? 1) >= 2
  return (
    <section className="fade-in">
      <header className="hero-mini">
        <div className="eyebrow">Gift Discovery</div>
        <h1 className="q-flow-title">
          {qIndex === 0 ? 'さあ、最初の一歩です' : 'あなたのギフト（才能）の軸を見つける'}
        </h1>
        <p className="hero-sub hero-sub-tight">
          {qIndex === 0
            ? 'Strength Vision · 強みと目標の羅針盤。設問は深掘りあり・直感で。ある選択がほかの能力の劣りを意味しません。'
            : '設問によっては2択・3択の深掘りもあります。選択肢の見た目は同じです。集計上、特定の選びだけ軸に減点が入る場合があります（どれかは示しません）。'}
        </p>
        <div className="progress-row">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{qIndex + 1} / {QUESTIONS.length}</span>
        </div>
      </header>

      <article className="card question-card">
        <div className="q-label-row">
          <div className="q-label">Q{qIndex + 1}</div>
          {isDeep && <span className="q-depth-badge">深掘り</span>}
        </div>
        <h2 className="q-text">{q.q}</h2>
        <div className="options">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className="option-btn"
              onClick={() => onPick(opt)}
              type="button"
            >
              <span className="option-label">{opt.label}</span>
              <span className="option-arrow">→</span>
            </button>
          ))}
        </div>
      </article>
    </section>
  )
}

function ResultScreen({ scores, answerLog, riskPenalty, top, second, onNext, onRestart }) {
  const baseGiftScores = useMemo(() => computeGiftScores(scores), [scores])
  const giftScores = useMemo(
    () => applyRiskPenalties(baseGiftScores, riskPenalty),
    [baseGiftScores, riskPenalty]
  )
  const archetype = useMemo(() => detectProfileArchetype(baseGiftScores), [baseGiftScores])
  const inspiringSummary = useMemo(
    () =>
      buildInspiringSummary({
        archetype,
        finalGifts: giftScores,
        topDomain: top.id,
        secondDomain: second.id
      }),
    [archetype, giftScores, top.id, second.id]
  )
  const topGift = giftScores[top.id]
  const secondGift = giftScores[second.id]
  const thinkingBlocked = useMemo(() => questionsWhereDomainCannotBePrimary('thinking'), [])
  const riskPicks = useMemo(() => answerLog.filter(a => a.risksApplied), [answerLog])

  return (
    <section className="fade-in">
      <header className="hero-mini">
        <div className="eyebrow">Gift Profile</div>
        <h1>あなたのギフトプロフィール</h1>
      </header>

      <article className="card result-card" style={{ borderColor: `${top.color}44` }}>
        <div className="radar-wrap">
          <RadarChart giftScores={giftScores} topDomain={top.id} />
        </div>
        <p className="archetype-badge">
          {archetype.kind === 'balance'
            ? `プロフィール型: バランス寄り（四象限への寄与が広く、状況で主軸を切り替えやすい）`
            : `プロフィール型: ピークあり — 数値上いちばん高いのは「${DOMAINS[archetype.leadDomain].label}」（他軸の優劣を意味しない）`}
        </p>
        <p className="radar-note">
          素点（{GIFT_BASE}〜{GIFT_CAP}点）は次の式だけです。各領域について、「その領域のラベルが選択肢に含まれる設問」の重みを全部足したものを満点とし、あなたがそのラベルを主回答にした重みの割合を{GIFT_BASE}〜{GIFT_CAP}に直しています。設問によっては、選んだ内容に応じて該当軸へ減点が後から加わり、下限は{RISK_FLOOR}点です（回答中はどれが減点対象か色分けしません）。思考の点が低いときは、定義どおり「戦略系のラベルが出た場面で、別のラベルを選んだ回数（重み）が多かった」という記録です。実行やビジョンを選んだこと自体が思考の点を減らす係数には入っていません。IQや経営判断の試験ではありません。
        </p>

        <div className="top-domain" style={{ color: top.color }}>
          <div className="top-eyebrow">TOP ギフト（クリック数）</div>
          <div className="top-label">{top.label}</div>
          <div className="top-gift-score" style={{ color: top.color }}>
            表示スコア <span className="top-gift-num">{topGift}</span> 点
            {topGift >= 88 && <span className="gift-tier">（高親和）</span>}
            {topGift < 88 && topGift >= 76 && <span className="gift-tier">（親和がはっきり）</span>}
          </div>
          <div className="top-summary">{top.summary}</div>
          <div className="top-traits">代表資質：{top.traits}</div>
          <p className="top-detail">{top.detail}</p>
          <p className="top-context">
            重み付きの{STRENGTH_SURVEY_TOTAL}問のなかで、このラベルに振ったクリックがいちばん多かったのが「{top.label}」です。四象限で突出がなければ「バランス型の強み」、一象限だけ高ければ「その象限が強み」という読み方にしています。ほかの領域が劣っているという意味ではありません。
          </p>
        </div>

        <div className="second-domain" style={{ color: second.color }}>
          <span className="second-eyebrow">SECOND ギフト</span>
          <span className="second-label">{second.label}</span>
          <span className="second-gift">（{secondGift}点）</span>
        </div>

        <div className="inspiring-summary" role="region" aria-label="総括">
          {inspiringSummary.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="score-grid-head">4領域スコア（軸ごとに満点が異なります。{GIFT_BASE}＝そのラベルが出た設問で一度も選ばない基準、{GIFT_CAP}＝出た設問すべてでそのラベルを選んだ。設問による減点を反映した最終値を表示）</div>
        <ul className="score-grid">
          {DOMAIN_ORDER.map(id => {
            const d = DOMAINS[id]
            const pts = giftScores[id]
            return (
              <li key={id} style={{ borderColor: `${d.color}44` }}>
                <span className="sg-label" style={{ color: d.color }}>{d.label}</span>
                <span className="sg-score">
                  {pts}
                  <span className="sg-max"> 点</span>
                </span>
              </li>
            )
          })}
        </ul>
        <details className="evidence-block">
          <summary>集計の仕組みと、あなたの主回答一覧（領域ごと）</summary>
          <div className="evidence-body">
            <p className="evidence-lead">
              素点の定義は次の1式です。領域ごとに、max＝「そのラベルが選択肢にある設問」の重みの合計、actual＝あなたがそのラベルを主回答に取った重みの合計、素点＝{GIFT_BASE}＋{GIFT_CAP - GIFT_BASE}×（actual÷max）。その後、設問ルールで指定された領域に減点を加算し、{RISK_FLOOR}〜{GIFT_CAP}に丸めたものが画面上の最終スコアです。ある軸が低い＝「その軸のラベルが出た場面で、ほかのラベルを選んだ（重みの）割合が多い」または「減点が積み上がった」という記録であり、ほかの軸を選んだから素点が下がったわけではありません。
            </p>
            {riskPicks.length > 0 && (
              <div className="evidence-risk-block">
                <p className="evidence-subhead">減点が付与された回答</p>
                <ul className="evidence-list">
                  {riskPicks.map((p, i) => (
                    <li key={i}>
                      <span className="evidence-q">Q{p.qIndex + 1}</span>
                      <span className="evidence-pick">「{p.selectedLabel}」</span>
                      <span className="evidence-qtext">{p.qText}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="evidence-lead">
              設計上、次の{thinkingBlocked.length}問では選択肢に戦略的思考力がそもそも出てこないため、その回は思考の重み計は増えません。該当: {thinkingBlocked.map(x => `Q${x.n}`).join('、')}。
            </p>
            <p className="evidence-subhead">あなたが「主回答」として各領域を選んだ設問</p>
            {DOMAIN_ORDER.map(dom => {
              const picks = answerLog.filter(a => a.primaryDomain === dom)
              const sumW = picks.reduce((s, p) => s + p.weight, 0)
              const maxW = maxPrimaryWeightForDomain(dom)
              return (
                <div key={dom} className="evidence-domain">
                  <div className="evidence-domain-title" style={{ color: DOMAINS[dom].color }}>
                    {DOMAINS[dom].label} … 主回答 {picks.length}回（重み計 {sumW}／この軸の満点 {maxW}）／素点 {baseGiftScores[dom]} → 最終 {giftScores[dom]}
                    {typeof riskPenalty?.[dom] === 'number' && riskPenalty[dom] !== 0 && (
                      <span className="evidence-penalty">（減点合計 {riskPenalty[dom]}）</span>
                    )}
                  </div>
                  {picks.length === 0 ? (
                    <p className="evidence-empty">この領域のラベルを主回答として選んだ設問はありません。</p>
                  ) : (
                    <ul className="evidence-list">
                      {picks.map((p, i) => (
                        <li key={i}>
                          <span className="evidence-q">Q{p.qIndex + 1}</span>
                          <span className="evidence-pick">「{p.selectedLabel}」</span>
                          <span className="evidence-qtext">{p.qText}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </details>

        <details className="raw-breakdown">
          <summary>内訳（重み付き選択の集計）を表示</summary>
          <p className="raw-breakdown-note">
            各回答で、選んだ領域にだけ設問重みを加えています。他領域を減らす操作はありません。4領域の重み計の合計は、全設問の重みの合計と一致します。生の数値は目安用です。
          </p>
          <ul className="raw-breakdown-list">
            {DOMAIN_ORDER.map(id => (
              <li key={id}>
                <span style={{ color: DOMAINS[id].color }}>{DOMAINS[id].label}</span>
                <span>{scores[id]}（重み計）</span>
              </li>
            ))}
          </ul>
        </details>
        <p className="score-footnote">
          グラフが短い軸は、式の意味どおり「その軸のラベルが出た設問で、別ラベルを選んだ重みが多い」か、「設問による減点が積み上がった」結果です。現場の能力の優劣ではなく、このアンケートの選択記録に対応した数値です。
        </p>
      </article>

      <div className="action-row">
        <button className="btn-ghost" onClick={onRestart} type="button">診断をやり直す</button>
        <button className="btn-primary" onClick={onNext} type="button">目標を書いてみる →</button>
      </div>
    </section>
  )
}

function RoughGoalsScreen({ roughGoals, onChange, onSubmit, onBack, errorMsg }) {
  return (
    <section className="fade-in">
      <header className="hero-mini">
        <div className="eyebrow">Rough Goals</div>
        <h1>夢を、ざっくり書く</h1>
        <p className="hero-sub">
          3つの領域に、思い浮かぶままで。空欄でもかまいません。次の画面で、強みとメモを踏まえた目標のたたきが並びます。
        </p>
      </header>

      {CATEGORY_ORDER.map(catName => {
        const c = CATEGORIES[catName]
        return (
          <article
            key={catName}
            className="card category-card"
            style={{ borderColor: `${c.color}44` }}
          >
            <div className="cat-head">
              <span className="cat-symbol" style={{ color: c.color }}>{c.symbol}</span>
              <div>
                <div className="cat-title" style={{ color: c.color }}>{catName}</div>
                <div className="cat-hints">{c.hints}</div>
              </div>
            </div>
            <textarea
              value={roughGoals[c.id]}
              onChange={e => onChange({ ...roughGoals, [c.id]: e.target.value })}
              placeholder={c.placeholder}
              rows={3}
            />
          </article>
        )
      })}

      <article
        className="card category-card gift-card"
        style={{ borderColor: `${GIFT_FIELD.color}66` }}
      >
        <div className="cat-head">
          <span className="cat-symbol" style={{ color: GIFT_FIELD.color }}>{GIFT_FIELD.symbol}</span>
          <div>
            <div className="cat-title" style={{ color: GIFT_FIELD.color }}>{GIFT_FIELD.title}</div>
            <div className="cat-hints">{GIFT_FIELD.hints}</div>
          </div>
        </div>
        <textarea
          value={roughGoals.gift || ''}
          onChange={e => onChange({ ...roughGoals, gift: e.target.value })}
          placeholder={GIFT_FIELD.placeholder}
          rows={4}
        />
        <p className="gift-note">この言葉はビジョンカードに必ず反映されます。</p>
      </article>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="action-row">
        <button className="btn-ghost" onClick={onBack} type="button">← 診断結果に戻る</button>
        <button className="btn-primary" onClick={onSubmit} type="button">
          目標案を表示する →
        </button>
      </div>
    </section>
  )
}

function ProposedGoalsScreen({ proposed, top, onEdit, onChooseAll, onBack, errorMsg }) {
  return (
    <section className="fade-in">
      <header className="hero-mini">
        <div className="eyebrow">Proposed Goals</div>
        <h1>あなたの強みを活かす目標</h1>
        <p className="hero-sub">
          設問でいちばんクリックが集まった「{top.label}」を軸に、事業・人・個人の目標たたきを並べました。気に入ったところから編集し、すべて揃ったら下のボタンで全GOALを「人生の集大成」として1枚絵に統合します。
        </p>
      </header>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="unified-cta">
        <button className="btn-primary cta-large" onClick={onChooseAll} type="button">
          人生の護符（Life Talisman）を生成 →
        </button>
        <p className="cta-hint">
          ビジョンボードではなく、あなたの来歴・原体験・縁・職業観・強み・未来の使命を一枚に封じた「護符」を作ります。書き込まれた目標とギフトの言葉が、すべての象徴の根拠になります。
        </p>
      </div>

      {proposed.map((cat, ci) => {
        const meta = CATEGORIES[cat.category]
        if (!meta) return null
        return (
          <article key={cat.category} className="card category-card" style={{ borderColor: `${meta.color}44` }}>
            <div className="cat-head">
              <span className="cat-symbol" style={{ color: meta.color }}>{meta.symbol}</span>
              <div className="cat-title" style={{ color: meta.color }}>{cat.category}</div>
            </div>
            <ul className="goal-list">
              {cat.goals.map((g, gi) => (
                <li key={gi} className="goal-item">
                  <div className="goal-title">{g.title}</div>
                  <textarea
                    value={g.desc}
                    onChange={e => onEdit(ci, gi, 'desc', e.target.value)}
                    rows={2}
                  />
                  <div className="strength-note" style={{ color: top.color }}>
                    {g.strength_note}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        )
      })}

      <div className="action-row">
        <button className="btn-ghost" onClick={onBack} type="button">← 目標を書き直す</button>
      </div>
    </section>
  )
}

function ImagePromptScreen({ selectedGoal, prompt, commentary, top, copied, onCopy, onRegenerate, onBack, errorMsg, gender, onGenderChange }) {
  const isUnified = selectedGoal && selectedGoal.category === '人生の集大成'
  const meta = !isUnified && selectedGoal ? CATEGORIES[selectedGoal.category] : null
  const selectAll = (e) => {
    e.currentTarget.focus()
    e.currentTarget.select()
  }
  const genderOptions = [
    ['male', '男性'],
    ['female', '女性'],
    ['androgynous', '中性的']
  ]
  return (
    <section className="fade-in">
      <header className="hero-mini">
        <div className="eyebrow">Life Talisman</div>
        <h1>{isUnified ? 'あなたの人生の護符' : '達成イメージのプロンプト'}</h1>
      </header>

      {isUnified && (
        <article className="card" style={{ borderColor: '#a855f744' }}>
          <div className="cat-head">
            <span className="cat-symbol" style={{ color: '#a855f7' }}>✦</span>
            <div>
              <div className="cat-title" style={{ color: '#a855f7' }}>人生の護符 / Life Talisman</div>
              <div className="goal-desc-read">来歴・原体験・縁・職業観・強み・未来の使命を一枚に封じます。</div>
            </div>
          </div>
        </article>
      )}

      {!isUnified && selectedGoal && meta && (
        <article className="card" style={{ borderColor: `${meta.color}44` }}>
          <div className="cat-head">
            <span className="cat-symbol" style={{ color: meta.color }}>{meta.symbol}</span>
            <div>
              <div className="cat-title" style={{ color: meta.color }}>{selectedGoal.category} / {selectedGoal.title}</div>
              <div className="goal-desc-read">{selectedGoal.desc}</div>
            </div>
          </div>
        </article>
      )}

      <div className="gender-row">
        <span className="gender-label">本人の性別（年齢は固定しません）</span>
        <div className="chip-group" role="radiogroup" aria-label="本人の性別">
          {genderOptions.map(([k, v]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={gender === k}
              className={'chip' + (gender === k ? ' chip-on' : '')}
              onClick={() => onGenderChange(k)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {commentary && (
        <article className="card commentary-card">
          <div className="commentary-eyebrow">この絵が伝えていること</div>
          <pre className="commentary-text">{commentary}</pre>
        </article>
      )}

      <article className="card prompt-card">
        <div className="prompt-eyebrow">Gemini / ChatGPT 用 英語プロンプト</div>
        <textarea
          className="prompt-text"
          value={prompt}
          readOnly
          onFocus={selectAll}
          onClick={selectAll}
          rows={12}
          aria-label="生成プロンプト"
        />
        <div className="prompt-actions">
          <button className="btn-primary" onClick={onCopy} type="button">
            {copied ? 'コピーしました' : 'プロンプトをコピー'}
          </button>
          <button className="btn-outline" onClick={onRegenerate} type="button" aria-label="再生成">
            ↻ 再生成
          </button>
        </div>
        {errorMsg && <div className="error-banner" role="status">{errorMsg}</div>}
        <p className="prompt-hint">
          Gemini または ChatGPT に貼り付けて達成した自分の1枚絵を生成してください。コピーが効かない時は上のテキストをタップ→自動全選択 → 手動コピーできます。
        </p>
      </article>

      <div className="action-row">
        <button className="btn-ghost" onClick={onBack} type="button">← 目標一覧に戻る</button>
      </div>
    </section>
  )
}
