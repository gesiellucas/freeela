import React from 'react';
import { DollarSign, TrendingUp, Clock, ArrowRight } from 'lucide-react';

const WORKFLOW_STEPS = [
  { id: 1, key: 'initial_contact' }, { id: 2, key: 'understanding' },
  { id: 3, key: 'proposal' },        { id: 4, key: 'contract' },
  { id: 5, key: 'development' },     { id: 6, key: 'payment' },
  { id: 7, key: 'finalization' },
];

const getStepNumber = (stepKey) => {
  const s = WORKFLOW_STEPS.find(s => s.key === stepKey);
  return s ? s.id : 1;
};

export default function FinanceiroView({ projects, onSelectProject }) {
  const activeProjects = projects.filter(p => p.status === 'active');

  const totalBilled = activeProjects.reduce((acc, p) => {
    return acc + (p.payments || []).filter(pay => pay.status === 'paid').reduce((a, pay) => a + (pay.amount || 0), 0);
  }, 0);

  const billableProjects = activeProjects.filter(p => getStepNumber(p.current_step) >= 6);
  const totalPending = billableProjects.reduce((acc, p) => {
    const paid = (p.payments || []).filter(pay => pay.status === 'paid').reduce((a, pay) => a + (pay.amount || 0), 0);
    return acc + Math.max(0, (p.value || 0) - paid);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Financeiro</h2>
        <p className="text-sm text-zinc-400 mt-0.5">Visão geral das suas receitas</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* A Receber */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800/60 shadow-card p-6 border-l-[3px] border-l-amber-400">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-amber-900/20 rounded-xl flex items-center justify-center">
              <Clock className="text-amber-500" size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-900/20 px-2 py-1 rounded-md">Pendente</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">A Receber</p>
          <p className="text-3xl font-bold font-mono text-zinc-100 tracking-tight">
            R$ {totalPending.toLocaleString('pt-BR')}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2">em {billableProjects.length} projeto{billableProjects.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Já Recebido */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800/60 shadow-card p-6 border-l-[3px] border-l-emerald-400">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-900/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-emerald-500" size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded-md">Recebido</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Já Recebido</p>
          <p className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            R$ {totalBilled.toLocaleString('pt-BR')}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2">pagamentos confirmados</p>
        </div>

        {/* Em Pagamento */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800/60 shadow-card p-6 border-l-[3px] border-l-blue-400">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-blue-900/20 rounded-xl flex items-center justify-center">
              <DollarSign className="text-blue-400" size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-900/20 px-2 py-1 rounded-md">Ativo</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Em Pagamento</p>
          <p className="text-3xl font-bold font-mono text-zinc-100 tracking-tight">
            {billableProjects.length}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2">projetos nas etapas finais</p>
        </div>
      </div>

      {/* Projects grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Visão por Projeto</h3>
        {activeProjects.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
            Nenhum projeto ativo
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map(p => {
              const payments = p.payments || [];
              const totalPaid = payments.filter(pay => pay.status === 'paid').reduce((acc, pay) => acc + (pay.amount || 0), 0);
              const pct = p.value ? Math.min(100, Math.round((totalPaid / p.value) * 100)) : 0;
              const pending = Math.max(0, (p.value || 0) - totalPaid);
              const isBillable = getStepNumber(p.current_step) >= 6;

              return (
                <div key={p.id}
                  className="bg-zinc-900 rounded-2xl border border-zinc-800/60 shadow-card p-5 hover:shadow-elevated hover:border-zinc-700 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-semibold text-sm text-zinc-100 truncate">{p.client?.name || 'Cliente'}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{p.title}</p>
                    </div>
                    <span className="font-bold font-mono text-sm text-zinc-200 whitespace-nowrap">
                      R$ {(p.value || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-500 font-medium">Faturado</span>
                      <span className="font-semibold font-mono text-emerald-400">
                        R$ {totalPaid.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    {isBillable && pending > 0 && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-zinc-500 font-medium">A Receber</span>
                        <span className="font-semibold font-mono text-amber-400">R$ {pending.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {!isBillable && (
                      <p className="text-[10px] text-zinc-600 italic">Aguardando conclusão do desenvolvimento</p>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectProject(p)}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl py-2.5 text-xs font-semibold transition-colors border border-zinc-700/60"
                  >
                    Gerenciar Faturas <ArrowRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
