"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Briefcase,
  FolderOpen,
  FileText,
  CheckCircle2,
  Plus,
  Calendar,
  DollarSign,
  Search,
  ChevronRight,
  ChevronDown,
  Clock,
  ExternalLink,
  Download,
  Settings,
  MoreVertical,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  Send,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Layers,
  FileSignature,
  LogOut,
  Receipt,
  Building2,
  Archive,
  UploadCloud,
  Music,
  Paperclip,
  LayoutDashboard,
  Timer,
  LayoutGrid,
  Network,
} from 'lucide-react';

// Importar Supabase client e funções
import {
  supabase,
  getCurrentUser,
  getCurrentUserId,
  signIn,
  signUp,
  signOut,
  getLeads,
  getProjects,
  getProjectById,
  createLead,
  convertLeadToProject as convertLeadToProjectAPI,
  createProjectDirectly,
  updateTaskStatus as updateTaskStatusAPI,
  advanceProjectWorkflow,
  createPayment,
declineProposal,
  declineProject as declineProjectAPI,
  archiveProject as archiveProjectAPI,
  deleteProject as deleteProjectAPI,
  getProposals,
  createProposal,
  updateProposal,
  deleteProposal,
  getContracts,
  createContract,
  updateContract,
  deleteContract,
  getFiscalNotes,
  createFiscalNote,
  updateFiscalNote,
  deleteFiscalNote,
  createMediaFile,
  deleteMediaFile,
  uploadFile,
  deleteStorageFile,
  getChecklists,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from '../lib/supabase';

import PainelView from '../views/PainelView';
import LeadsView from '../views/LeadsView';
import ProjetosView from '../views/ProjetosView';
import AreaFiscalView from '../views/AreaFiscalView';
import FinanceiroView from '../views/FinanceiroView';
import PropostasView from '../views/PropostasView';
import ContratosView from '../views/ContratosView';
import PomodoroView from '../views/PomodoroView';
import OverviewView from '../views/OverviewView';
import EapView from '../views/EapView';
import CronogramaView from '../views/CronogramaView';

// --- Constantes e Templates ---


const WORKFLOW_STEPS = [
  { id: 1, label: "Contato Inicial", key: "initial_contact", icon: <Users size={16} />, desc: "Registro do lead e e-mail de boas-vindas" },
  { id: 2, label: "Entender Demanda", key: "understanding", icon: <Calendar size={16} />, desc: "Briefing e alinhamento de expectativas" },
  { id: 3, label: "Propor Soluções", key: "proposal", icon: <FileText size={16} />, desc: "Geração e envio da proposta comercial" },
  { id: 4, label: "Assinar Contrato", key: "contract", icon: <CheckCircle2 size={16} />, desc: "Formalização jurídica do projeto" },
  { id: 5, label: "Desenvolvimento", key: "development", icon: <Briefcase size={16} />, desc: "Execução técnica e acompanhamento" },
  { id: 6, label: "Pagamento", key: "payment", icon: <DollarSign size={16} />, desc: "Faturamento e conciliação financeira" },
  { id: 7, label: "Finalização", key: "finalization", icon: <Download size={16} />, desc: "Entrega final e coleta de feedback" }
];

// Helper para mapear workflow_step para número
const getStepNumber = (stepKey) => {
  const step = WORKFLOW_STEPS.find(s => s.key === stepKey);
  return step ? step.id : 1;
};

// --- Componentes Reutilizáveis ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", icon: Icon, loading = false, disabled = false }) => {
  const variants = {
    primary: "bg-brand-500 text-warm-900 hover:bg-brand-400 font-semibold shadow-sm",
    secondary: "bg-warm-200 text-warm-800 hover:bg-warm-300 border border-warm-400/50",
    outline: "border border-warm-400 text-warm-600 hover:bg-warm-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    ghost: "text-warm-500 hover:bg-warm-200 hover:text-warm-600"
  };

  return (
    <button
      onClick={loading || disabled ? null : onClick}
      disabled={loading || disabled}
      className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : (Icon && <Icon size={16} />)}
      {children}
    </button>
  );
};

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border border-blue-200",
    green: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    yellow: "bg-amber-50 text-amber-600 border border-amber-200",
    purple: "bg-violet-50 text-violet-600 border border-violet-200",
    slate: "bg-warm-200 text-warm-500 border border-warm-400",
    red: "bg-red-50 text-red-600 border border-red-200"
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- Modais ---

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg overflow-hidden shadow-elevated animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-warm-300/60 flex justify-between items-center">
          <h3 className="font-semibold text-warm-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-warm-500 hover:text-warm-800 p-1 rounded-lg hover:bg-warm-200 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-warm-300/60 flex justify-end gap-3 bg-warm-100/50">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
};

// Modal de Login
const LoginModal = ({ isOpen, onLoginSuccess }) => {
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verificar se as credenciais do Supabase estão configuradas
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured = supabaseUrl && supabaseKey;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConfigured) {
      setError('Supabase não configurado. Verifique o arquivo .env');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
      }

      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-warm-100">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(203,144,80,0.06)_0%,_transparent_60%)]" />

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo mark */}
        <img src="/logo.png" alt="Freeela" className="w-7 h-7" />

        <div className="bg-warm-50 border border-warm-300 rounded-2xl p-8 shadow-elevated">
          {!isConfigured && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-6 text-xs">
              <p className="font-semibold mb-2">Supabase não configurado</p>
              <p className="mb-2 text-amber-600">Crie um arquivo <code className="bg-amber-100 px-1 rounded font-mono">.env</code> na pasta <code className="bg-amber-100 px-1 rounded font-mono">app/</code> com:</p>
              <pre className="bg-amber-100 p-2 rounded text-[10px] overflow-x-auto font-mono text-amber-700">
                VITE_SUPABASE_URL=https://seu-projeto.supabase.co{'\n'}VITE_SUPABASE_ANON_KEY=sua-anon-key
              </pre>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider block mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-warm-200 border border-warm-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-3 text-sm text-warm-900 placeholder-warm-500 outline-none transition-all"
                  placeholder="João Silva"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-warm-200 border border-warm-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-3 text-sm text-warm-900 placeholder-warm-500 outline-none transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider block mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-warm-200 border border-warm-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-3 text-sm text-warm-900 placeholder-warm-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <Button variant="primary" className="w-full py-3 text-sm font-semibold" loading={loading}>
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-warm-500 hover:text-brand-400 transition-colors"
              >
                {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tenho uma conta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- App Principal ---

export default function App() {
  // Authentication State
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data State
  const [activeTab, setActiveTab] = useState('painel');
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [projects, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [fiscalNotes, setFiscalNotes] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [comercialOpen, setComercialOpen] = useState(true);
  const [planejamentoOpen, setPlanejamentoOpen] = useState(true);
  const [leadsFilter, setLeadsFilter] = useState('active');
  const [projectsFilter, setProjectsFilter] = useState('active');

  // UI States
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [leadToDecline, setLeadToDecline] = useState(null);
  const [isDeclineProjectModalOpen, setIsDeclineProjectModalOpen] = useState(false);
  const [projectToDecline, setProjectToDecline] = useState(null);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Form States
  const [newLead, setNewLead] = useState({ name: '', email: '', demand: '', value: '' });
  const [declineReason, setDeclineReason] = useState('');
  const [declineProjectReason, setDeclineProjectReason] = useState('');

  // Verificar autenticação ao carregar
  useEffect(() => {
    // Timeout de segurança - nunca ficar travado em loading
    const timeout = setTimeout(() => {
      setAuthLoading(false);
    }, 3000);

    // Listener de mudanças de auth (dispara imediatamente com sessão atual)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(timeout);
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setUserId(null);
      }
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Quando user muda, buscar o userId do banco
  useEffect(() => {
    if (!user) {
      setUserId(null);
      return;
    }

    let cancelled = false;
    const fetchUserId = async () => {
      try {
        const id = await getCurrentUserId();
        if (!cancelled) setUserId(id);
      } catch (error) {
        console.error('Erro ao buscar userId:', error);
      }
    };
    fetchUserId();

    return () => { cancelled = true; };
  }, [user]);

  // Carregar dados do Supabase quando userId estiver disponível
  useEffect(() => {
    if (userId) {
      loadAllData();
    }
  }, [userId]);

  const loadAllData = async () => {
    if (!userId) return;

    setDataLoading(true);
    try {
      const [leadsRes, projectsRes, proposalsRes, contractsRes, fiscalRes, checklistsRes] = await Promise.all([
        getLeads(userId),
        getProjects(userId, 'all'),
        getProposals(userId),
        getContracts(userId),
        getFiscalNotes(userId),
        getChecklists(userId),
      ]);

      if (leadsRes.data) {
        setAllLeads(leadsRes.data);
        setLeads(leadsRes.data.filter(l => l.status !== 'lost'));
      }
      if (projectsRes.data) setProjects(projectsRes.data);
      if (proposalsRes.data) setProposals(proposalsRes.data);
      if (contractsRes.data) setContracts(contractsRes.data);
      if (fiscalRes.data) setFiscalNotes(fiscalRes.data);
      if (checklistsRes.data) setChecklists(checklistsRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleArchiveProject = async (projectId) => {
    await archiveProjectAPI(projectId);
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: 'archived', is_active: false } : p));
    if (selectedProject?.id === projectId) setSelectedProject(null);
  };

  // --- Checklist handlers ---

  const updateProjectChecklists = (projectId, updater) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, checklists: updater(p.checklists || []) } : p));
    if (selectedProject?.id === projectId) {
      setSelectedProject(prev => ({ ...prev, checklists: updater(prev.checklists || []) }));
    }
  };

  const handleCreateChecklist = async (projectId, title) => {
    if (!userId) return;
    try {
      const { data, error } = await createChecklist(userId, { project_id: projectId, title });
      if (error) throw error;
      if (data) {
        updateProjectChecklists(projectId, cls => [...cls, data]);
        setChecklists(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error('Erro ao criar checklist:', err);
    }
  };

  const handleUpdateChecklist = async (checklistId, updates) => {
    try {
      const { data, error } = await updateChecklist(checklistId, updates);
      if (error) throw error;
      if (data) {
        const pid = data.project?.id || data.project_id;
        updateProjectChecklists(pid, cls => cls.map(c => c.id === checklistId ? { ...c, ...data } : c));
        setChecklists(prev => prev.map(c => c.id === checklistId ? { ...c, ...data } : c));
      }
    } catch (err) {
      console.error('Erro ao atualizar checklist:', err);
    }
  };

  const handleUpdateChecklistStatus = async (checklistId, newStatus) => {
    await handleUpdateChecklist(checklistId, { status: newStatus });
  };

  const handleDeleteChecklist = async (checklistId) => {
    try {
      const { error } = await deleteChecklist(checklistId);
      if (error) throw error;
      setProjects(prev => prev.map(p => ({
        ...p,
        checklists: (p.checklists || []).filter(c => c.id !== checklistId)
      })));
      if (selectedProject) {
        setSelectedProject(prev => ({
          ...prev,
          checklists: (prev.checklists || []).filter(c => c.id !== checklistId)
        }));
      }
      setChecklists(prev => prev.filter(c => c.id !== checklistId));
    } catch (err) {
      console.error('Erro ao deletar checklist:', err);
    }
  };

  const handleAddChecklistItem = async (checklistId, title) => {
    try {
      const { data, error } = await createChecklistItem(checklistId, title);
      if (error) throw error;
      if (data) {
        const updateItems = cls => cls.map(c =>
          c.id === checklistId ? { ...c, checklist_items: [...(c.checklist_items || []), data] } : c
        );
        setProjects(prev => prev.map(p => ({ ...p, checklists: updateItems(p.checklists || []) })));
        if (selectedProject) {
          setSelectedProject(prev => ({ ...prev, checklists: updateItems(prev.checklists || []) }));
        }
      }
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    }
  };

  const handleToggleChecklistItem = async (itemId, completed) => {
    try {
      const { data, error } = await toggleChecklistItem(itemId, completed);
      if (error) throw error;
      if (data) {
        const updateItems = cls => cls.map(c => ({
          ...c,
          checklist_items: (c.checklist_items || []).map(i => i.id === itemId ? { ...i, completed } : i)
        }));
        setProjects(prev => prev.map(p => ({ ...p, checklists: updateItems(p.checklists || []) })));
        if (selectedProject) {
          setSelectedProject(prev => ({ ...prev, checklists: updateItems(prev.checklists || []) }));
        }
      }
    } catch (err) {
      console.error('Erro ao toggle item:', err);
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    try {
      const { error } = await deleteChecklistItem(itemId);
      if (error) throw error;
      const updateItems = cls => cls.map(c => ({
        ...c,
        checklist_items: (c.checklist_items || []).filter(i => i.id !== itemId)
      }));
      setProjects(prev => prev.map(p => ({ ...p, checklists: updateItems(p.checklists || []) })));
      if (selectedProject) {
        setSelectedProject(prev => ({ ...prev, checklists: updateItems(prev.checklists || []) }));
      }
    } catch (err) {
      console.error('Erro ao deletar item:', err);
    }
  };

  // --- Logica de Negócio ---

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!userId) return;

    if (!newLead.name.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (!newLead.email.trim()) {
      alert('Por favor, informe o e-mail de contato.');
      return;
    }
    if (!newLead.demand.trim()) {
      alert('Por favor, informe a demanda inicial.');
      return;
    }

    try {
      const leadData = {
        name: newLead.name.trim(),
        email: newLead.email.trim(),
        demand: newLead.demand.trim(),
        estimated_value: parseFloat(newLead.value) || 0,
        status: 'lead',
        priority: 0
      };

      const { data, error } = await createLead(userId, leadData);

      if (error) throw error;

      if (data) {
        setLeads([data, ...leads]);
        setAllLeads([data, ...allLeads]);
        setIsNewLeadModalOpen(false);
        setNewLead({ name: '', email: '', demand: '', value: '' });
      }
    } catch (err) {
      console.error('Erro ao criar lead:', err);
      alert(`Erro ao criar lead: ${err?.message || 'Tente novamente.'}`);
    }
  };

  const convertLeadToProject = async (lead) => {
    if (!userId) return;

    try {
      const { data, error } = await convertLeadToProjectAPI(lead.id, userId);

      if (error) throw error;

      if (data) {
        // Remover lead da lista
        setLeads(leads.filter(l => l.id !== lead.id));

        // Recarregar projetos
        await loadAllData();

        // Selecionar o novo projeto
        if (data.project) {
          const { data: fullProject } = await getProjectById(data.project.id);
          setSelectedProject(fullProject);
          setActiveTab('projects');
        }
      }
    } catch (err) {
      console.error('Erro ao converter lead:', err);
      alert('Erro ao converter lead em projeto');
    }
  };

  const handleCreateProjectDirectly = async (projectData) => {
    if (!userId) return;

    try {
      const { data, error } = await createProjectDirectly(userId, projectData);

      if (error) throw error;

      if (data) {
        // Recarregar projetos
        await loadAllData();

        // Selecionar o novo projeto
        const { data: fullProject } = await getProjectById(data.id);
        setSelectedProject(fullProject);
        setActiveTab('projects');
      }
    } catch (err) {
      console.error('Erro ao criar projeto direto:', err);
      alert('Erro ao criar projeto');
    }
  };

  const handleDeclineProposal = async () => {
    if (!leadToDecline) return;

    try {
      const { error } = await declineProposal(leadToDecline.id, declineReason);

      if (error) throw error;

      // Remover lead da lista ativa e marcar como lost em allLeads
      setLeads(leads.filter(l => l.id !== leadToDecline.id));
      setAllLeads(allLeads.map(l => l.id === leadToDecline.id ? { ...l, status: 'lost', decline_reason: declineReason } : l));

      // Fechar modal e limpar estados
      setIsDeclineModalOpen(false);
      setLeadToDecline(null);
      setDeclineReason('');
    } catch (err) {
      console.error('Erro ao declinar proposta:', err);
      alert('Erro ao declinar proposta');
    }
  };

  const openDeclineModal = (lead) => {
    setLeadToDecline(lead);
    setIsDeclineModalOpen(true);
  };

  const handleDeclineProject = async () => {
    if (!projectToDecline) return;

    try {
      const { error } = await declineProjectAPI(projectToDecline.id, declineProjectReason);

      if (error) throw error;

      setProjects(prev => prev.map(p => p.id === projectToDecline.id ? { ...p, status: 'declined', is_active: false } : p));
      if (selectedProject?.id === projectToDecline.id) {
        setSelectedProject(null);
      }

      setIsDeclineProjectModalOpen(false);
      setProjectToDecline(null);
      setDeclineProjectReason('');
    } catch (err) {
      console.error('Erro ao declinar projeto:', err);
      alert('Erro ao declinar projeto');
    }
  };

  const openDeclineProjectModal = (project) => {
    setProjectToDecline(project);
    setIsDeclineProjectModalOpen(true);
  };

  const openDeleteProjectModal = (project) => {
    setProjectToDelete(project);
    setIsDeleteProjectModalOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const { error } = await deleteProjectAPI(projectToDelete.id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      if (selectedProject?.id === projectToDelete.id) {
        setSelectedProject(null);
      }

      setIsDeleteProjectModalOpen(false);
      setProjectToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
      alert('Erro ao excluir projeto');
    }
  };

  const updateTaskStatus = async (projectId, taskId, newStatus) => {
    try {
      const { error } = await updateTaskStatusAPI(taskId, newStatus);

      if (error) throw error;

      // Atualizar localmente
      setProjects(projects.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
          };
        }
        return p;
      }));

      // Atualizar projeto selecionado se for o mesmo
      if (selectedProject?.id === projectId) {
        setSelectedProject({
          ...selectedProject,
          tasks: selectedProject.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
      alert('Erro ao atualizar tarefa');
    }
  };

  const handleAdvanceWorkflow = async (projectId) => {
    try {
      const { error } = await advanceProjectWorkflow(projectId);

      if (error) throw error;

      // Recarregar projetos
      await loadAllData();

      // Atualizar projeto selecionado
      if (selectedProject?.id === projectId) {
        const { data: updatedProject } = await getProjectById(projectId);
        setSelectedProject(updatedProject);
      }
    } catch (err) {
      console.error('Erro ao avançar workflow:', err);
      alert(err.message || 'Erro ao avançar workflow');
    }
  };

  const handleUpdateProject = async (projectId, updates) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select('*, client:clients(*), tasks(*), payments(*), checklists(*, checklist_items(*)), documents(*), workflow_history(*), proposals(*), contracts(*), media_files(*), fiscal_notes(*)')
        .single();

      if (error) throw error;

      if (data) {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...data } : p));
        if (selectedProject?.id === projectId) {
          setSelectedProject(data);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err);
      alert(err.message || 'Erro ao atualizar projeto');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setUserId(null);
    setLeads([]);
    setAllLeads([]);
    setChecklists([]);
    setProjects([]);
    setProposals([]);
    setContracts([]);
    setFiscalNotes([]);
    setSelectedProject(null);
  };

  // --- Views ---

  // Se ainda está verificando autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-warm-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <Layers size={20} className="text-warm-900" />
          </div>
          <Loader2 className="animate-spin text-brand-500" size={20} />
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostrar tela de login
  if (!user) {
    return <LoginModal isOpen={true} onLoginSuccess={() => { }} />;
  }

  const logoText = (
    <img src="/logo.png" alt="Freeela" className="w-full h-10 p-1 object-contain" />
  )

  return (
    <div className="min-h-screen bg-warm-100 text-warm-900 font-sans">

      {/* Sidebar — always dark */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-warm-50 border-r border-warm-300 z-20 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-warm-300">
          {logoText}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {[
            { id: 'painel', label: 'Painel', icon: LayoutDashboard },
            { id: 'overview', label: 'Overview', icon: LayoutGrid },
            { id: 'leads', label: 'Leads', icon: Users },
            { id: 'projects', label: 'Projetos', icon: Briefcase },
            { id: 'fiscal', label: 'Área Fiscal', icon: Receipt },
            { id: 'finances', label: 'Financeiro', icon: DollarSign },
            { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium
                ${activeTab === item.id
                  ? 'bg-brand-500 text-warm-900 font-semibold shadow-brand'
                  : 'text-warm-500 hover:text-warm-900 hover:bg-warm-200'
                }`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}

          {/* Seção Planejamento */}
          <div className="pt-4">
            <button
              onClick={() => setPlanejamentoOpen(!planejamentoOpen)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-warm-500 hover:text-warm-500 transition-colors"
            >
              <Network size={12} />
              <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left">Planejamento</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${planejamentoOpen ? 'rotate-180' : ''}`} />
            </button>
            {planejamentoOpen && (
              <div className="mt-0.5 space-y-0.5">
                {[
                  { id: 'eap', label: 'EAP / WBS', icon: Network },
                  { id: 'cronograma', label: 'Cronograma', icon: Calendar },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium
                      ${activeTab === item.id
                        ? 'bg-brand-500 text-warm-900 font-semibold'
                        : 'text-warm-500 hover:text-warm-900 hover:bg-warm-200'
                      }`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seção Comercial */}
          <div className="pt-4">
            <button
              onClick={() => setComercialOpen(!comercialOpen)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-warm-500 hover:text-warm-500 transition-colors"
            >
              <Building2 size={12} />
              <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left">Comercial</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${comercialOpen ? 'rotate-180' : ''}`} />
            </button>
            {comercialOpen && (
              <div className="mt-0.5 space-y-0.5">
                {[
                  { id: 'propostas', label: 'Propostas', icon: FileText },
                  { id: 'contratos', label: 'Contratos', icon: FileSignature },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium
                      ${activeTab === item.id
                        ? 'bg-brand-500 text-warm-900 font-semibold'
                        : 'text-warm-500 hover:text-warm-900 hover:bg-warm-200'
                      }`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-warm-300 space-y-2">

          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-warm-500 hover:text-warm-800 hover:bg-warm-200 transition-all text-sm font-medium">
            <LogOut size={15} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-60 min-h-screen">
        <header className="sticky top-0 bg-warm-100/90 backdrop-blur-md border-b border-warm-300/50 px-8 py-3.5 flex items-center justify-between z-10">
          <div className="relative w-80 max-w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-500" size={14} />
            <input
              type="text"
              placeholder="Pesquisar projetos, clientes..."
              className="w-full bg-warm-50 border border-warm-300 rounded-xl py-2 pl-9 pr-4 text-sm text-warm-600 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-400 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-warm-50 border border-warm-300 flex items-center justify-center text-brand-500 font-bold text-xs">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-brand-500" size={32} />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  projects={projects}
                  userId={userId}
                />
              )}
              {activeTab === 'painel' && (
                <PainelView
                  checklists={checklists}
                  projects={projects}
                  userId={userId}
                  onChecklistCreated={(c) => setChecklists(prev => [c, ...prev])}
                  onChecklistUpdated={(u) => setChecklists(prev => prev.map(c => c.id === u.id ? u : c))}
                  onChecklistDeleted={(id) => setChecklists(prev => prev.filter(c => c.id !== id))}
                  createChecklistFn={createChecklist}
                  updateChecklistFn={updateChecklist}
                  deleteChecklistFn={deleteChecklist}
                />
              )}
              {activeTab === 'leads' && (
                <LeadsView
                  allLeads={allLeads}
                  filter={leadsFilter}
                  onFilterChange={setLeadsFilter}
                  onAddLead={() => setIsNewLeadModalOpen(true)}
                  onConvertLead={convertLeadToProject}
                  onDeclineLead={openDeclineModal}
                />
              )}
              {activeTab === 'projects' && (
                <ProjetosView
                  projects={projects}
                  filter={projectsFilter}
                  onFilterChange={setProjectsFilter}
                  selectedProject={selectedProject}
                  onSelectProject={setSelectedProject}
                  onCreateProjectDirectly={handleCreateProjectDirectly}
                  onDeclineProject={openDeclineProjectModal}
                  onArchiveProject={handleArchiveProject}
                  onDeleteProject={openDeleteProjectModal}
                  onAdvanceWorkflow={handleAdvanceWorkflow}
                  onUpdateTask={updateTaskStatus}
                  onUpdateProject={handleUpdateProject}
                  onCreateChecklist={handleCreateChecklist}
                  onUpdateChecklist={handleUpdateChecklist}
                  onDeleteChecklist={handleDeleteChecklist}
                  onUpdateChecklistStatus={handleUpdateChecklistStatus}
                  onAddChecklistItem={handleAddChecklistItem}
                  onToggleChecklistItem={handleToggleChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                />
              )}
              {activeTab === 'fiscal' && (
                <AreaFiscalView
                  fiscalNotes={fiscalNotes}
                  projects={projects.filter(p => p.status === 'active')}
                  userId={userId}
                  authUser={user}
                  onNoteCreated={(n) => setFiscalNotes(prev => [n, ...prev])}
                  onNoteDeleted={(id) => setFiscalNotes(prev => prev.filter(n => n.id !== id))}
                />
              )}
              {activeTab === 'finances' && (
                <FinanceiroView
                  projects={projects}
                  contracts={contracts}
                  onSelectProject={(p) => { setSelectedProject(p); setActiveTab('projects'); }}
                />
              )}
              {activeTab === 'propostas' && (
                <PropostasView
                  proposals={proposals}
                  projects={projects}
                  allLeads={allLeads}
                  userId={userId}
                  authUser={user}
                  onProposalCreated={(p) => setProposals(prev => [p, ...prev])}
                  onProposalUpdated={(u) => setProposals(prev => prev.map(p => p.id === u.id ? u : p))}
                  onProposalDeleted={(id) => setProposals(prev => prev.filter(p => p.id !== id))}
                />
              )}
              {activeTab === 'pomodoro' && (
                <PomodoroView />
              )}
              {activeTab === 'eap' && (
                <EapView projects={projects} userId={userId} />
              )}
              {activeTab === 'cronograma' && (
                <CronogramaView projects={projects} userId={userId} />
              )}
              {activeTab === 'contratos' && (
                <ContratosView
                  contracts={contracts}
                  projects={projects}
                  userId={userId}
                  authUser={user}
                  onContractCreated={(c) => setContracts(prev => [c, ...prev])}
                  onContractUpdated={(u) => setContracts(prev => prev.map(c => c.id === u.id ? u : c))}
                  onContractDeleted={(id) => setContracts(prev => prev.filter(c => c.id !== id))}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Modais de Sistema */}
      <Modal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        title="Novo Potencial Cliente"
        footer={(
          <>
            <Button variant="outline" onClick={() => setIsNewLeadModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddLead}>Salvar Lead</Button>
          </>
        )}
      >
        <form className="space-y-4" onSubmit={handleAddLead}>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">Nome do Cliente/Empresa</label>
            <input type="text" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" placeholder="Ex: Acme Corp" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">E-mail de Contato</label>
            <input type="email" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" placeholder="exemplo@email.com" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">Demanda Inicial</label>
            <textarea className="w-full bg-warm-200 dark:bg-warm-200 border border-warm-300 dark:border-warm-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all h-24 resize-none" placeholder="Descreva brevemente o que o cliente precisa..." value={newLead.demand} onChange={e => setNewLead({ ...newLead, demand: e.target.value })} required></textarea>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">Budget Estimado (R$)</label>
            <input type="number" className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all" placeholder="Ex: 5000" value={newLead.value} onChange={e => setNewLead({ ...newLead, value: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => {
          setIsDeclineModalOpen(false);
          setLeadToDecline(null);
          setDeclineReason('');
        }}
        title="Declinar Proposta"
        footer={(
          <>
            <Button variant="outline" onClick={() => {
              setIsDeclineModalOpen(false);
              setLeadToDecline(null);
              setDeclineReason('');
            }}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeclineProposal}>Confirmar Declínio</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-amber-300">Esta ação arquivará o lead</p>
                <p className="text-xs text-amber-500 mt-1">
                  O lead <strong>{leadToDecline?.name}</strong> será marcado como "perdido" e arquivado.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">
              Motivo do declínio (opcional)
            </label>
            <textarea
              className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all h-24 resize-none"
              placeholder="Ex: Orçamento acima do esperado, prazo incompatível, cliente não respondeu..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>

          <p className="text-xs text-warm-500">
            Registrar o motivo ajuda a entender padrões de leads perdidos.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteProjectModalOpen}
        onClose={() => {
          setIsDeleteProjectModalOpen(false);
          setProjectToDelete(null);
        }}
        title="Excluir Projeto Permanentemente"
        footer={(
          <>
            <Button variant="outline" onClick={() => {
              setIsDeleteProjectModalOpen(false);
              setProjectToDelete(null);
            }}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteProject}>Excluir Permanentemente</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-red-300">Esta ação é irreversível</p>
                <p className="text-xs text-red-500 mt-1">
                  O projeto <strong>{projectToDelete?.title}</strong> e todos os seus dados (tarefas, pagamentos, documentos, checklists) serão excluídos permanentemente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeclineProjectModalOpen}
        onClose={() => {
          setIsDeclineProjectModalOpen(false);
          setProjectToDecline(null);
          setDeclineProjectReason('');
        }}
        title="Declinar Projeto"
        footer={(
          <>
            <Button variant="outline" onClick={() => {
              setIsDeclineProjectModalOpen(false);
              setProjectToDecline(null);
              setDeclineProjectReason('');
            }}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeclineProject}>Confirmar Declínio</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-red-300">Esta ação encerrará o projeto</p>
                <p className="text-xs text-red-500 mt-1">
                  O projeto <strong>{projectToDecline?.title}</strong> será marcado como inativo e removido da lista de projetos ativos.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-500 block mb-2">
              Motivo do declínio (opcional)
            </label>
            <textarea
              className="w-full bg-warm-200/60 border border-warm-400/60 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-warm-500 transition-all h-24 resize-none"
              placeholder="Ex: Cliente cancelou, proposta não aprovada, projeto inviável..."
              value={declineProjectReason}
              onChange={(e) => setDeclineProjectReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
