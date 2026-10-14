/* =====================================================================
 * dados.js — modelo do Diário Digital do professor (sem tela).
 * Testado em tests/dados.test.js
 *
 * banco = {
 *   v: 1,
 *   dias: { 'AAAA-MM-DD': { humor: 1..5|null, periodos: { manha, tarde, noite }, habitos: [ids], nota: '' } },
 *   turmas:  [{ id, nome, escola, cor, arquivada }],
 *   habitos: [{ id, nome, icone, arquivado }],
 *   config:  { tema }
 * }
 * periodo = { aula: bool, turmas: [ids], aulas: n, notas: '' }
 * ===================================================================== */

export const VERSAO = 1;
export const CHAVE = 'diarioDigital:v1';

export const PERIODOS = [
    { id: 'manha', nome: 'Manhã', icone: '☀️' },
    { id: 'tarde', nome: 'Tarde', icone: '🌇' },
    { id: 'noite', nome: 'Noite', icone: '🌙' },
];
export const HUMORES = [
    { v: 5, icone: '😄', nome: 'Ótimo' },
    { v: 4, icone: '🙂', nome: 'Bem' },
    { v: 3, icone: '😐', nome: 'Normal' },
    { v: 2, icone: '😕', nome: 'Desanimado' },
    { v: 1, icone: '😢', nome: 'Triste' },
];
export const CORES = ['verde', 'azul', 'coral', 'amarelo', 'roxo', 'rosa'];
export const ICONES_HABITO = ['💧', '🏃', '📚', '🧠', '🧘', '🥗', '😴', '✍️', '🎵', '🙏', '🚶', '💊', '📵', '☕', '🌱', '⭐'];

// ---------------- datas ----------------
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const hoje = (agora = new Date()) => iso(agora);
export const addDias = (s, n) => { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d); };
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (m) => MESES[m];
export const fmtDataLonga = (s) => { const d = deIso(s); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; };
export const fmtDataCurta = (s) => { const d = deIso(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };

export const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------------- banco ----------------
export const HABITOS_PADRAO = [
    { id: 'water', nome: 'Beber água', icone: '💧' },
    { id: 'exercise', nome: 'Exercício', icone: '🏃' },
    { id: 'read', nome: 'Leitura', icone: '📚' },
    { id: 'study', nome: 'Estudar algo novo', icone: '🧠' },
];

export function bancoVazio() {
    return { v: VERSAO, dias: {}, turmas: [], habitos: HABITOS_PADRAO.map((h) => ({ ...h, arquivado: false })), config: { tema: 'system' } };
}

export function normalizar(banco) {
    const b = structuredClone(banco || bancoVazio());
    b.v = VERSAO;
    b.dias = b.dias && typeof b.dias === 'object' ? b.dias : {};
    b.turmas = (Array.isArray(b.turmas) ? b.turmas : []).map((t, i) => ({ escola: '', cor: CORES[i % CORES.length], arquivada: false, ...t }));
    b.habitos = (Array.isArray(b.habitos) ? b.habitos : []).map((h) => ({ icone: '⭐', arquivado: false, ...h }));
    b.config = { tema: 'system', ...(b.config || {}) };
    return b;
}

export const periodoVazio = () => ({ aula: false, turmas: [], aulas: 0, notas: '' });
export const diaVazio = () => ({ humor: null, periodos: { manha: periodoVazio(), tarde: periodoVazio(), noite: periodoVazio() }, habitos: [], nota: '' });

export function obterDia(banco, data) {
    const d = banco.dias[data];
    if (!d) return diaVazio();
    const v = diaVazio();
    return { ...v, ...d, periodos: { manha: { ...v.periodos.manha, ...d.periodos?.manha }, tarde: { ...v.periodos.tarde, ...d.periodos?.tarde }, noite: { ...v.periodos.noite, ...d.periodos?.noite } }, habitos: d.habitos || [] };
}

export function diaEhVazio(d) {
    return !d.humor && !d.habitos.length && !d.nota?.trim()
        && PERIODOS.every(({ id }) => !d.periodos[id].aula && !d.periodos[id].notas?.trim());
}

/** Devolve um novo banco com o dia gravado (dias vazios são removidos). */
export function gravarDia(banco, data, dia) {
    const b = structuredClone(banco);
    if (diaEhVazio(dia)) delete b.dias[data];
    else b.dias[data] = structuredClone(dia);
    return b;
}

// ---------------- hábitos ----------------
export const habitosAtivos = (b) => b.habitos.filter((h) => !h.arquivado);

/** Dias seguidos com o hábito, contando até `ate` (se hoje ainda não marcou, conta a partir de ontem). */
export function sequencia(banco, habitoId, ate = hoje()) {
    const tem = (d) => banco.dias[d]?.habitos?.includes(habitoId);
    let d = tem(ate) ? ate : addDias(ate, -1);
    let n = 0;
    while (tem(d)) { n++; d = addDias(d, -1); }
    return n;
}

export function criarHabito(banco, { nome, icone }) {
    const b = structuredClone(banco);
    const id = novoId();
    b.habitos.push({ id, nome: nome.trim(), icone: icone || '⭐', arquivado: false });
    return { banco: b, id };
}
export function editarHabito(banco, id, dados) {
    const b = structuredClone(banco);
    const h = b.habitos.find((x) => x.id === id);
    if (h) Object.assign(h, { nome: (dados.nome ?? h.nome).trim(), icone: dados.icone ?? h.icone });
    return b;
}
export function arquivarHabito(banco, id, arquivado = true) {
    const b = structuredClone(banco);
    const h = b.habitos.find((x) => x.id === id);
    if (h) h.arquivado = arquivado;
    return b;
}
/** Exclui o hábito e tira ele de todos os dias. */
export function excluirHabito(banco, id) {
    const b = structuredClone(banco);
    b.habitos = b.habitos.filter((x) => x.id !== id);
    for (const [k, d] of Object.entries(b.dias)) {
        d.habitos = (d.habitos || []).filter((x) => x !== id);
        if (diaEhVazio(obterDia(b, k))) delete b.dias[k];
    }
    return b;
}

// ---------------- turmas / escolas ----------------
export const turmasAtivas = (b) => b.turmas.filter((t) => !t.arquivada);
export const nomeTurma = (t) => (t ? (t.escola ? `${t.nome} · ${t.escola}` : t.nome) : 'Turma removida');

export function criarTurma(banco, { nome, escola = '' }) {
    const b = structuredClone(banco);
    const id = novoId();
    b.turmas.push({ id, nome: nome.trim(), escola: escola.trim(), cor: CORES[b.turmas.length % CORES.length], arquivada: false });
    return { banco: b, id };
}
export function editarTurma(banco, id, dados) {
    const b = structuredClone(banco);
    const t = b.turmas.find((x) => x.id === id);
    if (t) Object.assign(t, { nome: (dados.nome ?? t.nome).trim(), escola: (dados.escola ?? t.escola).trim(), cor: dados.cor ?? t.cor });
    return b;
}
export function arquivarTurma(banco, id, arquivada = true) {
    const b = structuredClone(banco);
    const t = b.turmas.find((x) => x.id === id);
    if (t) t.arquivada = arquivada;
    return b;
}
/** Exclui a turma e tira ela dos registros (as aulas continuam contadas, sem turma). */
export function excluirTurma(banco, id) {
    const b = structuredClone(banco);
    b.turmas = b.turmas.filter((x) => x.id !== id);
    for (const d of Object.values(b.dias)) for (const p of Object.values(d.periodos || {})) p.turmas = (p.turmas || []).filter((x) => x !== id);
    return b;
}

// ---------------- resumos ----------------
export function aulasDoDia(d) {
    let periodos = 0, aulas = 0;
    for (const { id } of PERIODOS) if (d.periodos[id].aula) { periodos++; aulas += Math.max(1, Number(d.periodos[id].aulas) || 0); }
    return { periodos, aulas };
}

function resumoIntervalo(banco, datas) {
    const r = { dias: [], diasComRegistro: 0, diasComAula: 0, aulas: 0, porTurma: {}, porPeriodo: { manha: 0, tarde: 0, noite: 0 }, humor: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, humorMedio: null, habitos: {} };
    let somaH = 0, nH = 0;
    for (const data of datas) {
        const existe = !!banco.dias[data];
        const d = obterDia(banco, data);
        const a = aulasDoDia(d);
        r.dias.push({ data, d: deIso(data).getDate(), tem: existe, humor: d.humor, periodos: PERIODOS.filter((p) => d.periodos[p.id].aula).map((p) => p.id), habitos: d.habitos.length, aulas: a.aulas });
        if (!existe) continue;
        r.diasComRegistro++;
        if (a.periodos) r.diasComAula++;
        r.aulas += a.aulas;
        for (const { id } of PERIODOS) {
            const p = d.periodos[id];
            if (!p.aula) continue;
            r.porPeriodo[id]++;
            const n = Math.max(1, Number(p.aulas) || 0);
            const ts = p.turmas?.length ? p.turmas : ['_sem'];
            for (const t of ts) r.porTurma[t] = (r.porTurma[t] || 0) + n / ts.length;
        }
        if (d.humor) { r.humor[d.humor]++; somaH += d.humor; nH++; }
        for (const h of d.habitos) r.habitos[h] = (r.habitos[h] || 0) + 1;
    }
    if (nH) r.humorMedio = somaH / nH;
    return r;
}

export function resumoMes(banco, ano, mes) {
    const n = new Date(ano, mes + 1, 0).getDate();
    return resumoIntervalo(banco, Array.from({ length: n }, (_, i) => `${ano}-${pad(mes + 1)}-${pad(i + 1)}`));
}
export function resumoUltimos(banco, n = 30, ate = hoje()) {
    return resumoIntervalo(banco, Array.from({ length: n }, (_, i) => addDias(ate, i - n + 1)));
}

export const humorDe = (v) => HUMORES.find((h) => h.v === Number(v)) || null;

// ---------------- textos ----------------
export function textoDia(banco, data) {
    const d = obterDia(banco, data);
    const linhas = [`📔 ${fmtDataLonga(data)}`];
    const h = humorDe(d.humor);
    if (h) linhas.push(`Humor: ${h.icone} ${h.nome}`);
    for (const p of PERIODOS) {
        const x = d.periodos[p.id];
        if (!x.aula && !x.notas?.trim()) continue;
        let l = `${p.icone} ${p.nome}: `;
        if (x.aula) {
            const ts = (x.turmas || []).map((id) => nomeTurma(banco.turmas.find((t) => t.id === id)));
            l += `dei ${Math.max(1, Number(x.aulas) || 0)} ${Math.max(1, Number(x.aulas) || 0) === 1 ? 'aula' : 'aulas'}${ts.length ? ` (${ts.join(', ')})` : ''}`;
        } else l += 'sem aula';
        if (x.notas?.trim()) l += ` — ${x.notas.trim()}`;
        linhas.push(l);
    }
    const hs = d.habitos.map((id) => banco.habitos.find((x) => x.id === id)).filter(Boolean);
    if (hs.length) linhas.push(`Hábitos: ${hs.map((x) => `${x.icone} ${x.nome}`).join(', ')}`);
    if (d.nota?.trim()) linhas.push(`Nota: ${d.nota.trim()}`);
    return linhas.join('\n');
}

export function textoMes(banco, ano, mes) {
    const r = resumoMes(banco, ano, mes);
    const cab = [`DIÁRIO — ${nomeMes(mes).toUpperCase()} DE ${ano}`, '='.repeat(36),
        `Dias registrados: ${r.diasComRegistro} · Dias com aula: ${r.diasComAula} · Aulas: ${r.aulas}`];
    if (r.humorMedio) cab.push(`Humor médio: ${humorDe(Math.round(r.humorMedio)).icone} ${r.humorMedio.toFixed(1).replace('.', ',')} de 5`);
    const turmas = Object.entries(r.porTurma).filter(([k]) => k !== '_sem');
    if (turmas.length) cab.push(`Aulas por turma: ${turmas.map(([k, v]) => `${nomeTurma(banco.turmas.find((t) => t.id === k))}: ${Math.round(v)}`).join('; ')}`);
    const dias = r.dias.filter((x) => x.tem).map((x) => textoDia(banco, x.data));
    return [...cab, '', ...dias.flatMap((t) => [t, ''])].join('\n').trim() + '\n';
}

// ---------------- migração da versão antiga ----------------
const HUMOR_ANTIGO = { happy: 5, neutral: 3, sad: 1 };
/** entradas: [[chave, valorJSON], ...] do localStorage antigo (chaves = datas). */
export function migrarAntigo(banco, entradas) {
    const b = structuredClone(banco);
    let n = 0;
    for (const [k, v] of entradas) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || b.dias[k]) continue;
        let o;
        try { o = JSON.parse(v); } catch (e) { continue; }
        if (!o || typeof o !== 'object' || !('manha' in o || 'tarde' in o || 'noite' in o || 'mood' in o)) continue;
        const d = diaVazio();
        d.humor = HUMOR_ANTIGO[o.mood] || null;
        for (const { id } of PERIODOS) {
            const p = o[id] || {};
            d.periodos[id] = { aula: !!p.aula, turmas: [], aulas: p.aula ? 1 : 0, notas: p.notes || '' };
        }
        d.habitos = (o.habits || []).filter((h) => b.habitos.some((x) => x.id === h));
        if (!diaEhVazio(d)) { b.dias[k] = d; n++; }
    }
    return { banco: b, migrados: n };
}
