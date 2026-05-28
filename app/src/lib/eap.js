import { supabase } from './supabase';

export const getEapByProjectId = async (projectId, scopeVersionId = null) => {
  let q = supabase
    .from('eap')
    .select('*, scope_versions!inner(*)');

  if (scopeVersionId) {
    q = q.eq('scope_version_id', scopeVersionId);
  } else {
    q = q.eq('scope_versions.status', 'active');
  }

  const { data: eap, error } = await q.eq('project_id', projectId).maybeSingle();

  if (error) {
    throw error;
  }
  
  if (!eap) return null;

  const { data: items, error: itemsError } = await supabase
    .from('eap_items')
    .select('*')
    .eq('eap_id', eap.id)
    .order('codigo_estruturado', { ascending: true });

  if (itemsError) throw itemsError;

  return { ...eap, items };
};

export const createEap = async (projectId, userId, name, description = '') => {
  // 1. Criar uma versão de escopo ativa inicial
  const { data: version, error: versionError } = await supabase
    .from('scope_versions')
    .insert([
      {
        user_id: userId,
        project_id: projectId,
        version_number: 1,
        status: 'active',
        notes: 'Versão inicial criada automaticamente'
      }
    ])
    .select()
    .single();

  if (versionError) throw versionError;

  // 2. Criar a EAP vinculada a essa versão de escopo
  const { data, error } = await supabase
    .from('eap')
    .insert([
      { project_id: projectId, user_id: userId, name, description, scope_version_id: version.id }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createEapItem = async (eapId, parentId, itemData) => {
  const { data, error } = await supabase
    .from('eap_items')
    .insert([
      { eap_id: eapId, parent_id: parentId, ...itemData }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEapItem = async (itemId, updates) => {
  const { data, error } = await supabase
    .from('eap_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEapItem = async (itemId) => {
  const { error } = await supabase
    .from('eap_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
  return true;
};
