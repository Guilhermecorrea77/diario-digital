# 📔 Diário Digital do Professor

Agenda diária para quem dá aula em vários turnos, turmas e escolas. Em poucos toques você registra **onde e quantas aulas deu** em cada período, **como foi o dia** e **seus hábitos**, e no fim do mês vê um resumo.

**Acesse:** https://guilhermecorrea77.github.io/diario-digital/

---

## ✨ Como funciona

### ✏️ Hoje
- **Como foi o seu dia?** Humor numa escala de 5, com um toque.
- **Manhã, Tarde e Noite:** botão *Dei aula*, escolha da **turma/escola** (dá para marcar mais de uma), **quantas aulas** e anotações do período.
- **Hábitos** personalizáveis, com contador de **dias seguidos 🔥**.
- **Nota do dia**, além dos botões copiar o dia e baixar em .txt.
- Navegue entre os dias pelas setas ou tocando na data. **Tudo é salvo sozinho.**

### 🗓️ Mês
- Calendário colorido pelo humor, com barrinhas de manhã, tarde e noite nos dias com aula. Tocar num dia abre aquele dia.
- Dias com aula, aulas dadas, humor médio e dias registrados.
- Baixar o mês em .txt ou imprimir.

### 📊 Resumo (últimos 30 dias)
- Humor dia a dia, em uma faixa colorida.
- Constância de cada hábito.
- **Aulas por turma** e por período.

### ⚙️ Ajustes
- **Turmas e escolas**, com cor própria. Turma que terminou pode ser **arquivada**: some das opções do dia, mas o histórico fica guardado.
- **Hábitos**: criar, editar o nome e o ícone, **arquivar** ou **excluir**.
- Tema claro, escuro ou igual ao aparelho.
- **Backup**: baixar uma cópia e restaurar em outro aparelho.

---

## 🔧 O que mudou em relação à versão anterior

| Antes | Agora |
|---|---|
| Cada dia era salvo com a data pura como chave, no mesmo espaço dos outros apps do GitHub Pages | Tudo fica numa chave própria (`diarioDigital:v1`), sem misturar com outros projetos |
| Era preciso clicar em "Salvar Dia", com alerta e volta para o mês | Salvamento automático |
| Só 4 hábitos fixos | Hábitos personalizáveis, com sequência de dias |
| "Deu aula?" sem detalhes | Turma/escola e quantidade de aulas por período |
| Calendário alto e difícil de usar no celular | Layout pensado para o celular, com barra inferior |
| Chart.js via CDN | Gráficos próprios, sem dependências |
| — | Tema escuro, resumo de 30 dias, backup, README |

**Os registros da versão anterior são trazidos automaticamente** na primeira abertura.

---

## 🗺️ Próximos passos sugeridos
1. **Planejamento de aulas:** conteúdo previsto e conteúdo dado por turma, para facilitar o preenchimento do diário de classe oficial.
2. **Lembretes** (provas, entrega de notas, reuniões) no calendário.
3. **Horário semanal fixo:** o app já sugere a turma de cada período conforme o dia da semana.
4. **Exportar em PDF/planilha** a contagem de aulas por escola, para conferir pagamentos e horas-aula.
5. **Sincronização entre celular e computador**, com login.

---

## 💻 Desenvolvimento
HTML, CSS e JavaScript puro (módulos ES), sem build.

```bash
python3 -m http.server 8080   # abra http://localhost:8080
npm test                       # testes do modelo de dados (Node 18+)
```

```
index.html
css/estilo.css
js/dados.js      # modelo: dias, turmas, hábitos, resumos, textos e migração (testado)
js/app.js        # telas
tests/dados.test.js
```
