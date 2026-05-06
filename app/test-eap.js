const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://localhost:8000',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1MjU0NjQwLCJleHAiOjE5MzI5MzQ2NDB9.JR5uHTxooMpLgU_6p4-BTip6xrSsh_ddPkemxGRKRyk'
);

async function run() {
  const { data: eap } = await supabase.from('eap').select('*').limit(1).single();
  if (!eap) {
    console.log('No EAP found');
    return;
  }
  console.log('Found EAP:', eap.id);

  const { data: parent } = await supabase.from('eap_items').select('*').eq('eap_id', eap.id).limit(1).single();
  const parentId = parent ? parent.id : null;
  console.log('Using parentId:', parentId);

  const { data, error } = await supabase.from('eap_items').insert([{
    eap_id: eap.id,
    parent_id: parentId,
    nome: 'Teste Item',
    tipo_item: 'Pacote_Trabalho',
    codigo_estruturado: '1.1',
    nivel: 2,
    ordem: 1
  }]).select().single();

  if (error) {
    console.error('ERROR creating item:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS:', data.id);
  }
}

run();
