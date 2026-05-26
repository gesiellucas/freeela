import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { getEapByProjectId, updateEapItem } from '../lib/eap';
import Gantt from 'frappe-gantt';
import '../app/frappe-gantt.css'; // Using local copy due to exports restriction

const CronogramaView = ({ projects, userId }) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [eap, setEap] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ganttRef = useRef(null);
  const ganttInstance = useRef(null);

  useEffect(() => {
    if (selectedProjectId) {
      loadEap();
    } else {
      setEap(null);
      setItems([]);
      if (ganttInstance.current) {
         ganttInstance.current.clear();
      }
    }
  }, [selectedProjectId]);

  const loadEap = async () => {
    setLoading(true);
    try {
      const data = await getEapByProjectId(selectedProjectId);
      if (data) {
        setEap(data);
        setItems(data.items || []);
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

  useEffect(() => {
    if (!ganttRef.current || loading || items.length === 0) return;

    const ganttTasks = items.map(item => {
      const today = new Date();
      const start = item.data_inicio_planejada ? new Date(item.data_inicio_planejada) : today;
      const end = item.data_fim_planejada ? new Date(item.data_fim_planejada) : new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
      
      return {
        id: item.id,
        name: item.nome,
        start: start,
        end: end,
        progress: item.percentual_concluido || 0,
        dependencies: item.parent_id ? item.parent_id : '',
        custom_class: item.tipo_item === 'Fase' ? 'bar-milestone' : ''
      };
    });

    if (ganttTasks.length === 0) return;

    if (!ganttInstance.current) {
      ganttInstance.current = new Gantt(ganttRef.current, ganttTasks, {
        on_click: task => console.log(task),
        on_date_change: async (task, start, end) => {
          try {
            await updateEapItem(task.id, {
              data_inicio_planejada: start instanceof Date ? start.toISOString() : start,
              data_fim_planejada: end instanceof Date ? end.toISOString() : end
            });
            // Atualiza o estado local para evitar recarregamento
            setItems(prev => prev.map(item => item.id === task.id ? { ...item, data_inicio_planejada: start, data_fim_planejada: end } : item));
          } catch (err) {
             console.error('Error updating task date:', err);
             if (err && typeof err === 'object') {
               console.error('Detalhes do erro:', JSON.stringify(err, null, 2));
             }
          }
        },
        on_progress_change: async (task, progress) => {
          try {
            await updateEapItem(task.id, {
              percentual_concluido: progress
            });
            setItems(prev => prev.map(item => item.id === task.id ? { ...item, percentual_concluido: progress } : item));
          } catch (err) {
             console.error('Error updating task progress:', err);
             if (err && typeof err === 'object') {
               console.error('Detalhes do erro:', JSON.stringify(err, null, 2));
             }
          }
        },
        view_mode: 'Week',
        language: 'pt'
      });
    } else {
      ganttInstance.current.refresh(ganttTasks);
    }
  }, [items, loading]);

  const changeViewMode = (mode) => {
    if (ganttInstance.current) {
      ganttInstance.current.change_view_mode(mode);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-warm-900">Cronograma</h2>
          <p className="text-sm text-warm-500 mt-1">Visualização em Gráfico de Gantt</p>
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
            <Calendar size={32} className="text-brand-600" />
          </div>
          <h3 className="text-lg font-semibold text-warm-900 mb-2">Selecione um projeto</h3>
          <p className="text-warm-500 text-sm max-w-sm mx-auto">
            Escolha um projeto no menu acima para visualizar seu cronograma.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-warm-50 border border-warm-300 rounded-2xl p-12 text-center">
          <Calendar size={40} className="text-warm-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-warm-900 mb-2">EAP Vazia</h3>
          <p className="text-warm-500 text-sm max-w-sm mx-auto mb-6">
            O projeto atual não possui itens na EAP. Vá até o módulo EAP/WBS e adicione itens para visualizá-los aqui.
          </p>
        </div>
      ) : (
        <div className="bg-warm-50 border border-warm-300 rounded-2xl p-6 shadow-sm">
           <div className="flex justify-end gap-2 mb-4">
              <button onClick={() => changeViewMode('Quarter Day')} className="px-3 py-1 text-sm bg-warm-200 hover:bg-warm-300 rounded-lg">1/4 Dia</button>
              <button onClick={() => changeViewMode('Half Day')} className="px-3 py-1 text-sm bg-warm-200 hover:bg-warm-300 rounded-lg">1/2 Dia</button>
              <button onClick={() => changeViewMode('Day')} className="px-3 py-1 text-sm bg-warm-200 hover:bg-warm-300 rounded-lg">Dia</button>
              <button onClick={() => changeViewMode('Week')} className="px-3 py-1 text-sm bg-brand-100 text-brand-700 hover:bg-brand-200 rounded-lg font-medium">Semana</button>
              <button onClick={() => changeViewMode('Month')} className="px-3 py-1 text-sm bg-warm-200 hover:bg-warm-300 rounded-lg">Mês</button>
           </div>
           <div className="overflow-x-auto w-full">
             <svg ref={ganttRef} className="w-full"></svg>
           </div>
        </div>
      )}
    </div>
  );
};

export default CronogramaView;
