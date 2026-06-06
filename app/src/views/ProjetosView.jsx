import { useState, useEffect } from 'react';
import {
  Briefcase, X, Users, CreditCard, FolderOpen,
  CheckCircle2, ChevronDown, ChevronRight, Calendar, ShieldCheck,
  DollarSign, Archive, ArrowRight, Plus, Trash2, Pencil,
  ChevronUp, Minus, ArrowDown, Check, Square, CheckSquare,
  FileText, FileSignature, Receipt, UploadCloud, Download, ExternalLink,
  Info, ClipboardList, LayoutGrid, MapPin, StickyNote,
} from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import OrdemDeServicoTab from './OrdemDeServicoTab';

const WORKFLOW_STEPS = [
  { id: 1, label: 'Contato',      key: 'initial_contact', icon: <Users size={14} />,       desc: 'Registro do lead e e-mail de boas-vindas' },
  { id: 2, label: 'Demanda',      key: 'understanding',   icon: <Calendar size={14} />,    desc: 'Briefing e alinhamento de expectativas' },
  { id: 3, label: 'Proposta',     key: 'proposal',        icon: <ShieldCheck size={14} />, desc: 'Geração e envio da proposta comercial' },
  { id: 4, label: 'Contrato',     key: 'contract',        icon: <CheckCircle2 size={14} />, desc: 'Formalização jurídica do projeto' },
  { id: 5, label: 'Pagamento',    key: 'payment',         icon: <DollarSign size={14} />,  desc: 'Faturamento e conciliação financeira' },
  { id: 6, label: 'Finalização',  key: 'finalization',    icon: <CheckCircle2 size={14} />, desc: 'Entrega final e coleta de feedback' },
];

const PRIORITY_COLORS = {
  alta:   { color: 'text-red-500',   icon: ChevronUp,  badge: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900' },
  normal: { color: 'text-warm-500',  icon: Minus,       badge: 'bg-warm-200 text-warm-500 border-warm-300 dark:bg-warm-200 dark:text-warm-500 dark:border-warm-400' },
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
    slate:  'bg-warm-200 text-warm-500 border border-warm-300 dark:bg-warm-200 dark:text-warm-500 dark:border-warm-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, loading = false, disabled = false }) => {
  const variants = {
    primary:   'bg-brand-500 text-warm-900 hover:bg-brand-400 font-semibold shadow-sm',
    secondary: 'bg-warm-200 text-warm-800 hover:bg-warm-300 border border-warm-400/50',
    outline:   'border border-warm-400 text-warm-600 hover:bg-warm-200',
    danger:    'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
    ai:        'bg-gradient-to-r from-violet-600 to-purple-600 text-warm-900 hover:from-violet-500 hover:to-purple-500 shadow-md font-semibold',
    ghost:     'text-warm-500 hover:bg-warm-200 hover:text-warm-600',
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
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 p-0.5 text-warm-500 hover:text-warm-500 dark:hover:text-warm-800 transition-colors">
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
                  className="w-full bg-warm-200 dark:bg-warm-200 border border-warm-300 dark:border-warm-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <div className="flex items-center gap-2">
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                    className="bg-warm-200 dark:bg-warm-200 border border-warm-300 dark:border-warm-400 rounded-lg px-2 py-1 text-xs focus:outline-none">
                    <option value="alta">Alta</option>
                    <option value="normal">Normal</option>
                    <option value="baixa">Baixa</option>
                  </select>
                  <button onClick={handleSaveEdit} className="text-xs font-medium text-brand-500 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20">Salvar</button>
                  <button onClick={() => { setEditing(false); setEditTitle(cl.title); setEditPriority(cl.priority); }} className="text-xs text-warm-500 hover:text-warm-500 px-2 py-1">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-warm-800 dark:text-warm-800 leading-snug cursor-pointer" onClick={() => setExpanded(!expanded)}>{cl.title}</p>
                {totalCount > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-warm-200 dark:bg-warm-200 rounded-full overflow-hidden max-w-[80px]">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[10px] text-warm-500 font-mono">{doneCount}/{totalCount}</span>
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
              <button onClick={() => setEditing(true)} className="p-1 text-warm-600 hover:text-warm-500 dark:hover:text-warm-600 rounded transition-colors">
                <Pencil size={12} />
              </button>
              <button onClick={() => onDelete(cl.id)} className="p-1 text-warm-600 hover:text-red-500 rounded transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded: subtasks */}
      {expanded && (
        <div className="border-t border-warm-200 dark:border-warm-300 px-4 py-3 bg-warm-100/50 dark:bg-warm-200/20 space-y-1.5">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 group">
              <button onClick={() => onToggleItem(item.id, !item.completed)} className="flex-shrink-0 text-warm-500 hover:text-brand-500 transition-colors">
                {item.completed ? <CheckSquare size={15} className="text-emerald-500" /> : <Square size={15} />}
              </button>
              <span className={`text-sm flex-1 ${item.completed ? 'line-through text-warm-500' : 'text-warm-600 dark:text-warm-600'}`}>{item.title}</span>
              <button onClick={() => onDeleteItem(item.id)} className="p-0.5 text-warm-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                <X size={12} />
              </button>
            </div>
          ))}
          <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-1">
            <Plus size={14} className="text-warm-600 flex-shrink-0" />
            <input
              value={newItemTitle}
              onChange={e => setNewItemTitle(e.target.value)}
              placeholder="Adicionar subtarefa..."
              className="flex-1 bg-transparent text-sm text-warm-600 dark:text-warm-600 placeholder-zinc-400 outline-none"
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
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-warm-500 hover:text-warm-500 hover:bg-warm-200 dark:hover:bg-warm-200/50 transition-all">
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
        className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2.5 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all"
      />
      <div className="flex gap-2">
        <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-warm-900 hover:bg-brand-400 transition-all">Adicionar</button>
        <button type="button" onClick={() => { setOpen(false); setTitle(''); }} className="px-3 py-1.5 rounded-lg text-xs text-warm-500 hover:text-warm-500 hover:bg-warm-200 dark:hover:bg-warm-200 transition-all">Cancelar</button>
      </div>
    </form>
  );
}


// ── Demand Step Component ──
function DemandStepForm({ proj, onUpdateProject }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(proj.description || '');
  const [value, setValue] = useState(proj.value || 0);
  const [deadline, setDeadline] = useState(proj.deadline || '');
  const [startDate, setStartDate] = useState(proj.start_date || '');
  const [completionDate, setCompletionDate] = useState(proj.completion_date || '');
  const [technologies, setTechnologies] = useState(proj.metadata?.technologies || '');
  const [expertise, setExpertise] = useState(proj.metadata?.expertise || 'Pleno');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (onUpdateProject) {
      await onUpdateProject(proj.id, {
        description,
        value: parseFloat(value) || 0,
        deadline: deadline || null,
        start_date: startDate || null,
        completion_date: completionDate || null,
        metadata: {
          ...proj.metadata,
          technologies,
          expertise
        }
      });
    }
    setSaving(false);
    setEditing(false);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-warm-300 pb-3">
        <h3 className="font-semibold text-lg text-warm-900 flex items-center gap-2">
          <Calendar size={18} className="text-brand-500" />
          Especificações da Demanda
        </h3>
        {!editing ? (
          <Button variant="secondary" onClick={() => setEditing(true)}>Editar Detalhes</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">O que deve ser feito (Briefing)</label>
            {editing ? (
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all h-28 resize-none"
              />
            ) : (
              <p className="text-warm-850 bg-warm-200/35 p-3 rounded-xl border border-warm-300/30 min-h-[112px] whitespace-pre-wrap">{description || 'Sem descrição.'}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Valor (R$)</label>
              {editing ? (
                <input
                  type="number"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-2 focus:outline-none"
                />
              ) : (
                <p className="text-warm-900 font-semibold font-mono text-base mt-1">R$ {value.toLocaleString('pt-BR')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Prazo Final (Deadline)</label>
              {editing ? (
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-2 focus:outline-none"
                />
              ) : (
                <p className="text-warm-900 font-medium mt-1">{deadline ? new Date(deadline).toLocaleDateString('pt-BR') : 'Não definido'}</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Data de Início</label>
              {editing ? (
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-2 focus:outline-none"
                />
              ) : (
                <p className="text-warm-900 font-medium mt-1">{startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Não definido'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Data de Conclusão</label>
              {editing ? (
                <input
                  type="date"
                  value={completionDate}
                  onChange={e => setCompletionDate(e.target.value)}
                  className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-2 focus:outline-none"
                />
              ) : (
                <p className="text-warm-900 font-medium mt-1">{completionDate ? new Date(completionDate).toLocaleDateString('pt-BR') : 'Não definido'}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Tecnologias Utilizadas</label>
            {editing ? (
              <input
                type="text"
                placeholder="Ex: React, Node.js, PostgreSQL (separados por vírgula)"
                value={technologies}
                onChange={e => setTechnologies(e.target.value)}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {technologies ? (
                  technologies.split(',').map((t, idx) => (
                    <Badge key={idx} color="blue">{t.trim()}</Badge>
                  ))
                ) : (
                  <span className="text-warm-500">Nenhuma tecnologia especificada.</span>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Expertise Exigida</label>
            {editing ? (
              <select
                value={expertise}
                onChange={e => setExpertise(e.target.value)}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="Júnior">Júnior</option>
                <option value="Pleno">Pleno</option>
                <option value="Sênior">Sênior</option>
                <option value="Especialista">Especialista</option>
              </select>
            ) : (
              <p className="text-warm-900 font-semibold mt-1">{expertise}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Commercial (Proposal & Contract) Step Manager Component ──
function CommercialStepManager({ type, proj, currentUser, refreshProject }) {
  const isProposal = type === 'proposal';
  const title = isProposal ? 'Proposta' : 'Contrato';
  const statusOptions = isProposal
    ? [
        { value: 'draft', label: 'A Enviar' },
        { value: 'sent', label: 'Aguardando' },
        { value: 'accepted', label: 'Aceito' },
        { value: 'declined', label: 'Declinado' },
      ]
    : [
        { value: 'draft', label: 'Rascunho' },
        { value: 'sent', label: 'Enviado' },
        { value: 'signed', label: 'Assinado' },
        { value: 'cancelled', label: 'Cancelado' },
      ];

  const items = isProposal ? (proj.proposals || []) : (proj.contracts || []);

  const [formOpen, setFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState('draft');
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;
    setSaving(true);
    try {
      const payload = {
        user_id: proj.user_id,
        project_id: proj.id,
        title: newTitle.trim(),
        description: newDesc.trim(),
        status: newStatus,
      };

      let res;
      if (isProposal) {
        res = await supabase.from('proposals').insert(payload).select().single();
      } else {
        res = await supabase.from('contracts').insert(payload).select().single();
      }

      if (res.error) throw res.error;
      const createdItem = res.data;

      // Handle file upload if selected
      if (selectedFile && createdItem) {
        const folderName = isProposal ? 'proposals' : 'contracts';
        const uploadRes = await uploadFile(currentUser.id, folderName, createdItem.id, selectedFile);
        if (uploadRes.error) throw uploadRes.error;

        if (uploadRes.data) {
          // Link media file to the created entity
          const mediaPayload = {
            user_id: proj.user_id,
            file_name: selectedFile.name,
            file_path: uploadRes.data.path,
            file_url: uploadRes.data.url,
            mime_type: selectedFile.type,
            file_size: selectedFile.size,
            description: `Documento de ${title}`,
          };
          if (isProposal) {
            mediaPayload.proposal_id = createdItem.id;
          } else {
            mediaPayload.contract_id = createdItem.id;
          }
          const mediaRes = await supabase.from('media_files').insert(mediaPayload);
          if (mediaRes.error) throw mediaRes.error;
        }
      }

      setFormOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewStatus('draft');
      setSelectedFile(null);
      await refreshProject();
    } catch (err) {
      console.error(`Erro ao criar ${title}:`, err);
      alert(`Erro ao criar ${title}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (itemId, val) => {
    try {
      const table = isProposal ? 'proposals' : 'contracts';
      const { error } = await supabase.from(table).update({ status: val }).eq('id', itemId);
      if (error) throw error;
      await refreshProject();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      const table = isProposal ? 'proposals' : 'contracts';
      const { error } = await supabase.from(table).delete().eq('id', itemId);
      if (error) throw error;
      await refreshProject();
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  const getStatusBadge = (st) => {
    const maps = {
      draft:     { color: 'slate',  label: isProposal ? 'A Enviar' : 'Rascunho' },
      sent:      { color: 'yellow', label: isProposal ? 'Aguardando' : 'Enviado' },
      accepted:  { color: 'green',  label: 'Aceito' },
      signed:    { color: 'green',  label: 'Assinado' },
      declined:  { color: 'red',    label: 'Declinado' },
      cancelled: { color: 'red',    label: 'Cancelado' },
    };
    const c = maps[st] || { color: 'slate', label: st };
    return <Badge color={c.color}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-warm-300 pb-3">
        <h3 className="font-semibold text-lg text-warm-900 flex items-center gap-2">
          {isProposal ? <ShieldCheck size={20} className="text-brand-500" /> : <CheckCircle2 size={20} className="text-brand-500" />}
          Lista de {title}s
        </h3>
        <Button variant={formOpen ? 'outline' : 'primary'} onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? 'Cancelar' : `Nova ${title}`}
        </Button>
      </div>

      {formOpen && (
        <Card className="p-5">
          <form onSubmit={handleCreate} className="space-y-4">
            <h4 className="font-semibold text-sm text-warm-800 font-sans">Criar Nova {title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-warm-500 uppercase mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  placeholder={`Ex: ${title} do Escopo`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-500 uppercase mb-1">Status Inicial</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  {statusOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-500 uppercase mb-1">Descrição / Notas</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-2 text-sm focus:outline-none h-20 resize-none"
                placeholder="Insira detalhes e anotações pertinentes..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-500 uppercase mb-1">Anexar Documento (PDF, DOCX, TXT)</label>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={e => setSelectedFile(e.target.files[0] || null)}
                className="w-full text-xs text-warm-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-warm-200 file:text-warm-850 hover:file:bg-warm-300"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>Criar {title}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="text-center py-8 text-warm-500 bg-warm-50 rounded-2xl border border-warm-300/40">
            Nenhum(a) {title.toLowerCase()} registrado(a).
          </div>
        )}
        {items.map(item => {
          const files = proj.media_files?.filter(f => isProposal ? f.proposal_id === item.id : f.contract_id === item.id) || [];
          return (
            <Card key={item.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-sm text-warm-900">{item.title}</h4>
                  {getStatusBadge(item.status)}
                </div>
                {item.description && <p className="text-xs text-warm-500">{item.description}</p>}
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {files.map(f => (
                      <a
                        key={f.id}
                        href={f.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline bg-brand-50 px-2 py-1 rounded"
                      >
                        <Download size={11} />
                        {f.file_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={item.status}
                  onChange={e => handleStatusChange(item.id, e.target.value)}
                  className="bg-warm-200 border border-warm-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
                >
                  {statusOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-warm-500 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Payment (Invoices & Receipts) Step Manager Component ──
function PaymentStepManager({ proj, currentUser, refreshProject }) {
  const payments = proj.payments || [];
  const fiscalNotes = proj.fiscal_notes || [];

  // Fiscal note form states
  const [nfFormOpen, setNfFormOpen] = useState(false);
  const [nfNumber, setNfNumber] = useState('');
  const [nfDesc, setNfDesc] = useState('');
  const [nfValue, setNfValue] = useState('');
  const [nfDate, setNfDate] = useState('');
  const [nfFile, setNfFile] = useState(null);
  const [savingNf, setSavingNf] = useState(false);

  // Payment receipts state
  const [uploadingReceiptPaymentId, setUploadingReceiptPaymentId] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [savingReceipt, setSavingReceipt] = useState(false);

  const handleCreateFiscalNote = async (e) => {
    e.preventDefault();
    if (!nfDesc.trim() || !nfValue || !nfDate || !currentUser) return;
    setSavingNf(true);
    try {
      let fileUrl = '';
      let filePath = '';

      if (nfFile) {
        const uploadRes = await uploadFile(currentUser.id, 'fiscal-notes', proj.id, nfFile);
        if (uploadRes.error) throw uploadRes.error;
        fileUrl = uploadRes.data.url;
        filePath = uploadRes.data.path;
      }

      const { error } = await supabase.from('fiscal_notes').insert({
        user_id: proj.user_id,
        project_id: proj.id,
        nf_number: nfNumber.trim(),
        service_desc: nfDesc.trim(),
        gross_value: parseFloat(nfValue) || 0,
        issue_date: nfDate,
        status: 'issued',
        file_path: filePath || null,
        file_url: fileUrl || null,
      });

      if (error) throw error;

      setNfFormOpen(false);
      setNfNumber('');
      setNfDesc('');
      setNfValue('');
      setNfDate('');
      setNfFile(null);
      await refreshProject();
    } catch (err) {
      console.error('Erro ao salvar nota fiscal:', err);
      alert('Erro ao salvar nota fiscal');
    } finally {
      setSavingNf(false);
    }
  };

  const handleUploadReceipt = async (paymentId) => {
    if (!receiptFile || !currentUser) return;
    setSavingReceipt(true);
    try {
      const uploadRes = await uploadFile(currentUser.id, 'projects', paymentId, receiptFile);
      if (uploadRes.error) throw uploadRes.error;

      const { error } = await supabase.from('media_files').insert({
        user_id: proj.user_id,
        project_id: proj.id,
        file_name: receiptFile.name,
        file_path: uploadRes.data.path,
        file_url: uploadRes.data.url,
        mime_type: receiptFile.type,
        file_size: receiptFile.size,
        description: `Comprovante de pagamento para lançamento: ${paymentId}`,
        metadata: { payment_id: paymentId }
      });
      if (error) throw error;

      const { error: payError } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_date: new Date().toISOString() })
        .eq('id', paymentId);
      if (payError) throw payError;

      setUploadingReceiptPaymentId(null);
      setReceiptFile(null);
      await refreshProject();
    } catch (err) {
      console.error('Erro ao enviar comprovante:', err);
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleMarkAsPaid = async (paymentId) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_date: new Date().toISOString() })
        .eq('id', paymentId);
      if (error) throw error;
      await refreshProject();
    } catch (err) {
      console.error('Erro ao marcar como pago:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Receipts Section */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-warm-850 border-b border-warm-200 pb-2 flex items-center gap-2">
          <DollarSign size={16} className="text-brand-500" />
          Faturamentos e Comprovantes
        </h4>
        {payments.length === 0 && (
          <div className="text-center py-6 text-warm-500 bg-warm-50 rounded-2xl border border-warm-300/40">
            Nenhum faturamento registrado.
          </div>
        )}
        <div className="space-y-3">
          {payments.map(pay => {
            const receipts = proj.media_files?.filter(f => f.metadata?.payment_id === pay.id) || [];
            return (
              <Card key={pay.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h5 className="font-semibold text-sm text-warm-900">{pay.description}</h5>
                    <Badge color={pay.status === 'paid' ? 'green' : 'yellow'}>{pay.status}</Badge>
                  </div>
                  <p className="text-xs font-mono font-semibold text-warm-800">R$ {pay.amount.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-warm-500">
                    Vencimento: {pay.due_date ? new Date(pay.due_date).toLocaleDateString('pt-BR') : '—'}
                    {pay.paid_date && ` | Confirmado em: ${new Date(pay.paid_date).toLocaleDateString('pt-BR')}`}
                  </p>
                  {receipts.map(rec => (
                    <div key={rec.id} className="pt-1">
                      <a
                        href={rec.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline bg-brand-50 px-2 py-0.5 rounded"
                      >
                        <Download size={10} />
                        Comprovante: {rec.file_name}
                      </a>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {pay.status !== 'paid' && (
                    <>
                      <Button variant="ghost" className="text-xs py-1 px-2.5 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => handleMarkAsPaid(pay.id)}>
                        Marcar Pago
                      </Button>
                      <button
                        onClick={() => setUploadingReceiptPaymentId(uploadingReceiptPaymentId === pay.id ? null : pay.id)}
                        className="text-[11px] font-semibold text-brand-650 hover:underline bg-brand-50 px-2.5 py-1 rounded"
                      >
                        Enviar Comprovante
                      </button>
                    </>
                  )}
                </div>

                {uploadingReceiptPaymentId === pay.id && (
                  <div className="w-full md:w-auto flex items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0">
                    <input
                      type="file"
                      onChange={e => setReceiptFile(e.target.files[0] || null)}
                      className="text-xs text-warm-500"
                    />
                    <Button variant="primary" className="py-1 px-3 text-xs" onClick={() => handleUploadReceipt(pay.id)} loading={savingReceipt}>
                      Upload
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fiscal Notes Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-warm-200 pb-2">
          <h4 className="font-semibold text-sm text-warm-850 flex items-center gap-2">
            <Receipt size={16} className="text-brand-500" />
            Notas Fiscais Associadas
          </h4>
          <Button variant="secondary" className="py-1 px-3 text-xs" onClick={() => setNfFormOpen(!nfFormOpen)}>
            {nfFormOpen ? 'Cancelar' : 'Adicionar Nota'}
          </Button>
        </div>

        {nfFormOpen && (
          <Card className="p-4">
            <form onSubmit={handleCreateFiscalNote} className="space-y-4">
              <h5 className="font-semibold text-xs text-warm-800">Nova Nota Fiscal</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-0.5">Número</label>
                  <input
                    type="text"
                    value={nfNumber}
                    onChange={e => setNfNumber(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    placeholder="Ex: 1045"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-0.5">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    value={nfValue}
                    onChange={e => setNfValue(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-0.5">Data de Emissão</label>
                  <input
                    type="date"
                    required
                    value={nfDate}
                    onChange={e => setNfDate(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-0.5">Descrição do Serviço</label>
                <input
                  type="text"
                  required
                  value={nfDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-warm-50 border border-warm-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  placeholder="Ex: Prestação de serviços de programação de sistemas..."
                />
              </div>
              <div>
                <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-0.5">Nota em PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setNfFile(e.target.files[0] || null)}
                  className="w-full text-xs text-warm-500 file:mr-4 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-warm-200"
                />
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" loading={savingNf}>Salvar Nota Fiscal</Button>
              </div>
            </form>
          </Card>
        )}

        {fiscalNotes.length === 0 && (
          <div className="text-center py-6 text-warm-500 bg-warm-50 rounded-2xl border border-warm-300/40">
            Nenhuma nota fiscal emitida.
          </div>
        )}
        <div className="space-y-3">
          {fiscalNotes.map(nf => (
            <Card key={nf.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-warm-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h5 className="font-semibold text-sm text-warm-900">Nota Fiscal #{nf.nf_number || 'S/N'}</h5>
                  <Badge color="green">{nf.status}</Badge>
                </div>
                <p className="text-xs text-warm-600">{nf.service_desc}</p>
                <p className="text-[10px] text-warm-500 font-mono">
                  R$ {nf.gross_value.toLocaleString('pt-BR')} | Emitida em: {new Date(nf.issue_date).toLocaleDateString('pt-BR')}
                </p>
                {nf.file_url && (
                  <a
                    href={nf.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-brand-650 hover:underline bg-brand-50 px-2 py-0.5 rounded mt-1"
                  >
                    <Download size={10} />
                    Download PDF da Nota
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Finalization Step Component ──
function FinalizationStepForm({ proj, onUpdateProject }) {
  const [editing, setEditing] = useState(false);
  const [documentation, setDocumentation] = useState(proj.metadata?.finalization?.documentation || '');
  const [links, setLinks] = useState(proj.metadata?.finalization?.links || '');
  const [info, setInfo] = useState(proj.metadata?.finalization?.info || '');
  const [feedback, setFeedback] = useState(proj.metadata?.finalization?.feedback || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (onUpdateProject) {
      await onUpdateProject(proj.id, {
        metadata: {
          ...proj.metadata,
          finalization: {
            documentation,
            links,
            info,
            feedback
          }
        }
      });
    }
    setSaving(false);
    setEditing(false);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-warm-300 pb-3">
        <h3 className="font-semibold text-lg text-warm-900 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-emerald-500" />
          Encerramento e Finalização
        </h3>
        {!editing ? (
          <Button variant="secondary" onClick={() => setEditing(true)}>Editar Dados</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Documentações Finais</label>
            {editing ? (
              <textarea
                value={documentation}
                onChange={e => setDocumentation(e.target.value)}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-3 text-sm focus:outline-none h-24 resize-none"
                placeholder="Manuais de deploy, credenciais públicas..."
              />
            ) : (
              <p className="text-warm-850 bg-warm-200/35 p-3 rounded-xl border border-warm-300/30 min-h-[96px] whitespace-pre-wrap">{documentation || 'Nenhuma documentação cadastrada.'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Links Úteis (Produção, Repositórios, etc. - Separados por vírgula)</label>
            {editing ? (
              <input
                type="text"
                value={links}
                onChange={e => setLinks(e.target.value)}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-2.5 focus:outline-none"
                placeholder="Ex: https://meusistema.com, https://github.com/..."
              />
            ) : (
              <div className="space-y-1.5 mt-1 bg-warm-200/35 p-3 rounded-xl border border-warm-300/30 min-h-[48px]">
                {links ? (
                  links.split(',').map((l, idx) => {
                    const cleanLink = l.trim();
                    if (!cleanLink) return null;
                    return (
                      <div key={idx} className="flex items-center gap-1">
                        <ArrowRight size={12} className="text-warm-500" />
                        <a href={cleanLink.startsWith('http') ? cleanLink : `https://${cleanLink}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                          {cleanLink}
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-warm-500">Nenhum link cadastrado.</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Informações de Desenvolvimento</label>
            {editing ? (
              <textarea
                value={info}
                onChange={e => setInfo(e.target.value)}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-3 text-sm focus:outline-none h-24 resize-none"
                placeholder="Detalhamento geral e notas sobre a execução..."
              />
            ) : (
              <p className="text-warm-855 bg-warm-200/35 p-3 rounded-xl border border-warm-300/30 min-h-[96px] whitespace-pre-wrap">{info || 'Nenhuma informação registrada.'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Feedback do Cliente</label>
            {editing ? (
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="w-full bg-warm-200 border border-warm-300 rounded-xl px-4 py-3 text-sm focus:outline-none h-24 resize-none"
                placeholder="Apreciação final do cliente sobre o projeto..."
              />
            ) : (
              <p className="text-warm-855 bg-warm-200/35 p-3 rounded-xl border border-warm-300/30 min-h-[96px] whitespace-pre-wrap">{feedback || 'Nenhum feedback registrado.'}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}


export default function ProjetosView({
  projects, filter, onFilterChange, selectedProject, onSelectProject,
  onDeclineProject, onArchiveProject, onDeleteProject, onAdvanceWorkflow, onUpdateTask,
  onUpdateProject,
  // Checklist props
  onCreateChecklist, onUpdateChecklist, onDeleteChecklist, onUpdateChecklistStatus,
  onAddChecklistItem, onToggleChecklistItem, onDeleteChecklistItem,
  onCreateProjectDirectly,
  onViewClient,
  clients = [],
}) {
  const [subTab, setSubTab] = useState('informacoes');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ clientName: '', clientEmail: '', title: '', value: '' });
  const [clientMode, setClientMode] = useState('existing'); // 'existing' | 'new'
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [newPayDesc, setNewPayDesc] = useState('');
  const [newPayAmount, setNewPayAmount] = useState('');
  const [newPayDueDate, setNewPayDueDate] = useState('');
  const [newPayObs, setNewPayObs] = useState('');
  const [savingPay, setSavingPay] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '', company: '', contact_person: '', contact_position: '',
    phone: '', email: '', cpf_cnpj: '', address: '', city: '', state: '', zip_code: '', notes: ''
  });
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    setEditingContact(false);
  }, [selectedProject?.id]);

  const handleStartEditContact = () => {
    const c = proj?.client || {};
    setContactForm({
      name: c.name || '',
      company: c.company || '',
      contact_person: c.contact_person || '',
      contact_position: c.contact_position || '',
      phone: c.phone || '',
      email: c.email || '',
      cpf_cnpj: c.cpf_cnpj || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      zip_code: c.zip_code || '',
      notes: c.notes || '',
    });
    setEditingContact(false); // will be toggled to true below or we can just set it
    setEditingContact(true);
  };

  const handleSaveContact = async () => {
    if (!contactForm.name) {
      alert('O nome do cliente é obrigatório.');
      return;
    }
    setSavingContact(true);
    try {
      const clientId = proj.client_id || proj.client?.id;
      if (!clientId) throw new Error('Cliente não encontrado no projeto.');

      const { error } = await supabase
        .from('clients')
        .update({
          name: contactForm.name,
          company: contactForm.company || null,
          contact_person: contactForm.contact_person || null,
          contact_position: contactForm.contact_position || null,
          phone: contactForm.phone || null,
          email: contactForm.email,
          cpf_cnpj: contactForm.cpf_cnpj || null,
          address: contactForm.address || null,
          city: contactForm.city || null,
          state: contactForm.state || null,
          zip_code: contactForm.zip_code || null,
          notes: contactForm.notes || null,
        })
        .eq('id', clientId);

      if (error) throw error;

      if (onUpdateProject) {
        await onUpdateProject(proj.id, { updated_at: new Date().toISOString() });
      }
      setEditingContact(false);
    } catch (err) {
      alert('Erro ao atualizar contato: ' + (err.message || err));
    } finally {
      setSavingContact(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const clientId = proj?.client_id || proj?.client?.id;
      if (!clientId) throw new Error('Cliente não encontrado');
      const { error } = await supabase.from('clients').update({ notes: noteText.trim() }).eq('id', clientId);
      if (error) throw error;
      if (onUpdateProject) await onUpdateProject(proj.id, { updated_at: new Date().toISOString() });
      setAddingNote(false);
      await refreshProject();
    } catch (err) {
      alert('Erro ao salvar observação: ' + (err.message || err));
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!newPayDesc.trim() || !newPayAmount) return;
    setSavingPay(true);
    try {
      const { error } = await supabase.from('payments').insert({
        user_id: proj.user_id,
        project_id: proj.id,
        description: newPayDesc.trim(),
        amount: parseFloat(newPayAmount) || 0,
        due_date: newPayDueDate || null,
        status: 'pending',
        metadata: { observation: newPayObs.trim() || null },
      });
      if (error) throw error;
      setAddPaymentOpen(false);
      setNewPayDesc(''); setNewPayAmount(''); setNewPayDueDate(''); setNewPayObs('');
      await refreshProject();
    } catch (err) {
      console.error('Erro ao criar lançamento:', err);
      alert('Erro ao criar lançamento');
    } finally {
      setSavingPay(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!onCreateProjectDirectly) return;

    const payload = { title: newProject.title, value: parseFloat(newProject.value) || 0 };

    if (clientMode === 'existing') {
      if (!selectedClientId) return;
      payload.clientId = selectedClientId;
    } else {
      if (!newProject.clientName.trim()) return;
      payload.clientName = newProject.clientName;
      payload.clientEmail = newProject.clientEmail;
    }

    await onCreateProjectDirectly(payload);
    setIsNewProjectModalOpen(false);
    setNewProject({ clientName: '', clientEmail: '', title: '', value: '' });
    setClientMode('existing');
    setClientSearch('');
    setSelectedClientId('');
  };

  const proj = selectedProject;
  const stepNumber = proj ? getStepNumber(proj.current_step) : 1;
  const tasks      = proj ? (proj.tasks || []) : [];
  const checklists = proj ? (proj.checklists || []) : [];
  const payments   = proj ? (proj.payments || []) : [];

  // --- Carregamento de Itens da EAP para tarefas ---
  const [eapItems, setEapItems] = useState([]);

  useEffect(() => {
    if (!proj?.id) {
      setEapItems([]);
      return;
    }
    
    let active = true;
    const fetchEapItems = async () => {
      try {
        const { data: eap } = await supabase
          .from('eap')
          .select('id, scope_versions!inner(status)')
          .eq('project_id', proj.id)
          .eq('scope_versions.status', 'active')
          .maybeSingle();

        if (!active) return;

        if (eap) {
          const { data: items, error } = await supabase
            .from('eap_items')
            .select('*')
            .eq('eap_id', eap.id)
            .order('codigo_estruturado', { ascending: true });

          if (!error && active) {
            setEapItems(items || []);
          }
        } else {
          if (active) setEapItems([]);
        }
      } catch (err) {
        console.error('Erro ao buscar itens da EAP:', err);
      }
    };

    fetchEapItems();
    return () => { active = false; };
  }, [proj?.id]);

  const refreshProject = async () => {
    if (!proj) return;
    const { data } = await supabase
      .from('projects')
      .select('*, client:clients(*), tasks(*), payments(*), checklists(*, checklist_items(*)), documents(*), workflow_history(*), proposals(*), contracts(*), media_files(*), fiscal_notes(*), service_orders(*)')
      .eq('id', proj.id)
      .single();
    if (data) {
      onSelectProject(data);
    }
  };

  const counts = {
    active:   projects.filter(p => p.status === 'active').length,
    archived: projects.filter(p => p.status === 'archived').length,
    declined: projects.filter(p => p.status === 'declined').length,
  };

  const filtered = projects.filter(p => p.status === filter);

  const handleOpenProject = (p) => {
    onSelectProject(p);
    setSubTab('informacoes');
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

    const kanbanItems = [
      ...tasks.map(t => ({ ...t, _type: 'task' })),
      ...checklists.map(c => ({ ...c, _type: 'checklist' })),
    ];

    return (
      <div className="space-y-6 animate-in fade-in font-sans">
        {/* Project header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack}
              className="p-2 text-warm-500 hover:text-warm-650 hover:bg-warm-200 rounded-xl transition-all">
              <X size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-warm-900 tracking-tight">{proj.title}</h2>
              <div className="flex items-center gap-3 text-xs text-warm-500 font-medium mt-0.5">
                <span className="flex items-center gap-1"><Users size={11} /> {proj.client?.name || 'Cliente'}</span>
                <span className="text-warm-300">|</span>
                <span className="flex items-center gap-1 font-mono font-semibold text-warm-650">
                  <CreditCard size={11} /> R$ {(proj.value || 0).toLocaleString('pt-BR')}
                </span>
                {paidPct > 0 && (
                  <>
                    <span className="text-warm-300">|</span>
                    <span className="text-emerald-600 font-semibold">{paidPct}% faturado</span>
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
            <Button variant="danger" className="h-9 text-xs px-3" icon={Trash2} onClick={() => onDeleteProject(proj)}>Excluir</Button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-warm-300 gap-1 overflow-x-auto">
          {[
            { key: 'informacoes',      label: 'Informações',      icon: Info },
            { key: 'ordem-de-servico', label: 'Ordem de Serviço', icon: ClipboardList },
            { key: 'kanban',           label: 'Kanban',           icon: LayoutGrid },
            { key: 'financeiro',       label: 'Financeiro',       icon: DollarSign },
            { key: 'acordo-comercial', label: 'Acordo Comercial', icon: FileSignature },
          ].map(tab => (
            <button key={tab.key} onClick={() => setSubTab(tab.key)}
              className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5
                ${subTab === tab.key
                  ? 'border-brand-500 text-warm-900 font-semibold'
                  : 'border-transparent text-warm-500 hover:text-warm-650'
                }`}>
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── INFORMAÇÕES TAB ── */}
        {subTab === 'informacoes' && (
          <div className="space-y-6 py-2">
            {editingContact && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingContact(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSaveContact} loading={savingContact}>Salvar Contato</Button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {editingContact ? (
                <>
                  <Card className="p-5 space-y-4">
                    <h4 className="font-semibold text-sm text-warm-850 border-b border-warm-200 pb-2 flex items-center gap-1.5">
                      <Users size={15} />
                      Editar Dados de Contato
                    </h4>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-warm-500">Nome do Cliente *</label>
                        <input type="text" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30" required />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-warm-500">Empresa</label>
                        <input type="text" value={contactForm.company} onChange={e => setContactForm({ ...contactForm, company: e.target.value })}
                          className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-warm-500">Contato Principal</label>
                          <input type="text" value={contactForm.contact_person} onChange={e => setContactForm({ ...contactForm, contact_person: e.target.value })}
                            className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" placeholder="Nome" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-warm-500">Cargo</label>
                          <input type="text" value={contactForm.contact_position} onChange={e => setContactForm({ ...contactForm, contact_position: e.target.value })}
                            className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" placeholder="Cargo" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-warm-500">Telefone</label>
                        <input type="text" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                          className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" placeholder="(00) 00000-0000" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-warm-500">E-mail</label>
                        <input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" placeholder="email@exemplo.com" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-warm-500">CPF/CNPJ</label>
                        <input type="text" value={contactForm.cpf_cnpj} onChange={e => setContactForm({ ...contactForm, cpf_cnpj: e.target.value })}
                          className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" placeholder="00.000.000/0001-00" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 space-y-4">
                    <h4 className="font-semibold text-sm text-warm-850 border-b border-warm-200 pb-2 flex items-center gap-1.5">
                      <MapPin size={15} />
                      Editar Endereço & Notas
                    </h4>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-warm-500">Endereço Completo</label>
                        <input type="text" value={contactForm.address} onChange={e => setContactForm({ ...contactForm, address: e.target.value })}
                          className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" placeholder="Rua, Número, Bairro..." />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 flex flex-col gap-1">
                          <label className="text-xs font-semibold text-warm-500">Cidade</label>
                          <input type="text" value={contactForm.city} onChange={e => setContactForm({ ...contactForm, city: e.target.value })}
                            className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-warm-500">UF</label>
                          <input type="text" value={contactForm.state} onChange={e => setContactForm({ ...contactForm, state: e.target.value })}
                            className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" placeholder="UF" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-warm-500">CEP</label>
                        <input type="text" value={contactForm.zip_code} onChange={e => setContactForm({ ...contactForm, zip_code: e.target.value })}
                          className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-1.5 text-xs text-warm-900 focus:outline-none" placeholder="00000-000" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-warm-500">Observações Gerais</label>
                        <textarea value={contactForm.notes} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })}
                          className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-2 text-xs text-warm-900 focus:outline-none h-24 resize-none"
                          placeholder="Alguma nota sobre o cliente ou faturamento..." />
                      </div>
                    </div>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-warm-200 pb-2">
                      <h4 className="font-semibold text-sm text-warm-850 flex items-center gap-1.5">
                        <Users size={15} />
                        Dados de Contato
                      </h4>
                      <Button variant="secondary" className="py-1 px-3 text-xs" icon={Pencil} onClick={handleStartEditContact}>
                        Editar
                      </Button>
                    </div>
                    <div className="space-y-2.5 text-sm text-warm-600">
                      <div className="flex justify-between gap-2"><span className="font-medium shrink-0">Nome:</span> <span className="text-warm-900 font-semibold text-right">{proj.client?.name || 'Não informado'}</span></div>
                      <div className="flex justify-between gap-2"><span className="font-medium shrink-0">Empresa:</span> <span className="text-warm-900 text-right">{proj.client?.company || 'Não informada'}</span></div>
                      <div className="flex justify-between gap-2"><span className="font-medium shrink-0">Contato:</span> <span className="text-warm-900 text-right">{proj.client?.contact_person || 'Não informado'}{proj.client?.contact_position ? ` (${proj.client.contact_position})` : ''}</span></div>
                      <div className="flex justify-between gap-2"><span className="font-medium shrink-0">Telefone:</span> <span className="text-warm-900 text-right">{proj.client?.phone || 'Não informado'}</span></div>
                      <div className="flex justify-between gap-2"><span className="font-medium shrink-0">E-mail:</span> <a href={`mailto:${proj.client?.email}`} className="text-brand-500 hover:underline text-right">{proj.client?.email || 'Não informado'}</a></div>
                      <div className="flex justify-between gap-2"><span className="font-medium shrink-0">CPF/CNPJ:</span> <span className="text-warm-900 text-right">{proj.client?.cpf_cnpj || 'Não informado'}</span></div>
                      <div className="flex justify-between gap-2"><span className="font-medium shrink-0">Cadastro:</span> <span className="text-warm-900 text-right">{proj.created_at ? new Date(proj.created_at).toLocaleDateString('pt-BR') : '—'}</span></div>
                    </div>
                    {onViewClient && (
                      <div className="pt-3 border-t border-warm-200/40">
                        <Button variant="outline" icon={ExternalLink} className="w-full justify-center text-xs py-1.5" onClick={() => onViewClient(proj)}>
                          Ver mais sobre este cliente
                        </Button>
                      </div>
                    )}
                  </Card>
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-warm-200 pb-2">
                      <h4 className="font-semibold text-sm text-warm-850 flex items-center gap-1.5">
                        <MapPin size={15} />
                        Endereço & Observações
                      </h4>
                      <Button variant="secondary" className="py-1 px-3 text-xs" icon={StickyNote}
                        onClick={() => { setNoteText(proj.client?.notes || ''); setAddingNote(!addingNote); }}>
                        {addingNote ? 'Cancelar' : 'Editar Obs.'}
                      </Button>
                    </div>
                    <div className="space-y-3 text-sm text-warm-600">
                      <div>
                        <span className="font-medium">Endereço:</span>
                        <p className="text-warm-900 mt-1">
                          {proj.client?.address ? `${proj.client.address}, ` : ''}
                          {proj.client?.city ? `${proj.client.city} - ` : ''}
                          {proj.client?.state || ''}
                          {proj.client?.zip_code ? ` (CEP: ${proj.client.zip_code})` : ''}
                          {(!proj.client?.address && !proj.client?.city) && 'Nenhum endereço cadastrado'}
                        </p>
                      </div>
                      {!addingNote ? (
                        <div>
                          <span className="font-medium">Observações:</span>
                          <p className="text-warm-900 mt-1 bg-warm-200/40 p-3 rounded-lg border border-warm-300/40 italic min-h-[48px]">
                            {proj.client?.notes || 'Nenhuma observação cadastrada.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-warm-500">Observações / Notas</label>
                          <textarea
                            autoFocus
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            className="w-full bg-warm-200 border border-warm-300 rounded-xl px-3 py-2 text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 h-28 resize-none"
                            placeholder="Observações sobre o cliente ou o projeto..."
                          />
                          <div className="flex gap-2">
                            <Button variant="primary" className="text-xs py-1.5 px-3" onClick={handleSaveNote} loading={savingNote}>Salvar</Button>
                            <Button variant="outline" className="text-xs py-1.5 px-3" onClick={() => setAddingNote(false)}>Cancelar</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}
            </div>
            <DemandStepForm proj={proj} onUpdateProject={onUpdateProject} />
          </div>
        )}

        {/* ── ACORDO COMERCIAL TAB ── */}
        {subTab === 'acordo-comercial' && (
          <div className="space-y-8 py-2">
            <CommercialStepManager type="contract" proj={proj} currentUser={currentUser} refreshProject={refreshProject} />
            <div className="border-t border-warm-300 pt-6">
              <CommercialStepManager type="proposal" proj={proj} currentUser={currentUser} refreshProject={refreshProject} />
            </div>
          </div>
        )}

        {/* ── ORDEM DE SERVIÇO TAB ── */}
        {subTab === 'ordem-de-servico' && (
          <div className="py-2">
            <OrdemDeServicoTab proj={proj} refreshProject={refreshProject} />
          </div>
        )}

        {/* ── KANBAN TAB ── */}
        {subTab === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 py-2">
            {[
              { status: 'todo',    label: 'A Fazer',      color: 'text-warm-500',    dot: 'bg-warm-400',    prev: null,      next: 'doing' },
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
                    <span className="ml-auto text-[10px] font-bold text-warm-500 bg-warm-200 rounded-full px-2 py-0.5">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex-1 bg-warm-200/30 rounded-2xl p-3 space-y-2 min-h-[200px]">
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
                      return (
                        <Card key={`task-${item.id}`} className="p-4 hover:shadow-elevated transition-shadow cursor-move">
                          <p className="text-sm font-medium text-warm-850 mb-3 leading-snug">{item.title}</p>
                          {item.eap_item_id && (() => {
                            const eapItem = eapItems.find(i => i.id === item.eap_item_id);
                            return eapItem ? (
                              <div className="text-[10px] text-brand-650 font-bold bg-brand-50 border border-brand-100 rounded-md px-2 py-0.5 mb-3 inline-block">
                                EAP: {eapItem.codigo_estruturado} - {eapItem.nome}
                              </div>
                            ) : null;
                          })()}
                          <div className="flex justify-between items-center">
                            <Badge color="slate">{item.task_type || 'Tarefa'}</Badge>
                            <div className="flex gap-1">
                              {col.prev && (
                                <button onClick={() => onUpdateTask(proj.id, item.id, col.prev)}
                                  className="p-1.5 hover:bg-warm-200 rounded-lg transition-colors">
                                  <ChevronDown size={13} className="text-warm-500" />
                                </button>
                              )}
                              {col.next && (
                                <button onClick={() => onUpdateTask(proj.id, item.id, col.next)}
                                  className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors">
                                  <ChevronRight size={13} className="text-brand-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
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
              <div className="bg-warm-50 rounded-2xl p-5 border border-warm-300">
                <p className="text-[10px] text-warm-500 font-bold uppercase tracking-widest mb-2">Valor do Projeto</p>
                <p className="text-3xl font-bold text-warm-900 font-mono">R$ {(proj.value || 0).toLocaleString('pt-BR')}</p>
                <div className="mt-3 h-1.5 bg-warm-300 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${paidPct}%` }} />
                </div>
                <p className="text-[10px] text-warm-500 mt-1.5 font-mono">{paidPct}% faturado</p>
              </div>
              <Card className="p-5">
                <p className="text-[10px] text-warm-500 font-bold uppercase tracking-widest mb-2">Já Faturado</p>
                <p className="text-2xl font-bold text-emerald-600 font-mono">R$ {paidTotal.toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-warm-500 mt-1">pagamentos confirmados</p>
              </Card>
              <Card className="p-5">
                <p className="text-[10px] text-warm-500 font-bold uppercase tracking-widest mb-2">Saldo Pendente</p>
                <p className="text-2xl font-bold text-amber-500 font-mono">R$ {pendingTotal.toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-warm-500 mt-1">a receber</p>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-warm-200 pb-3 mb-4">
                <h4 className="font-semibold text-sm text-warm-900 flex items-center gap-2">
                  <DollarSign size={15} className="text-brand-500" />
                  Lançamentos
                </h4>
                <Button variant={addPaymentOpen ? 'outline' : 'primary'} className="text-xs py-1.5 px-3" icon={Plus}
                  onClick={() => setAddPaymentOpen(!addPaymentOpen)}>
                  {addPaymentOpen ? 'Cancelar' : 'Adicionar Lançamento'}
                </Button>
              </div>
              {addPaymentOpen && (
                <form onSubmit={handleCreatePayment} className="space-y-4 mb-6 p-4 bg-warm-100/60 rounded-xl border border-warm-300/50">
                  <h5 className="font-semibold text-xs text-warm-800">Novo Lançamento</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-1">Descrição *</label>
                      <input type="text" required value={newPayDesc} onChange={e => setNewPayDesc(e.target.value)}
                        className="w-full bg-warm-50 border border-warm-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        placeholder="Ex: Parcela 1 — Design" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-1">Valor (R$) *</label>
                      <input type="number" required min="0" step="0.01" value={newPayAmount} onChange={e => setNewPayAmount(e.target.value)}
                        className="w-full bg-warm-50 border border-warm-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-1">Vencimento</label>
                      <input type="date" value={newPayDueDate} onChange={e => setNewPayDueDate(e.target.value)}
                        className="w-full bg-warm-50 border border-warm-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-warm-500 font-semibold uppercase mb-1">Observação</label>
                      <input type="text" value={newPayObs} onChange={e => setNewPayObs(e.target.value)}
                        className="w-full bg-warm-50 border border-warm-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        placeholder="Ex: Referente ao escopo inicial" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" loading={savingPay}>Salvar Lançamento</Button>
                  </div>
                </form>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-warm-200/40 text-warm-500 text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Observação</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200/40">
                    {payments.length === 0 ? (
                      <tr><td colSpan="5" className="px-4 py-12 text-center text-warm-500 text-sm">Nenhum lançamento registrado.</td></tr>
                    ) : (
                      payments.map(pay => (
                        <tr key={pay.id} className="hover:bg-warm-200/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-sm text-warm-500">{pay.due_date ? new Date(pay.due_date).toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="px-4 py-3 font-medium text-warm-600">{pay.description}</td>
                          <td className="px-4 py-3 font-semibold font-mono text-warm-900">R$ {(pay.amount || 0).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-3 text-xs text-warm-500 italic">{pay.metadata?.observation || '—'}</td>
                          <td className="px-4 py-3"><Badge color={pay.status === 'paid' ? 'green' : 'yellow'}>{pay.status}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <PaymentStepManager proj={proj} currentUser={currentUser} refreshProject={refreshProject} />
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
          <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-900 tracking-tight">Projetos</h2>
          <p className="text-sm text-warm-500 mt-0.5">Gerencie seus projetos ativos</p>
        </div>
        <Button onClick={() => setIsNewProjectModalOpen(true)} icon={Plus}>
          Novo Projeto
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-warm-300 dark:border-warm-300 gap-1">
        {[
          { key: 'active',   label: 'Ativos',    count: counts.active },
          { key: 'archived', label: 'Arquivados', count: counts.archived },
          { key: 'declined', label: 'Declinados', count: counts.declined },
        ].map(tab => (
          <button key={tab.key} onClick={() => onFilterChange(tab.key)}
            className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 flex items-center gap-2
              ${filter === tab.key
                ? 'border-brand-500 text-warm-900 dark:text-warm-900'
                : 'border-transparent text-warm-500 hover:text-warm-500 dark:hover:text-warm-600'
              }`}>
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums
              ${filter === tab.key
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'bg-warm-200 text-warm-500 dark:bg-warm-200 dark:text-warm-500'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24">
          <div className="w-14 h-14 rounded-2xl bg-warm-200 dark:bg-warm-200 flex items-center justify-center">
            <Briefcase className="text-warm-600 dark:text-warm-500" size={24} />
          </div>
          <p className="text-warm-500 text-sm">
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
                className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card p-6 hover:shadow-elevated hover:border-warm-400 transition-all cursor-pointer group"
                onClick={() => handleOpenProject(p)}>

                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-sm text-warm-900 dark:text-warm-900 truncate leading-snug">{p.title}</p>
                    <p className="text-[11px] text-warm-500 mt-0.5 font-medium">{p.client?.name || 'Cliente'}</p>
                  </div>
                  <Badge color={sn >= 6 ? 'green' : 'blue'}>{stepData?.label}</Badge>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-warm-500 font-medium mb-1.5">
                    <span>Etapa {sn}/7</span>
                    <span className="font-semibold">{Math.round((sn / 7) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-warm-200 dark:bg-warm-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${sn >= 7 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                      style={{ width: `${(sn / 7) * 100}%` }} />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold font-mono text-warm-900 dark:text-warm-900">
                      R$ {(p.value || 0).toLocaleString('pt-BR')}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {paidPct > 0 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">{paidPct}% faturado</p>
                      )}
                      {clCount > 0 && (
                        <span className="text-[10px] text-warm-500 font-medium">{clCount} checklist{clCount > 1 ? 's' : ''}</span>
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
                        className="text-[10px] font-semibold text-warm-500 hover:text-warm-500 px-2 py-1 rounded-lg hover:bg-warm-200 dark:hover:bg-warm-200 transition-colors"
                        onClick={e => { e.stopPropagation(); onArchiveProject(p.id); }}>
                        Arquivar
                      </button>
                    )}
                    <button
                      title="Excluir permanentemente"
                      className="text-warm-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      onClick={e => { e.stopPropagation(); onDeleteProject(p); }}>
                      <Trash2 size={12} />
                    </button>
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
            <div className="px-6 py-4 border-b border-warm-300/60 flex justify-between items-center">
              <h3 className="font-semibold text-warm-900 tracking-tight">Novo Projeto Direto</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="text-warm-500 hover:text-warm-800 p-1 rounded-lg hover:bg-warm-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Título */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">Nome do Projeto</label>
                  <input type="text" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" placeholder="Ex: Criação de E-commerce" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} required />
                </div>

                {/* Toggle cliente */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">Cliente</label>
                  <div className="flex rounded-xl bg-warm-200 p-1 gap-1 mb-3">
                    {[{ id: 'existing', label: 'Cliente Existente' }, { id: 'new', label: 'Novo Cliente' }].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setClientMode(opt.id); setClientSearch(''); setSelectedClientId(''); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                          ${clientMode === opt.id ? 'bg-warm-50 text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {clientMode === 'existing' ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Buscar cliente pelo nome...'}
                        disabled={clients.length === 0}
                        value={clientSearch}
                        onChange={e => { setClientSearch(e.target.value); setSelectedClientId(''); setShowClientDropdown(true); }}
                        onFocus={() => setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                        className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {showClientDropdown && clients.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-warm-50 rounded-xl border border-warm-300 shadow-elevated overflow-hidden">
                          {clients
                            .filter(c => {
                              const q = clientSearch.toLowerCase();
                              return !q || c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q);
                            })
                            .slice(0, 8)
                            .map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={() => {
                                  setSelectedClientId(c.id);
                                  setClientSearch(c.company ? `${c.name} — ${c.company}` : c.name);
                                  setShowClientDropdown(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-warm-200 transition-colors"
                              >
                                <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-warm-900 truncate">{c.name}</p>
                                  {c.company && <p className="text-[11px] text-warm-500 truncate">{c.company}</p>}
                                </div>
                              </button>
                            ))}
                          {clients.filter(c => {
                            const q = clientSearch.toLowerCase();
                            return !q || c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q);
                          }).length === 0 && (
                            <p className="px-4 py-3 text-sm text-warm-400 italic">Nenhum cliente encontrado</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input type="text" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" placeholder="Nome do cliente / empresa" value={newProject.clientName} onChange={e => setNewProject({ ...newProject, clientName: e.target.value })} required={clientMode === 'new'} />
                      <input type="email" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" placeholder="E-mail (opcional)" value={newProject.clientEmail} onChange={e => setNewProject({ ...newProject, clientEmail: e.target.value })} />
                    </div>
                  )}
                </div>

                {/* Valor */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">Valor Estimado (R$)</label>
                  <input type="number" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" placeholder="Ex: 5000" value={newProject.value} onChange={e => setNewProject({ ...newProject, value: e.target.value })} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-warm-300/60 flex justify-end gap-3 bg-warm-100/50">
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
