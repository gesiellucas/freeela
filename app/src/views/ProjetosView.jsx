import { useState } from 'react';
import {
  Briefcase, X, Users, CreditCard, FolderOpen,
  CheckCircle2, ChevronDown, ChevronRight, Calendar, ShieldCheck,
  DollarSign, Archive, ArrowRight, Plus, Trash2, Pencil,
  ChevronUp, Minus, ArrowDown, Check, Square, CheckSquare,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { id: 1, label: 'Contato',      key: 'initial_contact', icon: <Users size={14} />,       desc: 'Registro do lead e e-mail de boas-vindas' },
  { id: 2, label: 'Demanda',      key: 'understanding',   icon: <Calendar size={14} />,    desc: 'Briefing e alinhamento de expectativas' },
  { id: 3, label: 'Proposta',     key: 'proposal',        icon: <ShieldCheck size={14} />, desc: 'Geração e envio da proposta comercial' },
  { id: 4, label: 'Contrato',     key: 'contract',        icon: <CheckCircle2 size={14} />, desc: 'Formalização jurídica do projeto' },
  { id: 5, label: 'Dev',          key: 'development',     icon: <Briefcase size={14} />,   desc: 'Execução técnica e acompanhamento' },
  { id: 6, label: 'Pagamento',    key: 'payment',         icon: <DollarSign size={14} />,  desc: 'Faturamento e conciliação financeira' },
  { id: 7, label: 'Finalização',  key: 'finalization',    icon: <CheckCircle2 size={14} />, desc: 'Entrega final e coleta de feedback' },
];

const PRIORITY_COLORS = {
  alta:   { color: 'text-red-500',   icon: ChevronUp,  badge: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900' },
  normal: { color: 'text-slate-500',  icon: Minus,       badge: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-100 dark:text-slate-500 dark:border-slate-300' },
  baixa:  { color: 'text-blue-500',  icon: ArrowDown,   badge: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900' },
};

const getStepNumber = (stepKey) => {
  const s = WORKFLOW_STEPS.find(s => s.key === stepKey);
  return s ? s.id : 1;
};

const Badge = ({ color = 'slate', children }) => {
  const colors = {
    green:  'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900',
    blue:   'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900',
    yellow: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
    red:    'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900',
    slate:  'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-100 dark:text-slate-500 dark:border-slate-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-card ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, loading = false, disabled = false }) => {
  const variants = {
    primary:   'bg-brand-500 text-slate-800 hover:bg-brand-400 font-semibold shadow-sm',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300/50',
    outline:   'border border-slate-300 text-slate-600 hover:bg-slate-100',
    danger:    'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
    ai:        'bg-gradient-to-r from-violet-600 to-purple-600 text-slate-900 hover:from-violet-500 hover:to-purple-500 shadow-md font-semibold',
    ghost:     'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${variants[variant]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {loading
        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : Icon && <Icon size={15} />}
      {children}
    </button>
  );
};

// ── Checklist Card (expandable with subtasks) ──
function ChecklistCard({ cl, onUpdateStatus, onDelete, onAddItem, onToggleItem, onDeleteItem, onUpdateChecklist }) {
  const [expanded, setExpanded] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(cl.title);
  const [editPriority, setEditPriority] = useState(cl.priority);

  const items = cl.checklist_items || [];
  const doneCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const pr = PRIORITY_COLORS[cl.priority] || PRIORITY_COLORS.normal;
  const PrIcon = pr.icon;

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    await onAddItem(cl.id, newItemTitle.trim());
    setNewItemTitle('');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    await onUpdateChecklist(cl.id, { title: editTitle.trim(), priority: editPriority });
    setEditing(false);
  };

  return (
    <Card className="overflow-hidden hover:shadow-elevated transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2">
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 p-0.5 text-slate-500 hover:text-slate-500 dark:hover:text-slate-700 transition-colors">
            <ChevronRight size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
          </button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                  className="w-full bg-slate-100 dark:bg-slate-100 border border-slate-200 dark:border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <div className="flex items-center gap-2">
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-100 border border-slate-200 dark:border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none">
                    <option value="alta">Alta</option>
                    <option value="normal">Normal</option>
                    <option value="baixa">Baixa</option>
                  </select>
                  <button onClick={handleSaveEdit} className="text-xs font-medium text-brand-500 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20">Salvar</button>
                  <button onClick={() => { setEditing(false); setEditTitle(cl.title); setEditPriority(cl.priority); }} className="text-xs text-slate-500 hover:text-slate-500 px-2 py-1">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-700 leading-snug cursor-pointer" onClick={() => setExpanded(!expanded)}>{cl.title}</p>
                {totalCount > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{doneCount}/{totalCount}</span>
                  </div>
                )}
              </>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${pr.badge}`}>
                <PrIcon size={10} />
              </span>
              <button onClick={() => setEditing(true)} className="p-1 text-slate-600 hover:text-slate-400 dark:hover:text-slate-600 rounded transition-colors">
                <Pencil size={12} />
              </button>
              <button onClick={() => onDelete(cl.id)} className="p-1 text-slate-600 hover:text-red-500 rounded transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded: subtasks */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-200 px-4 py-3 bg-slate-50/50 dark:bg-slate-100/20 space-y-1.5">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 group">
              <button onClick={() => onToggleItem(item.id, !item.completed)} className="flex-shrink-0 text-slate-500 hover:text-brand-500 transition-colors">
                {item.completed ? <CheckSquare size={15} className="text-emerald-500" /> : <Square size={15} />}
              </button>
              <span className={`text-sm flex-1 ${item.completed ? 'line-through text-slate-500' : 'text-slate-600 dark:text-slate-600'}`}>{item.title}</span>
              <button onClick={() => onDeleteItem(item.id)} className="p-0.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                <X size={12} />
              </button>
            </div>
          ))}
          <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-1">
            <Plus size={14} className="text-slate-600 flex-shrink-0" />
            <input
              value={newItemTitle}
              onChange={e => setNewItemTitle(e.target.value)}
              placeholder="Adicionar subtarefa..."
              className="flex-1 bg-transparent text-sm text-slate-600 dark:text-slate-600 placeholder-zinc-400 outline-none"
            />
          </form>
        </div>
      )}
    </Card>
  );
}

// ── Inline Add (Trello-style) ──
function InlineAdd({ onAdd, placeholder = 'Nome do checklist...' }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd(title.trim());
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-100/50 transition-all">
        <Plus size={14} /> Adicionar checklist
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        placeholder={placeholder}
        className="w-full bg-slate-100/60 border border-slate-300/60 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-slate-400 transition-all"
      />
      <div className="flex gap-2">
        <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-slate-800 hover:bg-brand-400 transition-all">Adicionar</button>
        <button type="button" onClick={() => { setOpen(false); setTitle(''); }} className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-100 transition-all">Cancelar</button>
      </div>
    </form>
  );
}


export default function ProjetosView({
  projects, filter, onFilterChange, selectedProject, onSelectProject,
  onDeclineProject, onArchiveProject, onAdvanceWorkflow, onUpdateTask,
  createProjectFolders,
  // Checklist props
  onCreateChecklist, onUpdateChecklist, onDeleteChecklist, onUpdateChecklistStatus,
  onAddChecklistItem, onToggleChecklistItem, onDeleteChecklistItem,
  onCreateProjectDirectly,
}) {
  const [subTab, setSubTab] = useState('workflow');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ clientName: '', clientEmail: '', title: '', value: '' });

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (onCreateProjectDirectly) {
      await onCreateProjectDirectly({
        clientName: newProject.clientName,
        clientEmail: newProject.clientEmail,
        title: newProject.title,
        value: parseFloat(newProject.value) || 0,
      });
      setIsNewProjectModalOpen(false);
      setNewProject({ clientName: '', clientEmail: '', title: '', value: '' });
    }
  };

  const proj = selectedProject;
  const stepNumber = proj ? getStepNumber(proj.current_step) : 1;
  const tasks      = proj ? (proj.tasks || []) : [];
  const checklists = proj ? (proj.checklists || []) : [];
  const payments   = proj ? (proj.payments || []) : [];

  const counts = {
    active:   projects.filter(p => p.status === 'active').length,
    archived: projects.filter(p => p.status === 'archived').length,
    declined: projects.filter(p => p.status === 'declined').length,
  };

  const filtered = projects.filter(p => p.status === filter);

  const handleOpenProject = (p) => {
    onSelectProject(p);
    setSubTab('workflow');
  };

  const handleBack = () => onSelectProject(null);

  const handleInlineAdd = async (title) => {
    if (proj && onCreateChecklist) {
      await onCreateChecklist(proj.id, title);
    }
  };

  // ── Detail view ──────────────────────────────────────────
  if (proj) {
    const paidTotal = payments.filter(p => p.status === 'paid').reduce((a, p) => a + (p.amount || 0), 0);
    const pendingTotal = Math.max(0, (proj.value || 0) - paidTotal);
    const paidPct = proj.value ? Math.min(100, Math.round((paidTotal / proj.value) * 100)) : 0;

    // Merge tasks + checklists for kanban
    const kanbanItems = [
      ...tasks.map(t => ({ ...t, _type: 'task' })),
      ...checklists.map(c => ({ ...c, _type: 'checklist' })),
    ];

    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Project header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack}
              className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-100 rounded-xl transition-all">
              <X size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-800 tracking-tight">{proj.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                <span className="flex items-center gap-1"><Users size={11} /> {proj.client?.name || 'Cliente'}</span>
                <span className="text-slate-700 dark:text-slate-600">|</span>
                <span className="flex items-center gap-1 font-mono font-semibold text-slate-500 dark:text-slate-600">
                  <CreditCard size={11} /> R$ {(proj.value || 0).toLocaleString('pt-BR')}
                </span>
                {paidPct > 0 && (
                  <>
                    <span className="text-slate-700 dark:text-slate-600">|</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{paidPct}% faturado</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {proj.status === 'active' && (
              <Button variant="danger" className="h-9 text-xs px-3" onClick={() => onDeclineProject(proj)}>Declinar</Button>
            )}
            {proj.status === 'active' && stepNumber >= 7 && (
              <Button variant="secondary" className="h-9 text-xs px-3" icon={Archive} onClick={() => onArchiveProject(proj.id)}>Arquivar</Button>
            )}
            {proj.status === 'active' && (
              <>
                <Button variant="outline" icon={FolderOpen} className="h-9 text-xs px-3" onClick={() => createProjectFolders && createProjectFolders(proj)} disabled={proj.folders_created}>
                  {proj.folders_created ? 'Pastas OK' : 'Criar Pastas'}
                </Button>
<Button variant="primary" className="h-9 text-xs px-3" onClick={() => onAdvanceWorkflow(proj.id)} disabled={stepNumber >= 7}>
                  {stepNumber >= 7 ? 'Finalizado' : 'Avançar Etapa'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-200 gap-1">
          <button onClick={handleBack}
            className="pb-3 px-3 text-sm text-slate-500 hover:text-slate-500 dark:hover:text-slate-600 border-b-2 border-transparent transition-all font-medium">
            ← Projetos
          </button>
          {['workflow', 'kanban', 'financeiro'].map(tab => (
            <button key={tab} onClick={() => setSubTab(tab)}
              className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 capitalize
                ${subTab === tab
                  ? 'border-brand-500 text-slate-800 dark:text-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-500 dark:hover:text-slate-600'
                }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── WORKFLOW TAB ── */}
        {subTab === 'workflow' && (
          <div className="space-y-8 py-2">
            {/* Timeline steps */}
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-px bg-slate-100 dark:bg-slate-100 z-0" />
              <div className="absolute top-5 left-0 h-px bg-brand-500 z-0 transition-all duration-700" style={{ width: `${((stepNumber - 1) / 6) * 100}%` }} />
              <div className="relative z-10 flex justify-between">
                {WORKFLOW_STEPS.map(s => {
                  const isActive = stepNumber === s.id;
                  const isDone   = stepNumber > s.id;
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-3" style={{ width: '14.28%' }}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500
                        ${isActive ? 'bg-brand-500 text-slate-800 shadow-brand scale-110 ring-4 ring-brand-100 dark:ring-brand-900/30' :
                          isDone   ? 'bg-emerald-500 text-slate-900' :
                                     'bg-slate-100 border-2 border-slate-300 text-slate-500'}`}>
                        {isDone ? <CheckCircle2 size={16} /> : s.icon}
                      </div>
                      <p className={`text-[9px] font-bold uppercase tracking-wider text-center leading-tight
                        ${isActive ? 'text-brand-600 dark:text-brand-400' :
                          isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Checklist section */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-800">Checklists</h3>
                  <Badge color="blue">{checklists.filter(c => c.status !== 'done').length} pendentes</Badge>
                </div>
                <div className="space-y-2.5">
                  {checklists.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <p className="text-sm text-slate-500">Nenhum checklist ainda</p>
                    </div>
                  )}
                  {checklists.map(cl => (
                    <ChecklistCard
                      key={cl.id}
                      cl={cl}
                      onUpdateStatus={onUpdateChecklistStatus}
                      onDelete={onDeleteChecklist}
                      onAddItem={onAddChecklistItem}
                      onToggleItem={onToggleChecklistItem}
                      onDeleteItem={onDeleteChecklistItem}
                      onUpdateChecklist={onUpdateChecklist}
                    />
                  ))}
                  <InlineAdd onAdd={handleInlineAdd} />
                </div>
              </Card>

            </div>
          </div>
        )}

        {/* ── KANBAN TAB ── */}
        {subTab === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 py-2">
            {[
              { status: 'todo',    label: 'A Fazer',      color: 'text-slate-500',    dot: 'bg-slate-300',    prev: null,      next: 'doing' },
              { status: 'doing',   label: 'Em Progresso', color: 'text-amber-500',   dot: 'bg-amber-400',   prev: 'todo',    next: 'waiting' },
              { status: 'waiting', label: 'Aguardando',   color: 'text-blue-500',    dot: 'bg-blue-400',    prev: 'doing',   next: 'done' },
              { status: 'done',    label: 'Concluido',    color: 'text-emerald-500', dot: 'bg-emerald-400', prev: 'waiting', next: null },
            ].map(col => {
              const colTasks = kanbanItems.filter(t => t.status === col.status);
              return (
                <div key={col.status} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${col.color}`}>{col.label}</h4>
                    <span className="ml-auto text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-100 rounded-full px-2 py-0.5">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex-1 bg-slate-100/30 rounded-2xl p-3 space-y-2 min-h-[200px]">
                    {colTasks.map(item => {
                      if (item._type === 'checklist') {
                        return (
                          <ChecklistCard
                            key={`cl-${item.id}`}
                            cl={item}
                            onUpdateStatus={onUpdateChecklistStatus}
                            onDelete={onDeleteChecklist}
                            onAddItem={onAddChecklistItem}
                            onToggleItem={onToggleChecklistItem}
                            onDeleteItem={onDeleteChecklistItem}
                            onUpdateChecklist={onUpdateChecklist}
                          />
                        );
                      }
                      // Regular task card
                      return (
                        <Card key={`task-${item.id}`} className="p-4 hover:shadow-elevated transition-shadow cursor-move">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-700 mb-3 leading-snug">{item.title}</p>
                          <div className="flex justify-between items-center">
                            <Badge color="slate">{item.task_type || 'Tarefa'}</Badge>
                            <div className="flex gap-1">
                              {col.prev && (
                                <button onClick={() => onUpdateTask(proj.id, item.id, col.prev)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-200 rounded-lg transition-colors">
                                  <ChevronDown size={13} className="text-slate-500" />
                                </button>
                              )}
                              {col.next && (
                                <button onClick={() => onUpdateTask(proj.id, item.id, col.next)}
                                  className="p-1.5 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors">
                                  <ChevronRight size={13} className="text-brand-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    {/* Inline add in "A Fazer" column */}
                    {col.status === 'todo' && (
                      <InlineAdd onAdd={handleInlineAdd} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FINANCEIRO TAB ── */}
        {subTab === 'financeiro' && (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-100 rounded-2xl p-5 border border-slate-200 dark:border-slate-300">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Valor do Projeto</p>
                <p className="text-3xl font-bold text-slate-900 font-mono">R$ {(proj.value || 0).toLocaleString('pt-BR')}</p>
                <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${paidPct}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 font-mono">{paidPct}% faturado</p>
              </div>
              <Card className="p-5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Ja Faturado</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">R$ {paidTotal.toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-slate-500 mt-1">pagamentos confirmados</p>
              </Card>
              <Card className="p-5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Saldo Pendente</p>
                <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 font-mono">R$ {pendingTotal.toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-slate-500 mt-1">a receber</p>
              </Card>
            </div>
            <Card>
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-200">
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-800">Historico de Lancamentos</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/40 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3.5">Data</th>
                      <th className="px-6 py-3.5">Descricao</th>
                      <th className="px-6 py-3.5">Valor</th>
                      <th className="px-6 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-slate-200">
                    {payments.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm">Nenhum pagamento registrado.</td></tr>
                    ) : (
                      payments.map(pay => (
                        <tr key={pay.id} className="hover:bg-slate-100/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm text-slate-400">{pay.due_date ? new Date(pay.due_date).toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-600">{pay.description}</td>
                          <td className="px-6 py-4 font-semibold font-mono text-slate-800 dark:text-slate-800">R$ {(pay.amount || 0).toLocaleString('pt-BR')}</td>
                          <td className="px-6 py-4"><Badge color={pay.status === 'paid' ? 'green' : 'yellow'}>{pay.status}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-800 tracking-tight">Projetos</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie seus projetos ativos</p>
        </div>
        <Button onClick={() => setIsNewProjectModalOpen(true)} icon={Plus}>
          Novo Projeto
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-200 gap-1">
        {[
          { key: 'active',   label: 'Ativos',    count: counts.active },
          { key: 'archived', label: 'Arquivados', count: counts.archived },
          { key: 'declined', label: 'Declinados', count: counts.declined },
        ].map(tab => (
          <button key={tab.key} onClick={() => onFilterChange(tab.key)}
            className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 flex items-center gap-2
              ${filter === tab.key
                ? 'border-brand-500 text-slate-800 dark:text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-500 dark:hover:text-slate-600'
              }`}>
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums
              ${filter === tab.key
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-100 dark:text-slate-500'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-100 flex items-center justify-center">
            <Briefcase className="text-slate-600 dark:text-slate-500" size={24} />
          </div>
          <p className="text-slate-500 text-sm">
            Nenhum projeto {filter === 'active' ? 'ativo' : filter === 'archived' ? 'arquivado' : 'declinado'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => {
            const sn = getStepNumber(p.current_step);
            const stepData = WORKFLOW_STEPS[sn - 1];
            const paidAmount = (p.payments || []).filter(pay => pay.status === 'paid').reduce((a, pay) => a + (pay.amount || 0), 0);
            const paidPct = p.value ? Math.min(100, Math.round((paidAmount / p.value) * 100)) : 0;
            const clCount = (p.checklists || []).length;

            return (
              <div key={p.id}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-card p-6 hover:shadow-elevated hover:border-slate-300 transition-all cursor-pointer group"
                onClick={() => handleOpenProject(p)}>

                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-800 truncate leading-snug">{p.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{p.client?.name || 'Cliente'}</p>
                  </div>
                  <Badge color={sn >= 6 ? 'green' : 'blue'}>{stepData?.label}</Badge>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1.5">
                    <span>Etapa {sn}/7</span>
                    <span className="font-semibold">{Math.round((sn / 7) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${sn >= 7 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                      style={{ width: `${(sn / 7) * 100}%` }} />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold font-mono text-slate-800 dark:text-slate-800">
                      R$ {(p.value || 0).toLocaleString('pt-BR')}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {paidPct > 0 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">{paidPct}% faturado</p>
                      )}
                      {clCount > 0 && (
                        <span className="text-[10px] text-slate-500 font-medium">{clCount} checklist{clCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === 'active' && (
                      <button
                        className="text-[10px] font-semibold text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        onClick={e => { e.stopPropagation(); onDeclineProject(p); }}>
                        Declinar
                      </button>
                    )}
                    {p.status === 'active' && sn >= 7 && (
                      <button
                        className="text-[10px] font-semibold text-slate-500 hover:text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-100 transition-colors"
                        onClick={e => { e.stopPropagation(); onArchiveProject(p.id); }}>
                        Arquivar
                      </button>
                    )}
                    <span className="text-[11px] font-semibold text-brand-500 group-hover:underline flex items-center gap-1">
                      Ver <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Novo Projeto */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg overflow-hidden shadow-elevated animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 tracking-tight">Novo Projeto Direto</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">Nome do Projeto</label>
                  <input type="text" className="w-full bg-slate-100/60 border border-slate-300/60 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-slate-400 transition-all" placeholder="Ex: Criação de E-commerce" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">Nome do Cliente / Empresa</label>
                  <input type="text" className="w-full bg-slate-100/60 border border-slate-300/60 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-slate-400 transition-all" placeholder="Ex: Acme Corp" value={newProject.clientName} onChange={e => setNewProject({ ...newProject, clientName: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">E-mail do Cliente (Opcional)</label>
                  <input type="email" className="w-full bg-slate-100/60 border border-slate-300/60 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-slate-400 transition-all" placeholder="exemplo@email.com" value={newProject.clientEmail} onChange={e => setNewProject({ ...newProject, clientEmail: e.target.value })} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">Valor Estimado do Projeto (R$)</label>
                  <input type="number" className="w-full bg-slate-100/60 border border-slate-300/60 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-slate-400 transition-all" placeholder="Ex: 5000" value={newProject.value} onChange={e => setNewProject({ ...newProject, value: e.target.value })} />
                </div>
                <p className="text-xs text-slate-500 mt-2">Um novo cliente será automaticamente cadastrado, se necessário, e o projeto pulará a fase de lead.</p>
              </div>
              <div className="px-6 py-4 border-t border-slate-200/60 flex justify-end gap-3 bg-slate-50/50">
                <Button variant="outline" type="button" onClick={() => setIsNewProjectModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" type="submit">Criar Projeto</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
