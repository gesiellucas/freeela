import React, { useState, useRef } from 'react';
import { Receipt, Plus, FileText, Trash2, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { createFiscalNote, updateFiscalNote, deleteFiscalNote, uploadFile } from '../lib/supabase';

const Badge = ({ color = 'slate', children }) => {
  const colors = {
    green:  'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50',
    yellow: 'bg-amber-950/30 text-amber-400 border border-amber-900/50',
    red:    'bg-red-950/30 text-red-400 border border-red-900/50',
    slate:  'bg-zinc-800 text-zinc-400 border border-zinc-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const statusColor = (s) => ({ issued: 'green', pending: 'yellow', cancelled: 'red' }[s] || 'slate');
const statusLabel = (s) => ({ issued: 'Emitida', pending: 'Pendente', cancelled: 'Cancelada' }[s] || s);

export default function AreaFiscalView({ fiscalNotes, projects, userId, authUser, onNoteCreated, onNoteDeleted }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachingId, setAttachingId] = useState(null);
  const fileInputRefs = useRef({});

  const [form, setForm] = useState({
    nf_number: '',
    nf_series: '',
    issue_date: new Date().toISOString().split('T')[0],
    service_desc: '',
    gross_value: '',
    iss_rate: '5',
    project_id: '',
    recipient_name: '',
    recipient_cnpj: '',
    notes: '',
    status: 'issued',
  });

  const grossVal  = parseFloat(form.gross_value) || 0;
  const issRate   = (parseFloat(form.iss_rate) || 0) / 100;
  const issAmt    = grossVal * issRate;
  const netVal    = grossVal - issAmt;

  const totalBruto = fiscalNotes.filter(n => n.status === 'issued').reduce((acc, n) => acc + (n.gross_value || 0), 0);
  const totalIss   = fiscalNotes.filter(n => n.status === 'issued').reduce((acc, n) => acc + ((n.gross_value || 0) * (n.iss_rate || 0)), 0);

  const handleSave = async () => {
    if (!form.issue_date || !form.service_desc || !form.gross_value) return;
    setSaving(true);
    try {
      const { data, error } = await createFiscalNote(userId, {
        issue_date: form.issue_date,
        service_desc: form.service_desc,
        gross_value: grossVal,
        iss_rate: issRate,
        project_id: form.project_id || undefined,
        nf_number: form.nf_number || undefined,
        nf_series: form.nf_series || undefined,
        recipient_name: form.recipient_name || undefined,
        recipient_cnpj: form.recipient_cnpj || undefined,
        notes: form.notes || undefined,
        status: form.status,
      });
      if (error) throw error;
      if (onNoteCreated) onNoteCreated(data);
      setIsModalOpen(false);
      setForm({ nf_number: '', nf_series: '', issue_date: new Date().toISOString().split('T')[0], service_desc: '', gross_value: '', iss_rate: '5', project_id: '', recipient_name: '', recipient_cnpj: '', notes: '', status: 'issued' });
    } catch (err) {
      alert('Erro ao salvar NF: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`Excluir NF ${note.nf_number || '#' + note.id.slice(0, 6)}?`)) return;
    await deleteFiscalNote(note.id);
    if (onNoteDeleted) onNoteDeleted(note.id);
  };

  const handleAttachFile = async (note, file) => {
    if (!file) return;
    setAttachingId(note.id);
    try {
      const { data: uploadData, error: uploadErr } = await uploadFile(authUser.id, 'fiscal-notes', note.id, file);
      if (uploadErr) throw uploadErr;
      const { data: updated } = await updateFiscalNote(note.id, { file_path: uploadData.path, file_url: uploadData.url });
      // update in parent (simple: reload by calling onNoteCreated with updated note as workaround)
      if (onNoteCreated) onNoteCreated(updated); // parent should handle upsert
    } catch (err) {
      alert('Erro ao anexar arquivo: ' + (err.message || err));
    } finally {
      setAttachingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Área Fiscal</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-zinc-900 rounded-xl text-sm font-bold hover:bg-brand-400 transition-colors shadow-sm"
        >
          <Plus size={16} /> Emitir NF
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de NFs', value: fiscalNotes.filter(n => n.status === 'issued').length, suffix: '', color: 'border-l-blue-500' },
          { label: 'Valor Bruto Total', value: `R$ ${totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, suffix: '', color: 'border-l-green-500' },
          { label: 'ISS Recolhido', value: `R$ ${totalIss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, suffix: '', color: 'border-l-amber-500' },
        ].map(card => (
          <div key={card.label} className={`bg-zinc-900 rounded-xl border border-zinc-800/60 shadow-card p-5 border-l-4 ${card.color}`}>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{card.label}</p>
            <p className="text-2xl font-black mt-1 text-zinc-100">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800/60 shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-800/40 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3">NF #</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Projeto</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3 text-right">Bruto</th>
              <th className="px-4 py-3 text-right">ISS</th>
              <th className="px-4 py-3 text-right">Líquido</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Arquivo</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {fiscalNotes.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-6 py-16 text-center">
                  <Receipt className="mx-auto text-zinc-700 mb-3" size={36} />
                  <p className="text-zinc-500 italic text-sm">Nenhuma nota fiscal registrada</p>
                </td>
              </tr>
            ) : (
              fiscalNotes.map(note => {
                const iss = (note.gross_value || 0) * (note.iss_rate || 0);
                const net = (note.gross_value || 0) - iss;
                return (
                  <tr key={note.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-200">
                      {note.nf_number || <span className="text-zinc-600">—</span>}
                      {note.nf_series && <span className="text-zinc-500">/{note.nf_series}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                      {note.issue_date ? new Date(note.issue_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 max-w-[120px]">
                      <p className="truncate">{note.project?.title || note.project?.client?.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 max-w-[160px]">
                      <p className="truncate">{note.service_desc}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-right text-zinc-200">
                      R$ {(note.gross_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-right text-amber-400">
                      R$ {iss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-right text-emerald-400">
                      R$ {net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor(note.status)}>{statusLabel(note.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {note.file_url ? (
                        <a
                          href={note.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline"
                        >
                          <FileText size={12} /> Ver PDF
                        </a>
                      ) : (
                        <div>
                          {attachingId === note.id ? (
                            <Loader2 size={14} className="animate-spin text-blue-500" />
                          ) : (
                            <>
                              <button
                                onClick={() => fileInputRefs.current[note.id]?.click()}
                                className="text-[10px] text-brand-500 hover:underline font-bold"
                              >
                                Anexar PDF
                              </button>
                              <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                ref={el => fileInputRefs.current[note.id] = el}
                                onChange={e => handleAttachFile(note, e.target.files[0])}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(note)}
                        className="p-1.5 hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Excluir NF"
                      >
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Emitir NF */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800/60">
              <h3 className="font-black text-lg text-zinc-100">Emitir Nota Fiscal</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Número NF</label>
                  <input type="text" className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all" placeholder="Ex: 000123" value={form.nf_number} onChange={e => setForm({ ...form, nf_number: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Série</label>
                  <input type="text" className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all" placeholder="Ex: A" value={form.nf_series} onChange={e => setForm({ ...form, nf_series: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Data de Emissão *</label>
                  <input type="date" className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Projeto (opcional)</label>
                  <select className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                    <option value="">Nenhum</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title} — {p.client?.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Descrição do Serviço *</label>
                <textarea className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all h-20 resize-none" placeholder="Descreva o serviço prestado..." value={form.service_desc} onChange={e => setForm({ ...form, service_desc: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Valor Bruto R$ *</label>
                  <input type="number" min="0" step="0.01" className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all" placeholder="0,00" value={form.gross_value} onChange={e => setForm({ ...form, gross_value: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Alíquota ISS %</label>
                  <input type="number" min="0" max="100" step="0.01" className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all" value={form.iss_rate} onChange={e => setForm({ ...form, iss_rate: e.target.value })} />
                </div>
              </div>

              {grossVal > 0 && (
                <div className="bg-zinc-800/40 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-[10px] text-zinc-500 uppercase font-black">ISS</p><p className="font-black text-amber-400">R$ {issAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-[10px] text-zinc-500 uppercase font-black">Valor Líquido</p><p className="font-black text-emerald-400">R$ {netVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-[10px] text-zinc-500 uppercase font-black">Status</p>
                    <select className="mt-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs p-1 font-bold text-zinc-200" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="issued">Emitida</option>
                      <option value="pending">Pendente</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Tomador / Destinatário</label>
                  <input type="text" className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all" placeholder="Nome ou Razão Social" value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">CNPJ / CPF do Tomador</label>
                  <input type="text" className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all" placeholder="00.000.000/0000-00" value={form.recipient_cnpj} onChange={e => setForm({ ...form, recipient_cnpj: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Observações</label>
                <textarea className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-zinc-600 transition-all h-16 resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800/60 flex justify-end gap-3 bg-zinc-900/50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.issue_date || !form.service_desc || !form.gross_value} className="px-4 py-2 bg-brand-500 text-zinc-900 rounded-xl text-sm font-bold hover:bg-brand-400 disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Salvar NF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
