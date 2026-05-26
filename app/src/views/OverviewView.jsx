import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Activity,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  FolderOpen,
} from 'lucide-react';
import {
  getProjectComments,
  createProjectComment,
  deleteProjectComment,
  getAllProjectComments,
} from '../lib/supabase';

// ─── Constantes ────────────────────────────────────────────────────────────────

const WORKFLOW_LABELS = {
  initial_contact: 'Contato Inicial',
  understanding: 'Entender Demanda',
  proposal: 'Propor Soluções',
  contract: 'Assinar Contrato',
  development: 'Desenvolvimento',
  payment: 'Pagamento',
  finalization: 'Finalização',
};

const WORKFLOW_STEP_COLOR = {
  initial_contact: 'bg-blue-50 text-blue-600 border-blue-200',
  understanding: 'bg-violet-50 text-violet-600 border-violet-200',
  proposal: 'bg-amber-50 text-amber-600 border-amber-200',
  contract: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  development: 'bg-sky-50 text-sky-600 border-sky-200',
  payment: 'bg-orange-50 text-orange-600 border-orange-200',
  finalization: 'bg-green-50 text-green-600 border-green-200',
};

const PROJECT_COLORS = {
  amber: 'bg-amber-400',
  blue: 'bg-blue-400',
  emerald: 'bg-emerald-400',
  violet: 'bg-violet-400',
  rose: 'bg-rose-400',
  sky: 'bg-sky-400',
  orange: 'bg-orange-400',
  teal: 'bg-teal-400',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `${mins}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days === 1) return 'ontem';
  return `${days} dias atrás`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatCurrency(value) {
  if (!value) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

// ─── Componentes internos ──────────────────────────────────────────────────────

const WorkflowBadge = ({ step }) => (
  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${WORKFLOW_STEP_COLOR[step] || 'bg-warm-200 text-warm-500 border-warm-300'}`}>
    {WORKFLOW_LABELS[step] || step}
  </span>
);

const CommentItem = ({ comment, onDelete, projectTitle }) => (
  <div className="flex gap-3 group">
    <div className="w-7 h-7 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-brand-600 mt-0.5">
      {(comment.user?.full_name || 'U').charAt(0).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-warm-800">{comment.user?.full_name || 'Você'}</span>
          {projectTitle && (
            <span className="text-[10px] text-warm-500">em <span className="font-medium text-warm-500">{projectTitle}</span></span>
          )}
        </div>
        <span className="text-[10px] text-warm-500 shrink-0">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-sm text-warm-600 leading-relaxed">{comment.content}</p>
    </div>
    {onDelete && (
      <button
        onClick={() => onDelete(comment.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-warm-400 hover:text-red-400 flex-shrink-0 mt-1"
        title="Apagar comentário"
      >
        <Trash2 size={13} />
      </button>
    )}
  </div>
);

const ProjectCard = ({ project, expanded, comments, loadingComments, newComment, onNewCommentChange, onToggle, onAddComment, onDeleteComment }) => {
  const colorDot = PROJECT_COLORS[project.color] || 'bg-warm-400';
  const commentCount = comments.length;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onAddComment(project.id);
    }
  };

  return (
    <div className={`bg-warm-50 rounded-2xl border transition-all duration-200 overflow-hidden ${expanded ? 'border-brand-300 shadow-brand' : 'border-warm-300/60 shadow-card hover:border-warm-400'}`}>
      {/* Card header — sempre visível */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4"
      >
        {/* Cor do projeto */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorDot}`} />

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-warm-900 text-sm truncate">{project.title}</p>
              <p className="text-xs text-warm-500 truncate">{project.client?.name || 'Cliente não vinculado'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <WorkflowBadge step={project.current_step} />
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-warm-500 flex-shrink-0">
          {project.deadline && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(project.deadline)}
            </span>
          )}
          {project.value && (
            <span className="flex items-center gap-1">
              <DollarSign size={11} />
              {formatCurrency(project.value)}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-warm-500">
            <MessageSquare size={12} />
            <span className="font-medium">{commentCount}</span>
          </span>
        </div>

        {/* Chevron */}
        <div className="text-warm-400 flex-shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Seção expandida de comentários */}
      {expanded && (
        <div className="border-t border-warm-200 px-5 py-4 space-y-4">
          {/* Input novo comentário */}
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-brand-600">
              V
            </div>
            <div className="flex-1 relative">
              <textarea
                value={newComment}
                onChange={(e) => onNewCommentChange(project.id, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Adicione um comentário... (Ctrl+Enter para enviar)"
                rows={2}
                className="w-full bg-warm-100 border border-warm-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-500 outline-none transition-all resize-none"
              />
              <button
                onClick={() => onAddComment(project.id)}
                disabled={!newComment?.trim()}
                className="absolute right-3 bottom-3 text-brand-500 hover:text-brand-600 disabled:text-warm-400 transition-colors"
                title="Enviar comentário"
              >
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* Lista de comentários */}
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <Loader2 size={18} className="animate-spin text-brand-400" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-warm-500 text-center py-3">Nenhum comentário ainda. Seja o primeiro!</p>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onDelete={(id) => onDeleteComment(id, project.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CommentTimeline = ({ comments, loading }) => (
  <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card sticky top-20">
    <div className="px-5 py-4 border-b border-warm-200 flex items-center gap-2">
      <Activity size={15} className="text-brand-500" />
      <h3 className="text-sm font-semibold text-warm-800">Atividade Recente</h3>
    </div>
    <div className="p-4 max-h-[calc(100vh-220px)] overflow-y-auto">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-brand-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={28} className="mx-auto text-warm-300 mb-2" />
          <p className="text-xs text-warm-500">Nenhum comentário ainda.</p>
          <p className="text-xs text-warm-500 mt-1">Expanda um projeto para começar.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map((comment, index) => (
            <div key={comment.id} className="relative">
              {/* Linha vertical da timeline */}
              {index < comments.length - 1 && (
                <div className="absolute left-3.5 top-7 bottom-0 w-px bg-warm-200" />
              )}
              <CommentItem
                comment={comment}
                projectTitle={comment.project?.title}
                onDelete={null}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── View principal ────────────────────────────────────────────────────────────

export default function OverviewView({ projects, userId }) {
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [recentComments, setRecentComments] = useState([]);
  const [newComments, setNewComments] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(true);

  const activeProjects = projects.filter(p => p.is_active || p.status === 'active');

  // Carrega a timeline global ao montar
  useEffect(() => {
    if (!userId) return;
    setTimelineLoading(true);
    getAllProjectComments(userId).then(({ data }) => {
      if (data) setRecentComments(data);
      setTimelineLoading(false);
    });
  }, [userId]);

  const handleToggleProject = async (project) => {
    if (expandedProjectId === project.id) {
      setExpandedProjectId(null);
      return;
    }
    setExpandedProjectId(project.id);

    // Carrega comentários somente uma vez por sessão
    if (!commentsMap[project.id]) {
      setLoadingComments(prev => ({ ...prev, [project.id]: true }));
      const { data } = await getProjectComments(project.id);
      setCommentsMap(prev => ({ ...prev, [project.id]: data || [] }));
      setLoadingComments(prev => ({ ...prev, [project.id]: false }));
    }
  };

  const handleNewCommentChange = (projectId, value) => {
    setNewComments(prev => ({ ...prev, [projectId]: value }));
  };

  const handleAddComment = async (projectId) => {
    const content = newComments[projectId]?.trim();
    if (!content || !userId || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await createProjectComment(projectId, userId, content);
      if (error) throw error;
      if (data) {
        setCommentsMap(prev => ({
          ...prev,
          [projectId]: [data, ...(prev[projectId] || [])],
        }));
        setRecentComments(prev => [data, ...prev]);
        setNewComments(prev => ({ ...prev, [projectId]: '' }));
      }
    } catch (err) {
      console.error('Erro ao criar comentário:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId, projectId) => {
    await deleteProjectComment(commentId);
    setCommentsMap(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(c => c.id !== commentId),
    }));
    setRecentComments(prev => prev.filter(c => c.id !== commentId));
  };

  const totalComments = recentComments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 tracking-tight">Overview</h1>
          <p className="text-sm text-warm-500 mt-1">
            Acompanhe todos os freelas em aberto e registre observações por projeto.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-warm-50 border border-warm-300 rounded-xl px-4 py-2.5 text-center shadow-card">
            <p className="text-xl font-bold text-warm-900">{activeProjects.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Em aberto</p>
          </div>
          <div className="bg-warm-50 border border-warm-300 rounded-xl px-4 py-2.5 text-center shadow-card">
            <p className="text-xl font-bold text-brand-500">{totalComments}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Comentários</p>
          </div>
        </div>
      </div>

      {/* Layout principal */}
      {activeProjects.length === 0 ? (
        <div className="bg-warm-50 rounded-2xl border border-warm-300/60 shadow-card flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-warm-200 flex items-center justify-center">
            <FolderOpen size={26} className="text-warm-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-warm-600">Nenhum freela em aberto</p>
            <p className="text-sm text-warm-500 mt-1">Converta um lead em projeto para acompanhar aqui.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Projetos — 2/3 */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-warm-500 px-1">
              Projetos em andamento — {activeProjects.length}
            </p>
            {activeProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                expanded={expandedProjectId === project.id}
                comments={commentsMap[project.id] || []}
                loadingComments={!!loadingComments[project.id]}
                newComment={newComments[project.id] || ''}
                onNewCommentChange={handleNewCommentChange}
                onToggle={() => handleToggleProject(project)}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
              />
            ))}
          </div>

          {/* Timeline — 1/3 */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-warm-500 px-1 mb-3">
              Timeline de comentários
            </p>
            <CommentTimeline comments={recentComments} loading={timelineLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
