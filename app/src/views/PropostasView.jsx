import React, { useState } from 'react';
import { Plus, FileText, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { createProposal, updateProposal, deleteProposal } from '../lib/supabase';
import FileUploader from '../components/ui/FileUploader';

const Badge = ({ color = 'slate', children }) => {
  const colors = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    slate: 'bg-warm-200/60 text-warm-500 text-warm-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const statusColor = (s) => ({ draft: 'slate', sent: 'blue', accepted: 'green', declined: 'red' }[s] || 'slate');
const statusLabel = (s) => ({ draft: 'Rascunho', sent: 'Enviada', accepted: 'Aceita', declined: 'Declinada' }[s] || s);

export default function PropostasView({
  proposals, projects, allLeads, userId, authUser,
  onProposalCreated, onProposalUpdated, onProposalDeleted,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [linkTo, setLinkTo] = useState('project');

  const [form, setForm] = useState({
    title: '', description: '', project_id: '', lead_id: '', status: 'draft', notes: '',
  });

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        notes: form.notes || undefined,
        ...(linkTo === 'project' && form.project_id ? { project_id: form.project_id } : {}),
        ...(linkTo === 'lead'    && form.lead_id    ? { lead_id: form.lead_id }        : {}),
      };
      if (!payload.project_id && !payload.lead_id) {
        alert('Vincule a proposta a um projeto ou a um lead.');
        setSaving(false);
        return;
      }
      const { data, error } = await createProposal(userId, payload);
      if (error) throw error;
      // Enrich with relationships so UI can render without refetch
      const enriched = {
        ...data,
        media_files: [],
        project: projects.find(p => p.id === data.project_id) || null,
        lead: allLeads.find(l => l.id === data.lead_id) || null,
      };
      if (onProposalCreated) onProposalCreated(enriched);
      setIsModalOpen(false);
      setForm({ title: '', description: '', project_id: '', lead_id: '', status: 'draft', notes: '' });
    } catch (err) {
      alert('Erro ao criar proposta: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (proposal, newStatus) => {
    const { data, error } = await updateProposal(proposal.id, { status: newStatus });
    if (!error && onProposalUpdated) onProposalUpdated({ ...proposal, status: newStatus });
  };

  const handleDelete = async (proposal) => {
    if (!window.confirm(`Excluir proposta "${proposal.title}"?`)) return;
    await deleteProposal(proposal.id);
    if (onProposalDeleted) onProposalDeleted(proposal.id);
  };

  // Group proposals by project, then ungrouped (lead-only)
  const byProject = {};
  const ungrouped = [];

  proposals.forEach(p => {
    if (p.project_id) {
      if (!byProject[p.project_id]) byProject[p.project_id] = [];
      byProject[p.project_id].push(p);
    } else {
      ungrouped.push(p);
    }
  });

  const ProposalCard = ({ proposal }) => {
    const isExpanded = expandedId === proposal.id;
    const files = proposal.media_files || [];

    return (
      <div className="bg-warm-50 rounded-xl border border-warm-300/60 shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-warm-200/50  transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText size={16} className="text-warm-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{proposal.title}</p>
              <p className="text-[10px] text-warm-500 mt-0.5">
                {new Date(proposal.created_at).toLocaleDateString('pt-BR')} · {files.length} arquivo{files.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <select
              value={proposal.status}
              onClick={e => e.stopPropagation()}
              onChange={e => handleStatusChange(proposal, e.target.value)}
              className="text-[10px] border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-1 bg-transparent font-bold cursor-pointer"
            >
              {['draft', 'sent', 'accepted', 'declined'].map(s => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <Badge color={statusColor(proposal.status)}>{statusLabel(proposal.status)}</Badge>
            <button onClick={e => { e.stopPropagation(); handleDelete(proposal); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
              <Trash2 size={13} className="text-red-400" />
            </button>
            {isExpanded ? <ChevronUp size={16} className="text-warm-500" /> : <ChevronDown size={16} className="text-warm-500" />}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-warm-200 dark:border-warm-800 p-4 space-y-4">
            {proposal.description && (
              <p className="text-xs text-warm-500 dark:text-warm-600">{proposal.description}</p>
            )}
            {proposal.notes && (
              <p className="text-xs text-warm-500 italic">{proposal.notes}</p>
            )}
            <FileUploader
              userId={userId}
              authUserId={authUser?.id}
              folder="proposals"
              entityId={proposal.id}
              existingFiles={files}
              onFileAdded={(file) => {
                if (onProposalUpdated) {
                  onProposalUpdated({ ...proposal, media_files: [...files, file] });
                }
              }}
              onFileDeleted={(fileId) => {
                if (onProposalUpdated) {
                  onProposalUpdated({ ...proposal, media_files: files.filter(f => f.id !== fileId) });
                }
              }}
              compact
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Propostas Comerciais</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-warm-900 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} /> Nova Proposta
        </button>
      </div>

      {/* Empty state */}
      {proposals.length === 0 && (
        <div className="text-center py-20">
          <FileText className="mx-auto text-warm-600 mb-3" size={40} />
          <p className="text-warm-500 italic">Nenhuma proposta cadastrada.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-4 text-sm text-blue-600 font-bold hover:underline">
            Criar primeira proposta →
          </button>
        </div>
      )}

      {/* Grouped by project */}
      {Object.entries(byProject).map(([projectId, projectProposals]) => {
        const project = projectProposals[0]?.project || projects.find(p => p.id === projectId);
        return (
          <div key={projectId} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-warm-800">
                {project?.title || 'Projeto'}
              </h3>
              {project?.client?.name && (
                <span className="text-[10px] text-warm-500 font-medium">({project.client.name})</span>
              )}
              <div className="flex-1 h-px bg-warm-200/60" />
              <span className="text-[10px] text-warm-500 font-bold">{projectProposals.length} proposta{projectProposals.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {projectProposals.map(p => <ProposalCard key={p.id} proposal={p} />)}
            </div>
          </div>
        );
      })}

      {/* Ungrouped (lead-only) */}
      {ungrouped.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-warm-500">Sem Projeto Vinculado</h3>
            <div className="flex-1 h-px bg-warm-200/60" />
          </div>
          <div className="space-y-2">
            {ungrouped.map(p => <ProposalCard key={p.id} proposal={p} />)}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-warm-50 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-warm-300/60">
              <h3 className="font-black text-lg">Nova Proposta Comercial</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Título *</label>
                <input type="text" className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ex: Proposta de Desenvolvimento Web" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-2">Vincular a</label>
                <div className="flex gap-3 mb-3">
                  {[['project', 'Projeto'], ['lead', 'Lead']].map(([val, lbl]) => (
                    <button key={val} onClick={() => setLinkTo(val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${linkTo === val ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'border-warm-300/60 text-warm-500'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
                {linkTo === 'project' ? (
                  <select className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                    <option value="">Selecione um projeto</option>
                    {projects.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.title} — {p.client?.name}</option>)}
                  </select>
                ) : (
                  <select className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}>
                    <option value="">Selecione um lead</option>
                    {allLeads.filter(l => l.status !== 'lost').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Descrição</label>
                <textarea className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 h-20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Status</label>
                  <select className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['draft', 'sent', 'accepted', 'declined'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Observações</label>
                <textarea className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 h-16" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="p-6 border-t border-warm-300/60 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-warm-400 text-warm-600 rounded-xl text-sm font-bold hover:bg-warm-200/50 transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.title} className="px-4 py-2 bg-blue-600 text-warm-900 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Criar Proposta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
