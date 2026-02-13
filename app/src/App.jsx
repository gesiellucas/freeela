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
  LayoutDashboard,
  MoreVertical,
  Trash2,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
  Send,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Layers,
  FileSignature,
  LogOut
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
  updateTaskStatus as updateTaskStatusAPI,
  advanceProjectWorkflow,
  getDashboardMetrics,
  createPayment,
  saveDocument,
  declineProposal
} from './lib/supabase';

// --- Constantes e Templates ---

const FOLDER_TEMPLATE = [
  "01_Briefings",
  "02_Propostas",
  "03_Contratos",
  "04_Projeto",
  "04_Projeto/src",
  "04_Projeto/assets",
  "05_Pagamentos",
  "06_Final"
];

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
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", icon: Icon, loading = false, disabled = false }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    ai: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md",
    ghost: "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
  };

  return (
    <button
      onClick={loading || disabled ? null : onClick}
      disabled={loading || disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : (Icon && <Icon size={16} />)}
      {children}
    </button>
  );
};

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    purple: "bg-purple-100 text-purple-700",
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-700"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- Modais ---

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
};

const AIModal = ({ isOpen, onClose, title, content, onApply, type }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border-purple-500/20">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <h3 className="font-black flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Sparkles size={20}/> {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-slate-900">
          <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-300">
            {content}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500">Gerado pelo Gemini 2.5 Flash • Rascunho para revisão</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Descartar</Button>
            {onApply && <Button variant="ai" onClick={onApply}>Utilizar este Conteúdo</Button>}
          </div>
        </div>
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
              <Layers className="text-blue-600" /> FREELANCE OS
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              {mode === 'login' ? 'Entre para continuar' : 'Crie sua conta'}
            </p>
          </div>

          {!isConfigured && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 text-xs">
              <p className="font-bold mb-2">⚠️ Supabase não configurado</p>
              <p className="mb-2">Crie um arquivo <code className="bg-amber-100 px-1 rounded">.env</code> na pasta <code className="bg-amber-100 px-1 rounded">app/</code> com:</p>
              <pre className="bg-amber-100 p-2 rounded text-[10px] overflow-x-auto">
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
              </pre>
              <p className="mt-2 text-[10px]">Consulte <code className="bg-amber-100 px-1 rounded">SETUP.md</code> para instruções completas</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-lg p-3 text-sm"
                  placeholder="João Silva"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-lg p-3 text-sm"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-lg p-3 text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <Button variant="primary" className="w-full" loading={loading}>
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-blue-600 hover:underline"
              >
                {mode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}
              </button>
            </div>
          </form>
        </div>
      </Card>
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rootDirectory, setRootDirectory] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);

  // UI States
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [leadToDecline, setLeadToDecline] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModal, setAiModal] = useState({ open: false, title: '', content: '', type: '', onApply: null });
  const [dataLoading, setDataLoading] = useState(false);

  // Form States
  const [newLead, setNewLead] = useState({ name: '', email: '', demand: '', value: '' });
  const [declineReason, setDeclineReason] = useState('');

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
      // Carregar leads (filtrar apenas leads ativos, não arquivados)
      const { data: leadsData, error: leadsError } = await getLeads(userId);
      if (!leadsError && leadsData) {
        // Filtrar leads que não foram declinados (status !== 'lost')
        const activeLeads = leadsData.filter(lead => lead.status !== 'lost');
        setLeads(activeLeads);
      }

      // Carregar projetos com relacionamentos
      const { data: projectsData, error: projectsError } = await getProjects(userId);
      if (!projectsError && projectsData) {
        setProjects(projectsData);
      }

      // Carregar métricas do dashboard
      const { data: metricsData, error: metricsError } = await getDashboardMetrics(userId);
      if (!metricsError && metricsData) {
        setDashboardMetrics(metricsData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // --- Gemini API ---

  const callGemini = async (prompt, systemInstruction) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (e) {
        if (i === 4) throw e;
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
      }
    }
  };

  const handleGenerateDocument = async (type, data) => {
    setAiLoading(true);
    let system = "";
    let prompt = "";
    let title = "";

    const clientName = data.client?.name || data.name || 'Cliente';
    const projectTitle = data.title || data.demand || 'Projeto';
    const projectValue = data.value || data.estimated_value || 0;

    switch(type) {
      case 'contract':
        title = `Contrato Prestação de Serviço: ${clientName}`;
        system = "Você é um advogado especialista em contratos de tecnologia para freelancers brasileiros. Redija um contrato completo com cláusulas de Escopo, Prazos, Pagamento, Propriedade Intelectual e Foro.";
        prompt = `Contratante: ${clientName}\nServiço: ${projectTitle}\nValor: R$ ${projectValue}\nAno: 2024`;
        break;
      case 'proposal':
        title = `Proposta Comercial: ${clientName}`;
        system = "Você é um consultor de vendas sênior. Crie uma proposta comercial irresistível, estruturada em: O Problema, Nossa Solução, Cronograma de Entrega, Investimento e Próximos Passos.";
        prompt = `Cliente: ${clientName}\nProjeto: ${projectTitle}\nBudget Estimado: R$ ${projectValue}`;
        break;
      case 'briefing':
        title = `Briefing Estratégico: ${clientName}`;
        system = "Você é um Product Designer. Gere um documento de briefing com perguntas específicas para o tipo de projeto solicitado e sugestões de referências visuais.";
        prompt = `Demanda: ${projectTitle}`;
        break;
    }

    try {
      const result = await callGemini(prompt, system);

      // Preparar função para salvar o documento
      const onApply = async () => {
        if (userId && data.id) {
          await saveDocument(userId, {
            project_id: data.id,
            title: title,
            document_type: type,
            content: result,
            generated_by_ai: true,
            ai_model: 'gemini-2.5-flash',
            ai_prompt: prompt,
          });
        }
        alert(`Documento (${type}) salvo com sucesso!`);
        setAiModal({ ...aiModal, open: false });
      };

      setAiModal({ open: true, title, content: result, type, onApply });
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar documento com IA');
    } finally {
      setAiLoading(false);
    }
  };

  // --- Logica de Negócio ---

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!userId) return;

    try {
      const leadData = {
        name: newLead.name,
        email: newLead.email,
        demand: newLead.demand,
        estimated_value: parseFloat(newLead.value) || 0,
        status: 'lead',
        priority: 0
      };

      const { data, error } = await createLead(userId, leadData);

      if (error) throw error;

      if (data) {
        setLeads([data, ...leads]);
        setIsNewLeadModalOpen(false);
        setNewLead({ name: '', email: '', demand: '', value: '' });
      }
    } catch (err) {
      console.error('Erro ao criar lead:', err);
      alert('Erro ao criar lead');
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

  const handleDeclineProposal = async () => {
    if (!leadToDecline) return;

    try {
      const { error } = await declineProposal(leadToDecline.id, declineReason);

      if (error) throw error;

      // Remover lead da lista (foi arquivado)
      setLeads(leads.filter(l => l.id !== leadToDecline.id));

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

  const handleSelectRoot = async () => {
    try {
      const selectedPath = await window.electronAPI?.selectDirectory();
      if (selectedPath) {
        setRootDirectory(selectedPath);
      }
    } catch (err) {
      console.error("Erro ao selecionar pasta:", err);
    }
  };

  const createProjectFolders = async (proj) => {
    if (!rootDirectory) return false;
    try {
      const result = await window.electronAPI?.createProjectFolders({
        rootPath: rootDirectory,
        clientName: proj.client?.name || proj.clientName || 'Cliente',
        folders: FOLDER_TEMPLATE,
      });
      if (result?.success) {
        // Atualizar no banco que as pastas foram criadas
        await supabase
          .from('projects')
          .update({ folders_created: true })
          .eq('id', proj.id);

        // Atualizar localmente
        setProjects(projects.map(p => p.id === proj.id ? { ...p, folders_created: true } : p));
        return true;
      }
      console.error(result?.error);
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setUserId(null);
    setLeads([]);
    setProjects([]);
    setSelectedProject(null);
  };

  // --- Views ---

  const Dashboard = () => {
    const totalBilled = projects.reduce((acc, p) => {
      const payments = p.payments || [];
      return acc + payments.reduce((pa, pay) => pay.status === 'paid' ? pa + (pay.amount || 0) : pa, 0);
    }, 0);

    const totalPending = projects.reduce((acc, p) => acc + (p.value || 0), 0) - totalBilled;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Leads Quentes</p>
                <p className="text-3xl font-black mt-1">{leads.length}</p>
              </div>
              <Users className="text-blue-200" size={24}/>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Projetos Ativos</p>
                <p className="text-3xl font-black mt-1">{projects.length}</p>
              </div>
              <Layers className="text-purple-200" size={24}/>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Faturamento Total</p>
                <p className="text-2xl font-black mt-1">R$ {totalBilled.toLocaleString('pt-BR')}</p>
              </div>
              <TrendingUp className="text-green-200" size={24}/>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-amber-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">A Receber</p>
                <p className="text-2xl font-black mt-1">R$ {totalPending.toLocaleString('pt-BR')}</p>
              </div>
              <Clock className="text-amber-200" size={24}/>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="font-bold flex items-center gap-2 text-sm"><Layers size={16} className="text-blue-500"/> Timeline de Operações</h3>
                <Button variant="outline" className="h-7 text-[10px]" onClick={() => setActiveTab('projects')}>Ver Workflow</Button>
             </div>
             <div className="p-4 space-y-4">
                {projects.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Nenhum projeto ativo</p>
                ) : (
                  projects.map(p => {
                    const stepNumber = getStepNumber(p.current_step);
                    return (
                      <div key={p.id} className="group p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 transition-all cursor-pointer" onClick={() => {setSelectedProject(p); setActiveTab('projects')}}>
                         <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-sm">{p.title}</span>
                            <Badge color={stepNumber > 5 ? "green" : "blue"}>
                              {WORKFLOW_STEPS[stepNumber - 1]?.label}
                            </Badge>
                         </div>
                         <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(stepNumber / 7) * 100}%` }}></div>
                         </div>
                         <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            <span>Início</span>
                            <span>{Math.round((stepNumber/7)*100)}% concluído</span>
                            <span>Entrega</span>
                         </div>
                      </div>
                    );
                  })
                )}
             </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
               <h3 className="font-bold flex items-center gap-2 text-sm"><Sparkles size={16} className="text-purple-500"/> Pipeline de Leads</h3>
            </div>
            <div className="p-2">
               {leads.length === 0 ? (
                 <p className="text-center text-slate-400 py-8 text-sm">Nenhum lead</p>
               ) : (
                 leads.map(lead => (
                   <div key={lead.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center justify-between group transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                         <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xs font-black">{lead.name.charAt(0)}</div>
                         <div className="flex-1">
                            <p className="text-xs font-bold">{lead.name}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{lead.demand}</p>
                         </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                         <button
                           onClick={() => openDeclineModal(lead)}
                           className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                           title="Declinar proposta"
                         >
                           <X size={14}/>
                         </button>
                         <Button variant="ghost" className="h-8 w-8 !p-0" onClick={() => convertLeadToProject(lead)}><ArrowRight size={14}/></Button>
                      </div>
                   </div>
                 ))
               )}
               <Button variant="outline" className="w-full mt-2 border-dashed h-10 text-xs" onClick={() => setIsNewLeadModalOpen(true)}>+ Adicionar Novo Lead</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const ProjectDetail = () => {
    const [subTab, setSubTab] = useState('workflow');
    const proj = selectedProject || projects[0];

    if (!proj) {
      return (
        <div className="text-center py-20">
          <p className="text-slate-400">Selecione um projeto</p>
        </div>
      );
    }

    const stepNumber = getStepNumber(proj.current_step);
    const tasks = proj.tasks || [];
    const payments = proj.payments || [];

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button onClick={() => setActiveTab('dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X size={20}/></button>
             <div>
                <h2 className="text-xl font-black">{proj.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                   <Users size={12}/> {proj.client?.name || 'Cliente'} <span className="text-slate-300">|</span> <CreditCard size={12}/> R$ {(proj.value || 0).toLocaleString('pt-BR')}
                </div>
             </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={FolderOpen} onClick={() => createProjectFolders(proj)} disabled={proj.folders_created}>
              {proj.folders_created ? "Pastas OK" : "Criar Pastas"}
            </Button>
            <Button variant="ai" icon={Sparkles} onClick={() => handleGenerateDocument('proposal', proj)} loading={aiLoading}>Gerar Proposta</Button>
            <Button onClick={() => handleAdvanceWorkflow(proj.id)} disabled={stepNumber >= 7}>
              {stepNumber >= 7 ? 'Finalizado' : 'Avançar Etapa'}
            </Button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
           {['workflow', 'kanban', 'financeiro'].map(tab => (
             <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`pb-3 px-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${subTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
             >
               {tab}
             </button>
           ))}
        </div>

        {subTab === 'workflow' && (
          <div className="space-y-8 py-4">
            <div className="flex justify-between px-2 relative">
               <div className="absolute top-6 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 z-0"></div>
               {WORKFLOW_STEPS.map(s => {
                 const isActive = stepNumber === s.id;
                 const isDone = stepNumber > s.id;
                 return (
                   <div key={s.id} className="relative z-10 flex flex-col items-center w-24">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2
                        ${isActive ? 'bg-blue-600 border-blue-100 text-white shadow-xl shadow-blue-500/20 scale-110' :
                          isDone ? 'bg-green-500 border-green-50 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-400'}`}>
                        {isDone ? <CheckCircle2 size={20}/> : s.icon}
                      </div>
                      <p className={`text-[9px] font-black uppercase mt-3 tracking-tighter text-center ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{s.label}</p>
                   </div>
                 );
               })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <Card className="p-6">
                  <h3 className="font-black text-sm mb-6 flex items-center gap-2 underline decoration-blue-500 decoration-4 underline-offset-4 uppercase italic">
                    {WORKFLOW_STEPS[stepNumber - 1]?.label} • Checklist
                  </h3>
                  <div className="space-y-3">
                     {tasks.filter(t => t.status === 'todo').length === 0 ? (
                       <p className="text-sm text-slate-400 text-center py-4">Nenhuma tarefa pendente</p>
                     ) : (
                       tasks.filter(t => t.status === 'todo').map(task => (
                         <div key={task.id} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all group">
                            <button
                              className="w-5 h-5 rounded-md border-2 border-slate-300 group-hover:border-blue-500 flex items-center justify-center"
                              onClick={() => updateTaskStatus(proj.id, task.id, 'done')}
                            ></button>
                            <span className="text-sm font-medium">{task.title}</span>
                         </div>
                       ))
                     )}
                  </div>
               </Card>
               <Card className="p-6">
                  <h3 className="font-black text-sm mb-6 uppercase italic">Documentos Rápidos (IA)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <button onClick={() => handleGenerateDocument('briefing', proj)} className="p-4 rounded-xl border border-slate-100 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/10 transition-all text-left group">
                        <Calendar className="text-purple-500 mb-2 group-hover:scale-110 transition-transform" size={24}/>
                        <p className="font-bold text-xs">Briefing Técnico</p>
                        <p className="text-[10px] text-slate-500 mt-1">Gere perguntas de alinhamento com IA.</p>
                     </button>
                     <button onClick={() => handleGenerateDocument('contract', proj)} className="p-4 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/10 transition-all text-left group">
                        <ShieldCheck className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" size={24}/>
                        <p className="font-bold text-xs">Contrato Jurídico</p>
                        <p className="text-[10px] text-slate-500 mt-1">Rascunho profissional com cláusulas BR.</p>
                     </button>
                  </div>
               </Card>
            </div>
          </div>
        )}

        {subTab === 'kanban' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 h-[60vh]">
              {['todo', 'doing', 'done'].map(status => (
                <div key={status} className="flex flex-col gap-4">
                   <div className="flex justify-between items-center px-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{status}</h4>
                      <Badge color={status === 'done' ? 'green' : status === 'doing' ? 'yellow' : 'slate'}>
                        {tasks.filter(t => t.status === status).length}
                      </Badge>
                   </div>
                   <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-3 space-y-3 overflow-y-auto">
                      {tasks.filter(t => t.status === status).map(task => (
                        <Card key={task.id} className="p-4 shadow-sm hover:shadow-md transition-shadow cursor-move">
                           <p className="text-sm font-medium mb-3">{task.title}</p>
                           <div className="flex justify-between items-center">
                              <Badge color="slate">{task.task_type || 'Técnica'}</Badge>
                              <div className="flex gap-1">
                                 {status !== 'todo' && <button onClick={() => updateTaskStatus(proj.id, task.id, status === 'done' ? 'doing' : 'todo')} className="p-1 hover:bg-slate-100 rounded"><ChevronDown size={14}/></button>}
                                 {status !== 'done' && <button onClick={() => updateTaskStatus(proj.id, task.id, status === 'todo' ? 'doing' : 'done')} className="p-1 hover:bg-slate-100 rounded text-blue-600"><ChevronRight size={14}/></button>}
                              </div>
                           </div>
                        </Card>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        )}

        {subTab === 'financeiro' && (
          <div className="space-y-6 py-4 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 bg-blue-600 text-white border-none">
                   <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Valor do Projeto</p>
                   <p className="text-3xl font-black">R$ {(proj.value || 0).toLocaleString('pt-BR')}</p>
                </Card>
                <Card className="p-5">
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Já Faturado</p>
                   <p className="text-2xl font-black text-green-600">
                     R$ {payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('pt-BR')}
                   </p>
                </Card>
                <Card className="p-5">
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Saldo Pendente</p>
                   <p className="text-2xl font-black text-amber-500">
                     R$ {((proj.value || 0) - payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (p.amount || 0), 0)).toLocaleString('pt-BR')}
                   </p>
                </Card>
             </div>
             <Card>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                   <h4 className="font-bold text-sm">Histórico de Lançamentos</h4>
                   <Button variant="outline" className="h-8 text-xs">+ Novo Recebimento</Button>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                         <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Descrição</th>
                            <th className="px-6 py-3">Valor</th>
                            <th className="px-6 py-3">Status</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                         {payments.length === 0 ? (
                           <tr>
                              <td colSpan="4" className="px-6 py-10 text-center text-slate-400 italic">Nenhum pagamento registrado ainda.</td>
                           </tr>
                         ) : (
                           payments.map(pay => (
                             <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 font-mono">{pay.due_date ? new Date(pay.due_date).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4 font-medium">{pay.description}</td>
                                <td className="px-6 py-4 font-bold">R$ {(pay.amount || 0).toLocaleString('pt-BR')}</td>
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
  };

  // Se ainda está verificando autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Se não está autenticado, mostrar tela de login
  if (!user) {
    return <LoginModal isOpen={true} onLoginSuccess={() => {}} />;
  }

  const logoText = (
    <div className="flex items-top">
      <span className="text-blue-500">F</span>
      <span className="text-blue-500">R</span>
      <span className="text-yellow-500">E</span>
      <span className="text-red-500">E</span>
      <span className="text-green-500">E</span>
      <span className="text-blue-500">L</span>
      <span className="text-blue-500">A</span>
      <span className="text-blue-500 text-xs mx-1">app</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20 hidden lg:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <Layers className="text-blue-600" /> {logoText}
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'leads', label: 'CRM & Leads', icon: Users },
            { id: 'projects', label: 'Projetos Ativos', icon: Briefcase },
            { id: 'finances', label: 'Financeiro', icon: DollarSign },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-4">
           <Card className="p-4 bg-slate-900 text-white border-none">
              <div className="flex items-center gap-2 mb-2">
                 <div className={`w-2 h-2 rounded-full ${rootDirectory ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                 <span className="text-[10px] font-black tracking-widest uppercase opacity-70">Sincronização Local</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-3">Conecte sua pasta de projetos para automação de diretórios.</p>
              <Button variant="ghost" className="w-full text-white bg-white/10 hover:bg-white/20 h-8 text-[10px]" onClick={handleSelectRoot}>
                {rootDirectory ? "Pasta Vinculada" : "Vincular Drive"}
              </Button>
           </Card>

           <Button variant="danger" className="w-full h-9 text-xs" icon={LogOut} onClick={handleLogout}>
             Sair
           </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between z-10">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar projetos, clientes ou faturas..."
              className="w-full bg-slate-100/50 dark:bg-slate-900 border-none rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ai" className="h-9 px-3 text-xs" onClick={() => handleGenerateDocument('proposal', { name: 'Novo Cliente', demand: 'Redação de Site', value: 2000 })} loading={aiLoading}>
               <Sparkles size={14}/> Assistente IA
            </Button>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-black text-xs">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'projects' && <ProjectDetail />}

              {activeTab === 'leads' && (
                <div className="space-y-6 animate-in fade-in">
                   <div className="flex justify-between items-center">
                     <h2 className="text-2xl font-black">Pipeline de Leads</h2>
                     <Button icon={Plus} onClick={() => setIsNewLeadModalOpen(true)}>Novo Lead</Button>
                   </div>
                   <Card className="overflow-hidden">
                     <table className="w-full text-left">
                       <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700">
                         <tr>
                           <th className="px-6 py-4">Lead / Empresa</th>
                           <th className="px-6 py-4">Demanda Principal</th>
                           <th className="px-6 py-4">Valor Estimado</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4 text-right">Ações</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                         {leads.length === 0 ? (
                           <tr>
                             <td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">Nenhum lead cadastrado</td>
                           </tr>
                         ) : (
                           leads.map(lead => (
                             <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                               <td className="px-6 py-4">
                                 <div className="font-bold text-sm">{lead.name}</div>
                                 <div className="text-[10px] text-slate-400">{lead.email}</div>
                               </td>
                               <td className="px-6 py-4 text-xs font-medium">{lead.demand}</td>
                               <td className="px-6 py-4 text-xs font-bold">R$ {(lead.estimated_value || 0).toLocaleString('pt-BR')}</td>
                               <td className="px-6 py-4"><Badge color={lead.status === 'lead' ? 'purple' : 'yellow'}>{lead.status}</Badge></td>
                               <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="outline" className="h-8 text-[10px]" onClick={() => convertLeadToProject(lead)}>Converter</Button>
                                    <Button variant="danger" className="h-8 text-[10px]" onClick={() => openDeclineModal(lead)}>Declinar</Button>
                                 </div>
                               </td>
                             </tr>
                           ))
                         )}
                       </tbody>
                     </table>
                   </Card>
                </div>
              )}

              {activeTab === 'finances' && (
                 <div className="space-y-6">
                    <h2 className="text-2xl font-black">Visão Financeira</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {projects.map(p => {
                         const payments = p.payments || [];
                         const totalPaid = payments.filter(pay => pay.status === 'paid').reduce((acc, pay) => acc + (pay.amount || 0), 0);
                         return (
                           <Card key={p.id} className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                 <h4 className="font-bold text-sm">{p.client?.name || 'Cliente'}</h4>
                                 <Badge color="blue">R$ {(p.value || 0).toLocaleString('pt-BR')}</Badge>
                              </div>
                              <div className="space-y-2">
                                 <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Faturado:</span>
                                    <span className="font-bold text-green-600">R$ {totalPaid.toLocaleString('pt-BR')}</span>
                                 </div>
                                 <div className="w-full bg-slate-100 h-1.5 rounded-full">
                                    <div className="bg-green-500 h-full" style={{ width: `${(totalPaid / (p.value || 1)) * 100}%` }}></div>
                                 </div>
                              </div>
                              <Button variant="outline" className="w-full mt-6 text-xs" onClick={() => {setSelectedProject(p); setActiveTab('projects')}}>Gerenciar Faturas</Button>
                           </Card>
                         );
                       })}
                    </div>
                 </div>
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
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nome do Cliente/Empresa</label>
              <input type="text" className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ex: Acme Corp" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} required />
           </div>
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">E-mail de Contato</label>
              <input type="email" className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="exemplo@email.com" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} required />
           </div>
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Demanda Inicial</label>
              <textarea className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 h-24" placeholder="Descreva brevemente o que o cliente precisa..." value={newLead.demand} onChange={e => setNewLead({...newLead, demand: e.target.value})} required></textarea>
           </div>
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Budget Estimado (R$)</label>
              <input type="number" className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ex: 5000" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} />
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-bold text-amber-900">Atenção: Esta ação arquivará o lead</p>
                <p className="text-xs text-amber-700 mt-1">
                  O lead <strong>{leadToDecline?.name}</strong> será marcado como "perdido" e arquivado.
                  Você não verá mais este lead na lista principal.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">
              Motivo do declínio (opcional)
            </label>
            <textarea
              className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 h-24"
              placeholder="Ex: Orçamento acima do esperado, prazo incompatível, cliente não respondeu..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>

          <div className="text-xs text-slate-500 italic">
            💡 Dica: Registrar o motivo ajuda a entender padrões de leads perdidos e melhorar futuras propostas.
          </div>
        </div>
      </Modal>

      <AIModal
        isOpen={aiModal.open}
        onClose={() => setAiModal({ ...aiModal, open: false })}
        title={aiModal.title}
        content={aiModal.content}
        type={aiModal.type}
        onApply={aiModal.onApply}
      />
    </div>
  );
}
