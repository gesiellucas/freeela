# Guia de Arquitetura de Produto e Diretrizes de Domínio (Mini PSA)

Este documento serve como diretriz oficial para a evolução do sistema Freeela, atuando como um mini PSA (Professional Services Automation) para freelancers, consultores e pequenas software houses. Deve ser consultado e atualizado sempre que uma nova funcionalidade significativa for planejada ou implementada.

---

## 1. Visão Geral e Objetivo do Produto
O objetivo principal do sistema é gerenciar operações de serviços profissionais, integrando de forma contínua três camadas fundamentais do negócio:
- **Camada Comercial**: Propostas, contratos, aditivos, precificação e orçamentos.
- **Camada de Execução (Operacional)**: Projetos, entregáveis (EAP/WBS), tarefas, checklists, apontamento de horas e esforço.
- **Camada Financeira**: Faturamento, recebimentos, custos, despesas, margens e rentabilidade.

**O sistema NÃO é um ERP genérico.** O foco está estritamente na entrega e rentabilidade de serviços de software e correlatos.

---

## 2. Estrutura e Definições do Domínio Principal

### 2.1. Entidades Principais
1. **Cliente (`Client`)**
   - Uma empresa ou pessoa física contratante.
   - Um cliente pode ter múltiplos projetos vinculados.
2. **Projeto (`Project`)**
   - O container principal de execução do trabalho.
   - Pertence a um cliente e pode agrupar múltiplos acordos comerciais ao longo de seu ciclo de vida.
3. **Acordo Comercial (`Commercial Agreement` / `Acordo Comercial`)**
   - Entidade central unificadora da camada comercial (substitui termos confusos como "termo").
   - Modela propostas, contratos, aditivos, ordens de serviço e outros documentos comerciais.
   - Possui tipo, status, valor, prazo estimado, forma de cobrança (Time & Materials, Preço Fixo, Retainer) e vigência.
   - Propostas aprovadas não mudam simplesmente de status no mesmo registro; elas geram novos registros para manter histórico, versões e rastreabilidade.
4. **Escopo Versionado (`Scope Version`)**
   - O escopo executável (SOW) é desvinculado fisicamente do documento comercial para permitir revisões, aditivos e ajustes de escopo sem perder a integridade histórica dos acordos originais.
5. **Estrutura de Execução (EAP / WBS)**
   - O escopo é decomposto hierarquicamente orientando-se a entregáveis.
   - Níveis hierárquicos suportados:
     - **Entregável** (Deliverable)
     - **Pacote de Trabalho** (Work Package)
     - **Tarefa** (Task)
     - **Subtarefa** (Subtask)
     - **Item de Checklist** (Checklist Item)
   - Pode ser implementado via tabela genérica de nós hierárquicos com autorrelacionamento (`parent_id`) e tipo de nó (`node_type`), ou tabelas específicas bem relacionadas.
6. **Tempo, Valor e Progresso**
   - O acordo comercial define o valor e tempo estimados totais.
   - Esses valores são distribuídos na EAP (por peso, proporcionalidade ou definição manual).
   - Progresso calculado com base em checklists, apontamentos de horas, pesos de nós filhos ou atualização manual, a depender do tipo de nó.

### 2.2. Rigor Semântico de Conceitos Comerciais
- **Proposta**: Apresentação comercial inicial de solução, preço, escopo e prazo. Sem caráter jurídico vinculante definitivo.
- **Contrato**: Documento jurídico vinculante formal contendo cláusulas, garantias, propriedade intelectual, condições de pagamento, multas e rescisões.
- **Escopo / SOW / Ordem de Serviço (OS)**: Detalhamento técnico objetivo do que será entregue, prazos específicos, valores e limites de atuação.
- **Acordo Comercial**: Entidade agregadora/polimórfica que abstrai e unifica propostas, contratos, aditivos e OSs, mantendo o histórico de interações comerciais do projeto.

---

## 3. Diretrizes de Evolução de Engenharia e Arquitetura

### 3.1. Princípios de Evolução Incremental
- **Preservação de Dados**: Nunca deletar ou alterar tabelas de produção sem um plano de migração ou retrocompatibilidade.
- **Evolução por Camadas**: Separar rigidamente a lógica comercial, operacional, financeira e analítica.
- **RLS (Row Level Security)**: Toda nova tabela no Supabase deve conter políticas de RLS estritas vinculadas ao usuário logado ou à organização do freelancer.
- **Linguagem Profissional**: Nomes de entidades, colunas e telas devem ser claros, significativos e padronizados em inglês (para código/banco) e português (para exibição na interface), ou conforme convenção já estabelecida no repositório.
- **Simplicidade (SaaS para PMEs e Freelancers)**: Evitar complexidades desnecessárias de nível Enterprise se soluções enxutas resolverem o problema de forma clara.

### 3.2. Métricas de Gestão a Serem Monitoradas
- Desvio de Escopo (Escopo planejado vs. realizado).
- Horas Estimadas vs. Horas Realizadas.
- Margem de Lucro por Projeto e Rentabilidade por Cliente.
- Taxa de Conclusão e Atrasos em Entregáveis.
- Balanço Financeiro: Faturado vs. Recebido.
- Backlog Operacional e Capacidade/Carga de Trabalho.

---

## 4. Estrutura de Resposta a Demandas
Sempre que uma nova funcionalidade, dúvida ou alteração for proposta pelo usuário, o arquiteto técnico deve responder seguindo exatamente a estrutura abaixo:

1. **Leitura do problema**: Explicação clara do problema sob a ótica de produto e domínio.
2. **Impacto no domínio**: Indicação das entidades afetadas e as ramificações comerciais, operacionais, financeiras ou analíticas.
3. **Melhor modelagem possível**: Descrição conceitual das soluções (Ideal vs. Pragmática vs. Futura).
4. **Estratégia de implementação**: Detalhamento técnico no Next.js + Supabase (tabelas, colunas, chaves, políticas RLS, Server Actions, componentes de interface).
5. **Riscos e trade-offs**: Mapeamento de possíveis dívidas técnicas ou riscos de acoplamento.
6. **Recomendação prática**: Sequenciamento de tarefas (o que fazer agora, o que fazer depois, qual o caminho mais seguro).
7. **Entregáveis solicitados**: (Se pedido pelo usuário: SQL, Mermaid, diagramas, backlog, etc.).
