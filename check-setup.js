#!/usr/bin/env node

/**
 * Script de Verificação do Setup do Freeela
 * Verifica se tudo está configurado corretamente
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuração do Freeela...\n');

let errors = 0;
let warnings = 0;

// 1. Verificar se a pasta app existe
console.log('📁 1. Verificando estrutura de pastas...');
if (!fs.existsSync('./app')) {
  console.log('   ❌ Pasta app/ não encontrada');
  errors++;
} else {
  console.log('   ✅ Pasta app/ encontrada');
}

// 2. Verificar arquivo .env
console.log('\n🔐 2. Verificando arquivo .env...');
const envPath = path.join(__dirname, 'app', '.env');
if (!fs.existsSync(envPath)) {
  console.log('   ❌ Arquivo .env não encontrado em app/');
  console.log('   💡 Copie app/.env.example para app/.env e configure as credenciais');
  errors++;
} else {
  console.log('   ✅ Arquivo .env encontrado');

  // Ler conteúdo do .env
  const envContent = fs.readFileSync(envPath, 'utf-8');

  // Verificar VITE_SUPABASE_URL
  if (!envContent.includes('VITE_SUPABASE_URL=')) {
    console.log('   ❌ VITE_SUPABASE_URL não configurada');
    errors++;
  } else {
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
    const url = urlMatch ? urlMatch[1].trim() : '';

    if (!url || url === 'https://seu-projeto.supabase.co') {
      console.log('   ⚠️  VITE_SUPABASE_URL ainda não foi configurada (valor padrão)');
      warnings++;
    } else if (!url.includes('supabase.co')) {
      console.log('   ⚠️  VITE_SUPABASE_URL parece incorreta (deve conter supabase.co)');
      warnings++;
    } else {
      console.log(`   ✅ VITE_SUPABASE_URL: ${url.substring(0, 30)}...`);
    }
  }

  // Verificar VITE_SUPABASE_ANON_KEY
  if (!envContent.includes('VITE_SUPABASE_ANON_KEY=')) {
    console.log('   ❌ VITE_SUPABASE_ANON_KEY não configurada');
    errors++;
  } else {
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
    const key = keyMatch ? keyMatch[1].trim() : '';

    if (!key || key === 'sua-anon-key-aqui') {
      console.log('   ⚠️  VITE_SUPABASE_ANON_KEY ainda não foi configurada (valor padrão)');
      warnings++;
    } else if (key.length < 50) {
      console.log('   ⚠️  VITE_SUPABASE_ANON_KEY parece muito curta (deve ser um JWT longo)');
      warnings++;
    } else if (!key.startsWith('eyJ')) {
      console.log('   ⚠️  VITE_SUPABASE_ANON_KEY não parece ser um JWT válido (deve começar com "eyJ")');
      warnings++;
    } else {
      console.log(`   ✅ VITE_SUPABASE_ANON_KEY: ${key.substring(0, 20)}... (${key.length} caracteres)`);
    }
  }
}

// 3. Verificar migrations
console.log('\n📊 3. Verificando migrations...');
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260213000000_initial_schema.sql');
if (!fs.existsSync(migrationPath)) {
  console.log('   ❌ Migration inicial não encontrada');
  errors++;
} else {
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  const hasUsers = migrationContent.includes('CREATE TABLE users');
  const hasLeads = migrationContent.includes('CREATE TABLE leads');
  const hasProjects = migrationContent.includes('CREATE TABLE projects');

  if (hasUsers && hasLeads && hasProjects) {
    console.log('   ✅ Migration inicial encontrada e válida');
  } else {
    console.log('   ⚠️  Migration parece incompleta');
    warnings++;
  }
}

// 4. Verificar seed
console.log('\n🌱 4. Verificando seed...');
const seedPath = path.join(__dirname, 'supabase', 'seed.sql');
if (!fs.existsSync(seedPath)) {
  console.log('   ⚠️  Arquivo seed.sql não encontrado (opcional)');
  warnings++;
} else {
  console.log('   ✅ Arquivo seed.sql encontrado');
}

// 5. Verificar package.json
console.log('\n📦 5. Verificando dependências...');
const packagePath = path.join(__dirname, 'app', 'package.json');
if (!fs.existsSync(packagePath)) {
  console.log('   ❌ package.json não encontrado em app/');
  errors++;
} else {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

  if (packageJson.dependencies && packageJson.dependencies['@supabase/supabase-js']) {
    console.log('   ✅ @supabase/supabase-js instalado');
  } else {
    console.log('   ❌ @supabase/supabase-js não encontrado nas dependências');
    errors++;
  }

  // Verificar se node_modules existe
  const nodeModulesPath = path.join(__dirname, 'app', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('   ⚠️  node_modules não encontrado - execute "npm install" em app/');
    warnings++;
  } else {
    console.log('   ✅ node_modules encontrado');
  }
}

// 6. Verificar supabase.ts
console.log('\n⚙️  6. Verificando configuração do Supabase...');
const supabaseTsPath = path.join(__dirname, 'app', 'src', 'lib', 'supabase.ts');
if (!fs.existsSync(supabaseTsPath)) {
  console.log('   ❌ app/src/lib/supabase.ts não encontrado');
  errors++;
} else {
  console.log('   ✅ app/src/lib/supabase.ts encontrado');
}

// Resumo
console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO DA VERIFICAÇÃO');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
  console.log('✅ Tudo configurado corretamente!');
  console.log('\n🚀 Próximos passos:');
  console.log('   1. Execute a migration no Supabase Dashboard');
  console.log('   2. (Opcional) Execute o seed: supabase db execute -f supabase/seed.sql');
  console.log('   3. Inicie o servidor: cd app && npm run dev');
} else {
  if (errors > 0) {
    console.log(`❌ ${errors} erro(s) encontrado(s)`);
  }
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} aviso(s) encontrado(s)`);
  }

  console.log('\n📖 Consulte TROUBLESHOOTING.md para mais informações');
  console.log('📖 Consulte SETUP.md para instruções completas de configuração');
}

console.log('\n');

process.exit(errors > 0 ? 1 : 0);
