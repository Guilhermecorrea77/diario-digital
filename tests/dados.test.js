import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/dados.js';

const novo = () => D.normalizar(D.bancoVazio());

test('data de hoje no horário local', () => {
    assert.equal(D.hoje(new Date(2026, 9, 13, 23, 30)), '2026-10-13');
    assert.equal(D.fmtDataLonga('2026-10-13'), 'terça-feira, 13 de outubro');
});

test('gravarDia guarda e remove dias vazios, sem alterar o original', () => {
    const b = novo();
    const d = D.diaVazio(); d.humor = 4;
    const b2 = D.gravarDia(b, '2026-10-13', d);
    assert.equal(b2.dias['2026-10-13'].humor, 4);
    assert.equal(b.dias['2026-10-13'], undefined);
    const b3 = D.gravarDia(b2, '2026-10-13', D.diaVazio());
    assert.equal(b3.dias['2026-10-13'], undefined);
});

test('sequência de dias do hábito', () => {
    let b = novo();
    for (const data of ['2026-10-10', '2026-10-11', '2026-10-12']) { const d = D.diaVazio(); d.habitos = ['water']; b = D.gravarDia(b, data, d); }
    assert.equal(D.sequencia(b, 'water', '2026-10-13'), 3); // hoje ainda não marcou: conta até ontem
    const d = D.diaVazio(); d.habitos = ['water']; b = D.gravarDia(b, '2026-10-13', d);
    assert.equal(D.sequencia(b, 'water', '2026-10-13'), 4);
    assert.equal(D.sequencia(b, 'read', '2026-10-13'), 0);
});

test('turmas: aulas por turma no mês, arquivar e excluir', () => {
    let b = novo();
    let r = D.criarTurma(b, { nome: '6º A', escola: 'EE Centro' }); b = r.banco; const t1 = r.id;
    r = D.criarTurma(b, { nome: '7º B' }); b = r.banco; const t2 = r.id;
    const d = D.diaVazio();
    d.periodos.manha = { aula: true, turmas: [t1], aulas: 3, notas: '' };
    d.periodos.tarde = { aula: true, turmas: [t1, t2], aulas: 2, notas: 'prova' };
    d.periodos.noite = { aula: true, turmas: [], aulas: 0, notas: '' };
    b = D.gravarDia(b, '2026-10-13', d);
    const m = D.resumoMes(b, 2026, 9);
    assert.equal(m.diasComAula, 1);
    assert.equal(m.aulas, 6); // 3 + 2 + 1 (aula sem número conta 1)
    assert.equal(m.porTurma[t1], 4);
    assert.equal(m.porTurma[t2], 1);
    assert.equal(m.porTurma._sem, 1);
    assert.deepEqual(m.porPeriodo, { manha: 1, tarde: 1, noite: 1 });
    b = D.arquivarTurma(b, t2);
    assert.deepEqual(D.turmasAtivas(b).map((t) => t.id), [t1]);
    b = D.excluirTurma(b, t1);
    assert.deepEqual(b.dias['2026-10-13'].periodos.manha.turmas, []);
    assert.equal(D.resumoMes(b, 2026, 9).aulas, 6);
});

test('hábitos: criar, arquivar e excluir tira dos dias', () => {
    let b = novo();
    const r = D.criarHabito(b, { nome: 'Meditar', icone: '🧘' }); b = r.banco;
    const d = D.diaVazio(); d.habitos = [r.id]; b = D.gravarDia(b, '2026-10-13', d);
    b = D.arquivarHabito(b, r.id);
    assert.ok(!D.habitosAtivos(b).some((h) => h.id === r.id));
    b = D.excluirHabito(b, r.id);
    assert.equal(b.dias['2026-10-13'], undefined); // o dia só tinha esse hábito
});

test('resumo dos últimos dias e humor médio', () => {
    let b = novo();
    for (const [data, h] of [['2026-10-11', 5], ['2026-10-12', 3], ['2026-10-13', 4]]) { const d = D.diaVazio(); d.humor = h; b = D.gravarDia(b, data, d); }
    const r = D.resumoUltimos(b, 7, '2026-10-13');
    assert.equal(r.dias.length, 7);
    assert.equal(r.dias[6].data, '2026-10-13');
    assert.equal(r.humorMedio, 4);
    assert.deepEqual(r.humor, { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 });
});

test('texto do dia', () => {
    let b = novo();
    const r = D.criarTurma(b, { nome: '6º A', escola: 'EE Centro' }); b = r.banco;
    const d = D.diaVazio();
    d.humor = 5; d.habitos = ['water', 'read']; d.nota = 'Turma participou muito';
    d.periodos.manha = { aula: true, turmas: [r.id], aulas: 2, notas: 'frações' };
    b = D.gravarDia(b, '2026-10-13', d);
    const t = D.textoDia(b, '2026-10-13');
    assert.match(t, /Humor: 😄 Ótimo/);
    assert.match(t, /☀️ Manhã: dei 2 aulas \(6º A · EE Centro\) — frações/);
    assert.match(t, /Hábitos: 💧 Beber água, 📚 Leitura/);
    assert.match(t, /Nota: Turma participou muito/);
    assert.doesNotMatch(t, /Tarde/);
});

test('migração da versão antiga', () => {
    const antigos = [
        ['2025-10-24', JSON.stringify({ mood: 'happy', manha: { aula: true, notes: 'reunião' }, tarde: { aula: false, notes: '' }, noite: { aula: true, notes: '' }, habits: ['water', 'study'] })],
        ['2025-10-25', JSON.stringify({ mood: undefined, manha: { aula: false, notes: '' }, tarde: { aula: false, notes: '' }, noite: { aula: false, notes: '' }, habits: [] })],
        ['tema', 'dark'],
        ['2025-10-26', 'isto não é json'],
    ];
    const { banco, migrados } = D.migrarAntigo(novo(), antigos);
    assert.equal(migrados, 1);
    const d = D.obterDia(banco, '2025-10-24');
    assert.equal(d.humor, 5);
    assert.equal(d.periodos.manha.aula, true);
    assert.equal(d.periodos.manha.notas, 'reunião');
    assert.equal(d.periodos.noite.aula, true);
    assert.deepEqual(d.habitos, ['water', 'study']);
});
