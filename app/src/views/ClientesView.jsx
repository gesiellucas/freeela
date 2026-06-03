import React, { useState, useEffect } from 'react';
import {
  Users, Building2, Mail, Phone, MapPin, Globe, CreditCard,
  Briefcase, Edit2, Trash2, X, ChevronRight, ArrowRight,
  ExternalLink, User, Search, AlertCircle, Loader2, Check, Hash, Plus,
} from 'lucide-react';

const Badge = ({ color = 'slate', children }) => {
  const colors = {
    green:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
    blue:   'bg-blue-50 text-blue-600 border border-blue-100',
    purple: 'bg-violet-50 text-violet-700 border border-violet-100',
    yellow: 'bg-amber-50 text-amber-700 border border-amber-100',
    red:    'bg-red-50 text-red-600 border border-red-100',
    slate:  'bg-warm-200 text-warm-500 border border-warm-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const stepLabel = (step) => {
  const map = {
    initial_contact: 'Contato Inicial',
    understanding: 'Briefing',
    proposal: 'Proposta',
    contract: 'Contrato',
    development: 'Desenvolvimento',
    payment: 'Pagamento',
    finalization: 'Finalização',
  };
  return map[step] || step;
};

const projectStatusColor = (status) => ({ active: 'green', archived: 'slate', declined: 'red' }[status] || 'slate');
const projectStatusLabel = (status) => ({ active: 'Ativo', archived: 'Arquivado', declined: 'Declinado' }[status] || status);

const InfoRow = ({ icon: Icon, label, value, mono = false, link = false }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400">{label}</p>
    {link && value ? (
      <a
        href={value.startsWith('http') ? value : `https://${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-brand-500 hover:underline flex items-center gap-1"
      >
        {value} <ExternalLink size={10} />
      </a>
    ) : (
      <p className={`text-sm text-warm-900 ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-warm-400 italic">Não informado</span>}
      </p>
    )}
  </div>
);

const ContactRow = ({ icon: Icon, label, value, href, external = false }) => (
  <div className="flex items-center gap-3 p-3 bg-warm-100/60 rounded-xl border border-warm-200/40">
    <div className="w-8 h-8 rounded-lg bg-warm-200 flex items-center justify-center flex-shrink-0">
      {Icon && <Icon size={14} className="text-warm-500" />}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400">{label}</p>
      {value ? (
        href ? (
          <a
            href={external && !href.startsWith('http') ? `https://${href}` : href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="text-sm text-brand-500 hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-warm-900">{value}</p>
        )
      ) : (
        <p className="text-sm text-warm-400 italic">Não informado</p>
      )}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, type = 'text', placeholder = '', colSpan = false }) => (
  <div className={colSpan ? 'col-span-2' : ''}>
    <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all"
    />
  </div>
);

const EMPTY_CLIENT_FORM = {
  name: '', email: '', phone: '', company: '', website: '',
  cpf_cnpj: '', contact_person: '', contact_position: '',
  address: '', city: '', state: '', zip_code: '', country: 'Brasil', notes: '',
};

export default function ClientesView({
  clients,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onViewProject,
  initialClient,
}) {
  const [selectedClient, setSelectedClient] = useState(initialClient || null);
  const [activeDetailTab, setActiveDetailTab] = useState('dados');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [createForm, setCreateForm] = useState(EMPTY_CLIENT_FORM);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialClient) {
      setSelectedClient(initialClient);
      setActiveDetailTab('dados');
    }
  }, [initialClient?.id]);

  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const selectClient = (client) => {
    setSelectedClient(client);
    setActiveDetailTab('dados');
  };

  const openEdit = () => {
    if (!selectedClient) return;
    setEditForm({
      name: selectedClient.name || '',
      email: selectedClient.email || '',
      phone: selectedClient.phone || '',
      company: selectedClient.company || '',
      website: selectedClient.website || selectedClient.metadata?.website || '',
      address: selectedClient.address || '',
      city: selectedClient.city || '',
      state: selectedClient.state || '',
      zip_code: selectedClient.zip_code || '',
      country: selectedClient.country || 'Brasil',
      cpf_cnpj: selectedClient.cpf_cnpj || '',
      contact_person: selectedClient.contact_person || '',
      contact_position: selectedClient.contact_position || '',
      notes: selectedClient.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const setField = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));
  const setCreateField = (key) => (e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await onCreateClient(createForm);
      if (error) {
        alert('Erro ao criar cliente: ' + (error.message || error));
        return;
      }
      if (data) {
        setSelectedClient(data);
        setActiveDetailTab('dados');
      }
      setIsCreateModalOpen(false);
      setCreateForm(EMPTY_CLIENT_FORM);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      const { data, error } = await onUpdateClient(selectedClient.id, editForm);
      if (!error) {
        const updated = data ? { ...selectedClient, ...data } : { ...selectedClient, ...editForm };
        setSelectedClient(updated);
      }
      setIsEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    await onDeleteClient(selectedClient.id);
    setSelectedClient(null);
    setIsDeleteOpen(false);
  };

  const totalRevenue = clients.reduce(
    (sum, c) => sum + (c.projects || []).reduce((s, p) => s + (p.value || 0), 0),
    0
  );
  const activeProjects = clients.reduce(
    (sum, c) => sum + (c.projects || []).filter((p) => p.status === 'active').length,
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-warm-900 tracking-tight">Clientes</h2>
          <p className="text-sm text-warm-500 mt-0.5">Gerencie sua base de clientes</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-warm-900 rounded-xl text-sm font-semibold hover:bg-brand-400 transition-colors shadow-sm"
        >
          <Plus size={15} /> Novo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Clientes', value: clients.length, mono: false },
          { label: 'Projetos Ativos', value: activeProjects, mono: false },
          { label: 'Receita Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR')}`, mono: true },
        ].map((stat) => (
          <div key={stat.label} className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-warm-500 mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold text-warm-900 ${stat.mono ? 'font-mono' : 'tabular-nums'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div className="flex gap-6">
        {/* Client list */}
        <div className={`${selectedClient ? 'w-72 flex-shrink-0' : 'w-full'}`}>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-500" size={14} />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-warm-50 border border-warm-300 rounded-xl py-2.5 pl-9 pr-4 text-sm text-warm-600 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-400 transition-all"
            />
          </div>

          <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card overflow-hidden">
            {/* Full table — no client selected */}
            {!selectedClient && (
              <table className="w-full text-left">
                <thead className="bg-warm-200/40 text-[10px] font-bold uppercase tracking-widest text-warm-500 border-b border-warm-300/60">
                  <tr>
                    <th className="px-6 py-3.5">Cliente / Empresa</th>
                    <th className="px-6 py-3.5">Contato</th>
                    <th className="px-6 py-3.5 text-center">Projetos</th>
                    <th className="px-6 py-3.5 font-mono">Receita</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200/60">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-warm-200 flex items-center justify-center">
                            <Users className="text-warm-600" size={20} />
                          </div>
                          <p className="text-warm-500 text-sm">
                            {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
                          </p>
                          {!searchQuery && (
                            <p className="text-warm-400 text-xs">
                              Clientes são criados automaticamente ao converter um lead em projeto
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => {
                      const clientRevenue = (client.projects || []).reduce((s, p) => s + (p.value || 0), 0);
                      const activeCount = (client.projects || []).filter((p) => p.status === 'active').length;
                      return (
                        <tr
                          key={client.id}
                          onClick={() => selectClient(client)}
                          className="hover:bg-warm-100/80 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
                                {(client.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-warm-900">{client.name}</p>
                                <p className="text-[11px] text-warm-500 mt-0.5">{client.company || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-warm-600">{client.email}</p>
                            <p className="text-[11px] text-warm-400 mt-0.5">{client.phone || '—'}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-sm font-bold text-warm-900">{(client.projects || []).length}</span>
                              {activeCount > 0 && (
                                <span className="text-[10px] text-emerald-600 font-semibold">
                                  {activeCount} ativo{activeCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono font-semibold text-warm-900">
                            R$ {clientRevenue.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); selectClient(client); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-200 text-warm-700 rounded-lg text-[11px] font-semibold hover:bg-warm-300 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Ver mais <ChevronRight size={11} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* Compact list — client selected */}
            {selectedClient && (
              <div className="divide-y divide-warm-200/60">
                {filteredClients.length === 0 ? (
                  <div className="px-4 py-8 text-center text-warm-500 text-sm">Nenhum cliente encontrado</div>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-warm-100
                        ${selectedClient?.id === client.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${selectedClient?.id === client.id ? 'bg-brand-500 text-warm-900' : 'bg-brand-100 text-brand-700'}`}
                      >
                        {(client.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-warm-900 truncate">{client.name}</p>
                        <p className="text-[11px] text-warm-500 truncate">{client.company || client.email}</p>
                      </div>
                      <span className="text-[10px] text-warm-400 flex-shrink-0">
                        {(client.projects || []).length}p
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedClient && (
          <div className="flex-1 min-w-0">
            <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card overflow-hidden">
              {/* Detail header */}
              <div className="px-6 py-5 border-b border-warm-300/60 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-lg font-bold text-brand-700">
                    {(selectedClient.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-warm-900 tracking-tight">{selectedClient.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      {selectedClient.company && (
                        <span className="text-sm text-warm-500 flex items-center gap-1">
                          <Building2 size={12} /> {selectedClient.company}
                        </span>
                      )}
                      {selectedClient.email && (
                        <span className="text-sm text-warm-400 flex items-center gap-1">
                          <Mail size={12} /> {selectedClient.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openEdit}
                    className="flex items-center gap-1.5 px-3 py-2 bg-warm-200 text-warm-700 rounded-xl text-xs font-semibold hover:bg-warm-300 transition-colors"
                  >
                    <Edit2 size={13} /> Editar
                  </button>
                  <button
                    onClick={() => setIsDeleteOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors border border-red-100"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="p-2 text-warm-500 hover:text-warm-800 hover:bg-warm-200 rounded-xl transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-warm-300/60 px-4 bg-warm-50">
                {[
                  { id: 'dados', label: 'Dados Gerais' },
                  { id: 'projetos', label: `Projetos (${(selectedClient.projects || []).length})` },
                  { id: 'contato', label: 'Contato' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id)}
                    className={`py-3 px-4 text-sm font-medium transition-all border-b-2
                      ${activeDetailTab === tab.id
                        ? 'border-brand-500 text-warm-900'
                        : 'border-transparent text-warm-500 hover:text-warm-700'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6">

                {/* === DADOS GERAIS === */}
                {activeDetailTab === 'dados' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <InfoRow icon={Building2} label="Empresa" value={selectedClient.company} />
                      <InfoRow icon={CreditCard} label="CPF / CNPJ" value={selectedClient.cpf_cnpj} mono />
                      <InfoRow
                        icon={Globe}
                        label="Website / URL"
                        value={selectedClient.website || selectedClient.metadata?.website}
                        link
                      />
                      <InfoRow icon={Hash} label="Ins. Estadual / Tax ID" value={selectedClient.tax_id} mono />
                    </div>

                    <div className="border-t border-warm-200/60 pt-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-4">Endereço</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div className="col-span-2">
                          <InfoRow icon={MapPin} label="Logradouro" value={selectedClient.address} />
                        </div>
                        <InfoRow icon={null} label="Cidade" value={selectedClient.city} />
                        <InfoRow icon={null} label="Estado" value={selectedClient.state} />
                        <InfoRow icon={null} label="CEP" value={selectedClient.zip_code} mono />
                        <InfoRow icon={null} label="País" value={selectedClient.country || 'Brasil'} />
                      </div>
                    </div>

                    {selectedClient.notes && (
                      <div className="border-t border-warm-200/60 pt-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-2">Observações</p>
                        <p className="text-sm text-warm-600 bg-warm-100/80 p-3 rounded-xl border border-warm-200/60 italic">
                          {selectedClient.notes}
                        </p>
                      </div>
                    )}

                    <p className="text-[11px] text-warm-400 pt-1">
                      Cliente desde{' '}
                      {new Date(selectedClient.created_at).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {/* === PROJETOS === */}
                {activeDetailTab === 'projetos' && (
                  <div className="space-y-3">
                    {(selectedClient.projects || []).length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-10 h-10 rounded-xl bg-warm-200 flex items-center justify-center mx-auto mb-3">
                          <Briefcase className="text-warm-500" size={18} />
                        </div>
                        <p className="text-warm-500 text-sm">Nenhum projeto para este cliente</p>
                      </div>
                    ) : (
                      (selectedClient.projects || []).map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 bg-warm-100/60 rounded-xl border border-warm-200/60 hover:border-warm-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-warm-200 flex items-center justify-center">
                              <Briefcase size={14} className="text-warm-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-warm-900">{project.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge color={projectStatusColor(project.status)}>
                                  {projectStatusLabel(project.status)}
                                </Badge>
                                <span className="text-[11px] text-warm-400">{stepLabel(project.current_step)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-mono font-semibold text-warm-900">
                                R$ {(project.value || 0).toLocaleString('pt-BR')}
                              </p>
                              <p className="text-[11px] text-warm-400">
                                {new Date(project.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            {onViewProject && (
                              <button
                                onClick={() => onViewProject(project)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-warm-900 rounded-lg text-[11px] font-semibold hover:bg-brand-400 transition-colors"
                              >
                                Ver <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* === CONTATO === */}
                {activeDetailTab === 'contato' && (
                  <div className="space-y-3">
                    <ContactRow
                      icon={Mail}
                      label="E-mail"
                      value={selectedClient.email}
                      href={`mailto:${selectedClient.email}`}
                    />
                    <ContactRow
                      icon={Phone}
                      label="Telefone"
                      value={selectedClient.phone}
                      href={`tel:${selectedClient.phone}`}
                    />
                    <ContactRow
                      icon={User}
                      label="Pessoa de Contato"
                      value={selectedClient.contact_person}
                    />
                    <ContactRow
                      icon={Briefcase}
                      label="Cargo / Função"
                      value={selectedClient.contact_position}
                    />
                    <ContactRow
                      icon={Globe}
                      label="Website / URL"
                      value={selectedClient.website || selectedClient.metadata?.website}
                      href={selectedClient.website || selectedClient.metadata?.website}
                      external
                    />

                    <div className="pt-3">
                      <button
                        onClick={openEdit}
                        className="flex items-center gap-2 px-4 py-2.5 bg-warm-200 text-warm-700 rounded-xl text-sm font-semibold hover:bg-warm-300 transition-colors"
                      >
                        <Edit2 size={14} /> Atualizar informações de contato
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-elevated w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-warm-300/60 flex justify-between items-center">
              <h3 className="font-semibold text-warm-900 tracking-tight">Novo Cliente</h3>
              <button
                onClick={() => { setIsCreateModalOpen(false); setCreateForm(EMPTY_CLIENT_FORM); }}
                className="text-warm-500 hover:text-warm-800 p-1 rounded-lg hover:bg-warm-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">Informações Básicas</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Nome <span className="text-red-400">*</span></label>
                      <input required type="text" value={createForm.name} onChange={setCreateField('name')} placeholder="Nome do cliente" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Empresa</label>
                      <input type="text" value={createForm.company} onChange={setCreateField('company')} placeholder="Nome da empresa" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">CPF / CNPJ</label>
                      <input type="text" value={createForm.cpf_cnpj} onChange={setCreateField('cpf_cnpj')} placeholder="00.000.000/0001-00" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Website / URL</label>
                      <input type="url" value={createForm.website} onChange={setCreateField('website')} placeholder="https://empresa.com" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">Contato</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">E-mail <span className="text-red-400">*</span></label>
                      <input required type="email" value={createForm.email} onChange={setCreateField('email')} placeholder="email@empresa.com" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Telefone</label>
                      <input type="text" value={createForm.phone} onChange={setCreateField('phone')} placeholder="(11) 99999-9999" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Pessoa de Contato</label>
                      <input type="text" value={createForm.contact_person} onChange={setCreateField('contact_person')} placeholder="Nome do responsável" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Cargo / Função</label>
                      <input type="text" value={createForm.contact_position} onChange={setCreateField('contact_position')} placeholder="Ex: CEO, Diretor" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">Endereço</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Logradouro</label>
                      <input type="text" value={createForm.address} onChange={setCreateField('address')} placeholder="Rua, Av., número" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Cidade</label>
                      <input type="text" value={createForm.city} onChange={setCreateField('city')} placeholder="São Paulo" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">Estado</label>
                      <input type="text" value={createForm.state} onChange={setCreateField('state')} placeholder="SP" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">CEP</label>
                      <input type="text" value={createForm.zip_code} onChange={setCreateField('zip_code')} placeholder="00000-000" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">País</label>
                      <input type="text" value={createForm.country} onChange={setCreateField('country')} placeholder="Brasil" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">Observações</p>
                  <textarea
                    value={createForm.notes}
                    onChange={setCreateField('notes')}
                    className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all h-20 resize-none"
                    placeholder="Notas adicionais sobre o cliente..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-warm-300/60 flex justify-end gap-3 bg-warm-100/50">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setCreateForm(EMPTY_CLIENT_FORM); }}
                  className="px-4 py-2 rounded-xl font-medium text-sm border border-warm-400 text-warm-600 hover:bg-warm-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl font-semibold text-sm bg-brand-500 text-warm-900 hover:bg-brand-400 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {creating ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-elevated w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-warm-300/60 flex justify-between items-center">
              <h3 className="font-semibold text-warm-900 tracking-tight">Editar Cliente</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-warm-500 hover:text-warm-800 p-1 rounded-lg hover:bg-warm-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
              {/* Informações Básicas */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">
                  Informações Básicas
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Nome" value={editForm.name} onChange={setField('name')} placeholder="Nome do cliente" />
                  <InputField label="Empresa" value={editForm.company} onChange={setField('company')} placeholder="Nome da empresa" />
                  <InputField label="CPF / CNPJ" value={editForm.cpf_cnpj} onChange={setField('cpf_cnpj')} placeholder="00.000.000/0001-00" />
                  <InputField label="Website / URL" value={editForm.website} onChange={setField('website')} placeholder="https://empresa.com" type="url" />
                </div>
              </div>

              {/* Contato */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">Contato</p>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="E-mail" value={editForm.email} onChange={setField('email')} type="email" placeholder="email@empresa.com" />
                  <InputField label="Telefone" value={editForm.phone} onChange={setField('phone')} placeholder="(11) 99999-9999" />
                  <InputField label="Pessoa de Contato" value={editForm.contact_person} onChange={setField('contact_person')} placeholder="Nome do responsável" />
                  <InputField label="Cargo / Função" value={editForm.contact_position} onChange={setField('contact_position')} placeholder="Ex: Diretor, CEO" />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">Endereço</p>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Logradouro" value={editForm.address} onChange={setField('address')} placeholder="Rua, Av., número" colSpan />
                  <InputField label="Cidade" value={editForm.city} onChange={setField('city')} placeholder="São Paulo" />
                  <InputField label="Estado" value={editForm.state} onChange={setField('state')} placeholder="SP" />
                  <InputField label="CEP" value={editForm.zip_code} onChange={setField('zip_code')} placeholder="00000-000" />
                  <InputField label="País" value={editForm.country} onChange={setField('country')} placeholder="Brasil" />
                </div>
              </div>

              {/* Observações */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400 mb-3">Observações</p>
                <textarea
                  value={editForm.notes}
                  onChange={setField('notes')}
                  className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-2.5 text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all h-24 resize-none"
                  placeholder="Notas adicionais sobre o cliente..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-warm-300/60 flex justify-end gap-3 bg-warm-100/50">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl font-medium text-sm border border-warm-400 text-warm-600 hover:bg-warm-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl font-semibold text-sm bg-brand-500 text-warm-900 hover:bg-brand-400 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-elevated w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-warm-300/60 flex justify-between items-center">
              <h3 className="font-semibold text-warm-900">Excluir Cliente</h3>
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="text-warm-500 hover:text-warm-800 p-1 rounded-lg hover:bg-warm-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Esta ação é irreversível</p>
                    <p className="text-xs text-red-600 mt-1">
                      O cliente <strong>{selectedClient?.name}</strong> e todos os seus dados serão excluídos permanentemente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-warm-300/60 flex justify-end gap-3 bg-warm-100/50">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 rounded-xl font-medium text-sm border border-warm-400 text-warm-600 hover:bg-warm-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all"
              >
                Excluir Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
