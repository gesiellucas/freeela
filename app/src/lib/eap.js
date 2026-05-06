import { supabase } from './supabase';

export const getEapByProjectId = async (projectId) => {
  const { data: eap, error } = await supabase
    .from('eap')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
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
  const { data, error } = await supabase
    .from('eap')
    .insert([
      { project_id: projectId, user_id: userId, name, description }
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
