import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, SkipForward, Timer, Coffee, Brain,
  Settings, X, CheckCircle2, Volume2, VolumeX, Plus, Minus,
  RefreshCw, Trophy,
} from 'lucide-react';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = { focus: 25, shortBreak: 5, longBreak: 15, totalCycles: 4 };

// Ordem dos passos dentro de um ciclo
const CYCLE_STEPS = ['focus', 'shortBreak', 'longBreak'];

const STEP_META = {
  focus:      { label: 'Foco',         shortLabel: 'F',  icon: Brain,  ring: 'stroke-amber-400',  bg: 'bg-amber-500',   text: 'text-amber-400',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  btn: 'bg-amber-500 hover:bg-amber-400 text-slate-800',  shadow: 'shadow-amber-500/20'  },
  shortBreak: { label: 'Pausa Curta',  shortLabel: 'PC', icon: Coffee, ring: 'stroke-emerald-400', bg: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', btn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-900', shadow: 'shadow-emerald-500/20' },
  longBreak:  { label: 'Pausa Longa',  shortLabel: 'PL', icon: Coffee, ring: 'stroke-sky-400',     bg: 'bg-sky-500',     text: 'text-sky-400',    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',         btn: 'bg-sky-500 hover:bg-sky-400 text-slate-900',         shadow: 'shadow-sky-500/20'    },
};

// ─── Utilitários ─────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
}

function playAlarm(muted) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [
      { freq: 880,  start: 0,    dur: 0.18 },
      { freq: 1046, start: 0.22, dur: 0.18 },
      { freq: 1318, start: 0.44, dur: 0.36 },
    ].forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.01);
    });
  } catch (_) {}
}

function stepDurationSec(step, config) {
  if (step === 'focus') return config.focus * 60;
  if (step === 'shortBreak') return config.shortBreak * 60;
  return config.longBreak * 60;
}

// ─── Anel de progresso ────────────────────────────────────────────────────────

function ProgressRing({ progress, step }) {
  const R = 110;
  const circ = 2 * Math.PI * R;
  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 260 260">
      <circle cx="130" cy="130" r={R} fill="none" stroke="currentColor"
        className="text-slate-700" strokeWidth="6" />
      <circle cx="130" cy="130" r={R} fill="none"
        className={STEP_META[step].ring}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.max(0, progress))}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
}

// ─── Visualizador de ciclos ───────────────────────────────────────────────────
// Cada ciclo mostra 3 pastilhas (F / PC / PL) com status: done, active, pending

function CycleTracker({ totalCycles, currentCycle, currentStep, running }) {
  return (
    <div className="w-full max-w-lg mx-auto px-2">
      <div className="flex items-center gap-1.5 justify-center flex-wrap">
        {Array.from({ length: totalCycles }, (_, i) => {
          const cycleNum = i + 1;
          const isDone = cycleNum < currentCycle;
          const isCurrent = cycleNum === currentCycle;

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              {/* Número do ciclo */}
              <span className={`text-[10px] font-bold ${
                isCurrent ? 'text-slate-600' : isDone ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {cycleNum}
              </span>

              {/* Pastilhas de passos */}
              <div className="flex gap-0.5">
                {CYCLE_STEPS.map(step => {
                  const stepIdx = CYCLE_STEPS.indexOf(step);
                  const currentStepIdx = CYCLE_STEPS.indexOf(currentStep);

                  let status; // 'done' | 'active' | 'pending'
                  if (isDone) {
                    status = 'done';
                  } else if (isCurrent) {
                    if (stepIdx < currentStepIdx) status = 'done';
                    else if (stepIdx === currentStepIdx) status = 'active';
                    else status = 'pending';
                  } else {
                    status = 'pending';
                  }

                  return (
                    <div
                      key={step}
                      title={`${STEP_META[step].label}`}
                      className={`rounded-sm transition-all ${
                        totalCycles > 8 ? 'w-2 h-4' : 'w-3 h-5'
                      } ${
                        status === 'done'
                          ? STEP_META[step].bg + ' opacity-70'
                          : status === 'active'
                            ? STEP_META[step].bg + (running ? ' animate-pulse' : '')
                            : 'bg-slate-100'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 mt-3">
        {CYCLE_STEPS.map(step => (
          <div key={step} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-sm ${STEP_META[step].bg}`} />
            <span className="text-[10px] text-slate-500">{STEP_META[step].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal de alarme ─────────────────────────────────────────────────────────

function AlarmModal({ step, currentCycle, totalCycles, onDismiss, onStartNext }) {
  const isLastStep = step === 'longBreak';
  const isLastCycle = currentCycle >= totalCycles;
  const sessionComplete = isLastStep && isLastCycle;

  const nextLabel = sessionComplete
    ? null
    : step === 'focus' ? 'Iniciar Pausa Curta'
    : step === 'shortBreak' ? 'Iniciar Pausa Longa'
    : `Iniciar Ciclo ${currentCycle + 1}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="relative bg-[#18181b] border border-slate-300 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <button onClick={onDismiss} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={16} />
        </button>

        <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${
          sessionComplete ? 'bg-amber-500/15' : STEP_META[step].bg.replace('bg-', 'bg-') + '/15'
        }`} style={{ background: sessionComplete ? 'rgba(245,158,11,0.12)' : '' }}>
          {sessionComplete
            ? <Trophy size={28} className="text-amber-400" />
            : step === 'focus'
              ? <CheckCircle2 size={28} className="text-amber-400" />
              : <Coffee size={28} className={STEP_META[step].text} />
          }
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {sessionComplete
            ? 'Sessão completa!'
            : `${STEP_META[step].label} concluída!`}
        </h2>

        <p className="text-slate-500 text-sm mb-6">
          {sessionComplete
            ? `Você completou todos os ${totalCycles} ciclos. Parabéns!`
            : step === 'focus'
              ? `Ciclo ${currentCycle} de ${totalCycles} — hora de descansar.`
              : step === 'shortBreak'
                ? 'Quase lá! Veja como está indo e descanse um pouco mais.'
                : currentCycle < totalCycles
                  ? `Próximo: Ciclo ${currentCycle + 1} de ${totalCycles}.`
                  : 'Último ciclo concluído!'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all text-sm font-medium"
          >
            {sessionComplete ? 'Fechar' : 'Dispensar'}
          </button>
          {!sessionComplete && (
            <button
              onClick={onStartNext}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${
                step === 'focus'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-emerald-500/20'
                  : step === 'shortBreak'
                    ? 'bg-sky-500 hover:bg-sky-400 text-slate-900 shadow-sky-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-800 shadow-amber-500/20'
              }`}
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Painel de configuração de ciclos ────────────────────────────────────────

function ConfigPanel({ config, onSave, onClose }) {
  const [local, setLocal] = useState(config);

  const totalMin = local.totalCycles * (local.focus + local.shortBreak + local.longBreak);

  const set = (key, val) => setLocal(p => ({ ...p, [key]: val }));

  const StepConfig = ({ stepKey, label, min, max }) => (
    <div className="flex items-center gap-3 py-3 border-b border-slate-200 last:border-0">
      <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${STEP_META[stepKey]?.bg ?? 'bg-slate-300'}`} />
      <span className="text-sm text-slate-600 flex-1">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => set(stepKey, Math.max(min, local[stepKey] - 1))}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
        >
          <Minus size={12} />
        </button>
        <span className="w-12 text-center text-sm font-mono font-semibold text-slate-800">
          {stepKey === 'totalCycles' ? local[stepKey] : `${local[stepKey]}min`}
        </span>
        <button
          onClick={() => set(stepKey, Math.min(max, local[stepKey] + 1))}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#18181b] border border-slate-300 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-800">Configurar Ciclos</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>
        <p className="text-slate-400 text-xs mb-5">Cada ciclo = Foco → Pausa Curta → Pausa Longa</p>

        {/* Campos */}
        <div className="mb-2">
          <StepConfig stepKey="focus"      label="Foco"         min={1}  max={90} />
          <StepConfig stepKey="shortBreak" label="Pausa Curta"  min={1}  max={30} />
          <StepConfig stepKey="longBreak"  label="Pausa Longa"  min={1}  max={60} />
        </div>

        {/* Ciclos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-sm bg-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-600 flex-1">Número de ciclos</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => set('totalCycles', Math.max(1, local.totalCycles - 1))}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
              >
                <Minus size={12} />
              </button>
              <span className="w-12 text-center text-sm font-mono font-bold text-slate-800">
                {local.totalCycles}×
              </span>
              <button
                onClick={() => set('totalCycles', Math.min(12, local.totalCycles + 1))}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Preview visual de 1 ciclo */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Preview — 1 ciclo</p>
          <div className="flex items-center gap-2">
            {CYCLE_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex-1 rounded-lg py-2 px-2 text-center ${STEP_META[step].badge} border`}>
                  <div className="text-[10px] font-semibold">{STEP_META[step].label}</div>
                  <div className="text-xs font-mono font-bold mt-0.5">
                    {formatMinutes(local[step])}
                  </div>
                </div>
                {i < CYCLE_STEPS.length - 1 && (
                  <div className="text-slate-600 text-xs">→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Resumo total */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
          <span className="text-xs text-slate-400">Tempo total estimado</span>
          <span className="text-sm font-bold text-slate-700 font-mono">{formatMinutes(totalMin)}</span>
        </div>

        <button
          onClick={() => { onSave(local); onClose(); }}
          className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-800 font-bold rounded-xl transition-all text-sm"
        >
          Salvar configuração
        </button>
      </div>
    </div>
  );
}

// ─── View principal ───────────────────────────────────────────────────────────

export default function PomodoroView() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [currentStep, setCurrentStep] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_CONFIG.focus * 60);
  const [running, setRunning] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [muted, setMuted] = useState(false);
  const [history, setHistory] = useState([]);

  const totalSecondsRef = useRef(DEFAULT_CONFIG.focus * 60);
  const intervalRef = useRef(null);

  const progress = secondsLeft / totalSecondsRef.current;

  // ── Ir para um passo específico ───────────────────────────────────────────
  const goToStep = useCallback((step, cycle, cfg = config, autoStart = false) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setCurrentStep(step);
    setCurrentCycle(cycle);
    const dur = stepDurationSec(step, cfg);
    totalSecondsRef.current = dur;
    setSecondsLeft(dur);
    if (autoStart) setTimeout(() => setRunning(true), 50);
  }, [config]);

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          onStepEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]); // eslint-disable-line

  // ── Fim de um passo ───────────────────────────────────────────────────────
  const onStepEnd = useCallback(() => {
    playAlarm(muted);
    if (window.electronAPI?.focusWindow) window.electronAPI.focusWindow();
    setHistory(h => [...h, { step: currentStep, cycle: currentCycle, completedAt: new Date() }]);
    setShowAlarm(true);
  }, [muted, currentStep, currentCycle]);

  // ── Próximo passo / ciclo ─────────────────────────────────────────────────
  const getNext = useCallback(() => {
    const stepIdx = CYCLE_STEPS.indexOf(currentStep);
    if (stepIdx < CYCLE_STEPS.length - 1) {
      // Ainda há passos neste ciclo
      return { step: CYCLE_STEPS[stepIdx + 1], cycle: currentCycle };
    }
    // Fim do ciclo — avançar para próximo
    return { step: 'focus', cycle: currentCycle + 1 };
  }, [currentStep, currentCycle]);

  const isSessionDone = currentStep === 'longBreak' && currentCycle >= config.totalCycles;

  const handleStartNext = () => {
    setShowAlarm(false);
    if (!isSessionDone) {
      const { step, cycle } = getNext();
      goToStep(step, cycle, config, true);
    }
  };

  const handleDismiss = () => {
    setShowAlarm(false);
    if (!isSessionDone) {
      const { step, cycle } = getNext();
      goToStep(step, cycle, config, false);
    }
  };

  // ── Reiniciar sessão completa ─────────────────────────────────────────────
  const handleRestart = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setHistory([]);
    goToStep('focus', 1, config, false);
  };

  // ── Reiniciar passo atual ─────────────────────────────────────────────────
  const handleReset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    const dur = stepDurationSec(currentStep, config);
    totalSecondsRef.current = dur;
    setSecondsLeft(dur);
  };

  // ── Pular passo ──────────────────────────────────────────────────────────
  const handleSkip = () => {
    clearInterval(intervalRef.current);
    setHistory(h => [...h, { step: currentStep, cycle: currentCycle, completedAt: new Date(), skipped: true }]);
    if (!isSessionDone) {
      const { step, cycle } = getNext();
      goToStep(step, cycle, config, false);
    }
  };

  // ── Salvar configuração (reseta sessão) ──────────────────────────────────
  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    clearInterval(intervalRef.current);
    setRunning(false);
    setHistory([]);
    setCurrentStep('focus');
    setCurrentCycle(1);
    const dur = newConfig.focus * 60;
    totalSecondsRef.current = dur;
    setSecondsLeft(dur);
  };

  const meta = STEP_META[currentStep];
  const StepIcon = meta.icon;
  const totalMin = config.totalCycles * (config.focus + config.shortBreak + config.longBreak);

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 flex flex-col pb-10">

      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Timer size={20} className="text-amber-400" />
            Pomodoro
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {config.totalCycles} ciclos · {formatMinutes(totalMin)} totais
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRestart}
            title="Reiniciar sessão"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setMuted(m => !m)}
            title={muted ? 'Ativar som' : 'Silenciar'}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all text-xs font-medium border border-slate-200"
          >
            <Settings size={13} />
            Configurar
          </button>
        </div>
      </div>

      {/* Visualizador de ciclos */}
      <div className="px-8 mb-8">
        <CycleTracker
          totalCycles={config.totalCycles}
          currentCycle={currentCycle}
          currentStep={currentStep}
          running={running}
        />
      </div>

      {/* Step info pill */}
      <div className="flex justify-center mb-6">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border ${meta.badge}`}>
          <StepIcon size={12} />
          {meta.label} · Ciclo {currentCycle} de {config.totalCycles}
        </div>
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center px-8">
        <div className="relative w-60 h-60 flex items-center justify-center mb-8">
          <ProgressRing progress={progress} step={currentStep} />
          <div className="text-center z-10">
            <div className={`text-5xl font-mono font-bold tracking-tight ${meta.text}`}>
              {formatTime(secondsLeft)}
            </div>
            <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${meta.text} opacity-60`}>
              {meta.label}
            </div>
          </div>
        </div>

        {/* Passos do ciclo atual */}
        <div className="flex items-center gap-2 mb-8">
          {CYCLE_STEPS.map((step, i) => {
            const stepIdx = CYCLE_STEPS.indexOf(currentStep);
            const isDone = i < stepIdx;
            const isCurrent = i === stepIdx;
            return (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isDone
                    ? `${STEP_META[step].bg} text-slate-800 opacity-60`
                    : isCurrent
                      ? `${STEP_META[step].badge} border`
                      : 'bg-white text-slate-500 border border-slate-200'
                }`}>
                  {isDone && <CheckCircle2 size={10} />}
                  {STEP_META[step].label}
                </div>
                {i < CYCLE_STEPS.length - 1 && (
                  <div className="text-slate-700 text-xs">→</div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            title="Reiniciar passo"
            className="p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all border border-slate-200"
          >
            <RotateCcw size={17} />
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            className={`px-10 py-4 rounded-2xl font-bold text-base transition-all shadow-xl flex items-center gap-3 ${meta.btn} ${meta.shadow}`}
          >
            {running ? <Pause size={19} /> : <Play size={19} />}
            {running ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            onClick={handleSkip}
            title="Pular"
            className="p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all border border-slate-200"
          >
            <SkipForward size={17} />
          </button>
        </div>

        {/* Histórico */}
        {history.length > 0 && (
          <div className="mt-10 w-full max-w-md">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Histórico</h3>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {[...history].reverse().map((entry, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl">
                  <div className={`w-1.5 h-1.5 rounded-sm ${STEP_META[entry.step].bg} ${entry.skipped ? 'opacity-40' : ''}`} />
                  <span className="text-xs text-slate-500 flex-1">
                    {STEP_META[entry.step].label}
                    <span className="text-slate-500"> · ciclo {entry.cycle}</span>
                    {entry.skipped && <span className="text-slate-600"> · pulado</span>}
                  </span>
                  <span className="text-[11px] text-slate-600 font-mono">
                    {entry.completedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {showAlarm && (
        <AlarmModal
          step={currentStep}
          currentCycle={currentCycle}
          totalCycles={config.totalCycles}
          onDismiss={handleDismiss}
          onStartNext={handleStartNext}
        />
      )}
      {showConfig && (
        <ConfigPanel
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
