/* =====================================================================
 * app.js — telas do Diário Digital. Tudo é salvo sozinho no navegador.
 * ===================================================================== */
import * as D from './dados.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
const folha = $('#folha');

const ABAS = [
    { id: 'hoje', ic: '✏️', nome: 'Hoje' },
    { id: 'mes', ic: '🗓️', nome: 'Mês' },
    { id: 'resumo', ic: '📊', nome: 'Resumo' },
    { id: 'ajustes', ic: '⚙️', nome: 'Ajustes' },
];
const hcor = (v) => `var(--h${v})`;

// ===================== dados =====================
function carregar() {
    let b = null;
    try { b = JSON.parse(localStorage.getItem(D.CHAVE) || 'null'); } catch (e) { b = null; }
    if (b) return { banco: D.normalizar(b), migrados: 0 };
    // Primeira vez nesta versão: traz os dias salvos pela versão antiga (chaves = datas).
    let entradas = [];
    try { entradas = Object.keys(localStorage).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).map((k) => [k, localStorage.getItem(k)]); } catch (e) { /* sem acesso */ }
    return D.migrarAntigo(D.normalizar(D.bancoVazio()), entradas);
}
const inicio = carregar();
let banco = inicio.banco;
const estado = { aba: 'hoje', data: D.hoje(), mes: null };

let salvoT = null;
function salvar() {
    try {
        localStorage.setItem(D.CHAVE, JSON.stringify(banco));
        $('#salvo').classList.add('mostrar');
        clearTimeout(salvoT); salvoT = setTimeout(() => $('#salvo').classList.remove('mostrar'), 1500);
    } catch (e) { aviso('⚠️ Não foi possível salvar: armazenamento do navegador cheio. Baixe uma cópia em Ajustes.'); }
}
const dia = () => D.obterDia(banco, estado.data);
function mudarDia(fn) { const d = structuredClone(dia()); fn(d); banco = D.gravarDia(banco, estado.data, d); salvar(); }

let avisoT = null;
function aviso(msg, acao = null) {
    const el = $('#aviso');
    el.innerHTML = `<span>${esc(msg)}</span>${acao ? `<button type="button">${esc(acao.nome)}</button>` : ''}`;
    if (acao) el.querySelector('button').onclick = () => { acao.fn(); el.classList.remove('mostrar'); };
    el.classList.add('mostrar');
    clearTimeout(avisoT); avisoT = setTimeout(() => el.classList.remove('mostrar'), acao ? 5000 : 2800);
}

// ===================== navegação =====================
function renderAbas() {
    const html = ABAS.map((a) => `<button type="button" data-aba="${a.id}" ${estado.aba === a.id ? 'aria-current="page"' : ''}><span class="ic" aria-hidden="true">${a.ic}</span>${a.nome}</button>`).join('');
    $('#abas-topo').innerHTML = html; $('#abas-inf').innerHTML = html;
    const t = banco.config.tema;
    $('#btn-tema').textContent = { system: '🖥️', light: '☀️', dark: '🌙' }[t] || '🖥️';
    $('#btn-tema').title = { system: 'Tema: igual ao aparelho', light: 'Tema: claro', dark: 'Tema: escuro' }[t];
}
function render({ rolar = false } = {}) {
    renderAbas();
    const v = { hoje: vistaHoje, mes: vistaMes, resumo: vistaResumo, ajustes: vistaAjustes }[estado.aba];
    app.innerHTML = `<div class="vista">${v()}</div>`;
    ({ hoje: ligarHoje, mes: ligarMes, resumo: ligarResumo, ajustes: ligarAjustes })[estado.aba]();
    if (rolar) window.scrollTo({ top: 0 });
}
function irPara(aba) { estado.aba = aba; history.replaceState(null, '', `#${aba}`); render({ rolar: true }); }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-aba]'); if (b) { if (b.dataset.aba === 'mes') estado.mes = null; irPara(b.dataset.aba); } });

// ===================== HOJE =====================
function chipsTurmas(p, pid) {
    const ativas = D.turmasAtivas(banco);
    // turmas arquivadas que já estavam marcadas neste dia continuam aparecendo
    const extras = (p.turmas || []).map((id) => banco.turmas.find((t) => t.id === id)).filter((t) => t && t.arquivada);
    const lista = [...ativas, ...extras];
    return `<div class="chips" role="group" aria-label="Turmas">
        ${lista.map((t) => `<button type="button" class="chip c-${t.cor}" data-turma="${t.id}" data-p="${pid}" aria-pressed="${p.turmas.includes(t.id)}"><span class="bola" aria-hidden="true"></span>${esc(D.nomeTurma(t))}</button>`).join('')}
        <button type="button" class="chip chip-add" data-nova-turma="${pid}">＋ ${lista.length ? 'Nova turma' : 'Cadastrar turma/escola'}</button>
    </div>`;
}

function vistaHoje() {
    const h = D.hoje();
    const d = dia();
    const rel = estado.data === h ? 'Hoje' : estado.data === D.addDias(h, -1) ? 'Ontem' : estado.data === D.addDias(h, 1) ? 'Amanhã' : D.fmtDataCurta(estado.data);
    const habs = D.habitosAtivos(banco);
    const periodos = D.PERIODOS.map((P) => {
        const p = d.periodos[P.id];
        const nAulas = Math.max(1, Number(p.aulas) || 1);
        const resumo = p.aula ? `${nAulas} ${nAulas === 1 ? 'aula' : 'aulas'}${p.turmas.length ? ` · ${p.turmas.map((id) => esc(banco.turmas.find((t) => t.id === id)?.nome || '')).join(', ')}` : ''}` : 'Sem aula registrada';
        return `<section class="cartao periodo p-${P.id} ${p.aula ? 'com-aula' : ''}" aria-labelledby="t-${P.id}">
            <div class="periodo-topo">
                <span class="ic" aria-hidden="true">${P.icone}</span>
                <div><h3 id="t-${P.id}">${P.nome}</h3><p class="resumo-p" id="r-${P.id}">${resumo}</p></div>
                <label class="chave"><span class="txt-chave">Dei aula</span><input type="checkbox" data-aula="${P.id}" ${p.aula ? 'checked' : ''} aria-label="Dei aula de ${P.nome.toLowerCase()}"><span class="trilho" aria-hidden="true"></span></label>
            </div>
            <div class="detalhe-aula"><div><div class="dentro">
                <div><span class="rotulo">Turma / escola</span>${chipsTurmas(p, P.id)}</div>
                <div><span class="rotulo">Quantas aulas</span>
                    <span class="passo"><button type="button" data-aulas="${P.id}" data-d="-1" aria-label="Menos aulas">−</button><output id="n-${P.id}">${nAulas}</output><button type="button" data-aulas="${P.id}" data-d="1" aria-label="Mais aulas">+</button></span></div>
            </div></div></div>
            <label class="sr-only" for="notas-${P.id}">Anotações da ${P.nome.toLowerCase()}</label>
            <textarea class="notas" id="notas-${P.id}" data-notas="${P.id}" rows="2" placeholder="Anotações da ${P.nome.toLowerCase()}…">${esc(p.notas)}</textarea>
        </section>`;
    }).join('');

    return `
        <section class="lousa" aria-label="Dia selecionado">
            <div class="data-nav">
                <button type="button" class="seta" data-dia="-1" aria-label="Dia anterior">‹</button>
                <div class="data-centro"><span class="rel">${rel}</span><span class="longa">${D.fmtDataLonga(estado.data)}</span>
                    <label class="sr-only" for="inp-data">Escolher data</label><input type="date" id="inp-data" value="${estado.data}"></div>
                <button type="button" class="seta" data-dia="1" aria-label="Próximo dia">›</button>
            </div>
            ${estado.data !== h ? '<div style="text-align:center"><button type="button" class="btn-hoje" id="btn-hoje">Voltar para hoje</button></div>' : ''}
            <div class="humor-linha" role="group" aria-label="Como foi o seu dia?">
                <span class="rot">Como foi o seu dia?</span>
                ${D.HUMORES.map((x) => `<button type="button" class="humor-btn" data-humor="${x.v}" aria-pressed="${d.humor === x.v}"><span class="e" aria-hidden="true">${x.icone}</span><span>${x.nome}</span></button>`).join('')}
            </div>
        </section>
        <div class="grade-hoje">
            <div class="periodos">${periodos}</div>
            <div class="pilha">
                <section class="cartao" aria-labelledby="t-habitos">
                    <div class="cartao-topo"><h2 id="t-habitos">Hábitos</h2><button type="button" class="btn btn-peq" data-aba="ajustes">Editar</button></div>
                    ${habs.length ? `<div class="habitos">${habs.map((x) => {
                        const on = d.habitos.includes(x.id);
                        const seq = D.sequencia(banco, x.id, estado.data);
                        return `<button type="button" class="habito" data-habito="${x.id}" aria-pressed="${on}"><span class="e" aria-hidden="true">${x.icone}</span><span><b>${esc(x.nome)}</b><small>${seq ? `🔥 ${seq} ${seq === 1 ? 'dia' : 'dias seguidos'}` : 'toque para marcar'}</small></span><span class="marca-ok" aria-hidden="true">${on ? '✓' : ''}</span></button>`;
                    }).join('')}</div>` : '<p class="vazio peq">Nenhum hábito ativo. Crie em Ajustes.</p>'}
                </section>
                <section class="cartao" aria-labelledby="t-nota">
                    <h2 id="t-nota" style="margin-bottom:10px">Nota do dia</h2>
                    <label class="sr-only" for="nota-dia">Nota do dia</label>
                    <textarea class="nota-dia" id="nota-dia" placeholder="Uma coisa boa de hoje, um lembrete para amanhã…">${esc(d.nota)}</textarea>
                    <div class="acoes" style="margin-top:12px">
                        <button type="button" class="btn btn-peq" id="btn-copiar">📋 Copiar o dia</button>
                        <button type="button" class="btn btn-peq" id="btn-txt">⬇️ Baixar .txt</button>
                    </div>
                </section>
            </div>
        </div>`;
}

function atualizarResumoPeriodo(pid) {
    const p = dia().periodos[pid];
    const n = Math.max(1, Number(p.aulas) || 1);
    $(`#r-${pid}`).textContent = p.aula ? `${n} ${n === 1 ? 'aula' : 'aulas'}${p.turmas.length ? ` · ${p.turmas.map((id) => banco.turmas.find((t) => t.id === id)?.nome || '').join(', ')}` : ''}` : 'Sem aula registrada';
}

function ligarHoje() {
    $$('[data-dia]').forEach((b) => b.addEventListener('click', () => { estado.data = D.addDias(estado.data, Number(b.dataset.dia)); render(); }));
    $('#inp-data').addEventListener('change', (e) => { if (e.target.value) { estado.data = e.target.value; render(); } });
    $('#btn-hoje')?.addEventListener('click', () => { estado.data = D.hoje(); render(); });
    $$('[data-humor]').forEach((b) => b.addEventListener('click', () => {
        const v = Number(b.dataset.humor);
        const novo = dia().humor === v ? null : v;
        mudarDia((d) => { d.humor = novo; });
        $$('[data-humor]').forEach((x) => x.setAttribute('aria-pressed', String(Number(x.dataset.humor) === novo)));
    }));
    $$('[data-aula]').forEach((inp) => inp.addEventListener('change', () => {
        const pid = inp.dataset.aula;
        mudarDia((d) => { d.periodos[pid].aula = inp.checked; if (inp.checked && !d.periodos[pid].aulas) d.periodos[pid].aulas = 1; });
        inp.closest('.periodo').classList.toggle('com-aula', inp.checked);
        atualizarResumoPeriodo(pid);
    }));
    $$('[data-turma]').forEach((b) => b.addEventListener('click', () => {
        const pid = b.dataset.p, id = b.dataset.turma;
        mudarDia((d) => { const t = d.periodos[pid].turmas; const i = t.indexOf(id); if (i >= 0) t.splice(i, 1); else t.push(id); });
        b.setAttribute('aria-pressed', String(dia().periodos[b.dataset.p].turmas.includes(id)));
        atualizarResumoPeriodo(pid);
    }));
    $$('[data-nova-turma]').forEach((b) => b.addEventListener('click', () => abrirTurma(null, b.dataset.novaTurma)));
    $$('[data-aulas]').forEach((b) => b.addEventListener('click', () => {
        const pid = b.dataset.aulas;
        mudarDia((d) => { d.periodos[pid].aulas = Math.min(12, Math.max(1, (Number(d.periodos[pid].aulas) || 1) + Number(b.dataset.d))); });
        $(`#n-${pid}`).textContent = dia().periodos[pid].aulas;
        atualizarResumoPeriodo(pid);
    }));
    let t = null;
    const texto = (fn) => () => { clearTimeout(t); t = setTimeout(fn, 350); };
    $$('[data-notas]').forEach((ta) => ta.addEventListener('input', texto(() => mudarDia((d) => { d.periodos[ta.dataset.notas].notas = ta.value; }))));
    $('#nota-dia').addEventListener('input', texto(() => mudarDia((d) => { d.nota = $('#nota-dia').value; })));
    $$('[data-habito]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.habito;
        mudarDia((d) => { const i = d.habitos.indexOf(id); if (i >= 0) d.habitos.splice(i, 1); else d.habitos.push(id); });
        const on = dia().habitos.includes(id);
        b.setAttribute('aria-pressed', String(on));
        b.querySelector('.marca-ok').textContent = on ? '✓' : '';
        const seq = D.sequencia(banco, id, estado.data);
        b.querySelector('small').textContent = seq ? `🔥 ${seq} ${seq === 1 ? 'dia' : 'dias seguidos'}` : 'toque para marcar';
        if (on && seq >= 3 && [3, 7, 14, 21, 30, 50, 100].includes(seq)) aviso(`🔥 ${seq} dias seguidos! Continue assim.`);
    }));
    $('#btn-copiar').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(D.textoDia(banco, estado.data)); aviso('Dia copiado'); } catch (e) { aviso('Não foi possível copiar'); }
    });
    $('#btn-txt').addEventListener('click', () => baixar(`diario-${estado.data}.txt`, D.textoDia(banco, estado.data)));
}

function baixar(nome, texto) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ===================== MÊS =====================
function vistaMes() {
    if (!estado.mes) { const d = D.deIso(estado.data); estado.mes = { ano: d.getFullYear(), mes: d.getMonth() }; }
    const { ano, mes } = estado.mes;
    const r = D.resumoMes(banco, ano, mes);
    const h = D.hoje();
    let cal = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((s) => `<span class="sem" aria-hidden="true">${s}</span>`).join('');
    for (let i = 0; i < new Date(ano, mes, 1).getDay(); i++) cal += '<span></span>';
    for (const x of r.dias) {
        const hum = D.humorDe(x.humor);
        const rot = `${x.d} de ${D.nomeMes(mes)}${hum ? `, humor ${hum.nome}` : ''}${x.periodos.length ? `, aula ${x.periodos.map((p) => D.PERIODOS.find((P) => P.id === p).nome.toLowerCase()).join(', ')}` : ''}${x.habitos ? `, ${x.habitos} hábitos` : ''}`;
        cal += `<button type="button" class="dia-cal ${x.data === h ? 'hoje' : ''}" data-abrir="${x.data}" ${x.humor ? `data-humor="${x.humor}" style="--hcor:${hcor(x.humor)}"` : ''} aria-label="${esc(rot)}">
            <span class="n">${x.d}</span>${hum ? `<span class="hum" aria-hidden="true">${hum.icone}</span>` : ''}
            ${x.habitos ? `<span class="habs" aria-hidden="true">✓ ${x.habitos}</span>` : ''}
            <span class="pers" aria-hidden="true">${D.PERIODOS.map((P) => (x.periodos.includes(P.id) ? `<i class="p-${P.id}"></i>` : '')).join('')}</span>
        </button>`;
    }
    const hm = r.humorMedio ? D.humorDe(Math.round(r.humorMedio)) : null;
    const ehMesAtual = ano === new Date().getFullYear() && mes === new Date().getMonth();
    return `
        <div class="mes-nav">
            <button type="button" class="btn" data-mes="-1" aria-label="Mês anterior">‹</button>
            <h1>${D.nomeMes(mes).replace(/^./, (c) => c.toUpperCase())} de ${ano}</h1>
            <button type="button" class="btn" data-mes="1" aria-label="Próximo mês">›</button>
        </div>
        <div class="numeros">
            <div class="numero"><b>${r.diasComAula}</b><span>${r.diasComAula === 1 ? 'dia com aula' : 'dias com aula'}</span></div>
            <div class="numero"><b>${r.aulas}</b><span>aulas dadas</span></div>
            <div class="numero"><b>${hm ? `${hm.icone} ${r.humorMedio.toFixed(1).replace('.', ',')}` : '—'}</b><span>humor médio (de 5)</span></div>
            <div class="numero"><b>${r.diasComRegistro}</b><span>${r.diasComRegistro === 1 ? 'dia registrado' : 'dias registrados'}</span></div>
        </div>
        <section class="cartao" aria-label="Calendário">
            <div class="calendario">${cal}</div>
            <div class="legenda">
                <span><i class="p-manha"></i>manhã</span><span><i class="p-tarde"></i>tarde</span><span><i class="p-noite"></i>noite</span>
                <span>humor: ${D.HUMORES.slice().reverse().map((x) => `<span class="q" style="--hcor:${hcor(x.v)}" title="${x.nome}"></span>`).join('')} triste → ótimo</span>
            </div>
        </section>
        <div class="acoes nao-imprimir" style="margin-top:16px">
            <button type="button" class="btn" id="btn-mes-txt">⬇️ Baixar o mês (.txt)</button>
            <button type="button" class="btn" id="btn-imprimir">🖨️ Imprimir</button>
            ${!ehMesAtual ? '<button type="button" class="btn" id="btn-mes-atual">Ir para o mês atual</button>' : ''}
        </div>`;
}
function ligarMes() {
    $$('[data-mes]').forEach((b) => b.addEventListener('click', () => {
        let { ano, mes } = estado.mes; mes += Number(b.dataset.mes);
        if (mes < 0) { mes = 11; ano--; } if (mes > 11) { mes = 0; ano++; }
        estado.mes = { ano, mes }; render();
    }));
    $$('[data-abrir]').forEach((b) => b.addEventListener('click', () => { estado.data = b.dataset.abrir; irPara('hoje'); }));
    $('#btn-mes-txt').addEventListener('click', () => baixar(`diario-${estado.mes.ano}-${String(estado.mes.mes + 1).padStart(2, '0')}.txt`, D.textoMes(banco, estado.mes.ano, estado.mes.mes)));
    $('#btn-imprimir').addEventListener('click', () => window.print());
    $('#btn-mes-atual')?.addEventListener('click', () => { const d = new Date(); estado.mes = { ano: d.getFullYear(), mes: d.getMonth() }; render(); });
}

// ===================== RESUMO =====================
function barras(itens, max, fmt) {
    if (!itens.length) return '<p class="vazio peq">Ainda sem dados.</p>';
    return `<div class="barras">${itens.map((x, i) => `<div class="barra-l ${x.cls || ''}"><span class="nome">${x.nome}</span><span class="valor">${fmt(x.v)}</span>
        <span class="trilho" aria-hidden="true"><i style="width:${max ? Math.max(2, (x.v / max) * 100) : 0}%;animation-delay:${i * 60}ms"></i></span></div>`).join('')}</div>`;
}
function vistaResumo() {
    const r = D.resumoUltimos(banco, 30);
    const h = D.hoje();
    const totalHum = Object.values(r.humor).reduce((a, b) => a + b, 0);
    const turmas = Object.entries(r.porTurma).map(([id, v]) => {
        const t = banco.turmas.find((x) => x.id === id);
        return { nome: id === '_sem' ? 'Sem turma marcada' : esc(D.nomeTurma(t)), v: Math.round(v * 10) / 10, cls: t ? `c-${t.cor}` : '' };
    }).sort((a, b) => b.v - a.v);
    const habs = banco.habitos.filter((x) => !x.arquivado || r.habitos[x.id]).map((x) => ({ nome: `${x.icone} ${esc(x.nome)}`, v: r.habitos[x.id] || 0, cls: 'c-verde' })).sort((a, b) => b.v - a.v);
    return `
        <h1 style="margin-bottom:4px">Últimos 30 dias</h1>
        <p class="suave" style="margin-bottom:16px">${D.fmtDataCurta(D.addDias(h, -29))} a ${D.fmtDataCurta(h)} · ${r.diasComRegistro} ${r.diasComRegistro === 1 ? 'dia registrado' : 'dias registrados'}</p>
        <section class="cartao" aria-labelledby="t-hum" style="margin-bottom:16px">
            <div class="cartao-topo"><h2 id="t-hum">Humor dia a dia</h2>${r.humorMedio ? `<span class="suave">média ${D.humorDe(Math.round(r.humorMedio)).icone} ${r.humorMedio.toFixed(1).replace('.', ',')}</span>` : ''}</div>
            <div class="faixa-humor" role="img" aria-label="Humor nos últimos 30 dias">${r.dias.map((x) => `<span ${x.humor ? `data-h="${x.humor}" style="--hcor:${hcor(x.humor)}"` : ''} class="${x.data === h ? 'hoje' : ''}" data-dica="${D.fmtDataCurta(x.data)}: ${x.humor ? D.humorDe(x.humor).nome : 'sem registro'}"></span>`).join('')}</div>
            <div class="eixo-faixa"><span>há 30 dias</span><span>hoje</span></div>
            ${totalHum ? `<div class="chips" style="margin-top:14px">${D.HUMORES.map((x) => `<span class="chip" style="cursor:default;--cor:${hcor(x.v)}" aria-pressed="${r.humor[x.v] > 0}">${x.icone} ${x.nome} <b>${r.humor[x.v]}</b></span>`).join('')}</div>` : ''}
        </section>
        <div class="grade-resumo">
            <section class="cartao" aria-labelledby="t-hab"><div class="cartao-topo"><h2 id="t-hab">Hábitos</h2><span class="suave peq">dias em que fez</span></div>
                ${barras(habs, 30, (v) => `${v} <span class="suave peq">/ 30</span>`)}</section>
            <section class="cartao" aria-labelledby="t-aul"><div class="cartao-topo"><h2 id="t-aul">Aulas por turma</h2><span class="suave peq">${r.aulas} no total</span></div>
                ${barras(turmas, Math.max(1, ...turmas.map((x) => x.v)), (v) => String(v).replace('.', ','))}
                <p class="suave peq" style="margin-top:12px">☀️ ${r.porPeriodo.manha} manhãs · 🌇 ${r.porPeriodo.tarde} tardes · 🌙 ${r.porPeriodo.noite} noites com aula</p></section>
        </div>`;
}
function ligarResumo() {
    const dica = $('#dica');
    $$('[data-dica]').forEach((el) => {
        const mostrar = () => { const r = el.getBoundingClientRect(); dica.textContent = el.dataset.dica; dica.style.left = `${r.left + r.width / 2}px`; dica.style.top = `${r.top}px`; dica.hidden = false; };
        el.addEventListener('pointerenter', mostrar);
        el.addEventListener('pointerdown', mostrar);
        el.addEventListener('pointerleave', () => { dica.hidden = true; });
    });
}

// ===================== AJUSTES =====================
function vistaAjustes() {
    const turmas = [...banco.turmas].sort((a, b) => a.arquivada - b.arquivada);
    const habs = [...banco.habitos].sort((a, b) => a.arquivado - b.arquivado);
    return `
        <h1 style="margin-bottom:16px">Ajustes</h1>
        <div class="grade-ajustes">
            <section class="cartao" aria-labelledby="t-turmas">
                <div class="cartao-topo"><h2 id="t-turmas">🏫 Turmas e escolas</h2><button type="button" class="btn btn-pri btn-peq" id="btn-nova-turma">＋ Nova</button></div>
                ${turmas.length ? `<ul class="lista">${turmas.map((t) => `<li class="c-${t.cor} ${t.arquivada ? 'arquivado' : ''}"><span class="bola-g" aria-hidden="true"></span>
                    <span class="txt"><b>${esc(t.nome)}</b><span>${esc(t.escola || 'sem escola')}${t.arquivada ? ' · arquivada' : ''}</span></span>
                    <button type="button" class="btn btn-peq" data-editar-turma="${t.id}">Editar</button></li>`).join('')}</ul>`
                : '<p class="vazio peq">Cadastre suas turmas e escolas para marcar onde deu cada aula e ver quantas aulas deu em cada uma.</p>'}
            </section>
            <section class="cartao" aria-labelledby="t-habs">
                <div class="cartao-topo"><h2 id="t-habs">✅ Hábitos</h2><button type="button" class="btn btn-pri btn-peq" id="btn-novo-habito">＋ Novo</button></div>
                ${habs.length ? `<ul class="lista">${habs.map((x) => `<li class="${x.arquivado ? 'arquivado' : ''}"><span class="e" aria-hidden="true">${x.icone}</span>
                    <span class="txt"><b>${esc(x.nome)}</b><span>${x.arquivado ? 'arquivado' : (() => { const n = D.sequencia(banco, x.id); return n ? `🔥 ${n} ${n === 1 ? 'dia' : 'dias seguidos'}` : 'sem sequência no momento'; })()}</span></span>
                    <button type="button" class="btn btn-peq" data-editar-habito="${x.id}">Editar</button></li>`).join('')}</ul>` : '<p class="vazio peq">Nenhum hábito.</p>'}
            </section>
            <section class="cartao" aria-labelledby="t-tema">
                <h2 id="t-tema" style="margin-bottom:12px">🎨 Tema</h2>
                <div class="temas" role="group" aria-label="Tema">${[['system', '🖥️ Igual ao aparelho'], ['light', '☀️ Claro'], ['dark', '🌙 Escuro']].map(([v, n]) => `<button type="button" class="chip" data-tema="${v}" aria-pressed="${banco.config.tema === v}">${n}</button>`).join('')}</div>
            </section>
            <section class="cartao" aria-labelledby="t-dados">
                <h2 id="t-dados" style="margin-bottom:8px">💾 Seus dados</h2>
                <p class="suave peq" style="margin-bottom:12px">Tudo fica guardado só neste aparelho. Baixe uma cópia de vez em quando — ela também serve para levar o diário para outro celular ou computador.</p>
                <div class="acoes"><button type="button" class="btn" id="btn-exportar">⬇️ Baixar cópia</button>
                    <label class="btn" style="cursor:pointer">⬆️ Restaurar cópia<input type="file" id="inp-importar" accept=".json,application/json" hidden></label></div>
            </section>
        </div>`;
}
function ligarAjustes() {
    $('#btn-nova-turma').addEventListener('click', () => abrirTurma());
    $('#btn-novo-habito').addEventListener('click', () => abrirHabito());
    $$('[data-editar-turma]').forEach((b) => b.addEventListener('click', () => abrirTurma(banco.turmas.find((t) => t.id === b.dataset.editarTurma))));
    $$('[data-editar-habito]').forEach((b) => b.addEventListener('click', () => abrirHabito(banco.habitos.find((x) => x.id === b.dataset.editarHabito))));
    $$('[data-tema]').forEach((b) => b.addEventListener('click', () => { banco.config.tema = b.dataset.tema; aplicarTema(); salvar(); render(); }));
    $('#btn-exportar').addEventListener('click', () => baixar(`diario-digital_${D.hoje()}.json`, JSON.stringify(banco)));
    $('#inp-importar').addEventListener('change', async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try {
            const b = JSON.parse(await f.text());
            if (b?.v !== D.VERSAO || typeof b.dias !== 'object') throw new Error();
            if (!confirm(`Restaurar a cópia com ${Object.keys(b.dias).length} dias? O diário atual deste aparelho será substituído.`)) return;
            banco = D.normalizar(b); salvar(); aplicarTema(); render(); aviso('Cópia restaurada');
        } catch (err) { aviso('Esse arquivo não é uma cópia do Diário Digital.'); }
    });
}

// ---------- folhas: turma e hábito ----------
function abrirFolha(corpo, acoes, aoSalvar) {
    $('#folha-corpo').innerHTML = corpo;
    $('#folha-acoes').innerHTML = acoes;
    $('#folha-form').onsubmit = (e) => { e.preventDefault(); if ($('#folha-form').reportValidity()) aoSalvar(); };
    $('[data-cancelar]', folha)?.addEventListener('click', () => folha.close());
    folha.showModal();
}
folha.addEventListener('click', (e) => { if (e.target === folha) folha.close(); });
function seletor(container, attr) {
    $$(`[${attr}]`, container).forEach((b) => b.addEventListener('click', () => $$(`[${attr}]`, container).forEach((x) => x.setAttribute('aria-pressed', String(x === b)))));
}

function abrirTurma(t = null, marcarNoPeriodo = null) {
    let usos = 0;
    if (t) for (const d of Object.values(banco.dias)) for (const p of Object.values(d.periodos || {})) if (p.turmas?.includes(t.id)) usos++;
    const cor = t?.cor || D.CORES[banco.turmas.length % D.CORES.length];
    abrirFolha(`
        <h2 id="folha-titulo">${t ? 'Editar turma' : 'Nova turma / escola'}</h2>
        <div class="campo"><label for="f-tnome">Turma</label><input class="entrada" id="f-tnome" required maxlength="40" value="${esc(t?.nome || '')}" placeholder="Ex.: 6º ano A"></div>
        <div class="campo"><label for="f-tescola">Escola <span class="suave">(opcional)</span></label><input class="entrada" id="f-tescola" maxlength="50" value="${esc(t?.escola || '')}" placeholder="Ex.: EE Centro"></div>
        <div class="campo"><span class="rotulo">Cor</span><div class="cores" role="group" aria-label="Cor">${D.CORES.map((c) => `<button type="button" class="c-${c}" data-cor="${c}" aria-pressed="${c === cor}" aria-label="${c}"></button>`).join('')}</div></div>
        ${t ? `<div class="zona"><p class="peq">${t.arquivada ? 'Esta turma está arquivada: não aparece mais para marcar, mas o histórico continua.' : '<b>A turma terminou?</b> Arquive: ela some das opções do dia, mas o histórico e as contagens ficam guardados.'}</p>
            <div class="acoes"><button type="button" class="btn btn-peq" id="f-arq">${t.arquivada ? '↩️ Reativar' : '🗄️ Arquivar'}</button><button type="button" class="btn btn-peq btn-perigo" id="f-exc">Excluir</button></div></div>` : ''}`,
    `<button type="button" class="btn" data-cancelar>Cancelar</button><button type="submit" class="btn btn-pri">${t ? 'Salvar' : 'Criar turma'}</button>`,
    () => {
        const dados = { nome: $('#f-tnome').value, escola: $('#f-tescola').value, cor: $('[data-cor][aria-pressed="true"]', folha)?.dataset.cor };
        if (t) banco = D.editarTurma(banco, t.id, dados);
        else {
            const r = D.criarTurma(banco, dados); banco = D.editarTurma(r.banco, r.id, { cor: dados.cor });
            if (marcarNoPeriodo) { const id = r.id; mudarDia((d) => { d.periodos[marcarNoPeriodo].aula = true; d.periodos[marcarNoPeriodo].turmas.push(id); d.periodos[marcarNoPeriodo].aulas ||= 1; }); }
        }
        salvar(); folha.close(); render(); aviso(t ? 'Turma atualizada' : 'Turma criada');
    });
    seletor(folha, 'data-cor');
    $('#f-arq')?.addEventListener('click', () => {
        banco = D.arquivarTurma(banco, t.id, !t.arquivada); salvar(); folha.close(); render();
        aviso(t.arquivada ? 'Turma reativada' : `${t.nome} arquivada`, t.arquivada ? null : { nome: 'Desfazer', fn: () => { banco = D.arquivarTurma(banco, t.id, false); salvar(); render(); } });
    });
    $('#f-exc')?.addEventListener('click', () => {
        if (!confirm(`Excluir a turma ${t.nome}?${usos ? `\n\nEla está marcada em ${usos} ${usos === 1 ? 'período' : 'períodos'}. As aulas continuam contadas, mas sem turma.` : ''}\n\nSe a turma só terminou, prefira Arquivar.`)) return;
        banco = D.excluirTurma(banco, t.id); salvar(); folha.close(); render(); aviso('Turma excluída');
    });
}

function abrirHabito(x = null) {
    const ic = x?.icone || D.ICONES_HABITO[banco.habitos.length % D.ICONES_HABITO.length];
    abrirFolha(`
        <h2 id="folha-titulo">${x ? 'Editar hábito' : 'Novo hábito'}</h2>
        <div class="campo"><label for="f-hnome">Nome</label><input class="entrada" id="f-hnome" required maxlength="30" value="${esc(x?.nome || '')}" placeholder="Ex.: Meditar 10 minutos"></div>
        <div class="campo"><span class="rotulo">Ícone</span><div class="icones" role="group" aria-label="Ícone">${D.ICONES_HABITO.map((i) => `<button type="button" data-icone="${i}" aria-pressed="${i === ic}">${i}</button>`).join('')}</div></div>
        ${x ? `<div class="zona"><p class="peq">${x.arquivado ? 'Arquivado: não aparece no dia, mas o histórico continua.' : '<b>Parou com este hábito?</b> Arquive para tirar da tela do dia sem perder o histórico.'}</p>
            <div class="acoes"><button type="button" class="btn btn-peq" id="f-arq">${x.arquivado ? '↩️ Reativar' : '🗄️ Arquivar'}</button><button type="button" class="btn btn-peq btn-perigo" id="f-exc">Excluir</button></div></div>` : ''}`,
    `<button type="button" class="btn" data-cancelar>Cancelar</button><button type="submit" class="btn btn-pri">${x ? 'Salvar' : 'Criar hábito'}</button>`,
    () => {
        const dados = { nome: $('#f-hnome').value, icone: $('[data-icone][aria-pressed="true"]', folha)?.dataset.icone };
        banco = x ? D.editarHabito(banco, x.id, dados) : D.criarHabito(banco, dados).banco;
        salvar(); folha.close(); render(); aviso(x ? 'Hábito atualizado' : 'Hábito criado');
    });
    seletor(folha, 'data-icone');
    $('#f-arq')?.addEventListener('click', () => {
        banco = D.arquivarHabito(banco, x.id, !x.arquivado); salvar(); folha.close(); render();
        aviso(x.arquivado ? 'Hábito reativado' : `${x.nome} arquivado`, x.arquivado ? null : { nome: 'Desfazer', fn: () => { banco = D.arquivarHabito(banco, x.id, false); salvar(); render(); } });
    });
    $('#f-exc')?.addEventListener('click', () => {
        const n = Object.values(banco.dias).filter((d) => d.habitos?.includes(x.id)).length;
        if (!confirm(`Excluir o hábito ${x.nome}${n ? ` e apagar as ${n} marcações dele` : ''}? Isso não pode ser desfeito. Se só parou, prefira Arquivar.`)) return;
        banco = D.excluirHabito(banco, x.id); salvar(); folha.close(); render(); aviso('Hábito excluído');
    });
}

// ===================== tema =====================
function aplicarTema() {
    const t = banco.config.tema;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
}
$('#btn-tema').addEventListener('click', () => {
    const o = ['system', 'light', 'dark'];
    banco.config.tema = o[(o.indexOf(banco.config.tema) + 1) % 3];
    aplicarTema(); salvar(); render();
    aviso({ system: 'Tema igual ao do aparelho', light: 'Tema claro', dark: 'Tema escuro' }[banco.config.tema]);
});

// ===================== início =====================
aplicarTema();
const h0 = location.hash.replace('#', '');
if (ABAS.some((a) => a.id === h0)) estado.aba = h0;
if (inicio.migrados) { salvar(); setTimeout(() => aviso(`📦 ${inicio.migrados} ${inicio.migrados === 1 ? 'dia trazido' : 'dias trazidos'} da versão anterior`), 400); }
render();
// virou o dia com a página aberta
let ultimoHoje = D.hoje();
setInterval(() => { const h = D.hoje(); if (h !== ultimoHoje) { if (estado.data === ultimoHoje) estado.data = h; ultimoHoje = h; render(); } }, 60000);
window.__diario = { get banco() { return banco; } };
