import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Flame,
  FolderOpen,
  Hash,
  List,
  Play,
  Search,
  Timer,
  Zap,
  Check,
  X,
  Calendar,
  Plus,
  Trash2,
  Paperclip,
  ZoomIn,
} from 'lucide-react';
import { updateTaskStatus, supabase, getTaskMediaFiles } from '../lib/supabase';

// EventCalendar Imports
import EventCalendar from '@event-calendar/core';
import DayGrid from '@event-calendar/day-grid';
import TimeGrid from '@event-calendar/time-grid';
import ResourceTimeline from '@event-calendar/resource-timeline';
import Interaction from '@event-calendar/interaction';
import '@event-calendar/core/index.css';
import FileUploader from '../components/ui/FileUploader';

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
  const d = new Date(dateStr);
  const pad = (num) => String(num).padStart(2, '0');
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diff < 0)  return `${Math.abs(diff)}d atraso`;
  if (diff === 0) return `Hoje às ${timeStr}`;
  if (diff === 1) return `Amanhã às ${timeStr}`;
  if (diff <= 7)  return `em ${diff}d às ${timeStr}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ` às ${timeStr}`;
}

function formatDateLiteral(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  const datePart = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${datePart} ${timePart}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function toDatetimeLocalString(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

const DueDateChip = ({ dateStr, status, literal = false }) => {
  if (!dateStr) return <span className="text-warm-300 text-xs whitespace-nowrap">—</span>;
  const label = literal ? formatDateLiteral(dateStr) : formatDateLabel(dateStr);
  const over = isOverdue(dateStr) && status !== 'done';
  const tod  = isToday(dateStr)   && status !== 'done';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold whitespace-nowrap ${over ? 'text-red-500' : tod ? 'text-amber-500' : 'text-warm-400'}`}>
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

const FocusDoDia = ({ tasks, onMarkDoing, onMarkDone, onMarkTask }) => (
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
              {task.status === 'doing' && (
                <button
                  onClick={() => onMarkTask(task.id, task.project_id, 'waiting')}
                  className="p-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                  title="Colocar em Aguardando"
                >
                  <Clock size={10} />
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
  { id: 'todo',    label: 'A fazer' },
  { id: 'today',   label: 'Hoje' },
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'doing',   label: 'Fazendo' },
  { id: 'week',    label: 'Esta semana' },
];

function applyFilter(tasks, filterId) {
  const base = tasks.filter(t => t.status !== 'done');
  switch (filterId) {
    case 'todo':    return base.filter(t => t.status === 'todo');
    case 'today':   return base.filter(t => isToday(t.due_date));
    case 'overdue': return base.filter(t => isOverdue(t.due_date));
    case 'doing':   return base.filter(t => t.status === 'doing');
    case 'week':    return base.filter(t => isThisWeek(t.due_date));
    default:        return base;
  }
}

const TaskListBlock = ({ tasks, onMarkDoing, onMarkDone, onMarkTask, onTaskClick }) => {
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
                onClick={() => onTaskClick?.(task)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-warm-100 last:border-0 hover:bg-warm-100/40 group transition-colors cursor-pointer ${over ? 'bg-red-50/20' : ''}`}
              >
                <PriorityDot priority={task.priority} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-warm-400 truncate max-w-[120px]">{task.project?.title}</span>
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
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {task.status !== 'doing' && task.status !== 'done' && (
                    <button
                      onClick={() => onMarkDoing(task.id, task.project_id)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-200 transition-colors"
                      title="Marcar como Fazendo"
                    >
                      <Play size={11} />
                    </button>
                  )}
                  {task.status === 'doing' && (
                    <button
                      onClick={() => onMarkTask(task.id, task.project_id, 'waiting')}
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                      title="Colocar em Aguardando"
                    >
                      <Clock size={11} />
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

// ─── Bloco Agenda do Dia / Cronograma de Recursos (EventCalendar) ────────────

const CalendarAgenda = ({ tasks, activeProjects, onUpdateTaskExecutionDates, onTaskClick }) => {
  const calendarRef = useRef(null);
  const instRef = useRef(null);
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  // Mapear OS ativas/aprovadas como recursos
  const calendarResources = useMemo(() => {
    const list = [];
    activeProjects.forEach(p => {
      const serviceOrders = p.service_orders || [];
      serviceOrders.forEach(os => {
        if (os.status === 'approved') {
          list.push({
            id: os.id,
            title: `${p.title} - ${os.title}`,
            companyName: p.title,
            osTitle: os.title
          });
        }
      });
    });
    return list;
  }, [activeProjects]);

  // Calcular limites de scroll horizontal dinamicamente
  const calendarRangeAndDate = useMemo(() => {
    let minDate = null;
    let maxDate = null;

    activeProjects.forEach(p => {
      const serviceOrders = p.service_orders || [];
      serviceOrders.forEach(os => {
        if (os.status === 'approved') {
          if (os.planned_start_date) {
            const d = new Date(os.planned_start_date + 'T00:00:00');
            if (!minDate || d < minDate) {
              minDate = d;
            }
          }
          if (os.planned_end_date) {
            const d = new Date(os.planned_end_date + 'T00:00:00');
            if (!maxDate || d > maxDate) {
              maxDate = d;
            }
          }
        }
      });
    });

    // Fallbacks
    if (!minDate) {
      minDate = new Date();
      minDate.setDate(minDate.getDate() - 30);
    } else {
      minDate = new Date(minDate);
      minDate.setDate(minDate.getDate() - 2); // 2 days margin
    }

    if (!maxDate) {
      maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
    } else {
      maxDate = new Date(maxDate);
      maxDate.setDate(maxDate.getDate() + 2); // 2 days margin
    }

    const format = (d) => {
      const pad = (num) => String(num).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let initialDate = today;
    if (today < minDate) {
      initialDate = minDate;
    } else if (today > maxDate) {
      initialDate = maxDate;
    }

    return {
      validRange: {
        start: format(minDate),
        end: format(maxDate)
      },
      initialDate: format(initialDate)
    };
  }, [activeProjects]);

  // Mapear tarefas e subtarefas agendadas como eventos
  const calendarEvents = useMemo(() => {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const eventsList = [];
    const approvedOsIds = new Set(
      activeProjects.flatMap(p => (p.service_orders || []).filter(os => os.status === 'approved').map(os => os.id))
    );

    tasks.forEach(t => {
      // Encontra a OS efetiva da tarefa (se for subtarefa, herda da tarefa pai se ela tiver)
      let soId = t.service_order_id;
      if (!soId && t.parent_task_id) {
        const parent = taskMap.get(t.parent_task_id);
        if (parent) {
          soId = parent.service_order_id;
        }
      }

      if (!soId || !approvedOsIds.has(soId)) {
        return;
      }

      // Verifica datas de execução
      let startStr = t.start_date;
      let endStr = t.end_date;

      // Fallback: se tiver apenas due_date, inicia 1 hora antes do due_date e termina no due_date
      if (!startStr && !endStr && t.due_date) {
        endStr = t.due_date;
        const d = new Date(t.due_date);
        d.setHours(d.getHours() - 1);
        startStr = d.toISOString();
      }

      if (startStr && endStr) {
        const isSubtask = !!t.parent_task_id;
        
        // Estilo de cores baseado no status
        let bgColor = '#FDE047'; // amarelo padrão do Freeela
        let txtColor = '#78350F';
        let borderColor = '#F59E0B';

        if (t.status === 'done') {
          bgColor = '#D1FAE5'; // verde suave
          txtColor = '#065F46';
          borderColor = '#A7F3D0';
        } else if (t.status === 'doing') {
          bgColor = '#DBEAFE'; // azul suave
          txtColor = '#1E40AF';
          borderColor = '#BFDBFE';
        } else if (isSubtask) {
          bgColor = '#FEF3C7'; // âmbar bem claro para subtarefas
          txtColor = '#92400E';
          borderColor = '#FCD34D';
        }

        eventsList.push({
          id: t.id,
          resourceIds: [soId],
          start: new Date(startStr),
          end: new Date(endStr),
          title: isSubtask ? `↳ ${t.title}` : t.title,
          editable: true,
          backgroundColor: bgColor,
          textColor: txtColor,
          borderColor: borderColor,
          extendedProps: {
            task: t,
            isSubtask
          }
        });
      }
    });

    return eventsList;
  }, [tasks, activeProjects]);

  // Lista de tarefas sem nenhum agendamento
  const unscheduledTasks = useMemo(() => {
    return tasks.filter(t => !t.start_date && !t.end_date && !t.due_date);
  }, [tasks]);

  // Agendar tarefa para hoje às 09:00 - 10:00
  const handleScheduleToday = async (task) => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const startStr = today.toISOString();
    
    today.setHours(10, 0, 0, 0);
    const endStr = today.toISOString();

    // Encontra a OS
    let targetOsId = task.service_order_id;
    if (!targetOsId && task.parent_task_id) {
      const parent = tasks.find(t => t.id === task.parent_task_id);
      if (parent) {
        targetOsId = parent.service_order_id;
      }
    }
    
    if (!targetOsId && task.project) {
      const approvedOs = (task.project.service_orders || []).find(os => os.status === 'approved');
      if (approvedOs) {
        targetOsId = approvedOs.id;
      }
    }
    
    if (!targetOsId) {
      alert("Para agendar esta tarefa, o projeto precisa ter pelo menos uma Ordem de Serviço aprovada.");
      return;
    }
    
    await onUpdateTaskExecutionDates(task.id, task.project_id, startStr, endStr, targetOsId);
  };

  useEffect(() => {
    const ec = new EventCalendar({
      target: calendarRef.current,
      props: {
        plugins: [DayGrid, TimeGrid, ResourceTimeline, Interaction],
        options: {
          view: 'resourceTimelineDay',
          resources: calendarResources,
          events: calendarEvents,
          validRange: calendarRangeAndDate.validRange,
          date: calendarRangeAndDate.initialDate,
          editable: true,
          slotMinTime: '06:00:00',
          slotMaxTime: '22:00:00',
          headerToolbar: {
            start: 'prev,next today',
            center: 'title',
            end: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
          },
          buttonText: {
            today: 'Hoje',
            resourceTimelineDay: 'Dia',
            resourceTimelineWeek: 'Semana',
            resourceTimelineMonth: 'Mês',
            prev: 'Anterior',
            next: 'Próximo'
          },
          views: {
            resourceTimelineDay: {
              titleFormat: { year: 'numeric', month: 'long', day: 'numeric' }
            },
            resourceTimelineWeek: {
            },
            resourceTimelineMonth: {
            }
          },
          locale: 'pt-br',
          firstDay: 1, // Segunda
          allDaySlot: false,
          resourceLabelContent: (info) => {
            const companyName = info.resource.companyName || info.resource.extendedProps?.companyName;
            const osTitle = info.resource.osTitle || info.resource.extendedProps?.osTitle;
            if (companyName && osTitle) {
              return {
                html: `<div class="flex flex-col py-0 leading-none">
                  <span class="text-[9px] text-warm-500 font-semibold leading-none">${companyName}</span>
                  <span class="text-[11px] text-warm-900 font-bold leading-tight mt-0.5">${osTitle}</span>
                </div>`
              };
            }
            if (info.resource.title) {
              const parts = info.resource.title.split(' - ');
              if (parts.length > 1) {
                return {
                  html: `<div class="flex flex-col py-0 leading-none">
                    <span class="text-[9px] text-warm-500 font-semibold leading-none">${parts[0]}</span>
                    <span class="text-[11px] text-warm-900 font-bold leading-tight mt-0.5">${parts.slice(1).join(' - ')}</span>
                  </div>`
                };
              }
            }
            return info.resource.title;
          },
          eventClick: (info) => {
            if (info.event && info.event.extendedProps && info.event.extendedProps.task) {
              onTaskClick(info.event.extendedProps.task);
            }
          },
          eventDrop: (info) => {
            const taskId = info.event.id;
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            const newStart = info.event.start.toISOString();
            const newEnd = info.event.end ? info.event.end.toISOString() : newStart;
            const newResourceId = info.newResource ? info.newResource.id : (info.event.resourceIds ? info.event.resourceIds[0] : undefined);
            
            onUpdateTaskExecutionDates(taskId, task.project_id, newStart, newEnd, newResourceId).catch(() => {
              info.revert();
            });
          },
          eventResize: (info) => {
            const taskId = info.event.id;
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            const newStart = info.event.start.toISOString();
            const newEnd = info.event.end ? info.event.end.toISOString() : newStart;
            
            onUpdateTaskExecutionDates(taskId, task.project_id, newStart, newEnd).catch(() => {
              info.revert();
            });
          }
        }
      }
    });

    instRef.current = ec;

    return () => {
      ec.destroy();
    };
  }, []);

  // Sincroniza dados com a instância do calendário
  useEffect(() => {
    if (instRef.current) {
      instRef.current.setOption('resources', calendarResources);
      instRef.current.setOption('events', calendarEvents);
      instRef.current.setOption('validRange', calendarRangeAndDate.validRange);
    }
  }, [calendarResources, calendarEvents, calendarRangeAndDate]);

  return (
    <div className="bg-warm-50 border border-warm-300/60 rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-warm-200 flex items-center justify-between flex-wrap gap-3 bg-warm-100/30">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-brand-500" />
          <h2 className="text-xs font-bold text-warm-900 uppercase tracking-wider">Agenda & Planejamento Diário</h2>
          <span className="text-[10px] text-warm-400 hidden sm:inline">Planeje e organize tarefas arrastando pelo cronograma</span>
        </div>
        <button
          onClick={() => setShowUnscheduled(!showUnscheduled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm
            ${showUnscheduled 
              ? 'bg-warm-200 text-warm-800 border-warm-350 hover:bg-warm-250' 
              : 'bg-brand-500 text-warm-900 border-brand-600 hover:bg-brand-400'
            }`}
        >
          <List size={12} />
          <span>Sem Agendamento ({unscheduledTasks.length})</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${showUnscheduled ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-warm-200">
        {/* Painel lateral de tarefas sem agendamento */}
        <div className={`transition-all duration-300 ease-in-out flex flex-col bg-warm-100/20 overflow-hidden
          ${showUnscheduled 
            ? 'w-full lg:w-64 p-4 opacity-100 border-b lg:border-b-0 lg:border-r border-warm-200 max-h-[1000px]' 
            : 'w-0 h-0 lg:h-auto lg:w-0 p-0 opacity-0 border-0 max-h-0 lg:max-h-[1000px]'
          }`}
        >
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-warm-500">Sem Agendamento ({unscheduledTasks.length})</h3>
          </div>
          <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1 flex-1 flex-shrink-0">
            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-warm-400 italic py-2 text-center">Todas as tarefas estão agendadas!</p>
            ) : (
              unscheduledTasks.map(task => {
                const isSubtask = !!task.parent_task_id;
                return (
                  <div key={task.id} className="p-3 bg-warm-50 border border-warm-200 rounded-xl space-y-2 hover:border-warm-400 transition-colors shadow-sm min-w-[200px]">
                    <span className="text-xs font-semibold text-warm-900 leading-tight block">
                      {isSubtask ? `↳ ${task.title}` : task.title}
                    </span>
                    {task.project && (
                      <span className="text-[9px] text-warm-400 font-medium block truncate">{task.project.title}</span>
                    )}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleScheduleToday(task)}
                        className="px-2 py-1 bg-brand-500 hover:bg-brand-400 text-warm-900 rounded-lg text-[9px] font-bold transition-colors flex items-center gap-0.5"
                      >
                        <Plus size={10} /> Agendar Hoje
                      </button>
                      <button
                        onClick={() => onTaskClick(task)}
                        className="px-2 py-1 border border-warm-300 hover:bg-warm-200 text-warm-600 rounded-lg text-[9px] font-semibold transition-colors"
                      >
                        Detalhes
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Componente do Calendário */}
        <div className="flex-1 p-4 overflow-x-auto min-w-0 bg-warm-50">
          <div ref={calendarRef} className="ec-calendar-wrapper" />
        </div>
      </div>
    </div>
  );
};

// ─── Tabela de Todas as Tarefas ───────────────────────────────────────────────

const TaskTableBlock = ({ tasks, projects, onMarkDoing, onMarkDone, onMarkTask, onUpdateTaskDate, onTaskClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sortField, setSortField] = useState('due_date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [tempDate, setTempDate] = useState('');
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const visibleParents = useMemo(() => {
    // Filter tasks by project first
    const projectTasks = tasks.filter(t => projectFilter === 'all' || t.project?.id === projectFilter);
    
    // Create a map of all tasks for quick access
    const tasksMap = new Map(projectTasks.map(t => [t.id, t]));

    // Determine which tasks match the status and search criteria
    const matchingTasks = projectTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all'
        ? task.status !== 'done'
        : task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Set of parent task IDs that should be visible
    const parentIdsToShow = new Set();

    matchingTasks.forEach(task => {
      if (task.parent_task_id && tasksMap.has(task.parent_task_id)) {
        // It's a child task, so its parent needs to be shown
        parentIdsToShow.add(task.parent_task_id);
      } else {
        // It's a top-level task
        parentIdsToShow.add(task.id);
      }
    });

    // Now build the list of parent tasks to display
    const parents = [];
    projectTasks.forEach(task => {
      // It's a top-level task that we decided to show
      if (!task.parent_task_id && parentIdsToShow.has(task.id)) {
        const allChildren = projectTasks.filter(t => t.parent_task_id === task.id);
        const childrenToShow = (statusFilter === 'all' && !searchTerm) 
          ? allChildren.filter(c => c.status !== 'done')
          : allChildren.filter(c => {
              const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesStatus = statusFilter === 'all'
                ? c.status !== 'done'
                : c.status === statusFilter;
              return matchesSearch && matchesStatus;
            });

        parents.push({
          ...task,
          children: childrenToShow,
          hasChildren: allChildren.length > 0
        });
      }
    });

    // Sort parents
    parents.sort((a, b) => {
      let aVal = '';
      let bVal = '';

      if (sortField === 'title') {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else if (sortField === 'project') {
        aVal = (a.project?.title || '').toLowerCase();
        bVal = (b.project?.title || '').toLowerCase();
      } else if (sortField === 'due_date') {
        const aDate = a.start_date || a.due_date;
        const bDate = b.start_date || b.due_date;
        aVal = aDate ? new Date(aDate).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
        bVal = bDate ? new Date(bDate).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
      } else if (sortField === 'status') {
        aVal = a.status;
        bVal = b.status;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return parents;
  }, [tasks, searchTerm, statusFilter, projectFilter, sortField, sortDirection]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const statuses = [
    { id: 'all', label: 'Todas' },
    { id: 'todo', label: 'A fazer' },
    { id: 'doing', label: 'Fazendo' },
    { id: 'waiting', label: 'Aguardando' },
    { id: 'done', label: 'Concluído' },
  ];

  const isSearchingOrFiltering = searchTerm !== '' || statusFilter !== 'all';

  const totalVisibleCount = useMemo(() => {
    let count = visibleParents.length;
    visibleParents.forEach(p => {
      if (p.hasChildren && (expandedTasks.has(p.id) || isSearchingOrFiltering)) {
        count += p.children.length;
      }
    });
    return count;
  }, [visibleParents, expandedTasks, searchTerm, statusFilter]);

  return (
    <div className="bg-warm-50 border border-warm-300/60 rounded-2xl shadow-card overflow-hidden">
      {/* Header e Controles */}
      <div className="px-5 py-4 border-b border-warm-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <List size={14} className="text-brand-500" />
            <h2 className="text-xs font-bold text-warm-900 uppercase tracking-wider">Organize as tarefas</h2>
          </div>
          
          {/* Busca */}
          <div className="relative max-w-xs w-full">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              placeholder="Buscar tarefa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-warm-200 border border-warm-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 rounded-xl text-xs text-warm-900 placeholder-warm-500 outline-none transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-warm-400 hover:text-warm-700 font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Filtros de Status e Projeto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Status Quick Filters */}
          <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {statuses.map(s => {
              const count = s.id === 'all' 
                ? tasks.length 
                : tasks.filter(t => t.status === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    statusFilter === s.id
                      ? 'bg-warm-900 text-warm-50'
                      : 'text-warm-500 hover:bg-warm-200 hover:text-warm-700'
                  }`}
                >
                  {s.label}
                  {count > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      statusFilter === s.id
                        ? 'bg-warm-700 text-warm-200'
                        : 'bg-warm-200 text-warm-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filtro por Projeto */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-warm-400">Projeto:</span>
            <div className="relative">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="appearance-none bg-warm-200 border border-warm-300 focus:border-brand-500 rounded-xl px-3 py-1 pr-8 text-xs text-warm-900 font-semibold outline-none transition-all cursor-pointer"
              >
                <option value="all">Todos</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Tarefas */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-warm-300 scrollbar-track-transparent">
        <table className="w-full border-collapse text-left min-w-[600px]">
          <thead>
            <tr className="bg-warm-100 border-b border-warm-200 text-[10px] font-bold text-warm-500 uppercase tracking-wider select-none">
              <th className="py-2.5 px-4 cursor-pointer hover:bg-warm-200/50 transition-colors w-28" onClick={() => toggleSort('project')}>
                <div className="flex items-center gap-1">
                  Projeto
                  {sortField === 'project' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </div>
              </th>
              <th className="py-2.5 px-4 cursor-pointer hover:bg-warm-200/50 transition-colors" onClick={() => toggleSort('title')}>
                <div className="flex items-center gap-1">
                  Tarefa
                  {sortField === 'title' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </div>
              </th>
              <th className="py-2.5 px-4 cursor-pointer hover:bg-warm-200/50 transition-colors w-40" onClick={() => toggleSort('due_date')}>
                <div className="flex items-center gap-1">
                  Data
                  {sortField === 'due_date' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </div>
              </th>
              <th className="py-2.5 px-4 cursor-pointer hover:bg-warm-200/50 transition-colors w-32" onClick={() => toggleSort('status')}>
                <div className="flex items-center gap-1">
                  Status
                  {sortField === 'status' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </div>
              </th>
              <th className="py-2.5 px-4 text-right w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100 text-sm">
            {visibleParents.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12">
                  <CheckSquare size={24} className="mx-auto text-warm-300 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-warm-700">Nenhuma tarefa encontrada</p>
                  <p className="text-xs text-warm-400 mt-1">Refine a sua busca ou filtros.</p>
                </td>
              </tr>
            ) : (
              visibleParents.map(parent => {
                const parentOver = isOverdue(parent.due_date) && parent.status !== 'done';
                const isExpanded = expandedTasks.has(parent.id) || isSearchingOrFiltering;

                return (
                  <React.Fragment key={parent.id}>
                    {/* Linha do Pai */}
                    <tr 
                      onClick={() => onTaskClick?.(parent)}
                      className={`hover:bg-warm-100/30 transition-colors group cursor-pointer ${parentOver ? 'bg-red-50/10' : ''}`}
                    >
                      {/* Coluna Projeto */}
                      <td className="py-3 px-4 text-warm-600 font-medium max-w-[120px] truncate" title={parent.project?.title || ''}>
                        {parent.project?.title || '—'}
                      </td>

                      {/* Coluna Tarefa */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {parent.hasChildren ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(parent.id);
                              }}
                              className="p-1 rounded hover:bg-warm-200 transition-colors text-warm-500"
                              title={isExpanded ? 'Recolher subtarefas' : 'Expandir subtarefas'}
                            >
                              <ChevronDown 
                                size={14} 
                                className={`transition-transform duration-205 ${isExpanded ? '' : '-rotate-90'}`} 
                              />
                            </button>
                          ) : (
                            <div className="w-6" />
                          )}
                          <PriorityDot priority={parent.priority} />
                          <span className="font-semibold text-warm-900 leading-tight">{parent.title}</span>
                          {parent.hasChildren && (
                            <span className="text-[9px] text-warm-500 bg-warm-200 px-1.5 py-0.5 rounded-full font-bold ml-1 whitespace-nowrap">
                              {parent.children.length} {parent.children.length === 1 ? 'subtarefa' : 'subtarefas'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Coluna Data */}
                      <td className="py-3 px-4">
                        {editingTaskId === parent.id ? (
                          <div className="flex items-center gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="datetime-local"
                              value={tempDate}
                              onChange={(e) => setTempDate(e.target.value)}
                              className="bg-warm-50 border border-warm-300 rounded-lg px-2 py-1 text-xs text-warm-800 outline-none focus:border-brand-500 transition-all font-sans font-semibold"
                            />
                            <button
                              onClick={() => {
                                onUpdateTaskDate(parent.id, parent.project_id, tempDate);
                                setEditingTaskId(null);
                              }}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              title="Confirmar"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="p-1.5 bg-warm-200 hover:bg-warm-300 text-warm-600 border border-warm-300 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTaskId(parent.id);
                              setTempDate(parent.start_date ? toDatetimeLocalString(parent.start_date) : (parent.due_date ? toDatetimeLocalString(parent.due_date) : ''));
                            }}
                            className="inline-flex items-center gap-1.5 hover:bg-warm-200/60 px-2 py-1 rounded-lg border border-transparent hover:border-warm-300/40 text-left transition-all group/date"
                            title="Clique para alterar a data e hora de início"
                          >
                            <DueDateChip dateStr={parent.start_date || parent.due_date} status={parent.status} literal={true} />
                            <Calendar size={11} className="text-warm-400 opacity-0 group-hover/date:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* Coluna Status */}
                      <td className="py-3 px-4">
                        <StatusPill status={parent.status} />
                      </td>

                      {/* Coluna Ações */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {parent.status !== 'doing' && parent.status !== 'done' && (
                            <button
                              onClick={() => onMarkDoing(parent.id, parent.project_id)}
                              className="p-1 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-200 transition-colors"
                              title="Marcar como Fazendo"
                            >
                              <Play size={10} />
                            </button>
                          )}
                          {parent.status === 'doing' && (
                            <button
                              onClick={() => onMarkTask(parent.id, parent.project_id, 'waiting')}
                              className="p-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                              title="Colocar em Aguardando"
                            >
                              <Clock size={10} />
                            </button>
                          )}
                          {parent.status !== 'done' && (
                            <button
                              onClick={() => onMarkDone(parent.id, parent.project_id)}
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="Marcar como Concluído"
                            >
                              <CheckCircle2 size={10} />
                            </button>
                          )}
                          {parent.status === 'done' && (
                            <button
                              onClick={() => onMarkTask(parent.id, parent.project_id, 'todo')}
                              className="p-1 rounded-lg bg-warm-200 text-warm-600 hover:bg-warm-300 border border-warm-300 transition-colors"
                              title="Reabrir tarefa"
                            >
                              <Clock size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Linhas dos Filhos */}
                    {parent.hasChildren && isExpanded && (
                      parent.children.map(child => {
                        const childOver = isOverdue(child.due_date) && child.status !== 'done';
                        return (
                          <tr 
                            key={child.id}
                            onClick={() => onTaskClick?.(child)}
                            className={`hover:bg-warm-100/20 bg-warm-100/10 transition-colors group cursor-pointer ${childOver ? 'bg-red-50/5' : ''}`}
                          >
                            {/* Coluna Projeto (Filho) */}
                            <td className="py-2.5 px-4 text-warm-400 font-medium text-xs pl-8 max-w-[120px] truncate" title={child.project?.title || ''}>
                              {child.project?.title || '—'}
                            </td>

                            {/* Coluna Tarefa (Filho) */}
                            <td className="py-2.5 px-4 pl-12">
                              <div className="flex items-center gap-2">
                                <PriorityDot priority={child.priority} />
                                <span className="font-medium text-warm-700 leading-tight text-xs">{child.title}</span>
                              </div>
                            </td>

                            {/* Coluna Data (Filho) */}
                            <td className="py-2.5 px-4">
                              {editingTaskId === child.id ? (
                                <div className="flex items-center gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="datetime-local"
                                    value={tempDate}
                                    onChange={(e) => setTempDate(e.target.value)}
                                    className="bg-warm-50 border border-warm-300 rounded-lg px-2 py-1 text-xs text-warm-800 outline-none focus:border-brand-500 transition-all font-sans font-semibold"
                                  />
                                  <button
                                    onClick={() => {
                                      onUpdateTaskDate(child.id, child.project_id, tempDate);
                                      setEditingTaskId(null);
                                    }}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                    title="Confirmar"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setEditingTaskId(null)}
                                    className="p-1.5 bg-warm-200 hover:bg-warm-300 text-warm-600 border border-warm-300 rounded-lg transition-colors"
                                    title="Cancelar"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTaskId(child.id);
                                    setTempDate(child.start_date ? toDatetimeLocalString(child.start_date) : (child.due_date ? toDatetimeLocalString(child.due_date) : ''));
                                  }}
                                  className="inline-flex items-center gap-1.5 hover:bg-warm-200/60 px-2 py-1 rounded-lg border border-transparent hover:border-warm-300/40 text-left transition-all group/date"
                                  title="Clique para alterar a data e hora de início"
                                >
                                  <DueDateChip dateStr={child.start_date || child.due_date} status={child.status} literal={true} />
                                  <Calendar size={11} className="text-warm-400 opacity-0 group-hover/date:opacity-100 transition-opacity" />
                                </button>
                              )}
                            </td>

                            {/* Coluna Status (Filho) */}
                            <td className="py-2.5 px-4">
                              <StatusPill status={child.status} />
                            </td>

                            {/* Coluna Ações (Filho) */}
                             <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {child.status !== 'doing' && child.status !== 'done' && (
                                  <button
                                    onClick={() => onMarkDoing(child.id, child.project_id)}
                                    className="p-1 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-200 transition-colors"
                                    title="Marcar como Fazendo"
                                  >
                                    <Play size={10} />
                                  </button>
                                )}
                                {child.status === 'doing' && (
                                  <button
                                    onClick={() => onMarkTask(child.id, child.project_id, 'waiting')}
                                    className="p-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                                    title="Colocar em Aguardando"
                                  >
                                    <Clock size={10} />
                                  </button>
                                )}
                                {child.status !== 'done' && (
                                  <button
                                    onClick={() => onMarkDone(child.id, child.project_id)}
                                    className="p-1 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                    title="Marcar como Concluído"
                                  >
                                    <CheckCircle2 size={10} />
                                  </button>
                                )}
                                {child.status === 'done' && (
                                  <button
                                    onClick={() => onMarkTask(child.id, child.project_id, 'todo')}
                                    className="p-1 rounded-lg bg-warm-200 text-warm-600 hover:bg-warm-300 border border-warm-300 transition-colors"
                                    title="Reabrir tarefa"
                                  >
                                    <Clock size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer com Metadados */}
      <div className="px-5 py-2.5 bg-warm-100/50 border-t border-warm-200 flex justify-between items-center text-[10px] font-bold text-warm-400 uppercase tracking-wider">
        <span>Total: {totalVisibleCount} {totalVisibleCount === 1 ? 'tarefa' : 'tarefas'}</span>
      </div>
    </div>
  );
};

// ─── Componente Modal Reutilizável localmente ─────────────────────────────────

const LocalModal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-elevated w-full max-w-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-warm-250 flex justify-between items-center flex-shrink-0">
          <h3 className="font-semibold text-warm-900 tracking-tight text-xs uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-warm-500 hover:text-warm-850 p-1.5 rounded-lg hover:bg-warm-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-warm-250 flex justify-end gap-3 bg-warm-100/50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── View principal ───────────────────────────────────────────────────────────

export default function OverviewView({ projects, userId, authUser, onUpdateTaskStatus, onRefresh }) {
  const activeProjects = useMemo(
    () => projects.filter(p => p.status === 'active' || p.is_active),
    [projects]
  );
  
  // Achata todas as tarefas top-level dos projetos ativos, filtrando as de OS não aprovadas
  const allTasks = useMemo(
    () =>
      activeProjects.flatMap(p => {
        const serviceOrders = p.service_orders || [];
        return (p.tasks || [])
          .filter(t => {
            if (t.service_order_id) {
              const os = serviceOrders.find(o => o.id === t.service_order_id);
              return os ? os.status === 'approved' : false;
            }
            return true;
          })
          .map(t => ({ ...t, project: p }));
      }),
    [activeProjects]
  );

  // Estado local para atualização otimista de status
  const [localTasks, setLocalTasks] = useState(allTasks);
  const [completedInSession, setCompletedInSession] = useState(new Set());

  // --- Task Details Modal State ---
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFiles, setTaskFiles] = useState([]);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);

  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalStatus, setModalStatus] = useState('todo');
  const [modalPriority, setModalPriority] = useState(0);
  const [modalHours, setModalHours] = useState('');
  const [modalDueDate, setModalDueDate] = useState('');
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [savingTaskDetails, setSavingTaskDetails] = useState(false);

  const [newSubTitle, setNewSubTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  useEffect(() => {
    if (!selectedTask) {
      setTaskFiles([]);
      setSubtasks([]);
      return;
    }

    const loadTaskData = async () => {
      setLoadingFiles(true);
      setLoadingSubtasks(true);
      try {
        const [filesRes, subtasksRes] = await Promise.all([
          getTaskMediaFiles(selectedTask.id),
          supabase.from('tasks').select('*').eq('parent_task_id', selectedTask.id).order('created_at', { ascending: true })
        ]);
        if (filesRes.data) setTaskFiles(filesRes.data);
        if (subtasksRes.data) setSubtasks(subtasksRes.data);
      } catch (err) {
        console.error('Erro ao carregar dados da tarefa:', err);
      } finally {
        setLoadingFiles(false);
        setLoadingSubtasks(false);
      }
    };

    loadTaskData();
  }, [selectedTask]);

  useEffect(() => {
    if (selectedTask) {
      setModalTitle(selectedTask.title || '');
      setModalDesc(selectedTask.description || '');
      setModalStatus(selectedTask.status || 'todo');
      setModalPriority(selectedTask.priority ?? 0);
      setModalHours(selectedTask.estimated_hours || '');
      setModalDueDate(selectedTask.due_date ? toDatetimeLocalString(selectedTask.due_date) : '');
      setModalStartDate(selectedTask.start_date ? toDatetimeLocalString(selectedTask.start_date) : '');
      setModalEndDate(selectedTask.end_date ? toDatetimeLocalString(selectedTask.end_date) : '');
    }
  }, [selectedTask]);

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

  const handleUpdateTaskDate = async (taskId, projectId, newDateStr) => {
    const newDate = newDateStr ? new Date(newDateStr).toISOString() : null;
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, start_date: newDate } : t));
    try {
      const { error } = await supabase.from('tasks').update({ start_date: newDate }).eq('id', taskId);
      if (error) throw error;
      onUpdateTaskStatus?.(taskId, projectId, undefined, { start_date: newDate });
    } catch (err) {
      console.error('Erro ao atualizar data de início da tarefa:', err);
    }
  };

  const handleUpdateTaskExecutionDates = async (taskId, projectId, startDateStr, endDateStr, newServiceOrderId = undefined) => {
    const startDate = startDateStr ? new Date(startDateStr).toISOString() : null;
    const endDate = endDateStr ? new Date(endDateStr).toISOString() : null;
    
    setLocalTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, start_date: startDate, end_date: endDate };
        if (newServiceOrderId !== undefined) {
          updated.service_order_id = newServiceOrderId === 'sem-os' ? null : newServiceOrderId;
        }
        return updated;
      }
      return t;
    }));
    
    try {
      const updates = { start_date: startDate, end_date: endDate };
      if (newServiceOrderId !== undefined) {
        updates.service_order_id = newServiceOrderId === 'sem-os' ? null : newServiceOrderId;
      }
      
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
      onUpdateTaskStatus?.(taskId, projectId, undefined, updates);
    } catch (err) {
      console.error('Erro ao atualizar execução da tarefa:', err);
      throw err;
    }
  };

  const handleMarkDoing = (taskId, projectId) => markTask(taskId, projectId, 'doing');
  const handleMarkDone  = (taskId, projectId) => markTask(taskId, projectId, 'done');

  const handleSaveTaskDetails = async () => {
    if (!modalTitle.trim()) return;
    setSavingTaskDetails(true);
    try {
      const updates = {
        title: modalTitle.trim(),
        description: modalDesc.trim() || null,
        status: modalStatus,
        priority: parseInt(modalPriority),
        estimated_hours: modalHours ? parseFloat(modalHours) : null,
        due_date: modalDueDate ? new Date(modalDueDate).toISOString() : null,
        start_date: modalStartDate ? new Date(modalStartDate).toISOString() : null,
        end_date: modalEndDate ? new Date(modalEndDate).toISOString() : null,
      };

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', selectedTask.id);

      if (error) throw error;

      // Update localTasks so that parent and sub-components in Overview re-render instantly
      setLocalTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updates } : t));
      
      // Update parent projects state
      onUpdateTaskStatus?.(selectedTask.id, selectedTask.project_id, updates.status, updates);

      // Trigger refresh
      onRefresh?.();
      
      setSelectedTask(null);
    } catch (err) {
      console.error('Erro ao salvar tarefa:', err);
      alert('Erro ao salvar alterações');
    } finally {
      setSavingTaskDetails(false);
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubTitle.trim()) return;
    setAddingSubtask(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: selectedTask.project_id,
          user_id: userId,
          parent_task_id: selectedTask.id,
          title: newSubTitle.trim(),
          status: 'todo',
          priority: 0,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSubtasks(prev => [...prev, data]);
        setNewSubTitle('');
        onRefresh?.(); // Refresh to update overview EAP hierarchy
      }
    } catch (err) {
      console.error('Erro ao adicionar subtarefa:', err);
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!window.confirm('Excluir esta subtarefa?')) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
      setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
      onRefresh?.();
    } catch (err) {
      console.error('Erro ao deletar subtarefa:', err);
    }
  };

  const handleToggleSubtaskStatus = async (subtask) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', subtask.id);

      if (error) throw error;
      setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, status: newStatus } : s));
      onRefresh?.();
    } catch (err) {
      console.error('Erro ao atualizar status da subtarefa:', err);
    }
  };

  const handleDeleteParentTask = async () => {
    if (!window.confirm('Excluir esta tarefa permanentemente?')) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;
      
      setLocalTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      onRefresh?.();
      setSelectedTask(null);
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
      alert('Erro ao excluir tarefa');
    }
  };

  const handleFileAdded = (newFile) => {
    setTaskFiles(prev => [newFile, ...prev]);
    onRefresh?.();
  };

  const handleFileDeleted = (deletedFileId) => {
    setTaskFiles(prev => prev.filter(f => f.id !== deletedFileId));
    onRefresh?.();
  };

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
            onMarkTask={markTask}
          />
        </div>
        <div className="lg:col-span-3">
          <TaskListBlock
            tasks={localTasks}
            onMarkDoing={handleMarkDoing}
            onMarkDone={handleMarkDone}
            onMarkTask={markTask}
            onTaskClick={setSelectedTask}
          />
        </div>
      </div>

      {/* ── Agenda do Dia / Cronograma de Recursos ── */}
      <CalendarAgenda
        tasks={localTasks}
        activeProjects={activeProjects}
        onUpdateTaskExecutionDates={handleUpdateTaskExecutionDates}
        onTaskClick={setSelectedTask}
      />

      {/* ── Tabela de Todas as Tarefas ── */}
      <TaskTableBlock 
        tasks={localTasks} 
        projects={activeProjects}
        onMarkDoing={handleMarkDoing}
        onMarkDone={handleMarkDone}
        onMarkTask={markTask}
        onUpdateTaskDate={handleUpdateTaskDate}
        onTaskClick={setSelectedTask}
      />

      {/* ── Modal de Detalhes da Tarefa ── */}
      {selectedTask && (
        <LocalModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="Detalhes da Tarefa"
          footer={(
            <div className="flex justify-between items-center w-full">
              <button
                type="button"
                onClick={handleDeleteParentTask}
                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Excluir Tarefa
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 border border-warm-400 text-warm-600 hover:bg-warm-250 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTaskDetails}
                  disabled={savingTaskDetails || !modalTitle.trim()}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-warm-900 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {savingTaskDetails ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Coluna da esquerda (Conteúdo) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Título */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-warm-400 block mb-1.5">Título da Tarefa</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full bg-warm-200 border border-warm-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-xs text-warm-900 placeholder-warm-500 outline-none transition-all font-semibold"
                  placeholder="Título da tarefa..."
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-warm-400 block mb-1.5">Descrição</label>
                <textarea
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  className="w-full bg-warm-200 border border-warm-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-xs text-warm-900 placeholder-warm-500 outline-none transition-all h-24 resize-none"
                  placeholder="Adicionar descrição detalhada..."
                />
              </div>

              {/* Subtarefas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <List size={14} className="text-brand-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-400">Subtarefas ({subtasks.length})</span>
                  </div>
                </div>

                {/* Lista de Subtarefas */}
                {loadingSubtasks ? (
                  <div className="py-4 text-center text-xs text-warm-400 font-medium">Carregando subtarefas...</div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {subtasks.length === 0 ? (
                      <p className="text-xs text-warm-400 italic">Nenhuma subtarefa criada.</p>
                    ) : (
                      subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-3 p-2.5 bg-warm-200/50 hover:bg-warm-200 rounded-xl border border-warm-300/40 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSubtaskStatus(sub)}
                              className="text-warm-500 hover:text-brand-500 flex-shrink-0 transition-colors"
                            >
                              {sub.status === 'done' ? (
                                <CheckSquare size={14} className="text-emerald-500" />
                              ) : (
                                <span className="block w-3.5 h-3.5 border border-warm-400 rounded bg-warm-100 hover:border-warm-600 transition-colors" />
                              )}
                            </button>
                            <span className={`text-xs font-medium truncate ${sub.status === 'done' ? 'line-through text-warm-400' : 'text-warm-800'}`}>
                              {sub.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(sub.id)}
                            className="p-1 text-warm-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover subtarefa"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Formulário de adicionar subtarefa */}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova subtarefa..."
                    value={newSubTitle}
                    onChange={(e) => setNewSubTitle(e.target.value)}
                    className="flex-1 bg-warm-200 border border-warm-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 rounded-xl px-3 py-1.5 text-xs text-warm-900 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={addingSubtask || !newSubTitle.trim()}
                    className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-400 text-warm-900 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Adicionar
                  </button>
                </form>
              </div>
            </div>

            {/* Coluna da direita (Sidebar) */}
            <div className="lg:col-span-2 bg-warm-200/40 rounded-2xl border border-warm-300/40 p-5 space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Status */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-500 block mb-2">Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-warm-850 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                  >
                    <option value="todo">A fazer</option>
                    <option value="doing">Fazendo</option>
                    <option value="waiting">Aguardando</option>
                    <option value="done">Concluído</option>
                  </select>
                </div>

                {/* Prioridade */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-500 block mb-2">Prioridade</label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-warm-850 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                  >
                    <option value={0}>Normal</option>
                    <option value={1}>Alta</option>
                    <option value={2}>Urgente</option>
                  </select>
                </div>

                {/* Horas Estimadas */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-500 block mb-2">Horas Estimadas</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Horas..."
                      value={modalHours}
                      onChange={(e) => setModalHours(e.target.value)}
                      className="w-full bg-warm-50 border border-warm-300 rounded-xl pl-4 pr-8 py-2.5 text-xs text-warm-900 outline-none transition-all font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-warm-400 font-bold uppercase">h</span>
                  </div>
                </div>

                {/* Data de Vencimento */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-500 block mb-2">Prazo / Vencimento</label>
                  <input
                    type="datetime-local"
                    value={modalDueDate}
                    onChange={(e) => setModalDueDate(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-300 rounded-xl px-4 py-2.5 text-xs text-warm-900 outline-none transition-all font-semibold cursor-pointer"
                  />
                </div>

                {/* Data de Início da Execução */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-500 block mb-2">Início da Execução</label>
                  <input
                    type="datetime-local"
                    value={modalStartDate}
                    onChange={(e) => setModalStartDate(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-300 rounded-xl px-4 py-2.5 text-xs text-warm-900 outline-none transition-all font-semibold cursor-pointer"
                  />
                </div>

                {/* Data de Fim da Execução */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-500 block mb-2">Fim da Execução</label>
                  <input
                    type="datetime-local"
                    value={modalEndDate}
                    onChange={(e) => setModalEndDate(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-300 rounded-xl px-4 py-2.5 text-xs text-warm-900 outline-none transition-all font-semibold cursor-pointer"
                  />
                </div>
              </div>

              {/* Informações de Contexto do Projeto */}
              <div className="pt-4 border-t border-warm-300/60 text-[11px] text-warm-500 space-y-1">
                <p>
                  <strong>Projeto:</strong> <span className="text-warm-700 font-medium">{selectedTask?.project?.title || '—'}</span>
                </p>
                {selectedTask?.project?.client && (
                  <p>
                    <strong>Cliente:</strong> <span className="text-warm-700 font-medium">{selectedTask.project.client.name}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Anexos / File Uploader */}
          <div className="mt-6 border-t border-warm-250 pt-5 space-y-4">
            <div className="flex items-center gap-1.5">
              <Paperclip size={14} className="text-brand-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-warm-400">Armazenamento / Anexos</span>
            </div>

            {/* Galeria de Imagens Anexadas */}
            {!loadingFiles && taskFiles.filter(f => f.mime_type?.startsWith('image/')).length > 0 && (
              <div className="space-y-2 bg-warm-200/20 rounded-xl p-3 border border-warm-300/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-warm-500">Galeria de Imagens</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {taskFiles.filter(f => f.mime_type?.startsWith('image/')).map(file => (
                    <div 
                      key={file.id} 
                      onClick={() => setActiveLightboxImage(file)}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-warm-300 bg-warm-200/50 hover:border-brand-400 hover:shadow-sm cursor-pointer transition-all"
                      title="Clique para ampliar"
                    >
                      <img 
                        src={file.file_url} 
                        alt={file.file_name} 
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="text-white animate-in zoom-in-75 duration-200" size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {loadingFiles ? (
              <div className="py-6 text-center text-xs text-warm-400 font-medium">Carregando anexos...</div>
            ) : (
              <FileUploader
                userId={userId}
                authUserId={authUser?.id}
                folder="tasks"
                entityId={selectedTask.id}
                existingFiles={taskFiles}
                onFileAdded={handleFileAdded}
                onFileDeleted={handleFileDeleted}
                compact={true}
              />
            )}
            
            <p className="text-[10px] text-warm-500 flex items-center gap-1 mt-1">
              <span className="font-bold">Dica:</span> Você pode colar uma imagem diretamente do seu clipboard (Ctrl+V) nesta seção.
            </p>
          </div>
        </LocalModal>
      )}

      {/* ── Lightbox para Visualização de Imagens ── */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button 
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X size={20} />
          </button>
          
          <div className="max-w-4xl max-h-[80vh] relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={activeLightboxImage.file_url} 
              alt={activeLightboxImage.file_name} 
              className="object-contain max-w-full max-h-[80vh] rounded-xl shadow-2xl animate-in zoom-in-95" 
            />
          </div>
          
          <div className="mt-4 text-center text-white/90 max-w-lg px-4">
            <p className="text-sm font-semibold truncate">{activeLightboxImage.file_name}</p>
            {activeLightboxImage.file_size && (
              <p className="text-xs text-white/50 mt-1">
                {activeLightboxImage.file_size < 1024 ? `${activeLightboxImage.file_size} B` :
                 activeLightboxImage.file_size < 1024 * 1024 ? `${(activeLightboxImage.file_size / 1024).toFixed(1)} KB` :
                 `${(activeLightboxImage.file_size / (1024 * 1024)).toFixed(1)} MB`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
