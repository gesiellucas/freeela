import React, { useState, useEffect } from 'react';
import { Network, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Loader2, Save } from 'lucide-react';
import { getEapByProjectId, createEap, createEapItem, updateEapItem, deleteEapItem } from '../lib/eap';
import { supabase } from '../lib/supabase';

const EapView = ({ projects, userId }) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [eap, setEap] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [newItemParentId, setNewItemParentId] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('Pacote_Trabalho');

  const [scopeVersions, setScopeVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');

  const isReadOnly = scopeVersions.find(v => v.id === selectedVersionId)?.status !== 'active';

  useEffect(() => {
    if (selectedProjectId) {
      loadVersions();
    } else {
      setScopeVersions([]);
      setSelectedVersionId('');
      setEap(null);
      setItems([]);
    }
  }, [selectedProjectId]);

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('scope_versions')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      setScopeVersions(data || []);
      if (data && data.length > 0) {
        // Encontrar a versão ativa, senão pegar a mais recente
        const active = data.find(v => v.status === 'active') || data[0];
        setSelectedVersionId(active.id);
      } else {
        setSelectedVersionId('');
        setEap(null);
        setItems([]);
      }
    } catch (err) {
      console.error('Error loading versions:', err);
    }
  };

  useEffect(() => {
    if (selectedProjectId && selectedVersionId) {
      loadEap(selectedVersionId);
    }
  }, [selectedProjectId, selectedVersionId]);

  const loadEap = async (versionId) => {
    setLoading(true);
    try {
      const data = await getEapByProjectId(selectedProjectId, versionId);
      if (data) {
        setEap({ id: data.id, name: data.name, description: data.description });
        setItems(data.items || []);
        // Expand all by default
        const expandAll = {};
        (data.items || []).forEach(i => expandAll[i.id] = true);
        setExpandedNodes(expandAll);
      } else {
        setEap(null);
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading EAP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEap = async () => {
    if (!selectedProjectId || !userId) return;
    setLoading(true);
    try {
      const proj = projects.find(p => p.id === selectedProjectId);
      const newEap = await createEap(selectedProjectId, userId, `EAP - ${proj.title}`);
      
      // Auto create root item
      const rootItem = await createEapItem(newEap.id, null, {
        nome: proj.title,
        tipo_item: 'Fase',
        codigo_estruturado: '1',
        nivel: 1,
        ordem: 1
      });
      
      // Reload versions list to get version 1
      await loadVersions();
    } catch (error) {
      console.error('Error creating EAP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (parentId) => {
    if (!newItemName.trim() || !eap) return;
    
    try {
      const siblings = items.filter(i => i.parent_id === parentId);
      const parent = items.find(i => i.id === parentId);
      
      const nextOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.ordem)) + 1 : 1;
      const parentCode = parent ? parent.codigo_estruturado : '';
      const newCode = parentCode ? `${parentCode}.${nextOrder}` : `${nextOrder}`;
      const newLevel = parent ? parent.nivel + 1 : 1;

      const newItem = await createEapItem(eap.id, parentId, {
        nome: newItemName,
        tipo_item: newItemType,
        codigo_estruturado: newCode,
        nivel: newLevel,
        ordem: nextOrder
      });

      setItems([...items, newItem]);
      setNewItemParentId(null);
      setNewItemName('');
      
      if (parentId) {
        setExpandedNodes({ ...expandedNodes, [parentId]: true });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Erro ao criar item: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const updated = await updateEapItem(itemId, updates);
      setItems(items.map(i => i.id === itemId ? { ...i, ...updated } : i));
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Tem certeza? Isso excluirá também todos os sub-itens.')) return;
    try {
      await deleteEapItem(itemId);
      await loadEap(selectedVersionId); // reload to get correct tree after cascade delete
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const toggleExpand = (id) => {
    setExpandedNodes({ ...expandedNodes, [id]: !expandedNodes[id] });
  };

  // Build tree
  const buildTree = (parentId = null) => {
    return items
      .filter(item => item.parent_id === parentId)
      .sort((a, b) => a.ordem - b.ordem)
      .map(item => ({
        ...item,
        children: buildTree(item.id)
      }));
  };

  const tree = buildTree(null);

  const getBadgeColor = (type) => {
    switch (type) {
      case 'Fase': return 'bg-blue-100 text-blue-800';
      case 'Entregavel': return 'bg-emerald-100 text-emerald-800';
      case 'Pacote_Trabalho': return 'bg-purple-100 text-purple-800';
      case 'Tarefa': return 'bg-warm-200 text-warm-900';
      default: return 'bg-warm-200 text-warm-900';
    }
  };

  const renderTreeItem = (node) => {
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="mb-2">
        <div className={`flex items-center justify-between p-3 bg-warm-50 border border-warm-300 rounded-xl hover:shadow-sm transition-all ml-${(node.nivel - 1) * 6}`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => toggleExpand(node.id)}
              className="text-warm-500 hover:text-brand-500 w-5 h-5 flex items-center justify-center"
            >
              {hasChildren ? (isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>) : <div className="w-4 h-4" />}
            </button>
            <span className="font-mono text-xs text-warm-500 font-bold w-12">{node.codigo_estruturado}</span>
            
            {editingItem === node.id ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  defaultValue={node.nome}
                  className="px-2 py-1 text-sm border border-warm-400 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                  onBlur={(e) => handleUpdateItem(node.id, { nome: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateItem(node.id, { nome: e.target.value })}
                  autoFocus
                />
              </div>
            ) : (
              <span className="font-medium text-warm-800 text-sm">{node.nome}</span>
            )}
            
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${getBadgeColor(node.tipo_item)}`}>
              {node.tipo_item.replace('_', ' ')}
            </span>
            
            {/* Progress Bar (simple visual) */}
            <div className="w-24 bg-warm-200 h-2 rounded-full overflow-hidden ml-4 flex items-center">
              <div className="bg-emerald-500 h-full" style={{ width: `${node.percentual_concluido || 0}%` }}></div>
            </div>
            <span className="text-xs text-warm-500 w-8">{node.percentual_concluido || 0}%</span>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setNewItemParentId(node.id)} className="p-1.5 text-warm-500 hover:bg-warm-200 rounded-md hover:text-brand-500" title="Adicionar Sub-item">
                <Plus size={14} />
              </button>
              <button onClick={() => setEditingItem(node.id)} className="p-1.5 text-warm-500 hover:bg-warm-200 rounded-md hover:text-blue-500" title="Editar">
                <Edit2 size={14} />
              </button>
              {node.parent_id !== null && ( // Don't delete root here
                <button onClick={() => handleDeleteItem(node.id)} className="p-1.5 text-warm-500 hover:bg-red-50 rounded-md hover:text-red-500" title="Excluir">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Form to add child */}
        {newItemParentId === node.id && (
          <div className={`mt-2 flex items-center gap-2 ml-${node.nivel * 6}`}>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Nome do item..."
                className="flex-1 px-3 py-2 text-sm border border-warm-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddItem(node.id)}
                autoFocus
              />
              <select 
                className="px-3 py-2 text-sm border border-warm-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-warm-50"
                value={newItemType}
                onChange={e => setNewItemType(e.target.value)}
              >
                <option value="Fase">Fase</option>
                <option value="Entregavel">Entregável</option>
                <option value="Pacote_Trabalho">Pacote de Trabalho</option>
                <option value="Tarefa">Tarefa</option>
              </select>
              <button type="button" onClick={() => handleAddItem(node.id)} className="bg-brand-500 text-warm-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-400">
                Adicionar
              </button>
              <button type="button" onClick={() => setNewItemParentId(null)} className="px-4 py-2 text-sm text-warm-500 hover:bg-warm-200 rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isExpanded && hasChildren && (
          <div className="mt-2">
            {node.children.map(child => renderTreeItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-warm-900">EAP / WBS</h2>
          <p className="text-sm text-warm-500 mt-1">Estrutura Analítica do Projeto orientada a entregáveis</p>
        </div>
        <div className="w-72">
          <select
            className="w-full bg-warm-50 border border-warm-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">Selecione um Projeto...</option>
            {projects.filter(p => p.status === 'active').map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="bg-warm-50 border border-warm-300 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Network size={32} className="text-brand-600" />
          </div>
          <h3 className="text-lg font-semibold text-warm-900 mb-2">Selecione um projeto</h3>
          <p className="text-warm-500 text-sm max-w-sm mx-auto">
            Escolha um projeto no menu acima para gerenciar sua Estrutura Analítica de Projeto.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </div>
      ) : !eap ? (
        <div className="bg-warm-50 border border-warm-300 rounded-2xl p-12 text-center">
          <Network size={40} className="text-warm-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-warm-900 mb-2">EAP não iniciada</h3>
          <p className="text-warm-500 text-sm max-w-sm mx-auto mb-6">
            Este projeto ainda não possui uma Estrutura Analítica. A EAP ajuda a decompor o escopo em entregáveis menores.
          </p>
          <button 
            onClick={handleCreateEap}
            className="bg-brand-500 text-warm-900 px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-400 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Criar Estrutura Inicial
          </button>
        </div>
      ) : (
        <div className="bg-warm-100 border border-warm-300 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-warm-300">
            <div className="flex items-center gap-6">
              <div>
                <h3 className="font-semibold text-warm-900 text-lg">{eap.name}</h3>
                <p className="text-sm text-warm-500 mt-0.5">{items.length} itens planejados</p>
              </div>
              {scopeVersions.length > 0 && (
                <div className="flex items-center gap-2 bg-warm-200/50 px-3 py-1.5 rounded-xl border border-warm-300">
                  <span className="text-[10px] font-black uppercase text-warm-500 tracking-wider">Versão:</span>
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-warm-950 focus:outline-none cursor-pointer"
                  >
                    {scopeVersions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version_number} - {v.notes || `Versão ${v.version_number}`} ({v.status === 'active' ? 'Ativa' : 'Arquivada'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-warm-50 border border-warm-400 text-warm-800 rounded-xl text-sm font-medium hover:bg-warm-100 transition-colors">
                Recalcular Progressos
              </button>
              <button className="px-4 py-2 bg-warm-900 text-white rounded-xl text-sm font-medium hover:bg-warm-800 transition-colors flex items-center gap-2">
                <Save size={16} />
                Salvar Baseline
              </button>
            </div>
          </div>

          {isReadOnly && (
            <div className="bg-yellow-50 border border-yellow-200/60 rounded-xl p-3 text-xs text-yellow-800 flex items-center gap-2 mb-6 shadow-sm">
              <AlertCircle size={14} className="text-yellow-600 flex-shrink-0" />
              <span>Você está visualizando um escopo histórico (versão arquivada). A edição e adição de itens estão desabilitadas para preservar o histórico operacional.</span>
            </div>
          )}

          <div className="space-y-1">
            {tree.map(node => renderTreeItem(node))}
          </div>
          
          {items.length === 0 && (
             <div className="text-center py-10 text-warm-500">Nenhum item na EAP.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EapView;
