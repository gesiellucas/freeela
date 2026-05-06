Especificação Funcional: Módulo de EAP (WBS)
1. Visão Geral do Módulo
O módulo de EAP posiciona-se como o núcleo estratégico para planejamento e execução dentro da plataforma de gestão de freelancers. Ele transcende a visão visual em árvore, tornando-se o "motor" que conecta escopo, tempo e custo. O foco central é a orientação a entregáveis (deliverables), garantindo que todo esforço (horas/despesas) esteja atrelado a pacotes de trabalho tangíveis, viabilizando o controle preciso de orçamento, cronograma e contratos de freelancers e equipes.

2. Arquitetura Funcional
A arquitetura do módulo é composta por 5 pilares funcionais:

Core de Estruturação (WBS Builder): Motor de hierarquia flexível (Árvore/Tabela) com geração automática de código estruturado (ex: 1.1.2) e validação contra ciclos.
Motor de Rollup (Consolidação Automática): Serviço em background (ou triggers no banco) responsável por subir na árvore somando custos, esforço e ponderando progresso físico das "folhas" até a "raiz".
Gestão de Baseline: Mecanismo de snapshot que congela a estrutura, estimativas de esforço, datas e orçamento para futura comparação (Planejado vs. Realizado).
Motor de Tracking (Apontamentos): Interface com o Timesheet e módulo financeiro para receber horas trabalhadas e despesas direcionadas exclusivamente aos itens "folha".
Gateway de Integração: Camada que conecta os entregáveis aos Contratos (cláusulas) e Marcos Financeiros (gatilhos de faturamento).
3. Modelo de Dados Sugerido (Diagrama de Entidades)
Entidades Principais e Relacionamentos
Projeto (1) -> (1) EAP
EAP (1) -> (N) ItemEAP
ItemEAP (1) -> (N) ItemEAP (Auto-relacionamento: parent_id)
ItemEAP (1) -> (N) DependenciaItemEAP (Predecessoras/Sucessoras)
EAP (1) -> (N) BaselineEAP (Snapshots da estrutura e estimativas)
ItemEAP (1) -> (N) AlocacaoRecurso (Freelancers/Equipes alocados)
ItemEAP (1) -> (N) ApontamentoHora / Despesa
ItemEAP (N) -> (1) MarcoFinanceiro (Gatilho de faturamento)
Estrutura Detalhada: ItemEAP
sql
Table ItemEAP {
  id UUID [primary key]
  eap_id UUID [ref: > EAP.id]
  parent_id UUID [ref: > ItemEAP.id, null] -- Null para itens raiz (Nível 1)
  codigo_estruturado VARCHAR -- Ex: "1.2.1" (Auto-gerado e recalculado)
  nome VARCHAR
  descricao TEXT
  tipo_item ENUM -- ['Fase', 'Entregavel', 'Pacote_Trabalho', 'Tarefa']
  nivel INTEGER -- Profundidade na árvore (1, 2, 3...)
  ordem INTEGER -- Ordem de exibição entre itens irmãos
  status ENUM -- ['Planejado', 'Em_Andamento', 'Aguardando_Aprovacao', 'Concluido', 'Cancelado']
  responsavel_id UUID [ref: > Usuario.id] -- Gestor do pacote
  cliente_visivel BOOLEAN -- Define se aparece no portal do cliente
  
  -- Cronograma
  data_inicio_planejada DATE
  data_fim_planejada DATE
  data_inicio_real DATE
  data_fim_real DATE
  
  -- Esforço e Custo
  esforco_estimado_horas NUMERIC
  esforco_real_horas NUMERIC
  custo_estimado NUMERIC
  custo_real NUMERIC
  
  -- Progresso e Qualidade
  percentual_concluido NUMERIC -- 0.0 a 100.0
  peso NUMERIC -- Relevância frente aos irmãos (para rollup manual)
  criterio_aceite TEXT
  
  -- Metadados
  baseline_id UUID [ref: > BaselineEAP.id, null] -- Se for um registro histórico
  created_at TIMESTAMP
  updated_at TIMESTAMP
  deleted_at TIMESTAMP
}
4. Regras de Negócio
RN01 - Orientação a Entregável: O tipo_item deve ser categorizado corretamente. A plataforma deve sugerir fortemente que os níveis intermediários sejam "Entregáveis" e os últimos sejam "Pacotes de Trabalho".
RN02 - Regra dos 100%: A soma do escopo (custo, esforço, peso) dos itens filhos deve sempre representar 100% do escopo do item pai. Se o pai tem orçamento de R$10.000, e a soma dos filhos for R$8.000, o sistema exibe alerta visual ("Orçamento divergente").
RN03 - Apontamentos Restritos: Horas e Despesas só podem ser alocadas em itens "Folha" (itens sem filhos), a menos que o gestor force um "Override" nas configurações avançadas.
RN04 - Rollup Automático:
Custo Pai = Soma(Custos Filhos).
Progresso Pai = Média Ponderada do Progresso dos Filhos (ponderado pelo custo, esforço ou "peso" configurado).
Data Início Pai = Min(Data Início Filhos).
Data Fim Pai = Max(Data Fim Filhos).
RN05 - Integridade Estrutural: Não é permitido excluir um nó pai que possua filhos. O usuário deve primeiro deletar/remover os filhos ou reatribuí-los a outro pai. É proibido criar ciclos de dependência (Ex: A depende de B que depende de A).
RN06 - Auditoria (Trail): Qualquer mudança em um ItemEAP após a aprovação da primeira Baseline gera um registro imutável no HistoricoAlteracao contendo (quem, o que mudou, de, para, quando).
5. Fluxos do Usuário
A. Criar EAP do Zero
Gestor clica em "Criar EAP" no painel do Projeto.
Adiciona o nó raiz (Nível 1 - Projeto).
Adiciona itens filhos (Fases) usando botão "+" ou atalhos de teclado (Tab / Enter).
Define nomes, seleciona tipo do item e responsável.
O sistema auto-gera os códigos (1.0, 1.1, 1.2...).
Salva a estrutura preliminar.
B. Aprovar Baseline (Congelamento)
Gestor preenche estimativas de tempo, custo e datas de todos os pacotes.
Resolve todos os alertas do sistema (ex: itens sem responsável).
Clica em "Salvar Baseline".
Adiciona uma nota ("Baseline V1 - Início do Projeto").
O sistema cria um snapshot profundo da EAP, bloqueando campos de "estimativa" para edições comuns, exigindo log de justificativa para mudanças futuras.
C. Lançar Horas e Atualizar Progresso (Freelancer)
Freelancer acessa "Meu Trabalho" > "Timesheet".
Seleciona o pacote de trabalho da EAP a qual está alocado.
Insere a data e horas trabalhadas.
Opcionalmente, arrasta o slider de "Progresso Atual" de 40% para 50%.
Salva. O sistema engatilha o Rollup e atualiza o progresso do projeto até a raiz.
6. Wireframes Textuais das Telas
6.1. Visão em Árvore (EAP Builder)
Objetivo: Construção visual e estrutural do escopo.
Componentes: Árvore colapsável (estilo Notion/Asana). Ícones indicando o tipo (Fase, Entregável, Pacote). Botão "+" inline ao lado de cada nó. Três pontinhos (menu de contexto: Editar, Mover, Adicionar Dependência, Excluir).
Ações Principais: Drag & Drop para reordenar ou mudar hierarquia (indentar).
Alertas: Ícone de alerta vermelho em nós folha sem estimativa ou sem critério de aceite.
6.2. Visão Tabular (Detalhada)
Objetivo: Edição em lote e conferência de métricas consolidadas.
Componentes: Tabela/Grid de dados (estilo Excel/Smartsheet). Colunas configuráveis: Estrutura (1.1, 1.1.2), Nome, Status, Responsável, Início, Fim, Custo Estimado, Progresso (Barra de progresso visual).
Ações Principais: Filtros avançados, agrupamento, edição "in-cell" (direto na célula).
Indicadores: Linhas pai ficam em negrito com fundo levemente acinzentado (indicando que seus valores de custo/esforço são calculados/read-only).
6.3. Visão Financeira (Custo & Faturamento)
Objetivo: Acompanhamento financeiro atrelado à EAP.
Componentes: Visão em painel dividido. Esquerda: Árvore da EAP simplificada. Direita: Colunas de Orçamento (Baseline), Custo Realizado, Desvio (Variância) e Vínculo com Marco Financeiro (Select box).
Alertas: Desvios negativos destacados em vermelho (Custo Real > Estimado).
6.4. Portal do Cliente (Visão Restrita)
Objetivo: Transparência de entregas sem expor detalhes operacionais (tarefas, quem está fazendo ou custos de equipe).
Componentes: Lista estilo Kanban ou Timeline de Entregáveis (cliente_visivel = true). Apenas campos: Nome, Descrição, Data Fim Prevista, Status, Arquivos Anexos de Entrega, e Botão "Aprovar Entrega".
7. Endpoints de API Sugeridos (REST)
GET /api/projects/{id}/wbs - Retorna a árvore completa da EAP com métricas consolidadas.
POST /api/projects/{id}/wbs/items - Adiciona novo nó (passando parent_id).
PUT /api/wbs/items/{item_id} - Atualiza metadados do item.
POST /api/wbs/items/{item_id}/move - Reposiciona o nó (Drag&Drop, novo parent, ordem).
POST /api/projects/{id}/wbs/baselines - Gera um snapshot e congela a baseline atual.
POST /api/wbs/items/{item_id}/progress - Atualiza o % concluído, disparando worker de Rollup.
8. Eventos de Integração (Webhooks / Events)
wbs.item.progress_updated -> Aciona Módulo de Relatórios (recalcula curva S e Earned Value) e Dashboard Gerencial.
wbs.item.completed -> Aciona Módulo Financeiro (se houver Marco Financeiro vinculado, cria fatura em "Rascunho" ou notifica liberação de pagamento).
timesheet.entry_created -> Aciona Módulo de EAP (atualiza esforco_real_horas do ItemEAP e dispara Rollup de custos se houver custo/hora associado ao recurso).
wbs.baseline.created -> Aciona Módulo de Contratos (salva um anexo PDF da EAP no repositório do contrato vigente).
9. Critérios de Aceite
O sistema não pode permitir que um código estruturado (ex: 1.1) seja duplicado no mesmo nível de irmãos sob o mesmo pai.
Ao alterar o progresso de um item folha de 0% para 100%, o progresso do item pai deve refletir imediatamente a porcentagem correspondente ao peso financeiro ou de esforço daquela folha em relação aos irmãos.
A exportação em Excel (CSV) deve manter a hierarquia visível através de indentações ou colunas separadas para cada nível.
O sistema deve impedir a exclusão de um item que tenha apontamento de horas vinculado, exigindo inativação/cancelamento em vez de exclusão física.
O cliente final não pode ver nenhum ItemEAP que não esteja com a flag cliente_visivel ativa, mesmo se inspecionar os retornos da API.
10. Roadmap de Implementação
Fase 1: MVP (Estrutura e Gestão Básica)

Modelagem de dados base.
Visão em árvore com arrastar/soltar e edição inline.
Geração automática de código estruturado.
Atualização de progresso manual simples (sem rollup complexo).
Fase 2: Motor Financeiro e Tracking (Rollups)

Motor de cálculo e rollup (Bottom-up para custo e esforço).
Integração real com apontamento de horas (Timesheet) e despesas de Freelancers.
Gestão de Baseline (primeiro snapshot).
Visão Tabular com filtros avançados.
Fase 3: Visões Avançadas e Contratos

Gantt Interativo atrelado aos itens da EAP com validação de dependências.
Vínculo da EAP com Marcos Financeiros e módulo de Contratos.
Visão Financeira para Gestores (Orçado x Realizado).
Fase 4: Inteligência, Cliente e IA

Portal restrito do Cliente (Aprovação de entregáveis).
Dashboard Executivo com Curva S e EVM (Earned Value Management).
Importação/Exportação inteligente para Excel/MS Project.
Templates de EAP corporativos. Sugestão de EAP via IA baseada na descrição do projeto.