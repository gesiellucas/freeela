import { useState } from 'react';
import {
  Plus, X, ChevronRight, ChevronDown, Trash2, Pencil,
  CheckCircle2, Clock, AlertCircle, FileText, Calendar,
  DollarSign, BarChart2, Users, Layers, CheckSquare,
  Square, ArrowLeft, ClipboardList, Lock, Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Shared primitives (mirrors ProjetosView design system) ──────────────────

const Card = ({ children, className = '', ...props }) => (
  <div className={`bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card ${className}`} {...props}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, loading = false, disabled = false, type = 'button' }) => {
  const variants = {
    primary:   'bg-brand-500 text-warm-900 hover:bg-brand-400 font-semibold shadow-sm',
    secondary: 'bg-warm-200 text-warm-800 hover:bg-warm-300 border border-warm-400/50',
    outline:   'border border-warm-400 text-warm-600 hover:bg-warm-200',
    danger:    'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
    ghost:     'text-warm-500 hover:bg-warm-200 hover:text-warm-600',
    success:   'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${variants[variant]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {loading
        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : Icon && <Icon size={15} />}
      {children}
    </button>
  );
};

const Badge = ({ color = 'slate', children }) => {
  const colors = {
    green:   'bg-emerald-50 text-emerald-700 border border-emerald-100',
    blue:    'bg-blue-50 text-blue-600 border border-blue-100',
    yellow:  'bg-amber-50 text-amber-700 border border-amber-100',
    red:     'bg-red-50 text-red-600 border border-red-100',
    slate:   'bg-warm-200 text-warm-500 border border-warm-300',
    violet:  'bg-violet-50 text-violet-600 border border-violet-100',
    orange:  'bg-orange-50 text-orange-600 border border-orange-100',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const OS_STATUS_CONFIG = {
  draft:    { label: 'Rascunho',  color: 'slate',  icon: FileText },
  pending:  { label: 'Pendente',  color: 'yellow', icon: Clock },
  approved: { label: 'Aprovada',  color: 'green',  icon: CheckCircle2 },
  declined: { label: 'Declinada', color: 'red',    icon: AlertCircle },
};

const PRIORITY_CONFIG = {
  baixa:  { label: 'Baixa',   color: 'blue' },
  normal: { label: 'Normal',  color: 'slate' },
  alta:   { label: 'Alta',    color: 'orange' },
  urgente:{ label: 'Urgente', color: 'red' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

function fmtCurrency(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ── OS Status Badge ──────────────────────────────────────────────────────────

function OSStatusBadge({ status }) {
  const cfg = OS_STATUS_CONFIG[status] || OS_STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border
      ${cfg.color === 'green'  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
        cfg.color === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-100' :
        cfg.color === 'red'    ? 'bg-red-50 text-red-600 border-red-100' :
                                 'bg-warm-200 text-warm-500 border-warm-300'}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ── Task Card (within OS) ────────────────────────────────────────────────────

function OSTaskCard({ task, checklists, onDeleteTask, onToggleChecklistItem, onDeleteChecklistItem, onAddChecklistItem, onUpdateTaskStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState({});
  const taskChecklists = checklists.filter(c => c.task_id === task.id);
  const totalItems = taskChecklists.reduce((sum, c) => sum + (c.checklist_items?.length || 0), 0);
  const doneItems  = taskChecklists.reduce((sum, c) => sum + (c.checklist_items?.filter(i => i.completed).length || 0), 0);

  const STATUS_NEXT = { todo: 'doing', doing: 'waiting', waiting: 'done', done: null };
  const STATUS_PREV = { todo: null, doing: 'todo', waiting: 'doing', done: 'waiting' };
  const STATUS_LABELS = { todo: 'A Fazer', doing: 'Em Progresso', waiting: 'Aguardando', done: 'Concluído' };
  const STATUS_DOT = { todo: 'bg-warm-400', doing: 'bg-amber-400', waiting: 'bg-blue-400', done: 'bg-emerald-400' };

  return (
    <Card className="overflow-hidden border-l-4 border-l-brand-500/60">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-warm-500 hover:text-warm-700 transition-colors flex-shrink-0">
            <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warm-900 leading-snug">{task.title}</p>
            {task.description && <p className="text-xs text-warm-500 mt-0.5 leading-snug">{task.description}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[task.status]}`} />
              <span className="text-[10px] text-warm-500 font-medium">{STATUS_LABELS[task.status]}</span>
              {task.due_date && (
                <>
                  <span className="text-warm-300">|</span>
                  <span className="text-[10px] text-warm-500 font-mono flex items-center gap-0.5">
                    <Calendar size={10} />{fmtDate(task.due_date)}
                  </span>
                </>
              )}
              {task.difficulty && (
                <>
                  <span className="text-warm-300">|</span>
                  <Badge color={task.difficulty === 'Alta' ? 'red' : task.difficulty === 'Média' ? 'yellow' : 'blue'}>
                    {task.difficulty}
                  </Badge>
                </>
              )}
              {totalItems > 0 && (
                <>
                  <span className="text-warm-300">|</span>
                  <span className="text-[10px] font-mono text-emerald-600">{doneItems}/{totalItems}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {STATUS_PREV[task.status] && (
              <button onClick={() => onUpdateTaskStatus(task.id, STATUS_PREV[task.status])}
                className="p-1.5 hover:bg-warm-200 rounded-lg transition-colors" title="Retroceder status">
                <ChevronDown size={13} className="text-warm-500" />
              </button>
            )}
            {STATUS_NEXT[task.status] && (
              <button onClick={() => onUpdateTaskStatus(task.id, STATUS_NEXT[task.status])}
                className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors" title="Avançar status">
                <ChevronRight size={13} className="text-brand-500" />
              </button>
            )}
            <button onClick={() => onDeleteTask(task.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-warm-400 hover:text-red-500 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Checklists expandidos */}
      {expanded && (
        <div className="border-t border-warm-200 bg-warm-100/40 px-4 py-3 space-y-4">
          {taskChecklists.length === 0 && (
            <p className="text-xs text-warm-500 italic py-1">Nenhuma subtarefa ainda.</p>
          )}
          {taskChecklists.map(cl => {
            const items = cl.checklist_items || [];
            const done = items.filter(i => i.completed).length;
            const pct = items.length ? Math.round((done / items.length) * 100) : 0;
            return (
              <div key={cl.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-warm-800">{cl.title}</p>
                  {items.length > 0 && (
                    <span className="text-[10px] font-mono text-emerald-600">{done}/{items.length} ({pct}%)</span>
                  )}
                </div>
                <div className="space-y-1.5 pl-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group text-xs">
                      <button onClick={() => onToggleChecklistItem(item.id, !item.completed)}
                        className="text-warm-500 hover:text-brand-500 flex-shrink-0 transition-colors">
                        {item.completed
                          ? <CheckSquare size={13} className="text-emerald-500" />
                          : <Square size={13} />}
                      </button>
                      <span className={`flex-1 ${item.completed ? 'line-through text-warm-400' : 'text-warm-700'}`}>
                        {item.title}
                      </span>
                      <button onClick={() => onDeleteChecklistItem(item.id)}
                        className="p-0.5 text-warm-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <Plus size={12} className="text-warm-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={newSubTitle[cl.id] || ''}
                      onChange={e => setNewSubTitle({ ...newSubTitle, [cl.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          onAddChecklistItem(cl.id, newSubTitle[cl.id] || '');
                          setNewSubTitle({ ...newSubTitle, [cl.id]: '' });
                        }
                      }}
                      placeholder="Adicionar item..."
                      className="flex-1 bg-transparent text-xs text-warm-700 outline-none placeholder-warm-400"
                    />
                    {(newSubTitle[cl.id] || '').trim() && (
                      <button
                        onClick={() => {
                          onAddChecklistItem(cl.id, newSubTitle[cl.id]);
                          setNewSubTitle({ ...newSubTitle, [cl.id]: '' });
                        }}
                        className="text-[10px] font-semibold text-brand-600 hover:underline">
                        Adicionar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── OS Detail View ───────────────────────────────────────────────────────────

function OSDetailView({ os, proj, onBack, onStatusChange, onDelete, refreshProject }) {
  const osTasks = (proj.tasks || []).filter(t => t.service_order_id === os.id);
  const allChecklists = proj.checklists || [];

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Form: Nova Tarefa
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskDifficulty, setTaskDifficulty] = useState('Média');
  const [taskStack, setTaskStack] = useState('');
  const [taskCost, setTaskCost] = useState('');

  // Form: Editar OS
  const [editTitle, setEditTitle] = useState(os.title);
  const [editDesc, setEditDesc] = useState(os.description || '');
  const [editScope, setEditScope] = useState(os.scope_summary || '');
  const [editStart, setEditStart] = useState(os.planned_start_date || '');
  const [editEnd, setEditEnd] = useState(os.planned_end_date || '');
  const [editHours, setEditHours] = useState(os.estimated_hours || '');
  const [editAmount, setEditAmount] = useState(os.planned_amount || 0);
  const [editPriority, setEditPriority] = useState(os.priority || 'normal');
  const [editCustomerNotes, setEditCustomerNotes] = useState(os.customer_notes || '');
  const [editInternalNotes, setEditInternalNotes] = useState(os.internal_notes || '');

  const isApproved = os.status === 'approved';

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: proj.id,
        user_id: proj.user_id,
        service_order_id: os.id,
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        due_date: taskDate || null,
        difficulty: taskDifficulty || null,
        development_stack: taskStack.trim() || null,
        estimated_cost: parseFloat(taskCost) || null,
        status: 'todo',
        task_type: 'technical',
      });
      if (error) throw error;
      setTaskTitle('');
      setTaskDesc('');
      setTaskDate('');
      setTaskDifficulty('Média');
      setTaskStack('');
      setTaskCost('');
      setShowTaskForm(false);
      await refreshProject();
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
      alert('Erro ao criar tarefa: ' + err.message);
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Excluir esta tarefa e seus checklists?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      await refreshProject();
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      await refreshProject();
    } catch (err) {
      console.error('Erro ao atualizar status da tarefa:', err);
    }
  };

  const handleToggleChecklistItem = async (itemId, completed) => {
    try {
      const { error } = await supabase.from('checklist_items').update({ completed }).eq('id', itemId);
      if (error) throw error;
      await refreshProject();
    } catch (err) {
      console.error('Erro ao alternar item:', err);
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    try {
      const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);
      if (error) throw error;
      await refreshProject();
    } catch (err) {
      console.error('Erro ao excluir item:', err);
    }
  };

  const handleAddChecklistItem = async (clId, title) => {
    if (!title.trim()) return;
    try {
      const { error } = await supabase.from('checklist_items').insert({
        checklist_id: clId,
        title: title.trim(),
        completed: false,
      });
      if (error) throw error;
      await refreshProject();
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setSavingStatus(true);
    try {
      await onStatusChange(os.id, newStatus);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('service_orders').update({
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        scope_summary: editScope.trim() || null,
        planned_start_date: editStart || null,
        planned_end_date: editEnd || null,
        estimated_hours: parseFloat(editHours) || null,
        planned_amount: parseFloat(editAmount) || 0,
        priority: editPriority,
        customer_notes: editCustomerNotes.trim() || null,
        internal_notes: editInternalNotes.trim() || null,
      }).eq('id', os.id);
      if (error) throw error;
      setShowEditForm(false);
      await refreshProject();
    } catch (err) {
      console.error('Erro ao editar OS:', err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const completedTasks = osTasks.filter(t => t.status === 'done').length;
  const progressFromTasks = osTasks.length
    ? Math.round((completedTasks / osTasks.length) * 100)
    : (os.progress_percent || 0);

  const STATUS_TRANSITIONS = {
    draft:    [{ to: 'pending',  label: 'Enviar para Aprovação', variant: 'secondary' }],
    pending:  [
      { to: 'approved', label: 'Aprovar OS', variant: 'success' },
      { to: 'declined', label: 'Declinar', variant: 'danger' },
      { to: 'draft',    label: 'Voltar a Rascunho', variant: 'ghost' },
    ],
    approved: [{ to: 'declined', label: 'Encerrar OS', variant: 'danger' }],
    declined: [],
  };

  const transitions = STATUS_TRANSITIONS[os.status] || [];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-warm-500 hover:text-warm-700 hover:bg-warm-200 rounded-xl transition-all">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-warm-900 tracking-tight">{os.title}</h3>
              <OSStatusBadge status={os.status} />
              {os.version > 1 && <Badge color="violet">v{os.version}</Badge>}
            </div>
            <p className="text-xs text-warm-500 mt-0.5">
              OS #{os.id.slice(0, 8).toUpperCase()} · {fmtDate(os.created_at.split('T')[0])}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {transitions.map(t => (
            <Button key={t.to} variant={t.variant} loading={savingStatus}
              onClick={() => handleStatusChange(t.to)}>
              {t.label}
            </Button>
          ))}
          {os.status !== 'declined' && (
            <Button variant="secondary" icon={Pencil} onClick={() => setShowEditForm(!showEditForm)}>
              {showEditForm ? 'Cancelar Edição' : 'Editar'}
            </Button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {showEditForm && (
        <Card className="p-5">
          <form onSubmit={handleSaveEdit} className="space-y-5">
            <h4 className="font-semibold text-sm text-warm-850 border-b border-warm-200 pb-2">Editar Ordem de Serviço</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Título *</label>
                <input required value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Prioridade</label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none">
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Descrição</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Resumo do Escopo</label>
              <textarea value={editScope} onChange={e => setEditScope(e.target.value)} rows={3}
                placeholder="Descreva o escopo desta OS de forma objetiva..."
                className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Início Planejado</label>
                <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Término Planejado</label>
                <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Horas Estimadas</label>
                <input type="number" value={editHours} onChange={e => setEditHours(e.target.value)} min="0" step="0.5"
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Valor Planejado (R$)</label>
                <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min="0" step="0.01"
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Notas para o Cliente</label>
                <textarea value={editCustomerNotes} onChange={e => setEditCustomerNotes(e.target.value)} rows={2}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Notas Internas</label>
                <textarea value={editInternalNotes} onChange={e => setEditInternalNotes(e.target.value)} rows={2}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowEditForm(false)}>Cancelar</Button>
              <Button type="submit" loading={savingEdit}>Salvar Alterações</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-warm-500 mb-1 flex items-center gap-1">
            <DollarSign size={10} /> Valor Planejado
          </p>
          <p className="text-xl font-bold text-warm-900 font-mono">{fmtCurrency(os.planned_amount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-warm-500 mb-1 flex items-center gap-1">
            <Clock size={10} /> Horas Estimadas
          </p>
          <p className="text-xl font-bold text-warm-900 font-mono">{os.estimated_hours ? `${os.estimated_hours}h` : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-warm-500 mb-1 flex items-center gap-1">
            <Calendar size={10} /> Período
          </p>
          <p className="text-xs font-semibold text-warm-800">
            {fmtDate(os.planned_start_date)} → {fmtDate(os.planned_end_date)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-warm-500 mb-1 flex items-center gap-1">
            <BarChart2 size={10} /> Progresso
          </p>
          <div className="space-y-1.5">
            <p className="text-xl font-bold text-warm-900 font-mono">{progressFromTasks}%</p>
            <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-700"
                style={{ width: `${progressFromTasks}%` }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Scope Summary + Notes */}
      {(os.scope_summary || os.customer_notes || os.internal_notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {os.scope_summary && (
            <Card className="p-5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-warm-500 mb-2 flex items-center gap-1.5">
                <Layers size={12} /> Resumo do Escopo
              </h5>
              <p className="text-sm text-warm-700 whitespace-pre-wrap leading-relaxed">{os.scope_summary}</p>
            </Card>
          )}
          {(os.customer_notes || os.internal_notes) && (
            <Card className="p-5 space-y-3">
              {os.customer_notes && (
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-warm-500 mb-1 flex items-center gap-1.5">
                    <Users size={12} /> Notas para o Cliente
                  </h5>
                  <p className="text-sm text-warm-700 whitespace-pre-wrap">{os.customer_notes}</p>
                </div>
              )}
              {os.internal_notes && (
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-warm-500 mb-1 flex items-center gap-1.5">
                    <Info size={12} /> Notas Internas
                  </h5>
                  <p className="text-sm text-warm-700 whitespace-pre-wrap">{os.internal_notes}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-warm-300 pb-3">
          <h4 className="font-semibold text-base text-warm-900 flex items-center gap-2">
            <ClipboardList size={16} className="text-brand-500" />
            Tarefas
            {osTasks.length > 0 && (
              <span className="text-xs font-bold text-warm-500 bg-warm-200 rounded-full px-2 py-0.5">
                {completedTasks}/{osTasks.length}
              </span>
            )}
          </h4>
          {isApproved ? (
            <Button variant={showTaskForm ? 'outline' : 'primary'} icon={showTaskForm ? null : Plus}
              onClick={() => setShowTaskForm(!showTaskForm)}>
              {showTaskForm ? 'Cancelar' : 'Nova Tarefa'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Lock size={12} className="text-amber-600" />
              <span className="text-xs font-medium text-amber-700">OS não aprovada</span>
            </div>
          )}
        </div>

        {/* Aviso de OS não aprovada */}
        {!isApproved && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <Lock size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Criação de tarefas bloqueada</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Só é possível adicionar tarefas após a OS ser <strong>aprovada</strong>.
                Altere o status da OS para continuar.
              </p>
            </div>
          </div>
        )}

        {/* Formulário de Nova Tarefa */}
        {isApproved && showTaskForm && (
          <Card className="p-5">
            <form onSubmit={handleCreateTask} className="space-y-4">
              <h5 className="font-semibold text-xs text-warm-800 uppercase tracking-wider">Nova Tarefa</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Título *</label>
                  <input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Ex: Implementar tela de login"
                    className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Dificuldade</label>
                  <select value={taskDifficulty} onChange={e => setTaskDifficulty(e.target.value)}
                    className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none">
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Descrição</label>
                  <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)}
                    placeholder="Breve descrição da tarefa..."
                    className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Prazo</label>
                  <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)}
                    className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Stack / Tecnologias</label>
                  <input value={taskStack} onChange={e => setTaskStack(e.target.value)}
                    placeholder="Ex: React, Node.js..."
                    className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Custo Estimado (R$)</label>
                  <input type="number" value={taskCost} onChange={e => setTaskCost(e.target.value)} min="0" step="0.01"
                    className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setShowTaskForm(false)}>Cancelar</Button>
                <Button type="submit" loading={savingTask}>Criar Tarefa</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Lista de Tarefas */}
        {osTasks.length === 0 && isApproved && !showTaskForm && (
          <div className="text-center py-12 text-warm-500 bg-warm-50 rounded-2xl border border-warm-300/40 border-dashed">
            <ClipboardList size={32} className="mx-auto mb-3 text-warm-300" />
            <p className="text-sm font-medium">Nenhuma tarefa nesta OS ainda.</p>
            <p className="text-xs text-warm-400 mt-1">Clique em "Nova Tarefa" para começar.</p>
          </div>
        )}

        <div className="space-y-3">
          {osTasks.map(task => (
            <OSTaskCard
              key={task.id}
              task={task}
              checklists={allChecklists.filter(c => c.task_id === task.id)}
              onDeleteTask={handleDeleteTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onToggleChecklistItem={handleToggleChecklistItem}
              onDeleteChecklistItem={handleDeleteChecklistItem}
              onAddChecklistItem={handleAddChecklistItem}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── OS Create Form ───────────────────────────────────────────────────────────

function OSCreateForm({ proj, onClose, refreshProject }) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scopeSummary, setScopeSummary] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState('');
  const [amount, setAmount] = useState('');
  const [priority, setPriority] = useState('normal');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('service_orders').insert({
        project_id: proj.id,
        user_id: proj.user_id,
        title: title.trim(),
        description: description.trim() || null,
        scope_summary: scopeSummary.trim() || null,
        planned_start_date: startDate || null,
        planned_end_date: endDate || null,
        estimated_hours: parseFloat(hours) || null,
        planned_amount: parseFloat(amount) || 0,
        priority,
        customer_notes: customerNotes.trim() || null,
        internal_notes: internalNotes.trim() || null,
        status: 'draft',
      });
      if (error) throw error;
      onClose();
      await refreshProject();
    } catch (err) {
      console.error('Erro ao criar OS:', err);
      alert('Erro ao criar Ordem de Serviço: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl overflow-hidden shadow-elevated animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-warm-300/60 flex justify-between items-center flex-shrink-0">
          <h3 className="font-semibold text-warm-900 flex items-center gap-2">
            <ClipboardList size={16} className="text-brand-500" />
            Nova Ordem de Serviço
          </h3>
          <button onClick={onClose} className="text-warm-500 hover:text-warm-800 p-1 rounded-lg hover:bg-warm-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Título + Prioridade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Título *</label>
                <input required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Desenvolvimento da Fase 1"
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Prioridade</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2.5 text-sm text-warm-800 focus:outline-none">
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Descrição</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Contextualização geral desta OS..."
                className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-500 focus:outline-none resize-none" />
            </div>

            {/* Escopo */}
            <div>
              <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Resumo do Escopo</label>
              <textarea value={scopeSummary} onChange={e => setScopeSummary(e.target.value)} rows={3}
                placeholder="Descreva o que está incluso no escopo desta OS..."
                className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-500 focus:outline-none resize-none" />
            </div>

            {/* Datas + Horas + Valor */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Início Planejado</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Término Planejado</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Horas Estimadas</label>
                <input type="number" value={hours} onChange={e => setHours(e.target.value)} min="0" step="0.5"
                  placeholder="0"
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Valor Planejado (R$)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01"
                  placeholder="0,00"
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none" />
              </div>
            </div>

            {/* Notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Notas para o Cliente</label>
                <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} rows={2}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-800 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1.5">Notas Internas</label>
                <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-800 focus:outline-none resize-none" />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-warm-300/60 flex justify-end gap-3 bg-warm-100/50 flex-shrink-0">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving} icon={Plus}>Criar Ordem de Serviço</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── OS List Card ─────────────────────────────────────────────────────────────

function OSCard({ os, onSelect, onDelete }) {
  const pct = os.progress_percent || 0;
  const prCfg = PRIORITY_CONFIG[os.priority] || PRIORITY_CONFIG.normal;

  return (
    <Card className="p-5 hover:shadow-elevated hover:border-warm-400 transition-all cursor-pointer group"
      onClick={() => onSelect(os)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <OSStatusBadge status={os.status} />
              <Badge color={prCfg.color}>{prCfg.label}</Badge>
              {os.version > 1 && <Badge color="violet">v{os.version}</Badge>}
            </div>
            <h4 className="font-semibold text-sm text-warm-900 leading-snug group-hover:text-brand-600 transition-colors">
              {os.title}
            </h4>
            {os.description && (
              <p className="text-xs text-warm-500 mt-0.5 line-clamp-1">{os.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-warm-400 font-medium opacity-0 group-hover:opacity-100 transition-all mr-1">
              ver detalhes →
            </span>
            <button
              onClick={e => { e.stopPropagation(); onDelete(os); }}
              className="p-1.5 text-warm-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-warm-100 rounded-xl px-3 py-2">
            <p className="text-[9px] font-bold text-warm-500 uppercase mb-0.5 flex items-center gap-0.5">
              <DollarSign size={9} /> Valor
            </p>
            <p className="font-bold text-warm-900 font-mono text-sm">{fmtCurrency(os.planned_amount)}</p>
          </div>
          <div className="bg-warm-100 rounded-xl px-3 py-2">
            <p className="text-[9px] font-bold text-warm-500 uppercase mb-0.5 flex items-center gap-0.5">
              <Calendar size={9} /> Período
            </p>
            <p className="font-medium text-warm-800">
              {fmtDate(os.planned_start_date)} → {fmtDate(os.planned_end_date)}
            </p>
          </div>
          <div className="bg-warm-100 rounded-xl px-3 py-2 col-span-2 md:col-span-1">
            <p className="text-[9px] font-bold text-warm-500 uppercase mb-1 flex items-center gap-0.5">
              <BarChart2 size={9} /> Progresso
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-warm-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${os.status === 'approved' ? 'bg-brand-500' : 'bg-warm-400'}`}
                  style={{ width: `${pct}%` }} />
              </div>
              <span className="font-mono font-bold text-warm-700 text-[10px]">{pct}%</span>
            </div>
          </div>
        </div>

        {/* Approved at */}
        {os.approved_at && (
          <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
            <CheckCircle2 size={10} />
            Aprovada em {new Date(os.approved_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function OrdemDeServicoTab({ proj, refreshProject }) {
  const [selectedOS, setSelectedOS] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const serviceOrders = (proj.service_orders || []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const handleStatusChange = async (osId, newStatus) => {
    try {
      const { error } = await supabase.from('service_orders')
        .update({ status: newStatus })
        .eq('id', osId);
      if (error) throw error;
      // Atualiza o selectedOS localmente após o refresh
      await refreshProject();
      // Recarrega a OS atualizada para refletir o novo status
      const { data } = await supabase.from('service_orders').select('*').eq('id', osId).single();
      if (data) setSelectedOS(data);
    } catch (err) {
      console.error('Erro ao mudar status da OS:', err);
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleDeleteOS = async (os) => {
    if (!window.confirm(`Excluir a OS "${os.title}"? Todas as tarefas vinculadas perderão o vínculo com esta OS.`)) return;
    try {
      const { error } = await supabase.from('service_orders').delete().eq('id', os.id);
      if (error) throw error;
      if (selectedOS?.id === os.id) setSelectedOS(null);
      await refreshProject();
    } catch (err) {
      console.error('Erro ao excluir OS:', err);
      alert('Erro ao excluir OS: ' + err.message);
    }
  };

  // OS Detail view
  if (selectedOS) {
    const latestOS = serviceOrders.find(o => o.id === selectedOS.id) || selectedOS;
    return (
      <>
        <OSDetailView
          os={latestOS}
          proj={proj}
          onBack={() => setSelectedOS(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteOS}
          refreshProject={refreshProject}
        />
        {showCreateForm && (
          <OSCreateForm proj={proj} onClose={() => setShowCreateForm(false)} refreshProject={refreshProject} />
        )}
      </>
    );
  }

  // OS List view
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-warm-900 flex items-center gap-2">
            <ClipboardList size={18} className="text-brand-500" />
            Ordens de Serviço
          </h3>
          <p className="text-xs text-warm-500 mt-0.5">
            {serviceOrders.length === 0
              ? 'Nenhuma OS criada ainda para este projeto.'
              : `${serviceOrders.length} OS · ${serviceOrders.filter(o => o.status === 'approved').length} aprovada(s)`}
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateForm(true)}>
          Nova OS
        </Button>
      </div>

      {serviceOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-warm-500">
          <div className="w-16 h-16 rounded-2xl bg-warm-200 flex items-center justify-center">
            <ClipboardList size={28} className="text-warm-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">Sem Ordens de Serviço</p>
            <p className="text-xs text-warm-400 mt-1 max-w-xs">
              Crie uma OS para definir o trabalho aprovado, prazo e valor antes de adicionar tarefas.
            </p>
          </div>
          <Button icon={Plus} onClick={() => setShowCreateForm(true)}>Criar primeira OS</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {serviceOrders.map(os => (
            <OSCard key={os.id} os={os} onSelect={setSelectedOS} onDelete={handleDeleteOS} />
          ))}
        </div>
      )}

      {showCreateForm && (
        <OSCreateForm proj={proj} onClose={() => setShowCreateForm(false)} refreshProject={refreshProject} />
      )}
    </div>
  );
}
