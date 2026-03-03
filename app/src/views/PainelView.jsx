import { useState } from 'react';
import {
  Plus, Search, Trash2, ChevronUp, ChevronDown,
  ClipboardList, AlertTriangle, Minus, ArrowDown,
  X, Loader2,
} from 'lucide-react';

const STATUS_CONFIG = {
  todo:    { label: 'A Fazer',      color: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',       dot: 'bg-zinc-400' },
  doing:   { label: 'Em Progresso', color: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900', dot: 'bg-amber-400' },
  waiting: { label: 'Aguardando',   color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900',       dot: 'bg-blue-400' },
  done:    { label: 'Concluido',    color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900', dot: 'bg-emerald-400' },
};

const PRIORITY_CONFIG = {
  alta:   { label: 'Alta',   color: 'text-red-600 dark:text-red-400',    icon: ChevronUp,   bg: 'bg-red-50 dark:bg-red-950/20' },
  normal: { label: 'Normal', color: 'text-zinc-500 dark:text-zinc-400',  icon: Minus,        bg: 'bg-zinc-50 dark:bg-zinc-800/50' },
  baixa:  { label: 'Baixa',  color: 'text-blue-500 dark:text-blue-400',  icon: ArrowDown,    bg: 'bg-blue-50 dark:bg-blue-950/20' },
};

export default function PainelView({
  checklists,
  projects,
  userId,
  onChecklistCreated,
  onChecklistUpdated,
  onChecklistDeleted,
  createChecklistFn,
  updateChecklistFn,
  deleteChecklistFn,
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ project_id: '', title: '', description: '', priority: 'normal', status: 'todo', due_date: '' });

  // Filtros
  const filtered = checklists.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      const projectName = c.project?.title?.toLowerCase() || '';
      const clientName = c.project?.client?.name?.toLowerCase() || '';
      return c.title.toLowerCase().includes(q) || projectName.includes(q) || clientName.includes(q);
    }
    return true;
  });

  // Contadores
  const counts = {
    all: checklists.length,
    todo: checklists.filter(c => c.status === 'todo').length,
    doing: checklists.filter(c => c.status === 'doing').length,
    waiting: checklists.filter(c => c.status === 'waiting').length,
    done: checklists.filter(c => c.status === 'done').length,
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!userId || !newItem.project_id || !newItem.title) return;
    setSaving(true);
    try {
      const payload = { ...newItem };
      if (!payload.due_date) delete payload.due_date;
      if (!payload.description) delete payload.description;
      const { data, error } = await createChecklistFn(userId, payload);
      if (error) throw error;
      if (data) onChecklistCreated(data);
      setIsModalOpen(false);
      setNewItem({ project_id: '', title: '', description: '', priority: 'normal', status: 'todo', due_date: '' });
    } catch (err) {
      console.error('Erro ao criar checklist:', err);
      alert('Erro ao criar checklist');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (checklist, newStatus) => {
    try {
      const { data, error } = await updateChecklistFn(checklist.id, { status: newStatus });
      if (error) throw error;
      if (data) onChecklistUpdated(data);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este checklist?')) return;
    try {
      const { error } = await deleteChecklistFn(id);
      if (error) throw error;
      onChecklistDeleted(id);
    } catch (err) {
      console.error('Erro ao deletar checklist:', err);
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Painel de Controle</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Visao geral dos checklists de todos os projetos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-500 text-zinc-900 hover:bg-brand-400 shadow-sm transition-all"
        >
          <Plus size={15} /> Novo Checklist
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: 'all',     label: 'Total',         dotClass: 'bg-zinc-400',    countClass: 'text-zinc-900 dark:text-zinc-100' },
          { key: 'todo',    label: 'A Fazer',        dotClass: 'bg-zinc-400',    countClass: 'text-zinc-600 dark:text-zinc-300' },
          { key: 'doing',   label: 'Em Progresso',   dotClass: 'bg-amber-400',   countClass: 'text-amber-600 dark:text-amber-400' },
          { key: 'waiting', label: 'Aguardando',     dotClass: 'bg-blue-400',    countClass: 'text-blue-600 dark:text-blue-400' },
          { key: 'done',    label: 'Concluido',      dotClass: 'bg-emerald-400', countClass: 'text-emerald-600 dark:text-emerald-400' },
        ].map(card => (
          <button
            key={card.key}
            onClick={() => setFilterStatus(card.key)}
            className={`bg-white dark:bg-zinc-900 rounded-2xl border p-4 transition-all text-left
              ${filterStatus === card.key
                ? 'border-brand-300 dark:border-brand-700 shadow-brand'
                : 'border-zinc-100 dark:border-zinc-800 shadow-card hover:shadow-elevated'
              }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-1.5 h-1.5 rounded-full ${card.dotClass}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${card.countClass}`}>{counts[card.key]}</p>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Buscar por projeto, cliente ou checklist..."
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
        >
          <option value="all">Todas prioridades</option>
          <option value="alta">Alta</option>
          <option value="normal">Normal</option>
          <option value="baixa">Baixa</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Projeto</th>
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Checklist</th>
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prioridade</th>
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</th>
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <ClipboardList className="text-zinc-300 dark:text-zinc-600" size={22} />
                      </div>
                      <p className="text-sm text-zinc-400">Nenhum checklist encontrado</p>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
                      >
                        Criar primeiro checklist
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.todo;
                  const pr = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
                  const PrIcon = pr.icon;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      {/* Projeto */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">{item.project?.title || '—'}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{item.project?.client?.name || ''}</p>
                      </td>
                      {/* Checklist */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-700 dark:text-zinc-300">{item.title}</p>
                        {item.description && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                      </td>
                      {/* Prioridade */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${pr.bg} ${pr.color}`}>
                          <PrIcon size={12} />
                          {pr.label}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border cursor-pointer outline-none transition-all ${st.color}`}
                        >
                          <option value="todo">A Fazer</option>
                          <option value="doing">Em Progresso</option>
                          <option value="waiting">Aguardando</option>
                          <option value="done">Concluido</option>
                        </select>
                      </td>
                      {/* Acoes */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal novo checklist */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-elevated animate-in zoom-in-95 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Novo Checklist</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Projeto */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">Projeto</label>
                <select
                  required
                  value={newItem.project_id}
                  onChange={(e) => setNewItem({ ...newItem, project_id: e.target.value })}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                >
                  <option value="">Selecione um projeto...</option>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title} — {p.client?.name || 'Cliente'}</option>
                  ))}
                </select>
              </div>
              {/* Titulo */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">Titulo do Checklist</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Revisar layout da homepage"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                />
              </div>
              {/* Descricao */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">Descricao (opcional)</label>
                <textarea
                  placeholder="Detalhes adicionais..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all h-20 resize-none"
                />
              </div>
              {/* Prioridade + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">Prioridade</label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                  >
                    <option value="alta">Alta</option>
                    <option value="normal">Normal</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">Status</label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                  >
                    <option value="todo">A Fazer</option>
                    <option value="doing">Em Progresso</option>
                    <option value="waiting">Aguardando</option>
                    <option value="done">Concluido</option>
                  </select>
                </div>
              </div>
              {/* Data limite */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">Data Limite (opcional)</label>
                <input
                  type="date"
                  value={newItem.due_date}
                  onChange={(e) => setNewItem({ ...newItem, due_date: e.target.value })}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                />
              </div>
              {/* Botoes */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-500 text-zinc-900 hover:bg-brand-400 shadow-sm transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Criar Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
