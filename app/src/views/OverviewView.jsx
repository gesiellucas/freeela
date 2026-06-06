import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  Code2,
  Flame,
  FolderOpen,
  Hash,
  List,
  Play,
  Timer,
  Zap,
} from 'lucide-react';
import { updateTaskStatus } from '../lib/supabase';

// ─── Constante de data do dia (módulo-level, atualizado ao recarregar a página) ──

const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

// ─── Configurações visuais ────────────────────────────────────────────────────

const PRIORITY_DOT = {
  0: 'bg-warm-300',
  1: 'bg-amber-400',
  2: 'bg-red-500',
};

const STATUS_CONFIG = {
  todo:    { label: 'A fazer',    color: 'text-warm-500',    bg: 'bg-warm-100' },
  doing:   { label: 'Fazendo',    color: 'text-blue-600',    bg: 'bg-blue-50' },
  waiting: { label: 'Aguardando', color: 'text-amber-600',   bg: 'bg-amber-50' },
  done:    { label: 'Concluído',  color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const STACK_PALETTE = [
  'bg-violet-50 border-violet-200 text-violet-700',
  'bg-sky-50 border-sky-200 text-sky-700',
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
  'bg-rose-50 border-rose-200 text-rose-700',
  'bg-orange-50 border-orange-200 text-orange-700',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayDiff(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - TODAY.getTime()) / 86400000);
}

function isToday(dateStr)   { return dayDiff(dateStr) === 0; }
function isOverdue(dateStr) { const d = dayDiff(dateStr); return d !== null && d < 0; }
function isThisWeek(dateStr){ const d = dayDiff(dateStr); return d !== null && d >= 0 && d <= 7; }

function formatDateLabel(dateStr) {
  const diff = dayDiff(dateStr);
  if (diff === null) return null;
  if (diff < 0)  return `${Math.abs(diff)}d atraso`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff <= 7)  return `em ${diff}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function scoreTask(task) {
  if (task.status === 'done')    return -9999;
  if (task.status === 'waiting') return -100;
  let score = 0;
  const diff = dayDiff(task.due_date);
  if (diff !== null) {
    if (diff < 0)     score += 100 + Math.abs(diff) * 2;
    else if (diff === 0) score += 80;
    else if (diff === 1) score += 40;
    else if (diff <= 7)  score += 20;
    else if (diff <= 14) score += 5;
  }
  score += (task.priority ?? 0) * 25;
  if (task.status === 'doing') score += 30;
  return score;
}

function buildAgendaBlocks(tasks) {
  let minutes = 9 * 60;
  const blocks = [];
  for (const task of tasks.slice(0, 8)) {
    const h = task.estimated_hours || 1;
    const sH = Math.floor(minutes / 60);
    const sM = minutes % 60;
    const eMin = minutes + h * 60;
    const eH = Math.min(Math.floor(eMin / 60), 20);
    const eM = eMin % 60;
    if (sH >= 20) break;
    blocks.push({
      task,
      start: `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`,
      end: `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`,
      hours: h,
    });
    minutes = eMin;
  }
  return blocks;
}

function stackColorClass(stack, allStacks) {
  if (!stack) return 'bg-warm-100 border-warm-300 text-warm-700';
  const idx = allStacks.indexOf(stack) % STACK_PALETTE.length;
  return STACK_PALETTE[idx];
}

// ─── Átomos visuais ───────────────────────────────────────────────────────────

const PriorityDot = ({ priority }) => (
  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[priority ?? 0] ?? PRIORITY_DOT[0]}`} />
);

const StatusPill = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

const DueDateChip = ({ dateStr, status }) => {
  if (!dateStr) return <span className="text-warm-300 text-xs">—</span>;
  const label = formatDateLabel(dateStr);
  const over = isOverdue(dateStr) && status !== 'done';
  const tod  = isToday(dateStr)   && status !== 'done';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${over ? 'text-red-500' : tod ? 'text-amber-500' : 'text-warm-400'}`}>
      {over && <AlertTriangle size={9} />}
      {tod && !over && <Flame size={9} />}
      {label}
    </span>
  );
};

const StatChip = ({ icon: Icon, value, label, scheme }) => {
  const schemes = {
    red:     'bg-red-50 border-red-200 text-red-600',
    amber:   'bg-amber-50 border-amber-200 text-amber-600',
    blue:    'bg-blue-50 border-blue-200 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    warm:    'bg-warm-100 border-warm-300 text-warm-700',
  };
  return (
    <div className={`flex items-center gap-2 border rounded-xl px-3.5 py-2 ${schemes[scheme]}`}>
      <Icon size={12} className="opacity-70" />
      <div>
        <p className="text-sm font-bold leading-none">{value}</p>
        <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 mt-0.5">{label}</p>
      </div>
    </div>
  );
};

// ─── Bloco Foco do Dia ────────────────────────────────────────────────────────

const FocusDoDia = ({ tasks, onMarkDoing, onMarkDone }) => (
  <div className="bg-warm-50 border border-warm-300/60 rounded-2xl shadow-card overflow-hidden h-full flex flex-col">
    <div className="px-5 py-4 border-b border-warm-200 flex items-center gap-2 flex-shrink-0">
      <Zap size={14} className="text-brand-500" />
      <h2 className="text-xs font-bold text-warm-900 uppercase tracking-wider">Foco do Dia</h2>
      {tasks.length > 0 && (
        <span className="ml-auto text-[10px] font-bold text-warm-400">top {tasks.length}</span>
      )}
    </div>

    {tasks.length === 0 ? (
      <div className="flex flex-col items-center justify-center flex-1 py-10 px-5">
        <CheckCircle2 size={26} className="text-emerald-400 mb-3" />
        <p className="text-sm font-semibold text-warm-700">Sem pendências urgentes</p>
        <p className="text-xs text-warm-400 mt-1 text-center">Nenhuma tarefa prioritária por enquanto.</p>
      </div>
    ) : (
      <div className="divide-y divide-warm-100 flex-1">
        {tasks.map((task, idx) => (
          <div
            key={task.id}
            className={`px-5 py-4 flex gap-3 ${idx === 0 ? 'bg-gradient-to-r from-brand-50/50 to-transparent' : ''}`}
          >
            {/* Número de prioridade */}
            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5
              ${idx === 0 ? 'bg-brand-500 text-warm-900' : 'bg-warm-200 text-warm-500'}`}>
              {idx + 1}
            </div>

            <div className="flex-1 min-w-0">
              {/* Badge "Começar agora" na primeira tarefa */}
              {idx === 0 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded mb-1.5">
                  <Zap size={7} /> Começar agora
                </span>
              )}
              <p className="text-sm font-semibold text-warm-900 leading-snug">{task.title}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <span className="text-[10px] text-warm-400 font-medium truncate max-w-[100px]">{task.project?.title}</span>
                {task.development_stack && (
                  <span className="text-[10px] font-mono bg-warm-100 text-warm-500 px-1.5 py-0.5 rounded">{task.development_stack}</span>
                )}
                {task.due_date && <DueDateChip dateStr={task.due_date} status={task.status} />}
                {task.estimated_hours && (
                  <span className="text-[10px] text-warm-400 flex items-center gap-0.5">
                    <Timer size={9} />{task.estimated_hours}h
                  </span>
                )}
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              {task.status !== 'doing' && task.status !== 'done' && (
                <button
                  onClick={() => onMarkDoing(task.id, task.project_id)}
                  className="p-1 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-200 transition-colors"
                  title="Marcar como Fazendo"
                >
                  <Play size={10} />
                </button>
              )}
              {task.status !== 'done' && (
                <button
                  onClick={() => onMarkDone(task.id, task.project_id)}
                  className="p-1 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  title="Marcar como Concluído"
                >
                  <CheckCircle2 size={10} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Bloco Lista de Tarefas ───────────────────────────────────────────────────

const FILTERS = [
  { id: 'all',     label: 'Todas' },
  { id: 'today',   label: 'Hoje' },
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'doing',   label: 'Fazendo' },
  { id: 'week',    label: 'Esta semana' },
];

function applyFilter(tasks, filterId) {
  const base = tasks.filter(t => t.status !== 'done');
  switch (filterId) {
    case 'today':   return base.filter(t => isToday(t.due_date));
    case 'overdue': return base.filter(t => isOverdue(t.due_date));
    case 'doing':   return base.filter(t => t.status === 'doing');
    case 'week':    return base.filter(t => isThisWeek(t.due_date));
    default:        return base;
  }
}

const TaskListBlock = ({ tasks, onMarkDoing, onMarkDone }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [stackFilter, setStackFilter]   = useState('');

  const stacks = useMemo(
    () => [...new Set(tasks.map(t => t.development_stack).filter(Boolean))],
    [tasks]
  );

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(f => [f.id, applyFilter(tasks, f.id).length])),
    [tasks]
  );

  const filtered = useMemo(() => {
    let result = applyFilter(tasks, activeFilter);
    if (stackFilter) result = result.filter(t => t.development_stack === stackFilter);
    return result.sort((a, b) => scoreTask(b) - scoreTask(a));
  }, [tasks, activeFilter, stackFilter]);

  return (
    <div className="bg-warm-50 border border-warm-300/60 rounded-2xl shadow-card overflow-hidden">
      {/* Cabeçalho com filtros */}
      <div className="px-5 py-4 border-b border-warm-200 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <List size={14} className="text-brand-500" />
            <h2 className="text-xs font-bold text-warm-900 uppercase tracking-wider">Tarefas</h2>
          </div>
          {stacks.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {stackFilter && (
                <button
                  onClick={() => setStackFilter('')}
                  className="text-[10px] text-warm-400 hover:text-warm-700 font-semibold"
                >
                  × limpar
                </button>
              )}
              {stacks.map(s => (
                <button
                  key={s}
                  onClick={() => setStackFilter(s === stackFilter ? '' : s)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-colors ${
                    stackFilter === s
                      ? 'bg-brand-100 text-brand-700 border-brand-200'
                      : 'text-warm-500 bg-warm-100 border-warm-200 hover:border-warm-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === f.id
                  ? 'bg-warm-900 text-warm-50'
                  : 'text-warm-500 hover:bg-warm-200 hover:text-warm-700'
              }`}
            >
              {f.label}
              {counts[f.id] > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.id
                    ? 'bg-warm-700 text-warm-200'
                    : f.id === 'overdue'
                    ? 'bg-red-100 text-red-500'
                    : 'bg-warm-200 text-warm-500'
                }`}>
                  {counts[f.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Linhas de tarefas */}
      <div className="overflow-y-auto max-h-72">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <CheckSquare size={22} className="mx-auto text-warm-300 mb-2" />
            <p className="text-sm text-warm-400">Nenhuma tarefa neste filtro.</p>
          </div>
        ) : (
          filtered.map(task => {
            const over = isOverdue(task.due_date) && task.status !== 'done';
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-warm-100 last:border-0 hover:bg-warm-100/40 group transition-colors ${over ? 'bg-red-50/20' : ''}`}
              >
                <PriorityDot priority={task.priority} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-warm-400 truncate max-w-[120px]">{task.project?.title}</span>
                    {task.development_stack && (
                      <span className="text-[10px] font-mono bg-warm-100 text-warm-500 px-1 rounded">{task.development_stack}</span>
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2.5 flex-shrink-0">
                  {task.estimated_hours && (
                    <span className="text-[10px] text-warm-400 flex items-center gap-0.5">
                      <Timer size={9} />{task.estimated_hours}h
                    </span>
                  )}
                  <DueDateChip dateStr={task.due_date} status={task.status} />
                  <StatusPill status={task.status} />
                </div>

                {/* Ações inline (aparece no hover) */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {task.status !== 'doing' && task.status !== 'done' && (
                    <button
                      onClick={() => onMarkDoing(task.id, task.project_id)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-200 transition-colors"
                      title="Marcar como Fazendo"
                    >
                      <Play size={11} />
                    </button>
                  )}
                  {task.status !== 'done' && (
                    <button
                      onClick={() => onMarkDone(task.id, task.project_id)}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      title="Marcar como Concluído"
                    >
                      <CheckCircle2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Bloco Agenda do Dia ──────────────────────────────────────────────────────

const DayAgenda = ({ tasks }) => {
  const agendaTasks = useMemo(() =>
    [...tasks]
      .filter(t => t.status !== 'done' && t.status !== 'waiting')
      .sort((a, b) => scoreTask(b) - scoreTask(a))
      .slice(0, 8),
    [tasks]
  );

  const blocks    = useMemo(() => buildAgendaBlocks(agendaTasks), [agendaTasks]);
  const allStacks = useMemo(() => [...new Set(agendaTasks.map(t => t.development_stack).filter(Boolean))], [agendaTasks]);
  const totalHours = agendaTasks.reduce((sum, t) => sum + (t.estimated_hours || 1), 0);

  if (blocks.length === 0) return null;

  return (
    <div className="bg-warm-50 border border-warm-300/60 rounded-2xl shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-warm-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-brand-500" />
          <h2 className="text-xs font-bold text-warm-900 uppercase tracking-wider">Agenda do Dia</h2>
          <span className="text-[10px] text-warm-400 hidden sm:inline">sugestão baseada em prioridade</span>
        </div>
        <span className="text-xs text-warm-500 flex items-center gap-1">
          <Timer size={10} className="text-warm-400" />
          ~{totalHours}h planejadas
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Blocos de tempo */}
        <div className="space-y-2">
          {blocks.map(block => {
            const colorCls = stackColorClass(block.task.development_stack, allStacks);
            return (
              <div key={block.task.id} className="flex items-center gap-3">
                {/* Horário de início */}
                <div className="w-16 text-right flex-shrink-0">
                  <span className="text-[11px] font-mono text-warm-400">{block.start}</span>
                </div>

                {/* Card da tarefa */}
                <div className={`flex-1 flex items-center gap-3 border rounded-xl px-4 py-2.5 transition-shadow ${colorCls}
                  ${block.task.status === 'doing' ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{block.task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] opacity-60 truncate max-w-[120px]">{block.task.project?.title}</span>
                      {block.task.development_stack && (
                        <span className="text-[10px] font-mono opacity-70">{block.task.development_stack}</span>
                      )}
                      {block.task.status === 'doing' && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">em andamento</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono opacity-50 flex-shrink-0">{block.hours}h</span>
                </div>

                {/* Horário de término */}
                <div className="w-16 flex-shrink-0">
                  <span className="text-[11px] font-mono text-warm-300">{block.end}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contextos de trabalho (só aparece se há múltiplas stacks) */}
        {allStacks.length > 1 && (
          <div className="pt-4 border-t border-warm-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">Contextos de trabalho hoje</p>
            <div className="flex flex-wrap gap-2">
              {allStacks.map(stack => {
                const count = agendaTasks.filter(t => t.development_stack === stack).length;
                const hrs   = agendaTasks.filter(t => t.development_stack === stack).reduce((s, t) => s + (t.estimated_hours || 1), 0);
                return (
                  <div key={stack} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${stackColorClass(stack, allStacks)}`}>
                    <Code2 size={10} />
                    <span>{stack}</span>
                    <span className="opacity-50">· {count}t · {hrs}h</span>
                  </div>
                );
              })}
              {agendaTasks.filter(t => !t.development_stack).length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-warm-200 bg-warm-100 text-warm-600 text-xs font-semibold">
                  <Hash size={10} />
                  <span>Geral</span>
                  <span className="opacity-50">· {agendaTasks.filter(t => !t.development_stack).length}t</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── View principal ───────────────────────────────────────────────────────────

export default function OverviewView({ projects, userId, onUpdateTaskStatus }) {
  const activeProjects = useMemo(
    () => projects.filter(p => p.status === 'active' || p.is_active),
    [projects]
  );

  // Achata todas as tarefas top-level dos projetos ativos
  const allTasks = useMemo(
    () =>
      activeProjects.flatMap(p =>
        (p.tasks || [])
          .filter(t => !t.parent_task_id)
          .map(t => ({ ...t, project: p }))
      ),
    [activeProjects]
  );

  // Estado local para atualização otimista de status
  const [localTasks, setLocalTasks] = useState(allTasks);
  const [completedInSession, setCompletedInSession] = useState(new Set());

  // Sincroniza quando o pai atualiza os projetos
  useEffect(() => { setLocalTasks(allTasks); }, [allTasks]);

  // ── Métricas do dia ──
  const stats = useMemo(() => ({
    today: localTasks.filter(t => isToday(t.due_date) && t.status !== 'done').length,
    overdue: localTasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length,
    doing: localTasks.filter(t => t.status === 'doing').length,
    doneToday:
      localTasks.filter(t => t.status === 'done' && isToday(t.completed_at)).length +
      completedInSession.size,
    plannedHours: localTasks
      .filter(t => t.status !== 'done' && (isToday(t.due_date) || t.status === 'doing'))
      .reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
  }), [localTasks, completedInSession]);

  // ── Top 3 tarefas para o bloco Foco ──
  const topTasks = useMemo(() =>
    [...localTasks]
      .filter(t => t.status !== 'done' && t.status !== 'waiting')
      .sort((a, b) => scoreTask(b) - scoreTask(a))
      .slice(0, 3),
    [localTasks]
  );

  // ── Atualização de status (otimista + API) ──
  const markTask = async (taskId, projectId, newStatus) => {
    const prevStatus = localTasks.find(t => t.id === taskId)?.status;
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (newStatus === 'done') {
      setCompletedInSession(prev => new Set([...prev, taskId]));
    }
    try {
      await updateTaskStatus(taskId, newStatus);
      onUpdateTaskStatus?.(taskId, projectId, newStatus);
    } catch {
      // Rollback em caso de erro
      setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: prevStatus } : t));
      if (newStatus === 'done') {
        setCompletedInSession(prev => { const s = new Set(prev); s.delete(taskId); return s; });
      }
    }
  };

  const handleMarkDoing = (taskId, projectId) => markTask(taskId, projectId, 'doing');
  const handleMarkDone  = (taskId, projectId) => markTask(taskId, projectId, 'done');

  const greeting = getGreeting();
  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // ── Empty state ──
  if (activeProjects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 tracking-tight">Overview</h1>
          <p className="text-sm text-warm-500 mt-1">Central de planejamento e execução diária.</p>
        </div>
        <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-warm-200 flex items-center justify-center">
            <FolderOpen size={26} className="text-warm-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-warm-700">Nenhum projeto ativo</p>
            <p className="text-sm text-warm-500 mt-1">Crie ou converta um lead para começar.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Cabeçalho do dia ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-warm-400 uppercase tracking-widest mb-0.5">{greeting}</p>
          <h1 className="text-xl font-bold text-warm-900 tracking-tight capitalize">{dateLabel}</h1>
        </div>

        {/* Chips de métricas */}
        <div className="flex items-center gap-2 flex-wrap">
          {stats.overdue > 0 && (
            <StatChip icon={AlertTriangle} value={stats.overdue} label="Atrasadas" scheme="red" />
          )}
          <StatChip icon={Flame}         value={stats.today}     label="Hoje"       scheme="amber" />
          <StatChip icon={Play}          value={stats.doing}     label="Fazendo"    scheme="blue" />
          <StatChip icon={CheckCircle2}  value={stats.doneToday} label="Concluídas" scheme="emerald" />
          {stats.plannedHours > 0 && (
            <StatChip icon={Timer} value={`${stats.plannedHours}h`} label="Planejadas" scheme="warm" />
          )}
        </div>
      </div>

      {/* ── Foco do Dia + Lista de Tarefas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2">
          <FocusDoDia
            tasks={topTasks}
            onMarkDoing={handleMarkDoing}
            onMarkDone={handleMarkDone}
          />
        </div>
        <div className="lg:col-span-3">
          <TaskListBlock
            tasks={localTasks}
            onMarkDoing={handleMarkDoing}
            onMarkDone={handleMarkDone}
          />
        </div>
      </div>

      {/* ── Agenda do Dia ── */}
      <DayAgenda tasks={localTasks} />
    </div>
  );
}
