import React from 'react';
import { Users, Plus, ArrowRight } from 'lucide-react';

const Badge = ({ color = 'slate', children }) => {
  const colors = {
    green:  'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900',
    blue:   'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900',
    purple: 'bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900',
    yellow: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
    red:    'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900',
    slate:  'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const statusColor = (status) => {
  const map = { lead: 'purple', briefing: 'blue', proposal: 'yellow', negotiation: 'yellow', won: 'green', lost: 'red' };
  return map[status] || 'slate';
};

const statusLabel = (status) => {
  const map = { lead: 'Lead', briefing: 'Briefing', proposal: 'Proposta', negotiation: 'Negociação', won: 'Convertido', lost: 'Perdido' };
  return map[status] || status;
};

export default function LeadsView({ allLeads, filter, onFilterChange, onAddLead, onConvertLead, onDeclineLead }) {
  const activeCount   = allLeads.filter(l => l.status !== 'lost').length;
  const archivedCount = allLeads.filter(l => l.status === 'lost').length;

  const filtered = allLeads.filter(l =>
    filter === 'active' ? l.status !== 'lost' : l.status === 'lost'
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Leads</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Acompanhe seus potenciais clientes</p>
        </div>
        <button
          onClick={onAddLead}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-zinc-900 rounded-xl text-sm font-semibold hover:bg-brand-400 transition-colors shadow-sm"
        >
          <Plus size={15} /> Novo Lead
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1">
        {[
          { key: 'active',   label: 'Ativos',     count: activeCount },
          { key: 'archived', label: 'Arquivados',  count: archivedCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 flex items-center gap-2
              ${filter === tab.key
                ? 'border-brand-500 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
          >
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums
              ${filter === tab.key
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-3.5">Lead / Empresa</th>
              <th className="px-6 py-3.5">Demanda</th>
              <th className="px-6 py-3.5 font-mono">Valor Estimado</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 font-mono">Data</th>
              <th className="px-6 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Users className="text-zinc-300 dark:text-zinc-600" size={20} />
                    </div>
                    <p className="text-zinc-400 text-sm">
                      {filter === 'active' ? 'Nenhum lead ativo ainda' : 'Nenhum lead arquivado'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/20 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-400 flex-shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{lead.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 max-w-xs">
                    <p className="truncate">{lead.demand}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                    R$ {(lead.estimated_value || 0).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={statusColor(lead.status)}>{statusLabel(lead.status)}</Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-400 font-mono tabular-nums">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {filter === 'active' ? (
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onConvertLead(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-zinc-900 rounded-lg text-[11px] font-semibold hover:bg-brand-400 transition-colors"
                        >
                          Converter <ArrowRight size={11} />
                        </button>
                        <button
                          onClick={() => onDeclineLead(lead)}
                          className="px-3 py-1.5 text-red-500 border border-red-100 dark:border-red-900/50 rounded-lg text-[11px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          Declinar
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        {lead.metadata?.decline_reason && (
                          <p className="text-[10px] text-zinc-400 italic max-w-[200px] ml-auto truncate" title={lead.metadata.decline_reason}>
                            "{lead.metadata.decline_reason}"
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
