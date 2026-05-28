import React, { useState } from 'react';
import { Plus, FileSignature, Trash2, Loader2, CheckCircle2, X, Paperclip, Pencil, Save, MapPin, Mail, Phone, Building2, User } from 'lucide-react';
import { createContract, updateContract, deleteContract, createAddendum, supabase } from '../lib/supabase';
import FileUploader from '../components/ui/FileUploader';

const Badge = ({ color = 'slate', children }) => {
  const colors = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    slate: 'bg-warm-200/60 text-warm-500 ',
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

  const [isAddendumModalOpen, setIsAddendumModalOpen] = useState(false);
  const [addendumForm, setAddendumForm] = useState({
    title: '',
    total_value: '',
    estimated_hours: '',
    description: '',
    status: 'draft',
    effective_date: '',
    expiry_date: '',
    notes: ''
  });
  const [scopeVersions, setScopeVersions] = useState([]);

  const [form, setForm] = useState({
    title: '', project_id: '', description: '', status: 'draft',
    effective_date: '', expiry_date: '', notes: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', description: '', effective_date: '', expiry_date: '', notes: '',
    client_name: '', client_email: '', client_phone: '', client_company: '',
    client_address: '', client_city: '', client_state: '', client_zip_code: '',
    client_cpf_cnpj: '', client_contact_person: '', client_contact_position: '',
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

  const handleStartEdit = () => {
    const client = syncedSelected.project?.client || {};
    setEditForm({
      title: syncedSelected.title || '',
      description: syncedSelected.description || '',
      effective_date: syncedSelected.effective_date || '',
      expiry_date: syncedSelected.expiry_date || '',
      notes: syncedSelected.notes || '',
      client_name: client.name || '',
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_company: client.company || '',
      client_address: client.address || '',
      client_city: client.city || '',
      client_state: client.state || '',
      client_zip_code: client.zip_code || '',
      client_cpf_cnpj: client.cpf_cnpj || '',
      client_contact_person: client.contact_person || '',
      client_contact_position: client.contact_position || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title) return;
    setSaving(true);
    try {
      // 1. Update contract
      const { error: contractError } = await updateContract(syncedSelected.id, {
        title: editForm.title,
        description: editForm.description || null,
        effective_date: editForm.effective_date || null,
        expiry_date: editForm.expiry_date || null,
        notes: editForm.notes || null,
      });
      if (contractError) throw contractError;

      // 2. Update client if exists
      const clientId = syncedSelected.project?.client_id || syncedSelected.project?.client?.id;
      if (clientId) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({
            name: editForm.client_name,
            email: editForm.client_email,
            phone: editForm.client_phone || null,
            company: editForm.client_company || null,
            address: editForm.client_address || null,
            city: editForm.client_city || null,
            state: editForm.client_state || null,
            zip_code: editForm.client_zip_code || null,
            cpf_cnpj: editForm.client_cpf_cnpj || null,
            contact_person: editForm.client_contact_person || null,
            contact_position: editForm.client_contact_position || null,
          })
          .eq('id', clientId);
        if (clientError) throw clientError;
      }

      // 3. Local update object
      const updatedContract = {
        ...syncedSelected,
        title: editForm.title,
        description: editForm.description || null,
        effective_date: editForm.effective_date || null,
        expiry_date: editForm.expiry_date || null,
        notes: editForm.notes || null,
        project: {
          ...syncedSelected.project,
          client: {
            ...(syncedSelected.project?.client || {}),
            name: editForm.client_name,
            email: editForm.client_email,
            phone: editForm.client_phone || null,
            company: editForm.client_company || null,
            address: editForm.client_address || null,
            city: editForm.client_city || null,
            state: editForm.client_state || null,
            zip_code: editForm.client_zip_code || null,
            cpf_cnpj: editForm.client_cpf_cnpj || null,
            contact_person: editForm.client_contact_person || null,
            contact_position: editForm.client_contact_position || null,
          }
        }
      };

      if (onContractUpdated) {
        onContractUpdated(updatedContract);
      }
      setSelectedContract(updatedContract);
      setIsEditing(false);
    } catch (err) {
      alert('Erro ao salvar edições: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(() => {
    setIsEditing(false);
  }, [selectedContract?.id]);

  // Sincronizar selectedContract quando contracts muda externamente (ex: file added)
  const syncedSelected = selectedContract
    ? (contracts.find(c => c.id === selectedContract.id) || selectedContract)
    : null;

  // Buscar versões de escopo para o projeto selecionado
  React.useEffect(() => {
    if (syncedSelected?.project_id) {
      supabase
        .from('scope_versions')
        .select('*')
        .eq('project_id', syncedSelected.project_id)
        .order('version_number', { ascending: true })
        .then(({ data }) => {
          if (data) setScopeVersions(data);
        });
    } else {
      setScopeVersions([]);
    }
  }, [syncedSelected?.project_id, contracts]);

  const handleCreateAddendum = async () => {
    if (!addendumForm.title || !syncedSelected?.project_id) return;
    setSaving(true);
    try {
      const { data, error } = await createAddendum(userId, {
        title: addendumForm.title,
        project_id: syncedSelected.project_id,
        description: addendumForm.description || undefined,
        status: addendumForm.status,
        total_value: parseFloat(addendumForm.total_value) || 0,
        estimated_hours: parseFloat(addendumForm.estimated_hours) || undefined,
        effective_date: addendumForm.effective_date || undefined,
        expiry_date: addendumForm.expiry_date || undefined,
        notes: addendumForm.notes || undefined,
      });

      if (error) throw error;

      const project = projects.find(p => p.id === syncedSelected.project_id);
      const enriched = { ...data, media_files: [], project };

      if (onContractCreated) onContractCreated(enriched);
      setSelectedContract(enriched);
      
      setIsAddendumModalOpen(false);
      setAddendumForm({
        title: '',
        total_value: '',
        estimated_hours: '',
        description: '',
        status: 'draft',
        effective_date: '',
        expiry_date: '',
        notes: ''
      });

      if (addendumForm.status === 'signed') {
        alert('Aditivo assinado e nova versão da EAP gerada com sucesso!');
      }
    } catch (err) {
      alert('Erro ao criar aditivo: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-warm-900 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      {/* Layout principal */}
      {contracts.length === 0 ? (
        <div className="text-center py-20">
          <FileSignature className="mx-auto text-warm-600 mb-3" size={40} />
          <p className="text-warm-500 italic">Nenhum contrato cadastrado.</p>
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
                    <h3 className="text-xs font-black text-warm-500 dark:text-warm-500 truncate">
                      {project?.title || 'Projeto'}
                    </h3>
                    {project?.client?.name && (
                      <span className="text-[10px] text-warm-500">({project.client.name})</span>
                    )}
                    <div className="flex-1 h-px bg-warm-200/60" />
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
                            ? 'border-blue-400 bg-blue-900/20 border-blue-700'
                            : 'border-warm-300/60 bg-warm-50 hover:border-warm-400 hover:bg-warm-200/50'
                        }`}
                      >
                        <FileSignature size={14} className={isSelected ? 'text-blue-500' : 'text-warm-500'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{c.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge color={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
                            {files.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-warm-500">
                                <Paperclip size={10} /> {files.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(c); }}
                          className="p-1.5 hover:bg-red-900/20 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 flex-shrink-0"
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
              {isEditing ? (
                /* Card de edição das informações do contrato e cliente */
                <div className="bg-warm-50 rounded-xl border border-warm-300/60 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-warm-200/60 pb-3">
                    <div>
                      <h3 className="font-black text-base flex items-center gap-1.5">
                        <FileSignature size={18} className="text-blue-500" />
                        Editar Contrato
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 border border-warm-400 text-warm-500 hover:bg-warm-200/50 rounded-xl text-xs font-bold transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving || !editForm.title}
                        className="px-3 py-1.5 bg-blue-600 text-warm-900 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Salvar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Coluna 1: Dados do Contrato */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-warm-500 border-b border-warm-200 pb-1 flex items-center gap-1">
                        <FileSignature size={12} className="text-blue-500" />
                        Informações do Contrato
                      </h4>
                      <div>
                        <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Título do Contrato *</label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                          placeholder="Ex: Contrato de Prestação de Serviços"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Data Início</label>
                          <input
                            type="date"
                            value={editForm.effective_date}
                            onChange={e => setEditForm({ ...editForm, effective_date: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Validade</label>
                          <input
                            type="date"
                            value={editForm.expiry_date}
                            onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Descrição</label>
                        <textarea
                          value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 h-20 resize-none text-warm-900"
                          placeholder="Breve descrição do escopo..."
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Observações</label>
                        <textarea
                          value={editForm.notes}
                          onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                          className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 h-20 resize-none text-warm-900"
                          placeholder="Notas adicionais sobre o contrato..."
                        />
                      </div>
                    </div>

                    {/* Coluna 2: Dados do Cliente */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-warm-500 border-b border-warm-200 pb-1 flex items-center gap-1">
                        <User size={12} className="text-blue-500" />
                        Contato & Endereço
                      </h4>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="col-span-2">
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Nome do Cliente *</label>
                          <input
                            type="text"
                            value={editForm.client_name}
                            onChange={e => setEditForm({ ...editForm, client_name: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                            placeholder="Nome do cliente"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Empresa</label>
                          <input
                            type="text"
                            value={editForm.client_company}
                            onChange={e => setEditForm({ ...editForm, client_company: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                            placeholder="Empresa Ltda"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">CPF/CNPJ</label>
                          <input
                            type="text"
                            value={editForm.client_cpf_cnpj}
                            onChange={e => setEditForm({ ...editForm, client_cpf_cnpj: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                            placeholder="00.000.000/0001-00"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">E-mail</label>
                          <input
                            type="email"
                            value={editForm.client_email}
                            onChange={e => setEditForm({ ...editForm, client_email: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                            placeholder="email@empresa.com"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Telefone</label>
                          <input
                            type="text"
                            value={editForm.client_phone}
                            onChange={e => setEditForm({ ...editForm, client_phone: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Pessoa de Contato</label>
                          <input
                            type="text"
                            value={editForm.client_contact_person}
                            onChange={e => setEditForm({ ...editForm, client_contact_person: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                            placeholder="Ex: Responsável"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Cargo do Contato</label>
                          <input
                            type="text"
                            value={editForm.client_contact_position}
                            onChange={e => setEditForm({ ...editForm, client_contact_position: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                            placeholder="Ex: Diretor"
                          />
                        </div>
                      </div>

                      <h4 className="text-[10px] font-black uppercase text-warm-500 border-b border-warm-200 pb-1 pt-2 flex items-center gap-1">
                        <MapPin size={12} className="text-blue-500" />
                        Endereço de Faturamento
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Logradouro / Endereço</label>
                          <input
                            type="text"
                            value={editForm.client_address}
                            onChange={e => setEditForm({ ...editForm, client_address: e.target.value })}
                            className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                            placeholder="Rua, Número, Bairro..."
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="col-span-2">
                            <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Cidade</label>
                            <input
                              type="text"
                              value={editForm.client_city}
                              onChange={e => setEditForm({ ...editForm, client_city: e.target.value })}
                              className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                              placeholder="Cidade"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">UF</label>
                            <input
                              type="text"
                              value={editForm.client_state}
                              onChange={e => setEditForm({ ...editForm, client_state: e.target.value })}
                              className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                              placeholder="UF"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">CEP</label>
                            <input
                              type="text"
                              value={editForm.client_zip_code}
                              onChange={e => setEditForm({ ...editForm, client_zip_code: e.target.value })}
                              className="w-full bg-warm-200/60 border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 text-warm-900"
                              placeholder="00000-000"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Card original de visualização de informações do contrato */
                <div className="bg-warm-50 rounded-xl border border-warm-300/60 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-black text-base truncate">{syncedSelected.title}</h3>
                      <p className="text-xs text-warm-500 mt-0.5">
                        {syncedSelected.project?.title || 'Projeto'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={handleStartEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/10"
                        title="Editar contrato"
                      >
                        <Pencil size={12} />
                        Editar Contrato
                      </button>
                      <button
                        onClick={() => setSelectedContract(null)}
                        className="p-1.5 hover:bg-warm-200/60 rounded-lg text-warm-600 hover:text-warm-900 transition-colors"
                      >
                        <X size={16} className="text-warm-500" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-warm-500 mb-1">Status</p>
                      <select
                        value={syncedSelected.status}
                        onChange={e => handleStatusChange(syncedSelected, e.target.value)}
                        className="w-full bg-warm-200/60 border-none rounded-lg px-2 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        {['draft', 'sent', 'signed', 'cancelled'].map(s => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-warm-500 mb-1">Início</p>
                      <p className="text-xs font-medium text-warm-800 py-1.5">
                        {syncedSelected.effective_date
                          ? new Date(syncedSelected.effective_date + 'T00:00:00').toLocaleDateString('pt-BR')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-warm-500 mb-1">Validade</p>
                      <p className="text-xs font-medium text-warm-800 py-1.5">
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
                    <p className="text-xs text-warm-500 dark:text-warm-500 mb-2">{syncedSelected.description}</p>
                  )}
                  {syncedSelected.notes && (
                    <p className="text-xs text-warm-500 italic mb-2">{syncedSelected.notes}</p>
                  )}

                  {/* Detalhes do Cliente */}
                  <div className="border-t border-warm-200/60 pt-4 mt-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase text-warm-500 mb-2.5 flex items-center gap-1.5">
                        <User size={13} className="text-blue-500" />
                        Informações do Cliente
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-warm-700">
                        <div>
                          <span className="font-bold text-warm-500">Nome:</span> {syncedSelected.project?.client?.name || '—'}
                        </div>
                        <div>
                          <span className="font-bold text-warm-500">Empresa:</span> {syncedSelected.project?.client?.company || '—'}
                        </div>
                        <div className="col-span-2">
                          <span className="font-bold text-warm-500">Contato:</span> {syncedSelected.project?.client?.contact_person || '—'} {syncedSelected.project?.client?.contact_position ? ` (${syncedSelected.project.client.contact_position})` : ''}
                        </div>
                        <div>
                          <span className="font-bold text-warm-500">E-mail:</span> {syncedSelected.project?.client?.email || '—'}
                        </div>
                        <div>
                          <span className="font-bold text-warm-500">Telefone:</span> {syncedSelected.project?.client?.phone || '—'}
                        </div>
                        <div>
                          <span className="font-bold text-warm-500">CPF/CNPJ:</span> {syncedSelected.project?.client?.cpf_cnpj || '—'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black uppercase text-warm-500 mb-2.5 flex items-center gap-1.5">
                        <MapPin size={13} className="text-blue-500" />
                        Endereço de Faturamento
                      </h4>
                      <div className="text-xs text-warm-700 space-y-1">
                        <p><span className="font-bold text-warm-500">Endereço:</span> {syncedSelected.project?.client?.address || '—'}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <span className="font-bold text-warm-500">Cidade/UF:</span> {syncedSelected.project?.client?.city ? `${syncedSelected.project.client.city} - ${syncedSelected.project.client.state || ''}` : '—'}
                          </div>
                          <div>
                            <span className="font-bold text-warm-500">CEP:</span> {syncedSelected.project?.client?.zip_code || '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card de Aditivos & Histórico de Escopo */}
              <div className="bg-warm-50 rounded-xl border border-warm-300/60 shadow-sm p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-sm flex items-center gap-2 underline decoration-purple-500 decoration-4 underline-offset-4 uppercase italic">
                    <FileSignature size={14} /> Acordos & Aditivos do Projeto
                  </h3>
                  <button
                    onClick={() => setIsAddendumModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-650 hover:bg-purple-700 text-warm-900 rounded-xl text-xs font-black transition-all shadow-md shadow-purple-500/10"
                  >
                    <Plus size={12} /> Adicionar Aditivo
                  </button>
                </div>

                <div className="space-y-2">
                  {contracts
                    .filter(c => c.project_id === syncedSelected.project_id)
                    .map(c => {
                      const isMainContract = c.commercial_agreement?.type !== 'addendum';
                      const value = c.commercial_agreement?.total_value || 0;
                      const relatedVersion = scopeVersions.find(v => v.commercial_agreement_id === c.commercial_agreement_id);

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (c.id !== syncedSelected.id) {
                              setSelectedContract(c);
                            }
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            c.id === syncedSelected.id
                              ? 'border-purple-400 bg-purple-900/10 dark:bg-purple-900/20 border-purple-700'
                              : 'border-warm-300/60 bg-warm-50 hover:border-warm-400 hover:bg-warm-200/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileSignature size={14} className={isMainContract ? 'text-blue-500' : 'text-purple-500'} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{c.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                                  isMainContract ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {isMainContract ? 'Contrato' : 'Aditivo'}
                                </span>
                                <Badge color={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
                                {relatedVersion && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                    relatedVersion.status === 'active' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                      : 'bg-warm-200 text-warm-500'
                                  }`}>
                                    v{relatedVersion.version_number} ({relatedVersion.status === 'active' ? 'Ativa' : 'Arquivada'})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-xs font-bold font-mono text-warm-900">
                              R$ {value.toLocaleString('pt-BR')}
                            </p>
                            {c.commercial_agreement?.estimated_hours && (
                              <p className="text-[9px] text-warm-500 mt-0.5">
                                {c.commercial_agreement.estimated_hours}h est.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Card de arquivos — estilo checklist */}
              <div className="bg-warm-50 rounded-xl border border-warm-300/60 shadow-sm p-5">
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
          <div className="bg-warm-50 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-warm-300/60 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">Novo Contrato</h3>
                <p className="text-[10px] text-warm-500 mt-0.5">Etapa 1 de 2 — Dados do contrato</p>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="w-2 h-2 rounded-full bg-warm-300 " />
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Título *</label>
                <input type="text" className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ex: Contrato de Prestação de Serviços" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Projeto *</label>
                <select className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">Selecione um projeto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title} — {p.client?.name} ({p.status})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Descrição</label>
                <textarea className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 h-16" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Status</label>
                  <select className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['draft', 'sent', 'signed', 'cancelled'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Data Início</label>
                  <input type="date" className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Validade</label>
                  <input type="date" className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Observações</label>
                <textarea className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 h-16" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="p-6 border-t border-warm-300/60 flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-4 py-2 border border-warm-400 text-warm-500 rounded-xl text-sm font-bold hover:bg-warm-200/50 transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.title || !form.project_id} className="px-4 py-2 bg-blue-600 text-warm-900 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
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
          <div className="bg-warm-50 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-warm-300/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <h3 className="font-black text-lg">Contrato criado!</h3>
                </div>
                <p className="text-[10px] text-warm-500 mt-0.5">Etapa 2 de 2 — Anexar arquivos</p>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-warm-200/40 rounded-xl p-3">
                <p className="text-xs font-bold text-warm-800">{createdContract.title}</p>
                <p className="text-[10px] text-warm-500 mt-0.5">{createdContract.project?.title || 'Projeto'} · {statusLabel(createdContract.status)}</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-2">
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
            <div className="p-6 border-t border-warm-300/60 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 bg-green-600 text-warm-900 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={14} /> Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Criar Aditivo */}
      {isAddendumModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-warm-50 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-warm-300/60 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">Novo Aditivo Contratual</h3>
                <p className="text-[10px] text-warm-500 mt-0.5">
                  Modificação de escopo e valor para: {syncedSelected?.project?.title || 'Projeto'}
                </p>
              </div>
              <button
                onClick={() => setIsAddendumModalOpen(false)}
                className="p-1 hover:bg-warm-200 rounded-lg text-warm-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Título do Aditivo *</label>
                <input
                  type="text"
                  className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Aditivo 01 - Integração com API Externa"
                  value={addendumForm.title}
                  onChange={e => setAddendumForm({ ...addendumForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Valor Adicional (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: 5000.00"
                    value={addendumForm.total_value}
                    onChange={e => setAddendumForm({ ...addendumForm, total_value: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Horas Estimadas (Opcional)</label>
                  <input
                    type="number"
                    className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: 40"
                    value={addendumForm.estimated_hours}
                    onChange={e => setAddendumForm({ ...addendumForm, estimated_hours: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Descrição</label>
                <textarea
                  className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 h-16 resize-none"
                  placeholder="Descrição do escopo do aditivo..."
                  value={addendumForm.description}
                  onChange={e => setAddendumForm({ ...addendumForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Status</label>
                  <select
                    className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500"
                    value={addendumForm.status}
                    onChange={e => setAddendumForm({ ...addendumForm, status: e.target.value })}
                  >
                    {['draft', 'sent', 'signed', 'cancelled'].map(s => (
                      <option key={s} value={s}>{statusLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Data Início</label>
                  <input
                    type="date"
                    className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500"
                    value={addendumForm.effective_date}
                    onChange={e => setAddendumForm({ ...addendumForm, effective_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Data Fim</label>
                  <input
                    type="date"
                    className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500"
                    value={addendumForm.expiry_date}
                    onChange={e => setAddendumForm({ ...addendumForm, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-warm-500 block mb-1">Observações</label>
                <textarea
                  className="w-full bg-warm-200/60 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 h-16 resize-none"
                  placeholder="Observações internas..."
                  value={addendumForm.notes}
                  onChange={e => setAddendumForm({ ...addendumForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="p-6 border-t border-warm-300/60 flex justify-end gap-3">
              <button
                onClick={() => setIsAddendumModalOpen(false)}
                className="px-4 py-2 border border-warm-400 text-warm-500 rounded-xl text-sm font-bold hover:bg-warm-200/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAddendum}
                disabled={saving || !addendumForm.title || !addendumForm.total_value}
                className="px-4 py-2 bg-purple-650 text-warm-900 rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Criar Aditivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
