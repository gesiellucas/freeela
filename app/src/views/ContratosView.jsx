import React, { useState } from 'react';
import { Plus, FileSignature, Trash2, Loader2, CheckCircle2, X, Paperclip } from 'lucide-react';
import { createContract, updateContract, deleteContract } from '../lib/supabase';
import FileUploader from '../components/ui/FileUploader';

const Badge = ({ color = 'slate', children }) => {
  const colors = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const statusColor = (s) => ({ draft: 'slate', sent: 'blue', signed: 'green', cancelled: 'red' }[s] || 'slate');
const statusLabel = (s) => ({ draft: 'Rascunho', sent: 'Enviado', signed: 'Assinado', cancelled: 'Cancelado' }[s] || s);

export default function ContratosView({
  contracts, projects, userId, authUser,
  onContractCreated, onContractUpdated, onContractDeleted,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdContract, setCreatedContract] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);

  const [form, setForm] = useState({
    title: '', project_id: '', description: '', status: 'draft',
    effective_date: '', expiry_date: '', notes: '',
  });

  const handleCreate = async () => {
    if (!form.title || !form.project_id) return;
    setSaving(true);
    try {
      const { data, error } = await createContract(userId, {
        title: form.title,
        project_id: form.project_id,
        description: form.description || undefined,
        status: form.status,
        effective_date: form.effective_date || undefined,
        expiry_date: form.expiry_date || undefined,
        notes: form.notes || undefined,
      });
      if (error) throw error;
      const project = projects.find(p => p.id === form.project_id);
      const enriched = { ...data, media_files: [], project };
      if (onContractCreated) onContractCreated(enriched);
      setCreatedContract(enriched);
      setForm({ title: '', project_id: '', description: '', status: 'draft', effective_date: '', expiry_date: '', notes: '' });
    } catch (err) {
      alert('Erro ao criar contrato: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Após criar, selecionar o contrato para mostrar o painel de arquivos
    if (createdContract) {
      setSelectedContract(createdContract);
    }
    setCreatedContract(null);
  };

  const handleStatusChange = async (contract, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'signed') updates.signed_at = new Date().toISOString();
    await updateContract(contract.id, updates);
    const updated = { ...contract, ...updates };
    if (onContractUpdated) onContractUpdated(updated);
    if (selectedContract?.id === contract.id) setSelectedContract(updated);
  };

  const handleDelete = async (contract) => {
    if (!window.confirm(`Excluir contrato "${contract.title}"?`)) return;
    await deleteContract(contract.id);
    if (onContractDeleted) onContractDeleted(contract.id);
    if (selectedContract?.id === contract.id) setSelectedContract(null);
  };

  // Sincronizar selectedContract quando contracts muda externamente (ex: file added)
  const syncedSelected = selectedContract
    ? (contracts.find(c => c.id === selectedContract.id) || selectedContract)
    : null;

  // Group by project
  const byProject = {};
  contracts.forEach(c => {
    if (!byProject[c.project_id]) byProject[c.project_id] = [];
    byProject[c.project_id].push(c);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Contratos</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      {/* Layout principal */}
      {contracts.length === 0 ? (
        <div className="text-center py-20">
          <FileSignature className="mx-auto text-slate-200 dark:text-slate-700 mb-3" size={40} />
          <p className="text-slate-400 italic">Nenhum contrato cadastrado.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-4 text-sm text-blue-600 font-bold hover:underline">
            Criar primeiro contrato →
          </button>
        </div>
      ) : (
        <div className={`grid gap-6 ${syncedSelected ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>

          {/* Lista de contratos */}
          <div className={`space-y-4 ${syncedSelected ? 'lg:col-span-2' : ''}`}>
            {Object.entries(byProject).map(([projectId, projectContracts]) => {
              const project = projectContracts[0]?.project || projects.find(p => p.id === projectId);
              return (
                <div key={projectId} className="space-y-2">
                  {/* Cabeçalho do projeto */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 truncate">
                      {project?.title || 'Projeto'}
                    </h3>
                    {project?.client?.name && (
                      <span className="text-[10px] text-slate-400">({project.client.name})</span>
                    )}
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  </div>

                  {/* Linhas de contrato */}
                  {projectContracts.map(c => {
                    const files = c.media_files || [];
                    const isSelected = syncedSelected?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedContract(isSelected ? null : c)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <FileSignature size={14} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{c.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge color={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
                            {files.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Paperclip size={10} /> {files.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(c); }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Painel de detalhes + arquivos */}
          {syncedSelected && (
            <div className="lg:col-span-3 space-y-4">
              {/* Card de informações do contrato */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-black text-base truncate">{syncedSelected.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {syncedSelected.project?.title || 'Projeto'} · {syncedSelected.project?.client?.name || ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedContract(null)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex-shrink-0"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Status</p>
                    <select
                      value={syncedSelected.status}
                      onChange={e => handleStatusChange(syncedSelected, e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-lg px-2 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      {['draft', 'sent', 'signed', 'cancelled'].map(s => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Início</p>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 py-1.5">
                      {syncedSelected.effective_date
                        ? new Date(syncedSelected.effective_date + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Validade</p>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 py-1.5">
                      {syncedSelected.expiry_date
                        ? new Date(syncedSelected.expiry_date + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </p>
                  </div>
                </div>

                {syncedSelected.signed_at && (
                  <p className="text-xs text-green-600 font-bold mb-3 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Assinado em: {new Date(syncedSelected.signed_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {syncedSelected.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">{syncedSelected.description}</p>
                )}
                {syncedSelected.notes && (
                  <p className="text-xs text-slate-400 italic">{syncedSelected.notes}</p>
                )}
              </div>

              {/* Card de arquivos — estilo checklist */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <h3 className="font-black text-sm mb-4 flex items-center gap-2 underline decoration-blue-500 decoration-4 underline-offset-4 uppercase italic">
                  <Paperclip size={14} /> Arquivos do Contrato
                </h3>
                <FileUploader
                  userId={userId}
                  authUserId={authUser?.id}
                  folder="contracts"
                  entityId={syncedSelected.id}
                  existingFiles={syncedSelected.media_files || []}
                  onFileAdded={(file) => {
                    const updated = { ...syncedSelected, media_files: [...(syncedSelected.media_files || []), file] };
                    setSelectedContract(updated);
                    if (onContractUpdated) onContractUpdated(updated);
                  }}
                  onFileDeleted={(fileId) => {
                    const updated = { ...syncedSelected, media_files: (syncedSelected.media_files || []).filter(f => f.id !== fileId) };
                    setSelectedContract(updated);
                    if (onContractUpdated) onContractUpdated(updated);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal — Etapa 1: dados do contrato */}
      {isModalOpen && !createdContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">Novo Contrato</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Etapa 1 de 2 — Dados do contrato</p>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Título *</label>
                <input type="text" className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ex: Contrato de Prestação de Serviços" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Projeto *</label>
                <select className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">Selecione um projeto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title} — {p.client?.name} ({p.status})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Descrição</label>
                <textarea className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 h-16" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status</label>
                  <select className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['draft', 'sent', 'signed', 'cancelled'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data Início</label>
                  <input type="date" className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Validade</label>
                  <input type="date" className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Observações</label>
                <textarea className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 h-16" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.title || !form.project_id} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Criar e Anexar Arquivos →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Etapa 2: upload de arquivos após criação */}
      {isModalOpen && createdContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <h3 className="font-black text-lg">Contrato criado!</h3>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Etapa 2 de 2 — Anexar arquivos</p>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{createdContract.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{createdContract.project?.title || 'Projeto'} · {statusLabel(createdContract.status)}</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">
                  Arquivos do Contrato
                </label>
                <FileUploader
                  userId={userId}
                  authUserId={authUser?.id}
                  folder="contracts"
                  entityId={createdContract.id}
                  existingFiles={createdContract.media_files || []}
                  onFileAdded={(file) => {
                    const updated = { ...createdContract, media_files: [...(createdContract.media_files || []), file] };
                    setCreatedContract(updated);
                    if (onContractUpdated) onContractUpdated(updated);
                  }}
                  onFileDeleted={(fileId) => {
                    const updated = { ...createdContract, media_files: (createdContract.media_files || []).filter(f => f.id !== fileId) };
                    setCreatedContract(updated);
                    if (onContractUpdated) onContractUpdated(updated);
                  }}
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={14} /> Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
