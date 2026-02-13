/**
 * Freeela - Supabase Client Configuration
 * Cliente configurado para comunicação com o banco de dados
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

// Variáveis de ambiente (adicione ao seu .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not found. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file'
  )
}

// Cliente Supabase tipado
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retorna o usuário autenticado atual
 */
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Retorna o user_id do banco (não o auth_user_id)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  return data?.id || null
}

/**
 * Login com email e senha
 */
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Registro de novo usuário
 */
export async function signUp(email: string, password: string, fullName: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { data: null, error: authError }
  }

  // Criar entrada na tabela users
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      email,
      full_name: fullName,
    })
    .select()
    .single()

  return { data: userData, error: userError }
}

/**
 * Logout
 */
export async function signOut() {
  return supabase.auth.signOut()
}

/**
 * Listener de mudanças de autenticação
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null)
  })
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Busca todos os leads do usuário
 */
export async function getLeads(userId: string) {
  return supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

/**
 * Busca todos os projetos ativos do usuário com seus relacionamentos
 */
export async function getProjects(userId: string) {
  return supabase
    .from('projects')
    .select(
      `
      *,
      client:clients(*),
      tasks(*),
      payments(*)
    `
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
}

/**
 * Busca um projeto específico com todos os detalhes
 */
export async function getProjectById(projectId: string) {
  return supabase
    .from('projects')
    .select(
      `
      *,
      client:clients(*),
      tasks(*),
      payments(*),
      documents(*),
      workflow_history(*)
    `
    )
    .eq('id', projectId)
    .single()
}

/**
 * Busca tarefas de um projeto específico
 */
export async function getTasksByProject(projectId: string) {
  return supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
}

/**
 * Atualiza o status de uma tarefa
 */
export async function updateTaskStatus(taskId: string, status: 'todo' | 'doing' | 'done') {
  return supabase.from('tasks').update({ status }).eq('id', taskId)
}

/**
 * Busca resumo financeiro de todos os projetos
 */
export async function getFinancialSummary() {
  return supabase.from('project_financial_summary').select('*')
}

/**
 * Busca métricas do dashboard
 */
export async function getDashboardMetrics(userId: string) {
  return supabase.from('dashboard_metrics').select('*').eq('user_id', userId).single()
}

/**
 * Cria um novo lead
 */
export async function createLead(userId: string, leadData: any) {
  return supabase
    .from('leads')
    .insert({
      user_id: userId,
      ...leadData,
    })
    .select()
    .single()
}

/**
 * Converte um lead em cliente e projeto
 */
export async function convertLeadToProject(leadId: string, userId: string) {
  // 1. Buscar o lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return { data: null, error: leadError }
  }

  // 2. Criar cliente
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

  if (clientError || !client) {
    return { data: null, error: clientError }
  }

  // 3. Criar projeto
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

  if (projectError) {
    return { data: null, error: projectError }
  }

  // 4. Atualizar lead como convertido
  await supabase
    .from('leads')
    .update({
      status: 'won',
      converted_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  return { data: { client, project }, error: null }
}

/**
 * Avança o workflow de um projeto
 */
export async function advanceProjectWorkflow(projectId: string) {
  const workflowOrder: any[] = [
    'initial_contact',
    'understanding',
    'proposal',
    'contract',
    'development',
    'payment',
    'finalization',
  ]

  // Buscar step atual
  const { data: project } = await supabase
    .from('projects')
    .select('current_step')
    .eq('id', projectId)
    .single()

  if (!project) return { data: null, error: 'Project not found' }

  const currentIndex = workflowOrder.indexOf(project.current_step)
  const nextStep = workflowOrder[currentIndex + 1]

  if (!nextStep) {
    return { data: null, error: 'Already at final step' }
  }

  // Atualizar step
  return supabase.from('projects').update({ current_step: nextStep }).eq('id', projectId)
}

/**
 * Cria um novo pagamento
 */
export async function createPayment(userId: string, paymentData: any) {
  return supabase
    .from('payments')
    .insert({
      user_id: userId,
      ...paymentData,
    })
    .select()
    .single()
}

/**
 * Marca um pagamento como pago
 */
export async function markPaymentAsPaid(paymentId: string) {
  return supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_date: new Date().toISOString(),
    })
    .eq('id', paymentId)
}

/**
 * Salva um documento gerado
 */
export async function saveDocument(userId: string, documentData: any) {
  return supabase
    .from('documents')
    .insert({
      user_id: userId,
      ...documentData,
    })
    .select()
    .single()
}

/**
 * Busca atividades recentes
 */
export async function getRecentActivities(userId: string, limit: number = 20) {
  return supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Inscreve-se para mudanças em tarefas de um projeto
 */
export function subscribeToProjectTasks(
  projectId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`project-${projectId}-tasks`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,
      },
      callback
    )
    .subscribe()
}

/**
 * Inscreve-se para mudanças em pagamentos de um projeto
 */
export function subscribeToProjectPayments(
  projectId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`project-${projectId}-payments`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `project_id=eq.${projectId}`,
      },
      callback
    )
    .subscribe()
}

export default supabase
