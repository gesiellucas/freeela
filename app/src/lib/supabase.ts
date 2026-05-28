/**
 * Freeela - Supabase Client Configuration
 * Cliente configurado para comunicação com o banco de dados
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ ERRO: Credenciais do Supabase não configuradas!\n' +
    'Crie um arquivo .env na pasta app/ com:\n' +
    'VITE_SUPABASE_URL=https://seu-projeto.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=sua-anon-key'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ============================================
// AUTENTICAÇÃO
// ============================================

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (error) {
    console.error('Erro ao buscar user_id:', error)
    return null
  }

  return data?.id || null
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

  if (authError || !authData.user) {
    return { data: null, error: authError }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({ auth_user_id: authData.user.id, email, full_name: fullName })
    .select()
    .single()

  return { data: userData, error: userError }
}

export async function signOut() {
  return supabase.auth.signOut()
}

export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null)
  })
}

// ============================================
// LEADS
// ============================================

/**
 * Busca leads do usuário com filtro opcional de status.
 * statusFilter: undefined = todos, 'active' = não perdidos, 'archived' = perdidos
 */
export async function getLeads(userId: string, statusFilter?: 'active' | 'archived') {
  let q = supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (statusFilter === 'active') q = q.neq('status', 'lost')
  else if (statusFilter === 'archived') q = q.eq('status', 'lost')

  return q
}

export async function createLead(userId: string, leadData: any) {
  return supabase
    .from('leads')
    .insert({ user_id: userId, ...leadData })
    .select()
    .single()
}

export async function declineProposal(leadId: string, reason?: string) {
  return supabase
    .from('leads')
    .update({
      status: 'lost',
      metadata: {
        declined_at: new Date().toISOString(),
        decline_reason: reason || 'Cliente recusou a proposta',
      },
    })
    .eq('id', leadId)
}

export async function convertLeadToProject(leadId: string, userId: string) {
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) return { data: null, error: leadError }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      lead_id: leadId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
    })
    .select()
    .single()

  if (clientError || !client) return { data: null, error: clientError }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      client_id: client.id,
      title: lead.demand,
      value: lead.estimated_value || 0,
      current_step: 'initial_contact',
    })
    .select()
    .single()

  if (projectError) return { data: null, error: projectError }

  await supabase
    .from('leads')
    .update({ status: 'won', converted_at: new Date().toISOString() })
    .eq('id', leadId)

  return { data: { client, project }, error: null }
}

// ============================================
// PROJETOS
// ============================================

/**
 * Busca projetos do usuário com filtro de status.
 * status: 'active' | 'archived' | 'declined' | 'all'
 */
export async function getProjects(
  userId: string,
  status: 'active' | 'archived' | 'declined' | 'all' = 'active'
) {
  let q = supabase
    .from('projects')
    .select('*, client:clients(*), tasks(*), payments(*), checklists(*, checklist_items(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status !== 'all') q = q.eq('status', status)

  return q
}

export async function getProjectById(projectId: string) {
  return supabase
    .from('projects')
    .select('*, client:clients(*), tasks(*), payments(*), checklists(*, checklist_items(*)), documents(*), workflow_history(*), proposals(*), contracts(*), media_files(*), fiscal_notes(*)')
    .eq('id', projectId)
    .single()
}

export async function declineProject(projectId: string, reason?: string) {
  return supabase
    .from('projects')
    .update({
      is_active: false,
      status: 'declined',
      metadata: {
        declined_at: new Date().toISOString(),
        decline_reason: reason || 'Projeto declinado',
      },
    })
    .eq('id', projectId)
}

export async function archiveProject(projectId: string) {
  return supabase
    .from('projects')
    .update({
      is_active: false,
      status: 'archived',
      archived_at: new Date().toISOString(),
    })
    .eq('id', projectId)
}

export async function advanceProjectWorkflow(projectId: string) {
  const workflowOrder = [
    'initial_contact', 'understanding', 'proposal',
    'contract', 'development', 'payment', 'finalization',
  ]

  const { data: project } = await supabase
    .from('projects')
    .select('current_step')
    .eq('id', projectId)
    .single()

  if (!project) return { data: null, error: 'Project not found' }

  const nextStep = workflowOrder[workflowOrder.indexOf(project.current_step) + 1]
  if (!nextStep) return { data: null, error: 'Already at final step' }

  return supabase.from('projects').update({ current_step: nextStep }).eq('id', projectId)
}

export async function createProjectDirectly(userId: string, data: {
  clientName: string
  clientEmail?: string
  title: string
  value: number
}) {
  const email = data.clientEmail || `contato@${data.clientName.toLowerCase().replace(/\s+/g, '')}.com`
  
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      name: data.clientName,
      email: email,
    })
    .select()
    .single()

  if (clientError || !client) return { data: null, error: clientError }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      client_id: client.id,
      title: data.title,
      value: data.value || 0,
      current_step: 'initial_contact',
    })
    .select()
    .single()

  if (projectError) return { data: null, error: projectError }

  return { data: project, error: null }
}

// ============================================
// CHECKLISTS
// ============================================

export async function getChecklists(userId: string) {
  return supabase
    .from('checklists')
    .select('*, project:projects(id, title, client:clients(name)), checklist_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function createChecklist(userId: string, data: {
  project_id: string
  title: string
  description?: string
  priority?: string
  status?: string
  due_date?: string
}) {
  return supabase
    .from('checklists')
    .insert({ user_id: userId, ...data })
    .select('*, project:projects(id, title, client:clients(name)), checklist_items(*)')
    .single()
}

export async function updateChecklist(checklistId: string, updates: {
  title?: string
  description?: string
  priority?: string
  status?: string
  due_date?: string
}) {
  return supabase
    .from('checklists')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', checklistId)
    .select('*, project:projects(id, title, client:clients(name)), checklist_items(*)')
    .single()
}

export async function deleteChecklist(checklistId: string) {
  return supabase.from('checklists').delete().eq('id', checklistId)
}

// ============================================
// CHECKLIST ITEMS (subtarefas)
// ============================================

export async function createChecklistItem(checklistId: string, title: string) {
  return supabase
    .from('checklist_items')
    .insert({ checklist_id: checklistId, title })
    .select()
    .single()
}

export async function toggleChecklistItem(itemId: string, completed: boolean) {
  return supabase
    .from('checklist_items')
    .update({ completed })
    .eq('id', itemId)
    .select()
    .single()
}

export async function deleteChecklistItem(itemId: string) {
  return supabase.from('checklist_items').delete().eq('id', itemId)
}

// ============================================
// TAREFAS
// ============================================

export async function getTasksByProject(projectId: string) {
  return supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
}

export async function updateTaskStatus(taskId: string, status: 'todo' | 'doing' | 'waiting' | 'done') {
  return supabase.from('tasks').update({ status }).eq('id', taskId)
}

// ============================================
// PAGAMENTOS
// ============================================

export async function createPayment(userId: string, paymentData: any) {
  return supabase
    .from('payments')
    .insert({ user_id: userId, ...paymentData })
    .select()
    .single()
}

export async function markPaymentAsPaid(paymentId: string) {
  return supabase
    .from('payments')
    .update({ status: 'paid', paid_date: new Date().toISOString() })
    .eq('id', paymentId)
}

// ============================================
// ACORDOS COMERCIAIS
// ============================================

export async function getCommercialAgreements(userId: string, projectId?: string) {
  let q = supabase
    .from('commercial_agreements')
    .select('*, project:projects(id, title, client:clients(name)), lead:leads(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (projectId) {
    q = q.eq('project_id', projectId);
  }

  return q;
}

export async function createCommercialAgreement(userId: string, data: any) {
  return supabase
    .from('commercial_agreements')
    .insert({ user_id: userId, ...data })
    .select()
    .single();
}

export async function updateCommercialAgreement(agreementId: string, updates: any) {
  return supabase
    .from('commercial_agreements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', agreementId)
    .select()
    .single();
}

export async function deleteCommercialAgreement(agreementId: string) {
  return supabase.from('commercial_agreements').delete().eq('id', agreementId);
}

// ============================================
// PROPOSTAS COMERCIAIS
// ============================================

export async function getProposals(userId: string) {
  return supabase
    .from('proposals')
    .select('*, project:projects(id, title, client:clients(name)), lead:leads(id, name), media_files(*), commercial_agreement:commercial_agreements(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function createProposal(userId: string, data: {
  title: string
  description?: string
  project_id?: string
  lead_id?: string
  status?: string
  notes?: string
}) {
  // Criar acordo comercial associado
  const { data: agreement, error: agreementError } = await supabase
    .from('commercial_agreements')
    .insert({
      user_id: userId,
      project_id: data.project_id || null,
      lead_id: data.lead_id || null,
      title: data.title,
      description: data.description || null,
      type: 'proposal',
      status: data.status || 'draft',
      total_value: 0.00,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (agreementError) return { data: null, error: agreementError };

  return supabase
    .from('proposals')
    .insert({
      user_id: userId,
      commercial_agreement_id: agreement.id,
      ...data
    })
    .select()
    .single();
}

export async function updateProposal(proposalId: string, updates: {
  title?: string
  description?: string
  status?: string
  sent_at?: string
  responded_at?: string
  notes?: string
}) {
  const { data: prop } = await supabase
    .from('proposals')
    .select('commercial_agreement_id')
    .eq('id', proposalId)
    .single();

  if (prop?.commercial_agreement_id) {
    const agreementUpdates: any = {};
    if (updates.title !== undefined) agreementUpdates.title = updates.title;
    if (updates.description !== undefined) agreementUpdates.description = updates.description;
    if (updates.status !== undefined) agreementUpdates.status = updates.status;
    if (updates.notes !== undefined) agreementUpdates.notes = updates.notes;

    if (Object.keys(agreementUpdates).length > 0) {
      await supabase
        .from('commercial_agreements')
        .update(agreementUpdates)
        .eq('id', prop.commercial_agreement_id);
    }
  }

  return supabase
    .from('proposals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', proposalId)
    .select()
    .single()
}

export async function deleteProposal(proposalId: string) {
  const { data: prop } = await supabase
    .from('proposals')
    .select('commercial_agreement_id')
    .eq('id', proposalId)
    .single();

  const res = await supabase.from('proposals').delete().eq('id', proposalId);

  if (prop?.commercial_agreement_id) {
    await supabase.from('commercial_agreements').delete().eq('id', prop.commercial_agreement_id);
  }

  return res;
}

// ============================================
// CONTRATOS
// ============================================

export async function getContracts(userId: string) {
  return supabase
    .from('contracts')
    .select('*, project:projects(id, title, client:clients(*)), media_files(*), commercial_agreement:commercial_agreements(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function createContract(userId: string, data: {
  title: string
  project_id: string
  description?: string
  status?: string
  effective_date?: string
  expiry_date?: string
  notes?: string
}) {
  // Buscar valor do projeto para o valor total do acordo
  const { data: proj } = await supabase
    .from('projects')
    .select('value')
    .eq('id', data.project_id)
    .single();

  const projValue = proj?.value || 0;

  // Criar acordo comercial associado
  const { data: agreement, error: agreementError } = await supabase
    .from('commercial_agreements')
    .insert({
      user_id: userId,
      project_id: data.project_id,
      title: data.title,
      description: data.description || null,
      type: 'contract',
      status: data.status || 'draft',
      total_value: projValue,
      billing_model: 'fixed_price',
      effective_date: data.effective_date || null,
      expiry_date: data.expiry_date || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (agreementError) return { data: null, error: agreementError };

  return supabase
    .from('contracts')
    .insert({
      user_id: userId,
      commercial_agreement_id: agreement.id,
      ...data
    })
    .select()
    .single()
}

export async function updateContract(contractId: string, updates: {
  title?: string
  description?: string
  status?: string
  signed_at?: string
  effective_date?: string
  expiry_date?: string
  notes?: string
}) {
  const { data: contr } = await supabase
    .from('contracts')
    .select('commercial_agreement_id, user_id, project_id, status')
    .eq('id', contractId)
    .single();

  if (contr?.commercial_agreement_id) {
    const agreementUpdates: any = {};
    if (updates.title !== undefined) agreementUpdates.title = updates.title;
    if (updates.description !== undefined) agreementUpdates.description = updates.description;
    if (updates.status !== undefined) agreementUpdates.status = updates.status;
    if (updates.effective_date !== undefined) agreementUpdates.effective_date = updates.effective_date;
    if (updates.expiry_date !== undefined) agreementUpdates.expiry_date = updates.expiry_date;
    if (updates.notes !== undefined) agreementUpdates.notes = updates.notes;

    if (Object.keys(agreementUpdates).length > 0) {
      await supabase
        .from('commercial_agreements')
        .update(agreementUpdates)
        .eq('id', contr.commercial_agreement_id);
    }

    // Se o status mudou para 'signed' agora, e for um aditivo, executa o versionamento recursivo da EAP
    if (updates.status === 'signed' && contr.status !== 'signed') {
      const { data: agreement } = await supabase
        .from('commercial_agreements')
        .select('type')
        .eq('id', contr.commercial_agreement_id)
        .single();

      if (agreement && agreement.type === 'addendum') {
        const { error: eapError } = await supabase.rpc('fn_create_new_eap_version', {
          p_project_id: contr.project_id,
          p_user_id: contr.user_id,
          p_agreement_id: contr.commercial_agreement_id,
          p_notes: `Aditivo assinado: ${updates.title || 'Sem título'}`
        });
        if (eapError) {
          console.error('Erro ao versionar EAP ao assinar aditivo:', eapError);
        }
      }
    }
  }

  return supabase
    .from('contracts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .select()
    .single()
}

export async function deleteContract(contractId: string) {
  const { data: contr } = await supabase
    .from('contracts')
    .select('commercial_agreement_id')
    .eq('id', contractId)
    .single();

  const res = await supabase.from('contracts').delete().eq('id', contractId);

  if (contr?.commercial_agreement_id) {
    await supabase.from('commercial_agreements').delete().eq('id', contr.commercial_agreement_id);
  }

  return res;
}

export async function createAddendum(userId: string, data: {
  title: string
  project_id: string
  description?: string
  status?: string
  total_value: number
  estimated_hours?: number
  effective_date?: string
  expiry_date?: string
  notes?: string
}) {
  // 1. Criar acordo comercial associado (tipo 'addendum')
  const { data: agreement, error: agreementError } = await supabase
    .from('commercial_agreements')
    .insert({
      user_id: userId,
      project_id: data.project_id,
      title: data.title,
      description: data.description || null,
      type: 'addendum',
      status: data.status || 'draft',
      total_value: data.total_value || 0,
      estimated_hours: data.estimated_hours || null,
      billing_model: 'fixed_price',
      effective_date: data.effective_date || null,
      expiry_date: data.expiry_date || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (agreementError) return { data: null, error: agreementError };

  // 2. Criar contrato correspondente para anexar arquivos e gerenciar status
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      user_id: userId,
      project_id: data.project_id,
      commercial_agreement_id: agreement.id,
      title: data.title,
      description: data.description || null,
      status: data.status || 'draft',
      effective_date: data.effective_date || null,
      expiry_date: data.expiry_date || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (contractError) return { data: null, error: contractError };

  // 3. Se foi criado diretamente como assinado, acionar o versionamento
  if (data.status === 'signed') {
    const { error: eapError } = await supabase.rpc('fn_create_new_eap_version', {
      p_project_id: data.project_id,
      p_user_id: userId,
      p_agreement_id: agreement.id,
      p_notes: `Aditivo criado como Assinado: ${data.title}`
    });
    if (eapError) {
      console.error('Erro ao versionar EAP:', eapError);
    }
  }

  return { data: contract, error: null };
}

export async function createNewEapVersion(projectId: string, userId: string, agreementId: string, notes: string) {
  return supabase.rpc('fn_create_new_eap_version', {
    p_project_id: projectId,
    p_user_id: userId,
    p_agreement_id: agreementId,
    p_notes: notes
  });
}

// ============================================
// NOTAS FISCAIS
// ============================================

export async function getFiscalNotes(userId: string) {
  return supabase
    .from('fiscal_notes')
    .select('*, project:projects(id, title, client:clients(name))')
    .eq('user_id', userId)
    .order('issue_date', { ascending: false })
}

export async function createFiscalNote(userId: string, data: {
  issue_date: string
  service_desc: string
  gross_value: number
  iss_rate: number
  project_id?: string
  payment_id?: string
  nf_number?: string
  nf_series?: string
  recipient_name?: string
  recipient_cnpj?: string
  status?: string
  notes?: string
}) {
  return supabase
    .from('fiscal_notes')
    .insert({ user_id: userId, ...data })
    .select()
    .single()
}

export async function updateFiscalNote(noteId: string, updates: {
  nf_number?: string
  status?: string
  file_path?: string
  file_url?: string
  notes?: string
}) {
  return supabase
    .from('fiscal_notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
}

export async function deleteFiscalNote(noteId: string) {
  return supabase.from('fiscal_notes').delete().eq('id', noteId)
}

// ============================================
// ARQUIVOS DE MÍDIA
// ============================================

export async function createMediaFile(userId: string, fileData: {
  file_name: string
  file_path: string
  file_url: string
  mime_type?: string
  file_size?: number
  description?: string
  proposal_id?: string
  contract_id?: string
  project_id?: string
  sort_order?: number
}) {
  return supabase
    .from('media_files')
    .insert({ user_id: userId, ...fileData })
    .select()
    .single()
}

export async function deleteMediaFile(fileId: string) {
  return supabase.from('media_files').delete().eq('id', fileId)
}

// ============================================
// SUPABASE STORAGE
// ============================================

/**
 * Faz upload de um arquivo para o Supabase Storage.
 * @param authUserId - auth.uid() do usuário (para o caminho no Storage)
 * @param folder     - subpasta: 'proposals' | 'contracts' | 'projects' | 'fiscal-notes'
 * @param entityId   - UUID da entidade pai
 * @param file       - File object
 */
export async function uploadFile(
  authUserId: string,
  folder: 'proposals' | 'contracts' | 'projects' | 'fiscal-notes',
  entityId: string,
  file: File
): Promise<{ data: { path: string; url: string } | null; error: any }> {
  const ext = file.name.split('.').pop()
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `${authUserId}/${folder}/${entityId}/${uniqueName}`

  const { error: uploadError } = await supabase.storage
    .from('freeela')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) return { data: null, error: uploadError }

  const { data: urlData, error: urlError } = await supabase.storage
    .from('freeela')
    .createSignedUrl(filePath, 86400)

  if (urlError) return { data: null, error: urlError }

  return { data: { path: filePath, url: urlData.signedUrl }, error: null }
}

export async function deleteStorageFile(filePath: string) {
  return supabase.storage.from('freeela').remove([filePath])
}

export async function getSignedUrl(filePath: string, expiresIn: number = 3600) {
  return supabase.storage.from('freeela').createSignedUrl(filePath, expiresIn)
}

// ============================================
// FINANCEIRO / MÉTRICAS
// ============================================

export async function getFinancialSummary() {
  return supabase.from('project_financial_summary').select('*')
}

export async function getDashboardMetrics(userId: string) {
  return supabase.from('dashboard_metrics').select('*').eq('user_id', userId).single()
}

export async function getRecentActivities(userId: string, limit: number = 20) {
  return supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
}

// ============================================
// PROJECT COMMENTS
// ============================================

export async function getProjectComments(projectId: string) {
  return supabase
    .from('project_comments')
    .select('*, user:users(full_name, avatar_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
}

export async function getAllProjectComments(userId: string, limit: number = 40) {
  return supabase
    .from('project_comments')
    .select('*, project:projects(id, title, color, client:clients(name)), user:users(full_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
}

export async function createProjectComment(projectId: string, userId: string, content: string) {
  return supabase
    .from('project_comments')
    .insert({ project_id: projectId, user_id: userId, content })
    .select('*, user:users(full_name, avatar_url), project:projects(id, title, color, client:clients(name))')
    .single()
}

export async function deleteProjectComment(commentId: string) {
  return supabase.from('project_comments').delete().eq('id', commentId)
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToProjectTasks(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`project-${projectId}-tasks`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, callback)
    .subscribe()
}

export function subscribeToProjectPayments(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`project-${projectId}-payments`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `project_id=eq.${projectId}` }, callback)
    .subscribe()
}

export default supabase
