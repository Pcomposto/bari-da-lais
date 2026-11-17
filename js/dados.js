/* Bari da Laís — cardápios transcritos das folhas fotografadas em 16/11/2026.
   Regras de transcrição:
   - Conteúdo preservado; normalizados apenas espaços, acentos de "Iogurte" e unidades
     (ex.: "150gramas" → "150 gramas", "120ml" → "120 ml").
   - Trechos com dúvida recebem "conf" (aviso de conferência) e NÃO foram corrigidos.
   Ordem dos dias: 0 = segunda … 6 = domingo (colunas da folha). */
(function () {
  'use strict';

  const REFEICOES = [
    { k: 'cafe',    nome: 'Café da manhã', nomePre: 'Café da manhã',     hora: '07:00' },
    { k: 'colacao', nome: 'Colação',       nomePre: 'Colação',           hora: '09:30' },
    { k: 'almoco',  nome: 'Almoço',        nomePre: 'Almoço',            hora: '12:00' },
    { k: 'lanche1', nome: 'Lanche 1',      nomePre: 'Lanche da tarde 1', hora: '15:00' },
    { k: 'lanche2', nome: 'Lanche 2',      nomePre: 'Lanche da tarde 2', hora: '17:00' },
    { k: 'jantar',  nome: 'Jantar',        nomePre: 'Jantar',            hora: '19:00' },
    { k: 'ceia',    nome: 'Ceia',          nomePre: 'Ceia',              hora: '22:00' }
  ];
  const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // ---------- PRÉ-OPERATÓRIO (folha "Dieta preparatória para a cirurgia", p. 5) ----------
  const PRE = {
    id: 'pre',
    nome: 'Pré-operatório',
    titulo: 'Dieta preparatória para a cirurgia',
    orientacoes: [
      'Nos 03 dias anteriores à cirurgia, você deverá se alimentar de acordo com o cardápio abaixo.',
      'Nada de despedida com comidas gordurosas e extravagantes na semana anterior.',
      'Fazer uso de bastante líquidos, nos intervalos das refeições, beber em torno de 2 a 2,5 litros de líquido/dia.'
    ],
    nota: 'A folha do pré não informa horários nem porções.',
    dias: [
      { rotulo: '1º dia', itens: {
        cafe: 'Mingau aveia com leite desnatado e adoçante',
        colacao: 'Gelatina diet',
        almoco: 'Purê de legumes (de sua preferência) com papa de carne (cozinhar e liquidificar a carne)',
        lanche1: 'Suco diluído e coado com adoçante',
        lanche2: 'Vitamina com leite desnatado e morango',
        jantar: 'Polenta molinha com papa de frango (cozinhar e liquidificar o frango)',
        ceia: 'Iogurte zero açúcar' } },
      { rotulo: '2º dia', itens: {
        cafe: 'Vitamina de mamão com leite desnatado e maçã (sem casca)',
        colacao: 'Suco diluído e coado com adoçante',
        almoco: 'Sopa de verduras, legumes e carne vermelha (liquidificada e coada)',
        lanche1: 'Gelatina diet',
        lanche2: 'Suco diluído e coado com adoçante',
        jantar: 'Sopa de verduras, legumes e carne vermelha (liquidificada e coada)',
        ceia: 'Suco diluído e coado com adoçante' } },
      { rotulo: 'Véspera da cirurgia', itens: {
        cafe: 'Chá de erva doce',
        colacao: 'Suco de fruta diluído e coado',
        almoco: 'Caldo de legumes e carne vermelha (apenas coar)',
        lanche1: 'Água de coco',
        lanche2: 'Gatorade®',
        jantar: 'Caldo de legumes e carne vermelha (apenas coar)',
        ceia: 'Gelatina diet' } }
    ]
  };

  // ---------- PÓS-OPERATÓRIO ----------
  const SUCO = ' diluído e coado com adoçante (natural ou polpa)';
  const SOPA1 = ' temperada com alho, cebola e sal (coar e tomar só o líquido, sem bater)';
  const SOPA2 = ' temperada com alho, cebola e sal (liquidificar e coar para evitar algum pedaço sem bater)';
  const WP = '1 colher de sopa de Whey Protein';
  const CADA = '1 colher de sopa de cada alimento';
  const L = s => ({ t: s });                     // item simples
  const C = (s, conf) => ({ t: s, conf: conf }); // item com aviso de conferência
  const rep = (s, n) => Array.from({ length: n }, () => L(s));

  const S1 = {
    id: 's1', nome: '1ª semana', titulo: 'Dieta de líquidos',
    orientacao: 'Tomando de gole em gole de acordo com a sua tolerância e orientado pela nutricionista.',
    destaque: '',
    refeicoes: {
      cafe: ['Chá de hortelã com adoçante', 'Chá de maçã com adoçante', 'Chá de cidreira com adoçante',
        'Chá de frutas vermelhas com adoçante', 'Chá de camomila com adoçante', 'Chá de menta com adoçante',
        'Chá de laranja com adoçante'].map(L),
      colacao: ['caju', 'melão', 'laranja', 'goiaba', 'acerola', 'maracujá', 'melancia'].map(f => L('Suco de ' + f + SUCO)),
      almoco: ['Sopa de batata, couve e carne vermelha', 'Sopa de inhame, cenoura e frango',
        'Sopa de aipim, espinafre e carne vermelha', 'Sopa de batata, chuchu e frango',
        'Sopa de batata doce, abobrinha e frango', 'Sopa de abobora, couve e carne vermelha',
        'Sopa de inhame, cenoura e carne vermelha'].map(s => L(s + SOPA1)),
      lanche1: rep('Gelatina diet', 7),
      lanche2: ['Chá de laranja com adoçante', 'Chá de camomila com adoçante', 'Chá de menta com adoçante',
        'Chá de hortelã com adoçante', 'Chá de cidreira com adoçante', 'Chá de frutas vermelhas com adoçante',
        'Chá de camomila com adoçante'].map(L),
      jantar: ['Sopa de batata, chuchu e frango', 'Sopa de batata doce, abobrinha e frango',
        'Sopa de abobora, couve e carne vermelha', 'Sopa de inhame, cenoura e carne vermelha',
        'Sopa de aipim, espinafre e carne vermelha', 'Sopa de inhame, cenoura e frango',
        'Sopa de batata, couve e carne vermelha'].map(s => L(s + SOPA1)),
      ceia: rep('Água de coco', 7)
    }
  };

  const VIT2 = 'Vitamina de fruta com leite desnatado, adoçante e ' + WP;
  const IOG2 = 'Iogurte zero açúcar e zero gordura e ' + WP;
  const S2 = {
    id: 's2', nome: '2ª semana', titulo: 'Dieta de líquidos completos',
    orientacao: 'Tomando de gole em gole de acordo com a sua tolerância.',
    destaque: '250 mL em 2 horas',
    refeicoes: {
      cafe: [
        L('Mingau de amido de milho com leite desnatado e ' + WP),
        L('Mingau de fubá e ' + WP),
        L('Leite desnatado batido com frutas (maçã e mamão) ' + WP),
        L(IOG2),
        L('Mingau de amido de milho com leite desnatado e adoçante (ralo)'),
        L('Mingau de fubá e ' + WP),
        L('Leite desnatado batido com frutas (banana e maçã) e ' + WP)],
      colacao: [
        L('Suco de caju' + SUCO), L('Suco de melão' + SUCO), L('Suco de laranja' + SUCO),
        L('Suco de goiaba' + SUCO),
        L('Suco de acerola' + SUCO), // folha: "ecerola"; confirmado como acerola por Pedro em 16/11/2026
        L('Suco de caju' + SUCO), L('Suco de melancia' + SUCO)],
      almoco: ['Sopa de batata, couve e carne vermelha', 'Sopa de inhame cenoura e frango',
        'Sopa de aipim, espinafre e carne vermelha', 'Sopa de batata, chuchu e frango',
        'Sopa de batata doce, abobrinha e frango', 'Sopa de abobora, couve e carne vermelha',
        'Sopa de inhame, cenoura e carne vermelha'].map(s => L(s + SOPA2)),
      lanche1: [L(VIT2), L(IOG2), L(VIT2), L(IOG2), L(VIT2), L(IOG2), L(VIT2)],
      lanche2: ['Iogurte zero açúcar e zero gordura', 'Gelatina diet', 'Chup Chup de fruta com adoçante',
        'Água de coco', 'Suco de fruta com adoçante', 'Gelatina diet',
        'Iogurte zero açúcar e zero gordura'].map(L),
      jantar: ['Sopa de batata, chuchu e frango', 'Sopa de batata doce, abobrinha e frango',
        'Sopa de abobora, couve e carne vermelha', 'Sopa de inhame, cenoura e carne vermelha',
        'Sopa de aipim, espinafre e carne vermelha', 'Sopa de inhame cenoura e frango',
        'Sopa de batata, couve e carne vermelha'].map(s => L(s + SOPA2)),
      ceia: ['Água de coco', 'Suco de fruta com adoçante', 'Gelatina diet', 'Iogurte zero açúcar e zero gordura',
        'Chup Chup de fruta com adoçante', 'Água de coco', 'Suco de fruta com adoçante'].map(L)
    }
  };

  const FR3 = ' 80 gramas ou ¼ da fruta';
  const P3 = s => L(s + ' – ' + CADA + '. (150 gramas)');
  const IOG3 = 'Iogurte zero açúcar e desnatado e ' + WP;
  const S3 = {
    id: 's3', nome: '3ª semana', titulo: 'Dieta pastosa',
    orientacao: 'Consistência de papinha de criança — sempre respeitar a sua tolerância.',
    destaque: '',
    refeicoes: {
      cafe: ['Mingau de aveia e ' + WP, 'Iogurte zero açúcar e ' + WP, 'Mingau de fubá e ' + WP,
        'Leite desnatado com fruta e ' + WP, 'Iogurte zero açúcar e ' + WP, 'Mingau de aveia e ' + WP,
        'Leite desnatado com fruta e ' + WP].map(L),
      colacao: ['Banana amassada', 'Mamão amassado', 'Maçã cozida', 'Banana amassada', 'Pêra cozida',
        'Mamão amassado', 'Banana amassada'].map(s => L(s + FR3)),
      almoco: [
        P3('Batata cozida e amassada, papa de frango e espinafre refogado e bem amassado'),
        P3('Aipim cozido e amassado, papa de carne e couve refogado e bem amassado'),
        P3('Inhame cozido e amassado, papa de frango e taioba refogado e bem amassado'),
        P3('Abobora cozida e amassada, papa de carne e espinafre refogado e bem amassado'),
        P3('Batata doce cozida amassada, papa de frango e couve refogado e bem amassado'),
        P3('Aipim cozido e amassado, papa de carne e espinafre refogado e bem amassado'),
        P3('Abobora cozida e amassada, papa de frango e taioba refogado e bem amassado')],
      lanche1: ['Vitamina de leite com banana e ' + WP, 'Leite desnatado e ' + WP, IOG3,
        'Vitamina de leite com maçã e ' + WP, IOG3, 'Leite desnatado e ' + WP, IOG3].map(L),
      lanche2: ['Gelatina diet (120 ml)', 'Água de coco (120 ml)', 'Suco de fruta com adoçante (120 ml)',
        'Chá de camomila (120 ml)', 'Gelatina diet (120 ml)', 'Água de coco (120 ml)',
        'Suco de fruta com adoçante (120 ml)'].map(L),
      jantar: [
        P3('Macarrão cozido e amassado, papa de carne'),
        P3('Cenoura cozida e amassada, papa de frango e espinafre refogado e bem amassado'),
        P3('Beterraba cozida e amassada, papa de carne e couve refogado e bem amassado'),
        P3('Polenta mole, papa de frango e chuchu amassado'),
        P3('Macarrão cozido e amassado, papa de carne e taioba refogado e bem amassado'),
        P3('Cenoura cozida e amassada, papa de frango e chuchu bem amassado'),
        P3('Beterraba cozida e amassada, papa de carne e espinafre refogado e bem amassado')],
      ceia: ['Leite desnatado ou leite de soja com adoçante (120 ml)', 'Chá erva cidreira (120 ml)',
        'Gelatina diet (120 ml)', 'Água de coco (120 ml)', 'Suco de fruta com adoçante (120 ml)',
        'Leite desnatado ou leite de soja com adoçante (120 ml)', 'Chá de hortelã (120 ml)'].map(L)
    }
  };

  const P4 = s => L(s + ' – ' + CADA + ' (150 gramas)');
  const CAFE_PAO = 'Leite desnatado ou de soja (100 ml) com pão de forma (½ fatia) e queijo branco 1 fatia pequena (25 gramas)';
  const CAFE_BISC = ' com adoçante (100 ml) com biscoito salgado (1 unidade) requeijão light (ponta da faca)';
  const VIT4 = 'Vitamina de fruta com leite desnatado e ' + WP;
  const IOG4 = 'Iogurte zero açúcar e ' + WP;
  const LEI4 = 'Leite desnatado e ' + WP;
  const S4 = {
    id: 's4', nome: '4ª semana', titulo: 'Dieta branda',
    orientacao: 'Consistência de pedaços bem moles — sempre respeitar a sua tolerância — Cuidado com a MASTIGAÇÃO.',
    destaque: '',
    refeicoes: {
      cafe: [
        L(CAFE_PAO),
        L('Suco de fruta' + CAFE_BISC),
        L('Chá de maçã' + CAFE_BISC),
        L(CAFE_PAO),
        L('Suco de fruta com adoçante (100 ml) com aipim cozido (1 pedaço pequeno 30 gramas) e queijo branco (1 fatia pequena 25 gramas)'),
        L('Chá de fruta vermelhas com adoçante (100 ml) batata doce (1 pedaço pequeno 30 gramas) e queijo branco (1 fatia pequena 25 gramas)'),
        L(CAFE_PAO)],
      colacao: [
        L('Maçã sem casca – ¼ da fruta (50 gramas)'),
        L('Pêra sem casca – ¼ da fruta (50 gramas)'),
        // Folha: "¼ da fruta (50gramas)". Para melão e melancia vale só 50 gramas (decisão de Pedro, 16/11/2026).
        L('Melão – 50 gramas'),
        L('Melancia – 50 gramas'),
        L('Banana – ¼ da fruta (50 gramas)'),
        L('Maçã sem casca – ¼ da fruta (50 gramas)'),
        L('Pêra sem casca – ¼ da fruta (50 gramas)')],
      almoco: [
        P4('Macarrão com carne moída ao molho de tomate'),
        P4('Purê de aipim com frango (coxa ou sobrecoxa) desfiado'),
        P4('Batata, chuchu e couve cozida e em pedaços pequenos com carne moída'),
        P4('Abobrinha e inhame cozidos em pedaços com frango (coxa ou sobrecoxa) desfiado'),
        P4('Abobora e couve cozidas em pedaços pequenos com carne moída'),
        P4('Macarrão com beterraba cozida com frango (coxa ou sobrecoxa) desfiado'),
        P4('Aipim e chuchu cozidos em pedaços pequenos com carne moída')],
      lanche1: [LEI4, VIT4, IOG4, LEI4, VIT4, IOG4, IOG4].map(L),
      lanche2: ['Gelatina diet (120 ml)', 'Água de coco (120 ml)', 'Suco de fruta com adoçante (120 ml)',
        'Chá de camomila (120 ml)', 'Gelatina diet (120 ml)', 'Água de coco (120 ml)',
        'Suco de fruta com adoçante (120 ml)'].map(L),
      jantar: [
        P4('Purê de legumes com frango (coxa ou sobrecoxa) desfiado'),
        P4('Polenta com carne moída ao molho de tomate'),
        P4('Macarrão com frango ao molho (coxa ou sobrecoxa) desfiado'),
        P4('Batata doce em pedaços com carne moída ao molho de tomate'),
        P4('Canjiquinha com frango ao molho (coxa ou sobrecoxa) desfiado'),
        P4('Batata e cenoura cozidas em pedaços com carne moída'),
        P4('Purê de legumes com frango (coxa ou sobrecoxa) desfiado')],
      ceia: [IOG4, LEI4, VIT4, IOG4, LEI4, VIT4, IOG4].map(L)
    }
  };

  /* Medidas como escritas na folha, na ordem em que aparecem no texto. */
  const PADROES = [
    /\d+\s(?:ml|gramas)\b/g, /[½¼]\s(?:da fruta|fatia)/g, /1 unidade/g, /ponta da faca/g,
    /1 colher de sopa de cada alimento/g, /1 colher de sopa de Whey Protein/g,
    /1 fatia pequena/g, /1 pedaço pequeno/g
  ];
  function medidas(texto) {
    const achados = [];
    PADROES.forEach(re => { let m; re.lastIndex = 0; while ((m = re.exec(texto))) achados.push([m.index, m[0]]); });
    achados.sort((a, b) => a[0] - b[0]);
    return achados.map(a => a[1]);
  }

  window.BARI = { REFEICOES, DIAS, DIAS_CURTOS, PRE, SEMANAS: [S1, S2, S3, S4], medidas };
})();
