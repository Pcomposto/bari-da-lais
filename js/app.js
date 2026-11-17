/* Bari da Laís — lógica do app (sem dependências, offline). */
(function () {
  'use strict';
  const B = window.BARI;
  const CHAVE = 'bari-da-lais:v1';
  const VERSAO_DADOS = 1;
  const TIPOS_PADRAO = ['Água', 'Água de coco', 'Chá', 'Suco diluído', 'Gatorade', 'Gelatina', 'Caldo / sopa', 'Leite / vitamina', 'Outro'];

  // ---------- utilidades ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const isoData = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const agoraLocal = () => { const d = new Date(); return isoData(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const hoje = () => isoData(new Date());
  const paraData = iso => { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const somarDias = (iso, n) => { const d = paraData(iso); d.setDate(d.getDate() + n); return isoData(d); };
  const diaSemana = iso => (paraData(iso).getDay() + 6) % 7; // 0 = segunda
  const fmtData = iso => { if (!iso) return ''; const p = iso.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  const fmtDataCurta = iso => fmtData(iso).slice(0, 5);
  const fmtHora = s => (s && s.length >= 16 ? s.slice(11, 16) : '');
  const fmtML = n => Number(n).toLocaleString('pt-BR') + ' mL';
  const fmtL = n => (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const valido = s => typeof s === 'string';
  const ic = n => '<svg class="icon" aria-hidden="true"><use href="icons/icones.svg#' + n + '"></use></svg>';

  // ---------- estado e persistência ----------
  function padrao() {
    const vazio = {}; B.REFEICOES.forEach(r => { vazio[r.k] = ''; });
    return {
      versao: VERSAO_DADOS,
      cfg: {
        cirurgia: '2026-11-23',
        preDatas: ['2026-11-20', '2026-11-21', '2026-11-22'],
        preHorarios: vazio,
        jejumInicio: '',
        faseAtiva: 'pre',
        confirmadas: { s1: false, s2: false, s3: false, s4: false },
        inicios: { s1: '', s2: '', s3: '', s4: '' },
        metas: { s1: '', s2: '', s3: '', s4: '' },
        atalhos: [50, 100],
        tipos: TIPOS_PADRAO.slice(),
        ultimoTipo: 'Água'
      },
      checks: {},
      liq: [],
      eventos: []
    };
  }
  function mesclar(base, dados) {
    const out = padrao();
    if (!dados || typeof dados !== 'object') return out;
    const c = dados.cfg || {};
    Object.keys(out.cfg).forEach(k => {
      if (c[k] === undefined) return;
      const v = out.cfg[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) out.cfg[k] = Object.assign({}, v, c[k]);
      else out.cfg[k] = c[k];
    });
    if (dados.checks && typeof dados.checks === 'object') out.checks = dados.checks;
    if (Array.isArray(dados.liq)) out.liq = dados.liq.filter(r => r && valido(r.quando) && Number(r.ml) > 0);
    if (Array.isArray(dados.eventos)) out.eventos = dados.eventos;
    return out;
  }
  function carregar() {
    try { return mesclar(null, JSON.parse(localStorage.getItem(CHAVE) || 'null')); }
    catch (e) { return padrao(); }
  }
  let S = carregar();
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(S)); return true; }
    catch (e) { aviso('Não foi possível salvar no aparelho (' + e.name + '). Exporte um backup.'); return false; }
  }

  // ---------- regras de fase ----------
  const semanaPorId = id => B.SEMANAS.find(s => s.id === id);
  function nomeFase(id) {
    if (id === 'pre') return 'Pré-operatório';
    if (id === 'nenhuma') return 'Nenhuma fase ativa';
    const s = semanaPorId(id); return s ? s.nome + ' do pós · ' + s.titulo : id;
  }
  function emJejum() {
    return S.cfg.faseAtiva === 'pre' && !!S.cfg.jejumInicio && agoraLocal() >= S.cfg.jejumInicio;
  }
  /* Qual cardápio vale para uma data. Pós só conta se a etapa foi confirmada manualmente. */
  function etapaDaData(iso) {
    let pos = null;
    B.SEMANAS.forEach(s => {
      const ini = S.cfg.inicios[s.id];
      if (S.cfg.confirmadas[s.id] && ini && ini <= iso && (!pos || ini >= S.cfg.inicios[pos.id])) pos = s;
    });
    if (pos) return { tipo: 'pos', semana: pos, wd: diaSemana(iso) };
    const i = S.cfg.preDatas.indexOf(iso);
    if (i >= 0) return { tipo: 'pre', idx: i };
    return null;
  }
  function itensDoDia(iso) {
    const e = etapaDaData(iso);
    if (!e) return [];
    if (e.tipo === 'pre') {
      const dia = B.PRE.dias[e.idx];
      return B.REFEICOES.map(r => ({
        chave: iso + '|pre-' + e.idx + '-' + r.k, nome: r.nomePre, hora: S.cfg.preHorarios[r.k] || '',
        texto: dia.itens[r.k], conf: '', origemHora: 'pre'
      }));
    }
    return B.REFEICOES.map(r => {
      const it = e.semana.refeicoes[r.k][e.wd];
      return { chave: iso + '|' + e.semana.id + '-' + e.wd + '-' + r.k, nome: r.nome, hora: r.hora, texto: it.t, conf: it.conf || '' };
    });
  }
  function rotuloEtapa(iso) {
    const e = etapaDaData(iso);
    if (!e) return 'Sem cardápio para esta data';
    if (e.tipo === 'pre') return 'Pré · ' + B.PRE.dias[e.idx].rotulo;
    return e.semana.nome + ' · ' + e.semana.titulo + ' · coluna ' + B.DIAS[e.wd];
  }
  const totalDia = iso => S.liq.filter(r => r.quando.slice(0, 10) === iso).reduce((a, r) => a + Number(r.ml), 0);

  // ---------- interface: estado de navegação ----------
  const UI = { aba: 'hoje', dia: hoje(), cardEtapa: null, cardDia: null };

  function aviso(msg, desfazer) {
    const t = $('#toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (desfazer ? '<button type="button" class="toast-btn" id="toastDesfazer">Desfazer</button>' : '');
    t.hidden = false;
    clearTimeout(aviso._t);
    if (desfazer) $('#toastDesfazer').onclick = () => { desfazer(); t.hidden = true; };
    aviso._t = setTimeout(() => { t.hidden = true; }, desfazer ? 7000 : 3500);
  }

  // ---------- telas ----------
  function telaHoje() {
    const dia = UI.dia, ehHoje = dia === hoje();
    const jejum = emJejum();
    const etapa = etapaDaData(dia);
    const itens = itensDoDia(dia);
    let h = '';

    if (!estaInstalado()) {
      h += '<div class="banner info">' + ic('info') + '<span>Você está usando pelo navegador. Para uso diário, adicione à Tela de Início (veja Ajustes). Os registros do Safari e do app instalado ficam <b>separados</b>.</span></div>';
    }

    h += '<section class="card fase"><div class="rotulo">' + ic('leaf') + 'Fase ativa</div><div class="fase-nome">' + esc(nomeFase(S.cfg.faseAtiva)) + '</div>';
    if (S.cfg.faseAtiva === 'pre') h += '<div class="sub">Cirurgia prevista: ' + fmtData(S.cfg.cirurgia) + '</div>';
    h += '</section>';

    h += '<nav class="dia-nav" aria-label="Escolher dia">' +
      '<button type="button" class="btn-icone" data-acao="dia-ant" aria-label="Dia anterior">' + ic('left') + '</button>' +
      '<div class="dia-centro"><div class="dia-data">' + B.DIAS[diaSemana(dia)] + ', ' + fmtData(dia) + '</div>' +
      '<div class="sub">' + esc(rotuloEtapa(dia)) + '</div></div>' +
      '<button type="button" class="btn-icone" data-acao="dia-prox" aria-label="Próximo dia">' + ic('right') + '</button></nav>';
    if (!ehHoje) h += '<button type="button" class="btn-sec largo" data-acao="dia-hoje">' + ic('calendar') + ' Voltar para hoje</button>';

    // jejum / avisos
    if (jejum && ehHoje) {
      h += '<section class="card jejum" id="cardJejum"><h2>Jejum em andamento</h2><p>Início informado: ' + fmtData(S.cfg.jejumInicio) +
        ' às ' + fmtHora(S.cfg.jejumInicio) + '. Siga a orientação da equipe.</p>' +
        '<button type="button" class="btn-sec largo" data-acao="aba" data-aba="liquidos">Ver histórico</button></section>';
    } else if (S.cfg.faseAtiva === 'pre' && ehHoje) {
      if (S.cfg.jejumInicio && S.cfg.jejumInicio.slice(0, 10) === dia) {
        h += '<div class="banner alerta">Jejum começa hoje às <b>' + fmtHora(S.cfg.jejumInicio) + '</b>. Antes disso, desative os alarmes de líquidos do pré no app Relógio. <button type="button" class="link" data-acao="aba" data-aba="alarmes">Como fazer</button></div>';
      } else if (!S.cfg.jejumInicio && dia >= S.cfg.preDatas[2]) {
        h += '<div class="banner alerta">Início do jejum não cadastrado. Informe a data e o horário orientados pela equipe em <button type="button" class="link" data-acao="aba" data-aba="ajustes">Ajustes</button>.</div>';
      }
    }

    // líquidos
    const total = totalDia(dia);
    h += '<section class="card liquidos" aria-live="polite"><div class="rotulo">' + ic('drop') + 'Líquidos registrados ' + (ehHoje ? 'hoje' : 'em ' + fmtDataCurta(dia)) + '</div>' +
      '<div class="total" id="totalDia">' + fmtML(total) + '</div><div class="sub">' + fmtL(total) + ' · soma dos registros</div>';
    if (!(jejum && ehHoje)) {
      h += blocoMeta(dia, total);
      if (ehHoje) {
        h += '<div class="atalhos">' + S.cfg.atalhos.map(ml => '<button type="button" class="btn-grande" data-acao="add" data-ml="' + ml + '">+' + ml + ' mL</button>').join('') + '</div>' +
          '<button type="button" class="btn-sec largo" data-acao="registrar">' + ic('plus') + ' Outro volume / tipo / horário</button>' +
          '<div class="sub">Tipo dos atalhos: <b>' + esc(S.cfg.ultimoTipo) + '</b> · <button type="button" class="link" data-acao="trocar-tipo">trocar</button></div>';
      }
    }
    h += '</section>';

    // próxima refeição
    if (ehHoje && itens.length && !jejum) {
      const prox = proximaRefeicao(itens);
      h += '<section class="card prox"><div class="rotulo">' + ic('clock') + 'Próxima refeição</div>' +
        (prox ? '<div class="prox-nome">' + (prox.hora ? esc(prox.hora.replace(':', 'h')) + ' · ' : '') + esc(prox.nome) + '</div><div class="sub">' + esc(prox.texto) + '</div>'
          : '<div class="prox-nome">Todas marcadas</div>') + '</section>';
    }

    // checklist
    if (!etapa) {
      h += '<section class="card vazio"><p>Não há cardápio para esta data.</p>';
      if (S.cfg.faseAtiva === 'pre' && dia < S.cfg.preDatas[0]) h += '<p class="sub">O pré começa em ' + fmtData(S.cfg.preDatas[0]) + '.</p><button type="button" class="btn-sec largo" data-acao="ir-dia" data-dia="' + S.cfg.preDatas[0] + '">Ver ' + fmtDataCurta(S.cfg.preDatas[0]) + '</button>';
      else if (S.cfg.faseAtiva === 'pre') h += '<p class="sub">O cardápio do pós aparece depois que a fase for confirmada em Ajustes, conforme a equipe.</p>';
      h += '</section>';
    } else {
      const feitas = itens.filter(i => S.checks[i.chave]).length;
      h += '<section><div class="lista-topo"><h2>Checklist</h2><span class="contador" id="contador">' + feitas + ' de ' + itens.length + ' feitas</span></div>';
      if (etapa.tipo === 'pos') {
        h += '<p class="orient">' + esc(etapa.semana.orientacao) + '</p>';
        if (etapa.semana.destaque) h += '<p class="destaque">Orientação da folha: <b>' + esc(etapa.semana.destaque) + '</b></p>';
      } else {
        h += '<p class="orient">' + esc(B.PRE.nota) + ' Horários podem ser preenchidos em Ajustes.</p>';
      }
      h += '<p class="sub">Marcar uma refeição não soma volume aos líquidos.</p><ul class="checklist">' + itens.map(cartaoItem).join('') + '</ul></section>';
    }
    return h;
  }

  function blocoMeta(dia, total) {
    const e = etapaDaData(dia);
    const fasePre = e ? e.tipo === 'pre' : S.cfg.faseAtiva === 'pre';
    if (fasePre) {
      const pct = Math.min(100, (total / 2500) * 100);
      return '<div class="meta"><div><b>Faixa da folha do pré:</b> 2 a 2,5 L de líquido/dia, nos intervalos das refeições.</div>' +
        '<div class="barra" role="img" aria-label="' + fmtL(total) + ' de 2,5 L"><span style="width:' + pct.toFixed(1) + '%"></span><i style="left:80%"></i></div>' +
        '<div class="sub">Marca na barra = 2 L · fim = 2,5 L</div></div>';
    }
    const sem = e && e.tipo === 'pos' ? e.semana : semanaPorId(S.cfg.faseAtiva);
    if (!sem) return '';
    const meta = Number(S.cfg.metas[sem.id]) || 0;
    let h = '<div class="meta">';
    if (meta > 0) {
      h += '<div><b>Meta cadastrada (' + esc(sem.nome) + '):</b> ' + fmtML(meta) + '</div>' +
        '<div class="barra"><span style="width:' + Math.min(100, total / meta * 100).toFixed(1) + '%"></span></div>';
    } else {
      h += '<div><b>Meta diária:</b> em branco. Cadastre em Ajustes conforme a orientação da equipe.</div>';
    }
    if (sem.destaque) h += '<div class="sub">Orientação da folha: ' + esc(sem.destaque) + ' (não é meta diária).</div>';
    return h + '</div>';
  }

  function proximaRefeicao(itens) {
    const agora = agoraLocal().slice(11, 16);
    const pend = itens.filter(i => !S.checks[i.chave]);
    if (!pend.length) return null;
    const comHora = pend.filter(i => i.hora);
    if (comHora.length === pend.length) return comHora.find(i => i.hora >= agora) || pend[pend.length - 1];
    return pend[0];
  }

  function cartaoItem(i) {
    const feito = !!S.checks[i.chave];
    const med = B.medidas(i.texto);
    const whey = /Whey Protein/.test(i.texto);
    return '<li class="item' + (feito ? ' feito' : '') + '">' +
      '<div class="item-topo"><span class="hora">' + (i.hora ? esc(i.hora.replace(':', 'h')) : 'sem horário') + '</span><span class="nome">' + esc(i.nome) + '</span>' + (whey ? '<span class="tag">Whey</span>' : '') + '</div>' +
      '<p class="texto">' + esc(i.texto) + '</p>' +
      '<p class="porcao"><b>Porção/medida na folha:</b> ' + (med.length ? esc(med.join(' · ')) : 'não especificada') + '</p>' +
      (i.conf ? '<p class="conf">⚠️ Conferir: ' + esc(i.conf) + '</p>' : '') +
      '<button type="button" class="btn-check" data-acao="check" data-chave="' + esc(i.chave) + '" aria-pressed="' + feito + '">' +
      (feito ? ic('check') + ' Feita' + (S.checks[i.chave].length > 10 ? ' às ' + fmtHora(S.checks[i.chave]) : '') + ' — toque para desmarcar' : 'Marcar como feita') + '</button></li>';
  }

  function telaCardapio() {
    const ids = ['pre'].concat(B.SEMANAS.map(s => s.id));
    if (!UI.cardEtapa) UI.cardEtapa = ids.indexOf(S.cfg.faseAtiva) >= 0 ? S.cfg.faseAtiva : 'pre';
    const et = UI.cardEtapa;
    let h = '<h2>Cardápio semanal</h2><div class="chips" role="tablist">' + ids.map(id =>
      '<button type="button" class="chip' + (id === et ? ' ativo' : '') + '" data-acao="card-etapa" data-id="' + id + '">' + (id === 'pre' ? 'Pré' : semanaPorId(id).nome.replace(' semana', '')) + '</button>').join('') + '</div>';
    if (et === 'pre') {
      if (UI.cardDia == null || UI.cardDia > 2) UI.cardDia = 0;
      h += '<section class="card"><h3>' + esc(B.PRE.titulo) + '</h3><ol class="orient-lista">' + B.PRE.orientacoes.map(o => '<li>' + esc(o) + '</li>').join('') + '</ol><p class="sub">' + esc(B.PRE.nota) + '</p></section>';
      h += '<div class="chips">' + B.PRE.dias.map((d, i) => '<button type="button" class="chip' + (i === UI.cardDia ? ' ativo' : '') + '" data-acao="card-dia" data-i="' + i + '">' + esc(d.rotulo) + ' · ' + fmtDataCurta(S.cfg.preDatas[i]) + '</button>').join('') + '</div>';
      const d = B.PRE.dias[UI.cardDia];
      h += '<ul class="checklist leitura">' + B.REFEICOES.map(r => '<li class="item"><div class="item-topo"><span class="hora">' + (S.cfg.preHorarios[r.k] ? esc(S.cfg.preHorarios[r.k].replace(':', 'h')) : 'sem horário') + '</span><span class="nome">' + esc(r.nomePre) + '</span></div><p class="texto">' + esc(d.itens[r.k]) + '</p></li>').join('') + '</ul>';
      return h;
    }
    const sem = semanaPorId(et);
    if (UI.cardDia == null || UI.cardDia > 6) UI.cardDia = diaSemana(hoje());
    const confs = [];
    B.REFEICOES.forEach(r => sem.refeicoes[r.k].forEach((it, wd) => { if (it.conf) confs.push(B.DIAS_CURTOS[wd] + ' · ' + r.nome); }));
    h += '<section class="card"><h3>' + esc(sem.nome) + ': ' + esc(sem.titulo) + '</h3><p>' + esc(sem.orientacao) + '</p>' +
      (sem.destaque ? '<p class="destaque">Orientação da folha: <b>' + esc(sem.destaque) + '</b> (não é meta diária nem alarme).</p>' : '') +
      (confs.length ? '<p class="conf">⚠️ ' + confs.length + ' trecho(s) para conferir: ' + esc(confs.join('; ')) + '</p>' : '') + '</section>';
    h += '<div class="chips dias">' + B.DIAS_CURTOS.map((d, i) => '<button type="button" class="chip' + (i === UI.cardDia ? ' ativo' : '') + '" data-acao="card-dia" data-i="' + i + '">' + d + '</button>').join('') + '</div>';
    h += '<ul class="checklist leitura">' + B.REFEICOES.map(r => {
      const it = sem.refeicoes[r.k][UI.cardDia];
      const med = B.medidas(it.t);
      return '<li class="item"><div class="item-topo"><span class="hora">' + r.hora.replace(':', 'h') + '</span><span class="nome">' + esc(r.nome) + '</span>' + (/Whey Protein/.test(it.t) ? '<span class="tag">Whey</span>' : '') + '</div><p class="texto">' + esc(it.t) + '</p>' +
        (med.length ? '<p class="porcao"><b>Medida:</b> ' + esc(med.join(' · ')) + '</p>' : '') + (it.conf ? '<p class="conf">⚠️ Conferir: ' + esc(it.conf) + '</p>' : '') + '</li>';
    }).join('') + '</ul>';
    return h;
  }

  function formRegistro(r) {
    const quando = r ? r.quando : agoraLocal();
    const tipo = r ? r.tipo : S.cfg.ultimoTipo;
    const tipos = S.cfg.tipos.indexOf(tipo) >= 0 ? S.cfg.tipos : S.cfg.tipos.concat([tipo]);
    return '<label>Tipo de bebida<select name="tipo" required>' + tipos.map(t => '<option' + (t === tipo ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></label>' +
      '<label>Volume (mL)<input name="ml" type="number" inputmode="numeric" min="1" max="5000" step="1" required value="' + (r ? r.ml : '') + '" placeholder="Ex.: 150"></label>' +
      '<div class="duas"><label>Data<input name="data" type="date" required value="' + quando.slice(0, 10) + '"></label>' +
      '<label>Horário<input name="hora" type="time" required value="' + quando.slice(11, 16) + '"></label></div>';
  }
  function lerRegistro(form) {
    const f = new FormData(form);
    const ml = Math.round(Number(f.get('ml')));
    if (!(ml >= 1 && ml <= 5000)) { aviso('Informe um volume entre 1 e 5.000 mL.'); return null; }
    if (!f.get('data') || !f.get('hora')) { aviso('Informe data e horário.'); return null; }
    return { tipo: String(f.get('tipo')), ml: ml, quando: f.get('data') + 'T' + String(f.get('hora')).slice(0, 5) };
  }

  function telaLiquidos() {
    const jejum = emJejum();
    let h = '<h2>Líquidos</h2>';
    const form = '<form id="formLiq" class="card form">' + formRegistro(null) + '<button type="submit" class="btn-grande largo">Registrar</button></form>';
    h += jejum ? '<details class="card"><summary>Registrar manualmente</summary>' + form + '</details>' : form;

    const porDia = {};
    S.liq.forEach(r => { (porDia[r.quando.slice(0, 10)] = porDia[r.quando.slice(0, 10)] || []).push(r); });
    const dias = Object.keys(porDia).sort().reverse();
    h += '<h2>Histórico</h2>';
    if (!dias.length) h += '<p class="card vazio">Nenhum registro ainda.</p>';
    dias.forEach(d => {
      const regs = porDia[d].sort((a, b) => b.quando.localeCompare(a.quando));
      h += '<section class="card hist"><div class="lista-topo"><h3>' + B.DIAS_CURTOS[diaSemana(d)] + ', ' + fmtData(d) + '</h3><b>' + fmtML(regs.reduce((a, r) => a + Number(r.ml), 0)) + '</b></div><ul class="regs">' +
        regs.map(r => '<li><button type="button" class="reg" data-acao="editar-liq" data-id="' + esc(r.id) + '"><span class="hora">' + fmtHora(r.quando) + '</span><span class="reg-tipo">' + esc(r.tipo) + '</span><span class="reg-ml">' + fmtML(r.ml) + '</span><span class="reg-ed" aria-hidden="true">' + ic('edit') + '</span></button></li>').join('') + '</ul></section>';
    });

    const diasCheck = {};
    Object.keys(S.checks).forEach(k => { const d = k.slice(0, 10); diasCheck[d] = (diasCheck[d] || 0) + 1; });
    const dc = Object.keys(diasCheck).sort().reverse();
    h += '<h2>Checklist — dias anteriores</h2>';
    if (!dc.length) h += '<p class="card vazio">Nenhuma refeição marcada ainda.</p>';
    else h += '<ul class="card regs">' + dc.map(d => '<li><button type="button" class="reg" data-acao="ir-dia" data-dia="' + d + '"><span class="hora">' + fmtDataCurta(d) + '</span><span class="reg-tipo">' + esc(rotuloEtapa(d)) + '</span><span class="reg-ml">' + diasCheck[d] + '/7</span></button></li>').join('') + '</ul>';
    return h;
  }

  function horariosFase() {
    const f = S.cfg.faseAtiva;
    if (f === 'pre') return B.REFEICOES.map(r => ({ hora: S.cfg.preHorarios[r.k], nome: r.nomePre }));
    if (semanaPorId(f)) return B.REFEICOES.map(r => ({ hora: r.hora, nome: r.nome }));
    return [];
  }

  function telaAlarmes() {
    const f = S.cfg.faseAtiva, hs = horariosFase();
    let h = '<h2>Alarmes no iPhone</h2><div class="banner info">' + ic('info') + '<span>O app não toca alarmes. Com a tela bloqueada, quem avisa é o app <b>Relógio</b> do iPhone, configurado por você.</span></div>';
    h += '<section class="card"><div class="rotulo">' + ic('leaf') + 'Fase ativa</div><div class="fase-nome">' + esc(nomeFase(f)) + '</div>';
    if (!hs.length) h += '<p>Nenhuma fase ativa: não há horários para configurar.</p>';
    else {
      h += '<ul class="horarios">' + hs.map(x => '<li><span class="hora">' + (x.hora ? esc(x.hora.replace(':', 'h')) : '—') + '</span><span>' + esc(x.nome) + '</span></li>').join('') + '</ul>';
      if (f === 'pre') h += '<p class="sub">A folha do pré não traz horários. Os que aparecerem aqui foram preenchidos em Ajustes.</p>';
      if (f === 's2') h += '<p class="sub">"250 mL em 2 horas" é orientação da folha. O app não cria alarme repetitivo para isso.</p>';
      h += '<p class="sub">Sugestão de nome do alarme: <b>' + (f === 'pre' ? 'Bari PRÉ' : 'Bari PÓS') + ' – [refeição]</b>. O prefixo ajuda a achar e desligar o grupo certo.</p>';
    }
    if (S.cfg.jejumInicio) h += '<p><b>Início do jejum:</b> ' + fmtData(S.cfg.jejumInicio) + ' às ' + fmtHora(S.cfg.jejumInicio) + '</p>';
    h += '</section>';

    const sec = (t, corpo, aberto) => '<details class="card passo"' + (aberto ? ' open' : '') + '><summary>' + t + '</summary>' + corpo + '</details>';
    h += sec('1. Criar um alarme', '<ol><li>Abra o app <b>Relógio</b> → aba <b>Alarmes</b> → toque em <b>+</b>.</li><li>Ajuste o horário.</li><li><b>Repetir</b>: escolha os dias (para o pré, deixe sem repetição e crie só para as datas do pré; para o pós, “Todos os dias” enquanto a etapa durar).</li><li><b>Etiqueta</b>: ex.: “Bari PÓS – 09h30 Colação”.</li><li><b>Som</b>: escolha um toque (com “Nenhum” ele só vibra). Deixe <b>Adiar</b> ligado se quiser.</li><li>Toque em <b>Salvar</b>. Repita para cada horário.</li></ol><p class="sub">Alternativa: diga à Siri “Criar alarme às 9h30 chamado Bari PÓS colação”.</p>', true);
    h += sec('2. Testar com a tela bloqueada', '<ol><li>Crie um alarme “Teste Bari” para daqui a 2 minutos.</li><li>Bloqueie a tela com o botão lateral e aguarde.</li><li>Confirme que tocou e com volume adequado. O volume é o de <b>Ajustes → Sons e Tátil → Toque e Alertas</b>.</li><li>Alarmes do Relógio tocam mesmo no modo silencioso e com Foco ligado.</li><li>Apague o alarme de teste (deslize para a esquerda → Apagar).</li></ol>');
    h += sec('3. Desativar ou apagar', '<ul><li><b>Desativar</b>: na aba Alarmes, desligue a chave ao lado de cada alarme. Ele fica guardado para reutilizar.</li><li><b>Apagar</b>: deslize o alarme para a esquerda → <b>Apagar</b>, ou toque em <b>Editar</b> → ⊖.</li><li>Confira: alarmes desligados aparecem em cinza.</li></ul>');
    h += sec('4. Pré: desligar os alarmes de líquidos antes do jejum', '<ol><li>Cadastre em Ajustes a data e o horário de início do jejum informados pela equipe.</li><li>Na véspera, <b>antes</b> desse horário, abra Relógio → Alarmes.</li><li>Desligue <b>todos</b> os alarmes “Bari PRÉ” de líquidos e refeições que tocariam depois do início do jejum.</li><li>Confira se nenhum “Bari PRÉ” ficou com a chave verde.</li><li>No horário do jejum, o app esconde a meta e os atalhos de ingestão automaticamente; o histórico continua acessível.</li></ol>');
    h += sec('5. Pós: configurar depois da liberação', '<ol><li>Só depois que a equipe liberar a dieta, confirme a etapa em <b>Ajustes → Fase ativa</b>.</li><li>Crie os alarmes com os horários da lista acima (07h, 09h30, 12h, 15h, 17h, 19h, 22h), etiqueta “Bari PÓS – …”, repetição “Todos os dias”.</li><li>Faça o teste com a tela bloqueada (passo 2).</li><li>Se a equipe mudar horários, edite cada alarme no Relógio. Ao fim do acompanhamento, apague os “Bari PÓS”.</li></ol>');
    h += sec('Opcional: desligar automaticamente com o app Atalhos', '<p>O app <b>Atalhos</b> tem a ação <b>“Alternar Alarme”</b> e automações por <b>Hora do Dia</b>. É possível criar uma automação que desliga os alarmes “Bari PRÉ” no horário do jejum. Os menus mudam entre versões do iOS: teste antes e mantenha a conferência manual do passo 4.</p>');
    return h;
  }

  function telaAjustes() {
    const c = S.cfg;
    const ids = ['pre'].concat(B.SEMANAS.map(s => s.id)).concat(['nenhuma']);
    let h = '<h2>Ajustes</h2>';

    h += '<form id="formFase" class="card form"><h3>Fase ativa</h3><p class="sub">Confirme somente após a orientação da equipe. A data da cirurgia não muda a fase sozinha.</p>' +
      '<label>Fase<select name="fase">' + ids.map(id => '<option value="' + id + '"' + (id === c.faseAtiva ? ' selected' : '') + '>' + esc(nomeFase(id)) + '</option>').join('') + '</select></label>' +
      '<label>Início desta etapa (pós)<input name="inicio" type="date" value="' + hoje() + '"></label>' +
      '<button type="submit" class="btn-grande largo">Confirmar fase</button></form>';

    h += '<form id="formInicios" class="card form"><h3>Início das etapas do pós</h3><p class="sub">Etapas confirmadas podem ter a data ajustada. Os registros de etapas anteriores ficam no histórico.</p>' +
      B.SEMANAS.map(s => '<label>' + esc(s.nome) + (c.confirmadas[s.id] ? '' : ' (não confirmada)') + '<input name="' + s.id + '" type="date" value="' + esc(c.inicios[s.id]) + '"' + (c.confirmadas[s.id] ? '' : ' disabled') + '></label>').join('') +
      '<button type="submit" class="btn-sec largo">Salvar datas</button></form>';

    h += '<form id="formPre" class="card form"><h3>Pré-operatório e jejum</h3>' +
      '<label>Cirurgia prevista<input name="cirurgia" type="date" required value="' + esc(c.cirurgia) + '"></label>' +
      '<div class="duas">' + B.PRE.dias.map((d, i) => '<label>' + esc(d.rotulo) + '<input name="pre' + i + '" type="date" required value="' + esc(c.preDatas[i]) + '"></label>').join('') + '</div>' +
      '<label>Início do jejum (conforme a equipe)<input name="jejum" type="datetime-local" value="' + esc(c.jejumInicio) + '"></label>' +
      '<p class="sub">Horários das refeições do pré (opcional; a folha não informa):</p><div class="duas">' +
      B.REFEICOES.map(r => '<label>' + esc(r.nomePre) + '<input name="h_' + r.k + '" type="time" value="' + esc(c.preHorarios[r.k]) + '"></label>').join('') + '</div>' +
      '<button type="submit" class="btn-sec largo">Salvar pré e jejum</button></form>';

    h += '<form id="formMetas" class="card form"><h3>Metas diárias do pós</h3><p class="sub">Deixe em branco até a equipe orientar.</p>' +
      B.SEMANAS.map(s => '<label>' + esc(s.nome) + ' (mL/dia)<input name="' + s.id + '" type="number" inputmode="numeric" min="0" max="10000" value="' + esc(c.metas[s.id]) + '" placeholder="em branco"></label>').join('') +
      '<button type="submit" class="btn-sec largo">Salvar metas</button></form>';

    h += '<form id="formAtalhos" class="card form"><h3>Atalhos e tipos</h3>' +
      '<label>Volumes dos botões rápidos (mL, separados por vírgula)<input name="atalhos" inputmode="numeric" value="' + esc(c.atalhos.join(', ')) + '"></label>' +
      '<label>Tipos de bebida (um por linha)<textarea name="tipos" rows="6">' + esc(c.tipos.join('\n')) + '</textarea></label>' +
      '<button type="submit" class="btn-sec largo">Salvar atalhos</button></form>';

    h += '<section class="card form"><h3>Backup</h3><p class="sub">Os dados ficam só neste aparelho e neste app. Exporte um backup com frequência (ex.: salve em Arquivos ou envie para você mesma).</p>' +
      '<button type="button" class="btn-grande largo" data-acao="exportar">' + ic('download') + ' Exportar backup (.json)</button>' +
      '<label class="btn-sec largo arquivo">Restaurar backup…<input id="importar" type="file" accept="application/json,.json"></label>' +
      '<p class="sub" id="infoArmaz">' + esc(infoArmazenamento()) + '</p></section>';

    h += '<section class="card"><h3>Instalar no iPhone</h3><ol><li>Abra o endereço do app no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> (quadrado com seta).</li><li>Escolha <b>Adicionar à Tela de Início</b> → <b>Adicionar</b>.</li><li>Abra pelo ícone “Bari da Laís”. Abra uma vez com internet; depois funciona offline.</li></ol><p class="sub">Situação: ' + (estaInstalado() ? 'aberto como app instalado.' : 'aberto no navegador.') + '</p></section>';
    return h;
  }

  function infoArmazenamento() {
    return S.liq.length + ' registro(s) de líquidos · ' + Object.keys(S.checks).length + ' refeição(ões) marcada(s).' + (infoArmazenamento.persist === true ? ' Armazenamento persistente concedido.' : '');
  }
  function estaInstalado() {
    return window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }

  // ---------- render ----------
  function render() {
    const telas = { hoje: telaHoje, cardapio: telaCardapio, liquidos: telaLiquidos, alarmes: telaAlarmes, ajustes: telaAjustes };
    $('#conteudo').innerHTML = telas[UI.aba]();
    document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-current', b.dataset.aba === UI.aba ? 'page' : 'false'));
    ligarFormularios();
  }
  function irPara(aba) { UI.aba = aba; render(); window.scrollTo(0, 0); }

  // ---------- ações ----------
  function adicionar(reg, mostrarDesfazer) {
    const r = Object.assign({ id: uid() }, reg);
    S.liq.push(r);
    if (S.cfg.tipos.indexOf(r.tipo) >= 0) S.cfg.ultimoTipo = r.tipo;
    if (!salvar()) { S.liq.pop(); return; }
    render();
    if (mostrarDesfazer) aviso('+' + fmtML(r.ml) + ' · ' + r.tipo + ' às ' + fmtHora(r.quando), () => { S.liq = S.liq.filter(x => x.id !== r.id); salvar(); render(); aviso('Registro desfeito.'); });
  }

  function abrirModal(titulo, corpo, aoMontar) {
    const m = $('#modal');
    m.innerHTML = '<div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="modalTitulo"><div class="modal-topo"><h2 id="modalTitulo">' + esc(titulo) + '</h2><button type="button" class="btn-icone" data-acao="fechar-modal" aria-label="Fechar">' + ic('close') + '</button></div>' + corpo + '</div>';
    m.hidden = false; document.body.classList.add('com-modal');
    if (aoMontar) aoMontar(m);
  }
  function fecharModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; document.body.classList.remove('com-modal'); }

  function modalRegistrar() {
    abrirModal('Registrar líquido', '<form id="formModal" class="form">' + formRegistro(null) + '<button type="submit" class="btn-grande largo">Registrar</button></form>', m => {
      const f = $('#formModal', m); $('input[name=ml]', f).focus();
      f.onsubmit = ev => { ev.preventDefault(); const r = lerRegistro(f); if (r) { fecharModal(); adicionar(r, true); } };
    });
  }
  function modalEditar(id) {
    const r = S.liq.find(x => x.id === id); if (!r) return;
    abrirModal('Editar registro', '<form id="formModal" class="form">' + formRegistro(r) + '<button type="submit" class="btn-grande largo">Salvar</button><button type="button" class="btn-perigo largo" id="btnExcluir">Excluir registro</button></form>', m => {
      const f = $('#formModal', m);
      f.onsubmit = ev => {
        ev.preventDefault(); const n = lerRegistro(f); if (!n) return;
        const antes = Object.assign({}, r); Object.assign(r, n); salvar(); fecharModal(); render();
        aviso('Registro atualizado.', () => { Object.assign(r, antes); salvar(); render(); });
      };
      $('#btnExcluir', m).onclick = () => {
        const pos = S.liq.indexOf(r); S.liq.splice(pos, 1); salvar(); fecharModal(); render();
        aviso('Registro excluído.', () => { S.liq.splice(pos, 0, r); salvar(); render(); });
      };
    });
  }
  function modalTipo() {
    abrirModal('Tipo dos atalhos', '<div class="lista-tipos">' + S.cfg.tipos.map(t => '<button type="button" class="btn-sec largo' + (t === S.cfg.ultimoTipo ? ' ativo' : '') + '" data-acao="escolher-tipo" data-tipo="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>');
  }

  function exportar() {
    const dados = JSON.stringify({ app: 'Bari da Laís', exportadoEm: agoraLocal(), dados: S }, null, 2);
    const nome = 'bari-da-lais-backup-' + hoje() + '.json';
    const blob = new Blob([dados], { type: 'application/json' });
    let arquivo = null;
    try { arquivo = new File([blob], nome, { type: 'application/json' }); } catch (e) { /* navegador antigo */ }
    if (arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      navigator.share({ files: [arquivo], title: nome }).catch(err => { if (err.name !== 'AbortError') baixar(blob, nome); });
    } else baixar(blob, nome);
  }
  function baixar(blob, nome) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    aviso('Backup gerado: ' + nome);
  }
  function importar(arquivo) {
    const leitor = new FileReader();
    leitor.onload = () => {
      let obj;
      try { obj = JSON.parse(leitor.result); } catch (e) { aviso('Arquivo inválido: não é JSON.'); return; }
      const d = obj && obj.dados;
      if (!d || obj.app !== 'Bari da Laís' || !d.cfg || !Array.isArray(d.liq) || typeof d.checks !== 'object') { aviso('Arquivo não reconhecido como backup do Bari da Laís.'); return; }
      const novo = mesclar(null, d);
      if (!confirm('Restaurar backup de ' + (obj.exportadoEm ? fmtData(obj.exportadoEm) + ' ' + fmtHora(obj.exportadoEm) : 'data desconhecida') + '?\n\n' + novo.liq.length + ' registros de líquidos e ' + Object.keys(novo.checks).length + ' marcações.\n\nOs dados atuais deste aparelho serão substituídos.')) return;
      S = novo; salvar(); render(); aviso('Backup restaurado.');
    };
    leitor.readAsText(arquivo);
  }

  function ligarFormularios() {
    const f = (id, fn) => { const el = document.getElementById(id); if (el) el.onsubmit = ev => { ev.preventDefault(); fn(new FormData(el), el); }; };
    f('formLiq', (_, el) => { const r = lerRegistro(el); if (r) adicionar(r, true); });
    f('formFase', fd => {
      const fase = String(fd.get('fase')), ini = String(fd.get('inicio') || '');
      const pos = !!semanaPorId(fase);
      if (pos && !ini) { aviso('Informe a data de início da etapa.'); return; }
      const msg = fase === 'pre' || fase === 'nenhuma' ? 'Mudar a fase ativa para "' + nomeFase(fase) + '"?' :
        'Confirma que a equipe liberou a ' + nomeFase(fase) + ', com início em ' + fmtData(ini) + '?';
      if (!confirm(msg)) return;
      S.eventos.push({ em: agoraLocal(), de: S.cfg.faseAtiva, para: fase, inicio: pos ? ini : '' });
      S.cfg.faseAtiva = fase;
      if (pos) { S.cfg.confirmadas[fase] = true; S.cfg.inicios[fase] = ini; }
      salvar(); UI.cardEtapa = null; render(); aviso('Fase ativa: ' + nomeFase(fase));
    });
    f('formInicios', fd => {
      B.SEMANAS.forEach(s => { if (S.cfg.confirmadas[s.id] && fd.get(s.id) !== null) S.cfg.inicios[s.id] = String(fd.get(s.id)); });
      salvar(); render(); aviso('Datas das etapas salvas.');
    });
    f('formPre', fd => {
      S.cfg.cirurgia = String(fd.get('cirurgia'));
      S.cfg.preDatas = [0, 1, 2].map(i => String(fd.get('pre' + i)));
      S.cfg.jejumInicio = String(fd.get('jejum') || '').slice(0, 16);
      B.REFEICOES.forEach(r => { S.cfg.preHorarios[r.k] = String(fd.get('h_' + r.k) || ''); });
      salvar(); render(); aviso('Pré e jejum salvos.');
    });
    f('formMetas', fd => {
      B.SEMANAS.forEach(s => { const v = String(fd.get(s.id) || '').trim(); S.cfg.metas[s.id] = v && Number(v) > 0 ? String(Math.round(Number(v))) : ''; });
      salvar(); render(); aviso('Metas salvas.');
    });
    f('formAtalhos', fd => {
      const at = String(fd.get('atalhos')).split(/[,;\s]+/).map(Number).filter(n => n >= 1 && n <= 5000).map(Math.round).slice(0, 6);
      const tipos = String(fd.get('tipos')).split('\n').map(s => s.trim()).filter(Boolean);
      if (!at.length) { aviso('Informe ao menos um volume entre 1 e 5.000 mL.'); return; }
      if (!tipos.length) { aviso('Informe ao menos um tipo de bebida.'); return; }
      S.cfg.atalhos = at; S.cfg.tipos = tipos;
      if (tipos.indexOf(S.cfg.ultimoTipo) < 0) S.cfg.ultimoTipo = tipos[0];
      salvar(); render(); aviso('Atalhos salvos.');
    });
    const imp = document.getElementById('importar');
    if (imp) imp.onchange = () => { if (imp.files[0]) importar(imp.files[0]); imp.value = ''; };
  }

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-acao]'); if (!el) return;
    const a = el.dataset.acao;
    if (a === 'aba') irPara(el.dataset.aba);
    else if (a === 'dia-ant') { UI.dia = somarDias(UI.dia, -1); render(); }
    else if (a === 'dia-prox') { UI.dia = somarDias(UI.dia, 1); render(); }
    else if (a === 'dia-hoje') { UI.dia = hoje(); render(); }
    else if (a === 'ir-dia') { UI.dia = el.dataset.dia; irPara('hoje'); }
    else if (a === 'add') adicionar({ tipo: S.cfg.ultimoTipo, ml: Number(el.dataset.ml), quando: agoraLocal() }, true);
    else if (a === 'registrar') modalRegistrar();
    else if (a === 'trocar-tipo') modalTipo();
    else if (a === 'escolher-tipo') { S.cfg.ultimoTipo = el.dataset.tipo; salvar(); fecharModal(); render(); }
    else if (a === 'check') {
      const k = el.dataset.chave;
      if (S.checks[k]) delete S.checks[k]; else S.checks[k] = agoraLocal();
      salvar(); render();
    }
    else if (a === 'editar-liq') modalEditar(el.dataset.id);
    else if (a === 'card-etapa') { UI.cardEtapa = el.dataset.id; UI.cardDia = null; render(); }
    else if (a === 'card-dia') { UI.cardDia = Number(el.dataset.i); render(); }
    else if (a === 'exportar') exportar();
    else if (a === 'fechar-modal') fecharModal();
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#modal').hidden) fecharModal(); });
  $('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal') fecharModal(); });

  // Atualiza a tela Hoje na virada do minuto (início do jejum, próxima refeição, virada do dia).
  // Não é alarme: só redesenha enquanto o app está aberto.
  let ultimoMin = agoraLocal(), ultimoDia = hoje();
  setInterval(() => {
    const m = agoraLocal(); if (m === ultimoMin) return;
    ultimoMin = m;
    if (hoje() !== ultimoDia) { if (UI.dia === ultimoDia) UI.dia = hoje(); ultimoDia = hoje(); }
    const editando = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (UI.aba === 'hoje' && $('#modal').hidden && !editando) render();
  }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && UI.aba === 'hoje' && $('#modal').hidden) { if (hoje() !== ultimoDia) { UI.dia = hoje(); ultimoDia = hoje(); } render(); } });

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(ok => { infoArmazenamento.persist = ok; }).catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) aviso('Nova versão instalada. Feche e abra o app para usar.'); });
      });
    }).catch(() => {});
  }

  window.__bari = { estado: () => S, totalDia, itensDoDia, emJejum, etapaDaData }; // apoio a testes
  render();
})();
