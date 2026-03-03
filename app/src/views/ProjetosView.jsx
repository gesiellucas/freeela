import React, { useState } from 'react';
import {
  Briefcase, X, Users, CreditCard, FolderOpen, Sparkles,
  CheckCircle2, ChevronDown, ChevronRight, Calendar, ShieldCheck,
  DollarSign, Archive, ArrowRight
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
    slate:  'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-card ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, loading = false, disabled = false }) => {
  const variants = {
    primary:   'bg-brand-500 text-zinc-900 hover:bg-brand-400 font-semibold shadow-sm',
    secondary: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
    outline:   'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
    danger:    'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900',
    ai:        'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-md font-semibold',
    ghost:     'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300',
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

export default function ProjetosView({
  projects, filter, onFilterChange, selectedProject, onSelectProject,
  onDeclineProject, onArchiveProject, onAdvanceWorkflow, onUpdateTask,
  onGenerateDocument, aiLoading, createProjectFolders,
}) {
  const [subTab, setSubTab] = useState('workflow');

  const proj = selectedProject;
  const stepNumber = proj ? getStepNumber(proj.current_step) : 1;
  const tasks    = proj ? (proj.tasks || []) : [];
  const payments = proj ? (proj.payments || []) : [];

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

  // ── Detail view ──────────────────────────────────────────
  if (proj) {
    const paidTotal = payments.filter(p => p.status === 'paid').reduce((a, p) => a + (p.amount || 0), 0);
    const pendingTotal = Math.max(0, (proj.value || 0) - paidTotal);
    const paidPct = proj.value ? Math.min(100, Math.round((paidTotal / proj.value) * 100)) : 0;

    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Project header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
              <X size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{proj.title}</h2>
              <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium mt-0.5">
                <span className="flex items-center gap-1"><Users size={11} /> {proj.client?.name || 'Cliente'}</span>
                <span className="text-zinc-200 dark:text-zinc-700">|</span>
                <span className="flex items-center gap-1 font-mono font-semibold text-zinc-600 dark:text-zinc-300">
                  <CreditCard size={11} /> R$ {(proj.value || 0).toLocaleString('pt-BR')}
                </span>
                {paidPct > 0 && (
                  <>
                    <span className="text-zinc-200 dark:text-zinc-700">|</span>
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
                <Button variant="ai" icon={Sparkles} className="h-9 text-xs px-3" onClick={() => onGenerateDocument('proposal', proj)} loading={aiLoading}>Gerar Proposta</Button>
                <Button variant="primary" className="h-9 text-xs px-3" onClick={() => onAdvanceWorkflow(proj.id)} disabled={stepNumber >= 7}>
                  {stepNumber >= 7 ? 'Finalizado' : 'Avançar Etapa'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1">
          <button onClick={handleBack}
            className="pb-3 px-3 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border-b-2 border-transparent transition-all font-medium">
            ← Projetos
          </button>
          {['workflow', 'kanban', 'financeiro'].map(tab => (
            <button key={tab} onClick={() => setSubTab(tab)}
              className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 capitalize
                ${subTab === tab
                  ? 'border-brand-500 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
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
              {/* Track line */}
              <div className="absolute top-5 left-0 right-0 h-px bg-zinc-100 dark:bg-zinc-800 z-0" />
              <div
                className="absolute top-5 left-0 h-px bg-brand-500 z-0 transition-all duration-700"
                style={{ width: `${((stepNumber - 1) / 6) * 100}%` }}
              />
              <div className="relative z-10 flex justify-between">
                {WORKFLOW_STEPS.map(s => {
                  const isActive = stepNumber === s.id;
                  const isDone   = stepNumber > s.id;
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-3" style={{ width: '14.28%' }}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500
                        ${isActive ? 'bg-brand-500 text-zinc-900 shadow-brand scale-110 ring-4 ring-brand-100 dark:ring-brand-900/30' :
                          isDone   ? 'bg-emerald-500 text-white' :
                                     'bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600'}`}>
                        {isDone ? <CheckCircle2 size={16} /> : s.icon}
                      </div>
                      <p className={`text-[9px] font-bold uppercase tracking-wider text-center leading-tight
                        ${isActive ? 'text-brand-600 dark:text-brand-400' :
                          isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Checklist */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {WORKFLOW_STEPS[stepNumber - 1]?.label} — Checklist
                  </h3>
                  <Badge color="blue">{tasks.filter(t => t.status === 'todo').length} pendentes</Badge>
                </div>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'todo').length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <CheckCircle2 className="text-emerald-400" size={24} />
                      <p className="text-sm text-zinc-400">Tudo concluído nesta etapa</p>
                    </div>
                  ) : (
                    tasks.filter(t => t.status === 'todo').map(task => (
                      <div key={task.id}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-brand-200 dark:hover:border-brand-800 transition-all group cursor-pointer"
                        onClick={() => onUpdateTask(proj.id, task.id, 'done')}>
                        <div className="w-4.5 h-4.5 rounded-md border-2 border-zinc-300 dark:border-zinc-600 group-hover:border-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 transition-all flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-sm bg-transparent group-hover:bg-brand-500 transition-all" />
                        </div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{task.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* AI Docs */}
              <Card className="p-6">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-5">Documentos com IA</h3>
                <div className="space-y-3">
                  <button onClick={() => onGenerateDocument('briefing', proj)}
                    className="w-full p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all text-left group flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Calendar className="text-violet-500" size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">Briefing Técnico</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Gere perguntas de alinhamento</p>
                    </div>
                    <ArrowRight className="ml-auto text-zinc-300 group-hover:text-violet-400 transition-colors" size={15} />
                  </button>

                  <button onClick={() => onGenerateDocument('contract', proj)}
                    className="w-full p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left group flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="text-blue-500" size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">Contrato Jurídico</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Rascunho com cláusulas BR</p>
                    </div>
                    <ArrowRight className="ml-auto text-zinc-300 group-hover:text-blue-400 transition-colors" size={15} />
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── KANBAN TAB ── */}
        {subTab === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 py-2">
            {[
              { status: 'todo',  label: 'A Fazer',   color: 'text-zinc-400',    dot: 'bg-zinc-300' },
              { status: 'doing', label: 'Em Progresso', color: 'text-amber-500', dot: 'bg-amber-400' },
              { status: 'done',  label: 'Concluído',  color: 'text-emerald-500', dot: 'bg-emerald-400' },
            ].map(col => (
              <div key={col.status} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                  <h4 className={`text-xs font-bold uppercase tracking-widest ${col.color}`}>{col.label}</h4>
                  <span className="ml-auto text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">
                    {tasks.filter(t => t.status === col.status).length}
                  </span>
                </div>
                <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl p-3 space-y-2 min-h-[200px]">
                  {tasks.filter(t => t.status === col.status).map(task => (
                    <Card key={task.id} className="p-4 hover:shadow-elevated transition-shadow cursor-move">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-3 leading-snug">{task.title}</p>
                      <div className="flex justify-between items-center">
                        <Badge color="slate">{task.task_type || 'Técnica'}</Badge>
                        <div className="flex gap-1">
                          {col.status !== 'todo' && (
                            <button onClick={() => onUpdateTask(proj.id, task.id, col.status === 'done' ? 'doing' : 'todo')}
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                              <ChevronDown size={13} className="text-zinc-400" />
                            </button>
                          )}
                          {col.status !== 'done' && (
                            <button onClick={() => onUpdateTask(proj.id, task.id, col.status === 'todo' ? 'doing' : 'done')}
                              className="p-1.5 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors">
                              <ChevronRight size={13} className="text-brand-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FINANCEIRO TAB ── */}
        {subTab === 'financeiro' && (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900 dark:bg-zinc-800 rounded-2xl p-5 border border-zinc-800 dark:border-zinc-700">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Valor do Projeto</p>
                <p className="text-3xl font-bold text-white font-mono">R$ {(proj.value || 0).toLocaleString('pt-BR')}</p>
                <div className="mt-3 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${paidPct}%` }} />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5 font-mono">{paidPct}% faturado</p>
              </div>

              <Card className="p-5">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Já Faturado</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  R$ {paidTotal.toLocaleString('pt-BR')}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">pagamentos confirmados</p>
              </Card>

              <Card className="p-5">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Saldo Pendente</p>
                <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 font-mono">
                  R$ {pendingTotal.toLocaleString('pt-BR')}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">a receber</p>
              </Card>
            </div>

            <Card>
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Histórico de Lançamentos</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3.5">Data</th>
                      <th className="px-6 py-3.5">Descrição</th>
                      <th className="px-6 py-3.5">Valor</th>
                      <th className="px-6 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {payments.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-zinc-400 text-sm">Nenhum pagamento registrado.</td></tr>
                    ) : (
                      payments.map(pay => (
                        <tr key={pay.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm text-zinc-500">
                            {pay.due_date ? new Date(pay.due_date).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-6 py-4 font-medium text-zinc-700 dark:text-zinc-300">{pay.description}</td>
                          <td className="px-6 py-4 font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                            R$ {(pay.amount || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={pay.status === 'paid' ? 'green' : 'yellow'}>{pay.status}</Badge>
                          </td>
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
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Projetos</h2>
        <p className="text-sm text-zinc-400 mt-0.5">Gerencie seus projetos ativos</p>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1">
        {[
          { key: 'active',   label: 'Ativos',    count: counts.active },
          { key: 'archived', label: 'Arquivados', count: counts.archived },
          { key: 'declined', label: 'Declinados', count: counts.declined },
        ].map(tab => (
          <button key={tab.key} onClick={() => onFilterChange(tab.key)}
            className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 flex items-center gap-2
              ${filter === tab.key
                ? 'border-brand-500 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}>
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums
              ${filter === tab.key
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Briefcase className="text-zinc-300 dark:text-zinc-600" size={24} />
          </div>
          <p className="text-zinc-400 text-sm">
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

            return (
              <div key={p.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-card p-6 hover:shadow-elevated hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer group"
                onClick={() => handleOpenProject(p)}>

                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate leading-snug">{p.title}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-medium">{p.client?.name || 'Cliente'}</p>
                  </div>
                  <Badge color={sn >= 6 ? 'green' : 'blue'}>{stepData?.label}</Badge>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium mb-1.5">
                    <span>Etapa {sn}/7</span>
                    <span className="font-semibold">{Math.round((sn / 7) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${sn >= 7 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                      style={{ width: `${(sn / 7) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      R$ {(p.value || 0).toLocaleString('pt-BR')}
                    </p>
                    {paidPct > 0 && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">{paidPct}% faturado</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === 'active' && (
                      <button
                        className="text-[10px] font-semibold text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        onClick={e => { e.stopPropagation(); onDeclineProject(p); }}
                      >
                        Declinar
                      </button>
                    )}
                    {p.status === 'active' && sn >= 7 && (
                      <button
                        className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        onClick={e => { e.stopPropagation(); onArchiveProject(p.id); }}
                      >
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
    </div>
  );
}
