# 🔴 Funcionalidade: Declínio de Proposta

## ✅ Implementação Completa

### 📋 Resumo
Sistema completo para declinar propostas de leads, com arquivamento automático e registro de motivo.

---

## 🎯 Funcionalidades Adicionadas

### 1. **Declínio de Proposta**
- ✅ Botão "Declinar" na tabela de leads (página CRM & Leads)
- ✅ Botão de declínio (ícone X) nos cards de leads do Dashboard
- ✅ Modal de confirmação com aviso de arquivamento
- ✅ Campo opcional para registrar motivo do declínio
- ✅ Atualização automática de status para `lost`
- ✅ Remoção imediata do lead da visualização ativa

### 2. **Arquivamento Automático**
- ✅ Leads declinados recebem status `lost`
- ✅ Filtro automático na listagem (não exibe leads com status `lost`)
- ✅ Metadados salvos com data e motivo do declínio
- ✅ Histórico preservado no banco de dados

### 3. **Interface do Usuário**

#### Modal de Confirmação
```
┌─────────────────────────────────────────┐
│ Declinar Proposta                   [X] │
├─────────────────────────────────────────┤
│                                         │
│ ⚠️ Atenção: Esta ação arquivará o lead  │
│                                         │
│ O lead [Nome] será marcado como        │
│ "perdido" e arquivado.                 │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Motivo do declínio (opcional)       ││
│ │                                     ││
│ │ [Textarea para motivo]              ││
│ └─────────────────────────────────────┘│
│                                         │
│ 💡 Dica: Registrar o motivo ajuda...   │
│                                         │
│         [Cancelar] [Confirmar Declínio]│
└─────────────────────────────────────────┘
```

#### Botões Adicionados
- **Tabela de Leads**: Botão vermelho "Declinar" ao lado de "Converter"
- **Dashboard**: Ícone X vermelho ao passar mouse sobre card de lead

---

## 🔧 Arquivos Modificados

### 1. **app/src/lib/supabase.ts**
```typescript
// Nova função para declinar proposta
export async function declineProposal(leadId: string, reason?: string)

// Nova função para buscar leads arquivados
export async function getArchivedLeads(userId: string)
```

**O que foi adicionado:**
- Função `declineProposal()` - Atualiza status para 'lost' e salva metadados
- Função `getArchivedLeads()` - Busca apenas leads arquivados (futuro uso)
- Metadata salvada: `declined_at`, `decline_reason`

### 2. **app/src/App.jsx**

**Novos Estados:**
```javascript
const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
const [leadToDecline, setLeadToDecline] = useState(null);
const [declineReason, setDeclineReason] = useState('');
```

**Novas Funções:**
```javascript
const handleDeclineProposal = async () => { ... }
const openDeclineModal = (lead) => { ... }
```

**Modificações:**
- `loadAllData()` - Agora filtra leads com status !== 'lost'
- Import de `declineProposal` do módulo supabase
- Adição do Modal de confirmação de declínio
- Botões de declínio no Dashboard e na tabela de Leads

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `leads`

#### Status Possíveis (ENUM `lead_status`)
```sql
'lead'        -- Lead inicial
'briefing'    -- Em processo de briefing
'proposal'    -- Proposta enviada
'negotiation' -- Em negociação
'won'         -- ✅ Convertido em projeto
'lost'        -- ❌ DECLINADO/ARQUIVADO
```

#### Campo Metadata (JSONB)
Quando um lead é declinado, salvamos:
```json
{
  "declined_at": "2024-03-15T14:30:00Z",
  "decline_reason": "Cliente não tinha orçamento suficiente"
}
```

---

## 🎨 Fluxo de Uso

### Cenário 1: Declinar do Dashboard
```
1. Usuário passa mouse sobre card de lead
2. Aparece ícone X vermelho
3. Clica no X
4. Modal de confirmação abre
5. (Opcional) Preenche motivo
6. Clica em "Confirmar Declínio"
7. Lead desaparece da lista
8. Status atualizado para 'lost' no banco
```

### Cenário 2: Declinar da Tabela de Leads
```
1. Usuário acessa aba "CRM & Leads"
2. Passa mouse sobre linha do lead
3. Botão "Declinar" aparece
4. Clica em "Declinar"
5. Modal de confirmação abre
6. (Opcional) Preenche motivo
7. Clica em "Confirmar Declínio"
8. Lead removido da tabela
9. Status atualizado para 'lost' no banco
```

---

## 📊 Impacto nos Dados

### Antes do Declínio
```javascript
{
  id: "uuid-123",
  name: "Alpha Tech",
  email: "hi@alphatech.io",
  status: "proposal", // Em proposta
  metadata: {}
}
```

### Depois do Declínio
```javascript
{
  id: "uuid-123",
  name: "Alpha Tech",
  email: "hi@alphatech.io",
  status: "lost", // ❌ Arquivado
  metadata: {
    declined_at: "2024-03-15T14:30:00Z",
    decline_reason: "Orçamento incompatível"
  }
}
```

---

## 🔮 Melhorias Futuras Sugeridas

### 1. Página de Leads Arquivados
```javascript
// Já existe a função no supabase.ts
const { data } = await getArchivedLeads(userId);
```

Criar uma nova aba "Leads Arquivados" para:
- ✅ Visualizar leads declinados
- ✅ Ver motivos do declínio
- ✅ Analisar padrões de perda
- ✅ Reativar leads se necessário

### 2. Analytics de Conversão
```javascript
// Métricas úteis
const totalLeads = allLeads.length;
const wonLeads = allLeads.filter(l => l.status === 'won').length;
const lostLeads = allLeads.filter(l => l.status === 'lost').length;
const conversionRate = (wonLeads / totalLeads) * 100;
```

### 3. Categorização de Motivos
```javascript
// Adicionar campo de categoria
const declineCategories = [
  'price',      // Preço alto
  'timeline',   // Prazo incompatível
  'scope',      // Escopo não alinhado
  'no_response', // Cliente não respondeu
  'competitor',  // Escolheu concorrente
  'other'       // Outros
];
```

### 4. Notificações
- Email automático para o lead agradecendo o contato
- Registro de atividade no sistema

---

## 🧪 Como Testar

### Teste 1: Declinar do Dashboard
1. Acesse o Dashboard
2. Passe o mouse sobre um lead
3. Clique no ícone X vermelho
4. Verifique se o modal abre
5. Preencha um motivo
6. Confirme
7. Verifique se o lead desapareceu

### Teste 2: Declinar da Tabela
1. Acesse "CRM & Leads"
2. Passe o mouse sobre uma linha
3. Clique em "Declinar"
4. Verifique o modal
5. Confirme sem motivo
6. Verifique se o lead foi removido

### Teste 3: Verificar no Banco
```sql
-- Verificar leads arquivados
SELECT * FROM leads WHERE status = 'lost';

-- Ver metadados do declínio
SELECT
  name,
  email,
  metadata->>'declined_at' as declined_at,
  metadata->>'decline_reason' as reason
FROM leads
WHERE status = 'lost';
```

---

## 📝 Notas Técnicas

### Row Level Security (RLS)
- ✅ Leads arquivados ainda respeitam RLS
- ✅ Usuário só pode declinar seus próprios leads
- ✅ Filtro automático por `user_id`

### Performance
- ✅ Filtro de status aplicado no carregamento inicial
- ✅ Não há queries extras desnecessárias
- ✅ Uso de índice em `leads.status` para performance

### Validações
- ✅ Modal de confirmação previne declínios acidentais
- ✅ Motivo é opcional (flexibilidade)
- ✅ Timestamp automático de quando foi declinado

---

## ✅ Checklist de Implementação

- [x] Criar função `declineProposal` no supabase.ts
- [x] Criar função `getArchivedLeads` no supabase.ts
- [x] Adicionar estados no App.jsx
- [x] Implementar `handleDeclineProposal`
- [x] Implementar `openDeclineModal`
- [x] Filtrar leads arquivados em `loadAllData`
- [x] Adicionar botão "Declinar" na tabela
- [x] Adicionar ícone X no Dashboard
- [x] Criar Modal de confirmação
- [x] Testar fluxo completo
- [x] Documentar alterações

---

**Data de Implementação:** 2024-02-13
**Versão:** 1.0.0
**Status:** ✅ Concluído e Testado
