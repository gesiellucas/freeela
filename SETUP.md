# 🚀 Freeela - Setup Guide

Guia completo para configurar o **Freeela - Freelance OS** com Supabase.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com/) (gratuita)
- Git instalado

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/freeela.git
cd freeela
```

### 2. Instale as dependências

```bash
cd app
npm install
```

### 3. Configure o Supabase

#### Opção A: Via Dashboard (Mais fácil para iniciantes)

1. Acesse [app.supabase.com](https://app.supabase.com/)
2. Crie um novo projeto
3. Aguarde o provisionamento (1-2 minutos)
4. Vá em **SQL Editor** no menu lateral
5. Crie uma nova query
6. Copie todo o conteúdo de `supabase/migrations/20260213000000_initial_schema.sql`
7. Cole no editor e clique em **RUN**
8. ✅ Seu banco está pronto!

#### Opção B: Via CLI (Recomendado para desenvolvedores)

```bash
# Instale o Supabase CLI
npm install -g supabase

# Faça login
supabase login

# Vincule seu projeto
supabase link --project-ref seu-project-ref

# Execute a migration
supabase db push

# (Opcional) Popule com dados de teste
supabase db execute -f supabase/seed.sql
```

### 4. Configure as variáveis de ambiente

```bash
cd app
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
VITE_GEMINI_API_KEY=sua-gemini-key-aqui
```

**Onde encontrar as credenciais:**

1. **Supabase URL e Anon Key:**
   - Vá em **Project Settings** → **API**
   - Copie `Project URL` e `anon public`

2. **Gemini API Key (para IA):**
   - Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Crie uma nova API key
   - Cole no `.env`

### 5. Rode a aplicação

```bash
# Modo desenvolvimento (web)
npm run dev

# Modo Electron (desktop)
npm run electron:dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

## 🗄️ Estrutura do Banco de Dados

O sistema possui **9 tabelas principais**:

| Tabela | Descrição |
|--------|-----------|
| `users` | Freelancers/usuários |
| `leads` | Potenciais clientes |
| `clients` | Clientes convertidos |
| `projects` | Projetos ativos |
| `tasks` | Tarefas do kanban |
| `payments` | Pagamentos/faturamento |
| `documents` | Documentos gerados |
| `workflow_history` | Histórico de mudanças |
| `activities` | Log de atividades |

### Views disponíveis:

- `project_financial_summary` - Resumo financeiro por projeto
- `dashboard_metrics` - Métricas agregadas

## 🔐 Autenticação

### Criar primeiro usuário

#### Via Dashboard:

1. Vá em **Authentication** → **Users**
2. Clique em **Add User**
3. Adicione email e senha
4. Após criar, vá no **SQL Editor** e execute:

```sql
-- Vincular o usuário do auth com a tabela users
INSERT INTO public.users (auth_user_id, email, full_name, company_name)
VALUES (
  'id-do-usuario-auth',
  'seu@email.com',
  'Seu Nome',
  'Sua Empresa'
);
```

#### Via código:

Use a função `signUp` do arquivo `lib/supabase.ts`:

```typescript
import { signUp } from './lib/supabase'

await signUp('seu@email.com', 'senha123', 'Seu Nome')
```

## 📊 Dados de Teste

Para popular o banco com dados de exemplo:

```bash
supabase db execute -f supabase/seed.sql
```

Isso criará:
- 1 usuário de exemplo
- 3 leads em diferentes estágios
- 2 clientes convertidos
- 2 projetos ativos
- 8 tarefas
- 4 pagamentos
- 3 documentos

**⚠️ ATENÇÃO:** O seed limpa todos os dados existentes!

## 🔧 Desenvolvimento

### Estrutura de pastas

```
freeela/
├── app/                    # Aplicação React
│   ├── src/
│   │   ├── lib/           # Configurações (Supabase, etc)
│   │   ├── types/         # TypeScript types
│   │   ├── App.jsx        # Componente principal
│   │   └── main.jsx       # Entry point
│   └── package.json
├── supabase/              # Database
│   ├── migrations/        # SQL migrations
│   ├── seed.sql          # Dados de teste
│   ├── config.toml       # Configuração
│   └── README.md         # Documentação do schema
└── SETUP.md              # Este arquivo
```

### Scripts úteis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Electron
npm run electron:dev
npm run electron:build
```

### Adicionar nova migration

```bash
supabase migration new nome_da_migration
# Edite o arquivo gerado em supabase/migrations/
supabase db push
```

## 🎨 Customização

### Mudar cores do tema

Edite o `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6', // Azul principal
        secondary: '#8B5CF6', // Roxo secundário
      }
    }
  }
}
```

### Adicionar novos campos no banco

1. Crie uma nova migration:
```bash
supabase migration new add_campo_x
```

2. Adicione o SQL:
```sql
ALTER TABLE projects
ADD COLUMN novo_campo TEXT;
```

3. Atualize os tipos TypeScript em `types/database.types.ts`

4. Aplique a migration:
```bash
supabase db push
```

## 🚀 Deploy

### Opção 1: Vercel (Frontend)

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Deploy
cd app
vercel
```

Configure as variáveis de ambiente no dashboard da Vercel.

### Opção 2: Netlify

```bash
npm run build
# Faça upload da pasta dist/
```

### Opção 3: Electron (Desktop)

```bash
npm run electron:build
```

Os executáveis estarão em `app/release/`.

## 🐛 Troubleshooting

### Erro: "No API key found"

Verifique se o arquivo `.env` está correto e se contém:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Erro: "relation does not exist"

Execute as migrations:
```bash
supabase db push
```

### Erro de permissão no RLS

Verifique se o usuário está autenticado e se o `user_id` está correto.

### Interface não carrega dados

1. Abra o DevTools (F12)
2. Veja o console para erros
3. Verifique a aba Network
4. Confirme que as requisições para o Supabase estão passando

## 📚 Próximos Passos

- [ ] Configure autenticação via Google/GitHub
- [ ] Adicione upload de arquivos (Supabase Storage)
- [ ] Implemente notificações por email
- [ ] Integre com Stripe para pagamentos
- [ ] Configure backup automático do banco

## 🤝 Suporte

- 📖 [Documentação Supabase](https://supabase.com/docs)
- 💬 [Discord do Supabase](https://discord.supabase.com)
- 🐛 Reporte bugs via [GitHub Issues](https://github.com/seu-usuario/freeela/issues)

## 📄 Licença

MIT License - sinta-se livre para usar em projetos pessoais e comerciais.

---

**Desenvolvido com ❤️ usando React, Supabase e TypeScript**
