# 🔧 Troubleshooting - Freeela

## 🔴 Problema: Aplicação fica só carregando

### Causas Possíveis

#### 1. **Migration não foi executada no Supabase**
A causa mais comum! As tabelas do banco de dados ainda não existem.

**Solução:**

**Opção A - Via Supabase Dashboard (Mais fácil):**
```
1. Acesse https://app.supabase.com/
2. Selecione seu projeto
3. Vá em "SQL Editor" no menu lateral
4. Clique em "New Query"
5. Copie TODO o conteúdo de: supabase/migrations/20260213000000_initial_schema.sql
6. Cole no editor
7. Clique em "RUN" ou pressione Ctrl+Enter
8. Aguarde a execução (pode levar 30-60 segundos)
9. Verifique se apareceu "Success" sem erros
```

**Opção B - Via CLI do Supabase:**
```bash
# Instalar CLI (se não tiver)
npm install -g supabase

# Fazer login
supabase login

# Vincular projeto
supabase link --project-ref SEU_PROJECT_REF

# Executar migration
supabase db push
```

**Como verificar se funcionou:**
```sql
-- Execute isso no SQL Editor
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Deve retornar: users, leads, clients, projects, tasks, payments, documents, workflow_history, activities
```

---

#### 2. **Credenciais do Supabase incorretas**

**Verificar arquivo `.env`:**
```bash
# Localização: app/.env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

**Onde encontrar as credenciais corretas:**
```
1. Acesse https://app.supabase.com/
2. Selecione seu projeto
3. Vá em "Project Settings" (ícone de engrenagem)
4. Clique em "API"
5. Copie:
   - "Project URL" → VITE_SUPABASE_URL
   - "anon public" → VITE_SUPABASE_ANON_KEY
```

**Exemplo de .env correto:**
```env
VITE_SUPABASE_URL=https://xyzabc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc2MDAwMDAwLCJleHAiOjE5OTE1NzYwMDB9.abcdef123456
```

**IMPORTANTE:**
- A `anon key` é um token JWT longo (200+ caracteres)
- Se for muito curto (como `sb_publishable_...`), está incorreto
- Reinicie o servidor após alterar o `.env`

---

#### 3. **Sem usuário criado no banco**

Mesmo após autenticar no Supabase Auth, você precisa ter um registro na tabela `users`.

**Solução 1 - Via Seed (Dados de Teste):**
```bash
supabase db execute -f supabase/seed.sql
```

**Solução 2 - Criar usuário manualmente:**
```sql
-- 1. Primeiro crie um usuário no Auth (via interface ou signup)
-- 2. Depois execute isso no SQL Editor:

INSERT INTO public.users (auth_user_id, email, full_name, company_name)
VALUES (
  'auth-user-id-aqui',  -- Pegue do auth.users
  'seu@email.com',
  'Seu Nome',
  'Sua Empresa'
);
```

**Como pegar o auth_user_id:**
```sql
SELECT id, email FROM auth.users;
```

---

#### 4. **RLS bloqueando acesso**

As políticas de Row Level Security podem estar bloqueando.

**Verificar se RLS está ativo:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**Verificar políticas:**
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

**Temporariamente desabilitar RLS (APENAS PARA DEBUG):**
```sql
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
-- Etc...
```

**IMPORTANTE:** Reabilite depois!
```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
```

---

## 🔍 Debug Step-by-Step

### 1. Abra o Console do Navegador
```
Chrome/Edge: F12 ou Ctrl+Shift+I
Firefox: F12
```

### 2. Vá na aba "Console"
Procure por erros em vermelho:

**Erro comum:**
```
relation "public.users" does not exist
```
→ **Solução:** Execute a migration (ver item 1 acima)

**Erro comum:**
```
Invalid API key
```
→ **Solução:** Verifique credenciais no .env (ver item 2 acima)

### 3. Vá na aba "Network"
- Filtre por "supabase"
- Veja se há requisições com status 401, 403 ou 500
- Clique na requisição e veja a resposta (Response)

### 4. Teste a conexão manualmente

**Crie um arquivo `test.html` temporário:**
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <h1>Teste Supabase</h1>
  <div id="result"></div>
  <script>
    const supabaseUrl = 'SUA_URL_AQUI'
    const supabaseKey = 'SUA_KEY_AQUI'
    const { createClient } = supabase

    const client = createClient(supabaseUrl, supabaseKey)

    async function test() {
      const result = document.getElementById('result')

      // Teste 1: Conexão
      result.innerHTML += '<p>Testando conexão...</p>'

      try {
        const { data, error } = await client.from('users').select('count')

        if (error) {
          result.innerHTML += `<p style="color: red">❌ Erro: ${error.message}</p>`
        } else {
          result.innerHTML += `<p style="color: green">✅ Conexão OK!</p>`
        }
      } catch (err) {
        result.innerHTML += `<p style="color: red">❌ Exceção: ${err.message}</p>`
      }
    }

    test()
  </script>
</body>
</html>
```

---

## 📋 Checklist Completo

Execute na ordem:

- [ ] **1. Verificar se o Supabase está configurado**
  ```bash
  cat app/.env
  # Deve ter VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
  ```

- [ ] **2. Validar credenciais**
  - URL no formato: `https://[projeto].supabase.co`
  - Anon key é um JWT longo (200+ caracteres)

- [ ] **3. Executar migration**
  ```bash
  # Via SQL Editor no dashboard
  # Copiar e colar: supabase/migrations/20260213000000_initial_schema.sql
  ```

- [ ] **4. Verificar tabelas criadas**
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  ```

- [ ] **5. (Opcional) Popular com dados de teste**
  ```bash
  supabase db execute -f supabase/seed.sql
  ```

- [ ] **6. Criar primeiro usuário**
  - Opção A: Via seed (acima)
  - Opção B: Signup na interface + INSERT manual na tabela users

- [ ] **7. Reiniciar servidor de desenvolvimento**
  ```bash
  cd app
  npm run dev
  ```

- [ ] **8. Limpar cache do navegador**
  - Ctrl+Shift+Delete → Limpar cache
  - Ou usar modo anônimo (Ctrl+Shift+N)

- [ ] **9. Testar login**
  - Email: freelancer@freeela.com (se usou seed)
  - Senha: senha123 (se usou seed)

---

## 🎯 Solução Rápida (TL;DR)

Se está com pressa:

```bash
# 1. Verifique as credenciais
cat app/.env

# 2. Execute a migration via Dashboard:
# https://app.supabase.com/ → SQL Editor → Copiar/Colar migration

# 3. Popular dados de teste (opcional)
supabase db execute -f supabase/seed.sql

# 4. Reiniciar servidor
cd app
npm run dev
```

---

## 🆘 Ainda não funciona?

### Logs Detalhados

**No navegador (Console):**
```javascript
localStorage.debug = 'supabase:*'
// Recarregar a página
```

**Verificar erro exato:**
```javascript
// Cole no console do navegador
supabase.from('users').select('*').then(console.log).catch(console.error)
```

### Reportar Problema

Se ainda não funcionar, colete:

1. **Screenshot do console** (F12 → Console)
2. **Screenshot da aba Network** (requisições com erro)
3. **Resultado da query:**
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```
4. **Conteúdo do .env** (SEM expor as chaves completas):
   ```
   VITE_SUPABASE_URL=https://xyzabc***.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc***...
   ```

---

## ✅ Como saber se está funcionando

Quando tudo estiver correto:

1. ✅ Página de login aparece (não fica em loading infinito)
2. ✅ Ao criar conta ou fazer login, redireciona para o Dashboard
3. ✅ Dashboard mostra cards com números (mesmo que zerados)
4. ✅ Consegue criar um novo lead
5. ✅ Consegue converter lead em projeto

---

**Última atualização:** 2024-02-13
