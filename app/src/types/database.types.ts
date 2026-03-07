/**
 * Freeela - Database Types
 * Tipos TypeScript gerados baseados no schema do Supabase
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// ENUM TYPES
// ============================================

export type LeadStatus =
  | 'lead'
  | 'briefing'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'

export type WorkflowStep =
  | 'initial_contact'
  | 'understanding'
  | 'proposal'
  | 'contract'
  | 'development'
  | 'payment'
  | 'finalization'

export type TaskStatus = 'todo' | 'doing' | 'done'

export type TaskType =
  | 'technical'
  | 'administrative'
  | 'communication'
  | 'documentation'
  | 'meeting'
  | 'review'

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export type DocumentType =
  | 'briefing'
  | 'proposal'
  | 'contract'
  | 'invoice'
  | 'report'
  | 'other'

// ============================================
// DATABASE TYPES
// ============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      leads: {
        Row: Lead
        Insert: LeadInsert
        Update: LeadUpdate
      }
      clients: {
        Row: Client
        Insert: ClientInsert
        Update: ClientUpdate
      }
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
      tasks: {
        Row: Task
        Insert: TaskInsert
        Update: TaskUpdate
      }
      payments: {
        Row: Payment
        Insert: PaymentInsert
        Update: PaymentUpdate
      }
      documents: {
        Row: Document
        Insert: DocumentInsert
        Update: DocumentUpdate
      }
      workflow_history: {
        Row: WorkflowHistory
        Insert: WorkflowHistoryInsert
        Update: WorkflowHistoryUpdate
      }
      activities: {
        Row: Activity
        Insert: ActivityInsert
        Update: ActivityUpdate
      }
    }
    Views: {
      project_financial_summary: {
        Row: ProjectFinancialSummary
      }
      dashboard_metrics: {
        Row: DashboardMetrics
      }
    }
    Functions: {}
    Enums: {
      lead_status: LeadStatus
      workflow_step: WorkflowStep
      task_status: TaskStatus
      task_type: TaskType
      payment_status: PaymentStatus
      document_type: DocumentType
    }
  }
}

// ============================================
// TABLE TYPES
// ============================================

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string | null
  company_name?: string | null
  phone?: string | null
  auth_user_id?: string | null
  settings?: Json
  created_at: string
  updated_at: string
}

export interface UserInsert {
  id?: string
  email: string
  full_name: string
  avatar_url?: string | null
  company_name?: string | null
  phone?: string | null
  auth_user_id?: string | null
  settings?: Json
  created_at?: string
  updated_at?: string
}

export interface UserUpdate {
  email?: string
  full_name?: string
  avatar_url?: string | null
  company_name?: string | null
  phone?: string | null
  settings?: Json
  updated_at?: string
}

export interface Lead {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  demand: string
  estimated_value?: number | null
  status: LeadStatus
  priority: number
  source?: string | null
  notes?: string | null
  metadata?: Json
  created_at: string
  updated_at: string
  converted_at?: string | null
}

export interface LeadInsert {
  id?: string
  user_id: string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  demand: string
  estimated_value?: number | null
  status?: LeadStatus
  priority?: number
  source?: string | null
  notes?: string | null
  metadata?: Json
  created_at?: string
  updated_at?: string
  converted_at?: string | null
}

export interface LeadUpdate {
  name?: string
  email?: string
  phone?: string | null
  company?: string | null
  demand?: string
  estimated_value?: number | null
  status?: LeadStatus
  priority?: number
  source?: string | null
  notes?: string | null
  metadata?: Json
  updated_at?: string
  converted_at?: string | null
}

export interface Client {
  id: string
  user_id: string
  lead_id?: string | null
  name: string
  email: string
  phone?: string | null
  company?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  zip_code?: string | null
  cpf_cnpj?: string | null
  tax_id?: string | null
  contact_person?: string | null
  contact_position?: string | null
  notes?: string | null
  tags?: string[] | null
  metadata?: Json
  created_at: string
  updated_at: string
}

export interface ClientInsert {
  id?: string
  user_id: string
  lead_id?: string | null
  name: string
  email: string
  phone?: string | null
  company?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  zip_code?: string | null
  cpf_cnpj?: string | null
  tax_id?: string | null
  contact_person?: string | null
  contact_position?: string | null
  notes?: string | null
  tags?: string[] | null
  metadata?: Json
  created_at?: string
  updated_at?: string
}

export interface ClientUpdate {
  name?: string
  email?: string
  phone?: string | null
  company?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  zip_code?: string | null
  cpf_cnpj?: string | null
  tax_id?: string | null
  contact_person?: string | null
  contact_position?: string | null
  notes?: string | null
  tags?: string[] | null
  metadata?: Json
  updated_at?: string
}

export interface Project {
  id: string
  user_id: string
  client_id: string
  title: string
  description?: string | null
  current_step: WorkflowStep
  is_active: boolean
  value: number
  currency: string
  deadline?: string | null
  start_date?: string | null
  completion_date?: string | null
  folders_created: boolean
  folder_path?: string | null
  root_directory?: string | null
  color?: string | null
  tags?: string[] | null
  metadata?: Json
  created_at: string
  updated_at: string
  archived_at?: string | null
}

export interface ProjectInsert {
  id?: string
  user_id: string
  client_id: string
  title: string
  description?: string | null
  current_step?: WorkflowStep
  is_active?: boolean
  value: number
  currency?: string
  deadline?: string | null
  start_date?: string | null
  completion_date?: string | null
  folders_created?: boolean
  folder_path?: string | null
  root_directory?: string | null
  color?: string | null
  tags?: string[] | null
  metadata?: Json
  created_at?: string
  updated_at?: string
  archived_at?: string | null
}

export interface ProjectUpdate {
  title?: string
  description?: string | null
  current_step?: WorkflowStep
  is_active?: boolean
  value?: number
  currency?: string
  deadline?: string | null
  start_date?: string | null
  completion_date?: string | null
  folders_created?: boolean
  folder_path?: string | null
  root_directory?: string | null
  color?: string | null
  tags?: string[] | null
  metadata?: Json
  updated_at?: string
  archived_at?: string | null
}

export interface Task {
  id: string
  project_id: string
  user_id: string
  title: string
  description?: string | null
  status: TaskStatus
  task_type: TaskType
  priority: number
  position: number
  due_date?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  parent_task_id?: string | null
  tags?: string[] | null
  attachments?: Json
  metadata?: Json
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export interface TaskInsert {
  id?: string
  project_id: string
  user_id: string
  title: string
  description?: string | null
  status?: TaskStatus
  task_type?: TaskType
  priority?: number
  position?: number
  due_date?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  parent_task_id?: string | null
  tags?: string[] | null
  attachments?: Json
  metadata?: Json
  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

export interface TaskUpdate {
  title?: string
  description?: string | null
  status?: TaskStatus
  task_type?: TaskType
  priority?: number
  position?: number
  due_date?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  parent_task_id?: string | null
  tags?: string[] | null
  attachments?: Json
  metadata?: Json
  updated_at?: string
  completed_at?: string | null
}

export interface Payment {
  id: string
  project_id: string
  user_id: string
  description: string
  amount: number
  currency: string
  status: PaymentStatus
  due_date?: string | null
  paid_date?: string | null
  invoice_number?: string | null
  invoice_url?: string | null
  tax_amount?: number | null
  net_amount?: number | null
  payment_method?: string | null
  payment_reference?: string | null
  notes?: string | null
  metadata?: Json
  created_at: string
  updated_at: string
}

export interface PaymentInsert {
  id?: string
  project_id: string
  user_id: string
  description: string
  amount: number
  currency?: string
  status?: PaymentStatus
  due_date?: string | null
  paid_date?: string | null
  invoice_number?: string | null
  invoice_url?: string | null
  tax_amount?: number | null
  net_amount?: number | null
  payment_method?: string | null
  payment_reference?: string | null
  notes?: string | null
  metadata?: Json
  created_at?: string
  updated_at?: string
}

export interface PaymentUpdate {
  description?: string
  amount?: number
  currency?: string
  status?: PaymentStatus
  due_date?: string | null
  paid_date?: string | null
  invoice_number?: string | null
  invoice_url?: string | null
  tax_amount?: number | null
  net_amount?: number | null
  payment_method?: string | null
  payment_reference?: string | null
  notes?: string | null
  metadata?: Json
  updated_at?: string
}

export interface Document {
  id: string
  user_id: string
  project_id?: string | null
  lead_id?: string | null
  title: string
  document_type: DocumentType
  content: string
  content_html?: string | null
  file_url?: string | null
  file_path?: string | null
  file_size?: number | null
  mime_type?: string | null
  version: number
  parent_document_id?: string | null
  is_draft: boolean
  is_archived: boolean
  tags?: string[] | null
  metadata?: Json
  created_at: string
  updated_at: string
  sent_at?: string | null
  signed_at?: string | null
}

export interface DocumentInsert {
  id?: string
  user_id: string
  project_id?: string | null
  lead_id?: string | null
  title: string
  document_type: DocumentType
  content: string
  content_html?: string | null
  file_url?: string | null
  file_path?: string | null
  file_size?: number | null
  mime_type?: string | null
  version?: number
  parent_document_id?: string | null
  is_draft?: boolean
  is_archived?: boolean
  tags?: string[] | null
  metadata?: Json
  created_at?: string
  updated_at?: string
  sent_at?: string | null
  signed_at?: string | null
}

export interface DocumentUpdate {
  title?: string
  document_type?: DocumentType
  content?: string
  content_html?: string | null
  file_url?: string | null
  file_path?: string | null
  file_size?: number | null
  mime_type?: string | null
  version?: number
  is_draft?: boolean
  is_archived?: boolean
  tags?: string[] | null
  metadata?: Json
  updated_at?: string
  sent_at?: string | null
  signed_at?: string | null
}

export interface WorkflowHistory {
  id: string
  project_id: string
  user_id: string
  from_step?: WorkflowStep | null
  to_step: WorkflowStep
  notes?: string | null
  created_at: string
}

export interface WorkflowHistoryInsert {
  id?: string
  project_id: string
  user_id: string
  from_step?: WorkflowStep | null
  to_step: WorkflowStep
  notes?: string | null
  created_at?: string
}

export interface WorkflowHistoryUpdate {
  notes?: string | null
}

export interface Activity {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  action: string
  description?: string | null
  changes?: Json
  created_at: string
}

export interface ActivityInsert {
  id?: string
  user_id: string
  entity_type: string
  entity_id: string
  action: string
  description?: string | null
  changes?: Json
  created_at?: string
}

export interface ActivityUpdate {
  description?: string | null
  changes?: Json
}

// ============================================
// VIEW TYPES
// ============================================

export interface ProjectFinancialSummary {
  project_id: string
  project_title: string
  total_value: number
  paid_amount: number
  pending_amount: number
  overdue_amount: number
  remaining_amount: number
  completion_percentage: number
}

export interface DashboardMetrics {
  user_id: string
  total_leads: number
  active_leads: number
  total_projects: number
  active_projects: number
  total_project_value: number
  total_billed: number
  total_pending: number
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
}

// ============================================
// HELPER TYPES
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
