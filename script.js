document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS AOS ELEMENTOS ---
    const monthlyView = document.getElementById('monthly-view');
    const dailyView = document.getElementById('daily-view');
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthYearEl = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const backToMonthBtn = document.getElementById('back-to-month-btn');
    const selectedDateEl = document.getElementById('selected-date');
    const dailyForm = document.getElementById('daily-form');
    const downloadBtn = document.getElementById('download-btn');
    
    // Elementos do Gráfico
    const showHabitChartBtn = document.getElementById('show-habit-chart-btn');
    const showMoodChartBtn = document.getElementById('show-mood-chart-btn');
    const chartView = document.getElementById('chart-view');
    const closeChartBtn = document.getElementById('close-chart-btn');
    const downloadChartBtn = document.getElementById('download-chart-btn');
    const chartCanvas = document.getElementById('chart-canvas');
    const modalTitle = document.getElementById('modal-title');
    let chartInstance = null; 

    // --- ESTADO DA APLICAÇÃO ---
    let currentDate = new Date();
    let selectedDate = null;

    const CONFIG = {
        habits: {
            'water': { label: 'Beber Água', color: '#36A2EB' },
            'exercise': { label: 'Exercício', color: '#FF6384' },
            'read': { label: 'Leitura', color: '#FFCE56' },
            'study': { label: 'Estudo', color: '#4BC0C0' }
        },
        moods: {
            'happy': { label: 'Feliz', color: '#28a745', emoji: '😊' },
            'neutral': { label: 'Normal', color: '#6c757d', emoji: '😐' },
            'sad': { label: 'Triste', color: '#007bff', emoji: '😔' }
        }
    };

    // --- LÓGICA DE DADOS (localStorage) ---
    
    function saveDailyData() {
        if (!selectedDate) {
            alert("Erro: Nenhuma data selecionada.");
            return;
        }

        const mood = document.querySelector('input[name="mood"]:checked')?.value;
        const habits = [...document.querySelectorAll('input[name="habit"]:checked')].map(cb => cb.value);
        
        const data = {
            mood: mood,
            manha: { aula: document.querySelector('[name="aula-manha"]').checked, notes: document.querySelector('[name="notes-manha"]').value },
            tarde: { aula: document.querySelector('[name="aula-tarde"]').checked, notes: document.querySelector('[name="notes-tarde"]').value },
            noite: { aula: document.querySelector('[name="aula-noite"]').checked, notes: document.querySelector('[name="notes-noite"]').value },
            habits: habits
        };
        
        localStorage.setItem(selectedDate, JSON.stringify(data));
        alert('Dia salvo com sucesso!');
        showMonthlyView();
    }

    function loadDailyData(dateKey) {
        dailyForm.reset();
        const dataString = localStorage.getItem(dateKey);
        if (dataString) {
            const data = JSON.parse(dataString);

            if (data.mood) {
                const radio = document.querySelector(`input[name="mood"][value="${data.mood}"]`);
                if (radio) radio.checked = true;
            }
            
            document.querySelector('[name="aula-manha"]').checked = data.manha?.aula || false;
            document.querySelector('[name="notes-manha"]').value = data.manha?.notes || '';
            document.querySelector('[name="aula-tarde"]').checked = data.tarde?.aula || false;
            document.querySelector('[name="notes-tarde"]').value = data.tarde?.notes || '';
            document.querySelector('[name="aula-noite"]').checked = data.noite?.aula || false;
            document.querySelector('[name="notes-noite"]').value = data.noite?.notes || '';
            
            if (data.habits) {
                data.habits.forEach(habit => {
                    const checkbox = document.querySelector(`input[name="habit"][value="${habit}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }
    }

    // --- LÓGICA DE DOWNLOAD (TXT e Gráfico) ---

    // CORRIGIDO: Função de download de TXT completa
    function downloadTxt() {
        const dataString = localStorage.getItem(selectedDate);
        if (!dataString) {
            alert('Não há nada salvo para este dia.');
            return;
        }
        const data = JSON.parse(dataString);
        const dateFormatted = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(selectedDate + 'T00:00:00'));

        let content = `Agenda do dia: ${dateFormatted}\n`;
        content += "=================================\n\n";

        content += `Humor: ${data.mood ? CONFIG.moods[data.mood].label : 'Não definido'}\n\n`;

        content += "--- Manhã ☀️ ---\n";
        content += `Deu aula: ${data.manha.aula ? 'Sim' : 'Não'}\n`;
        content += `Anotações: ${data.manha.notes || 'Nenhuma'}\n\n`;
        
        content += "--- Tarde 🌆 ---\n";
        content += `Deu aula: ${data.tarde.aula ? 'Sim' : 'Não'}\n`;
        content += `Anotações: ${data.tarde.notes || 'Nenhuma'}\n\n`;

        content += "--- Noite 🌙 ---\n";
        content += `Deu aula: ${data.noite.aula ? 'Sim' : 'Não'}\n`;
        content += `Anotações: ${data.noite.notes || 'Nenhuma'}\n\n`;

        content += `Hábitos: ${data.habits.length > 0 ? data.habits.map(h => CONFIG.habits[h].label).join(', ') : 'Nenhum'}\n`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `agenda-${selectedDate}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    function downloadChart() {
        if (chartInstance) {
            const link = document.createElement('a');
            link.href = chartInstance.toBase64Image();
            link.download = `grafico-${new Date().toISOString().split('T')[0]}.png`;
            link.click();
        }
    }

    // --- LÓGICA DOS GRÁFICOS ---

    function get30DaysData() {
        const data = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const dataString = localStorage.getItem(dateKey);
            if (dataString) {
                data.push(JSON.parse(dataString));
            }
        }
        return data;
    }

    function renderHabitChart() {
        const pastData = get30DaysData();
        const habitCounts = {};
        pastData.forEach(day => {
            if (day.habits) {
                day.habits.forEach(habit => {
                    habitCounts[habit] = (habitCounts[habit] || 0) + 1;
                });
            }
        });

        const chartData = {
            labels: Object.values(CONFIG.habits).map(h => h.label),
            datasets: [{
                label: 'Dias Praticados',
                data: Object.keys(CONFIG.habits).map(key => habitCounts[key] || 0),
                backgroundColor: Object.values(CONFIG.habits).map(h => h.color)
            }]
        };

        createChart('bar', chartData);
    }

    function renderMoodChart() {
        const pastData = get30DaysData();
        const moodCounts = {};
        pastData.forEach(day => {
            if (day.mood) {
                moodCounts[day.mood] = (moodCounts[day.mood] || 0) + 1;
            }
        });
        
        const chartData = {
            labels: Object.values(CONFIG.moods).map(m => m.label),
            datasets: [{
                data: Object.keys(CONFIG.moods).map(key => moodCounts[key] || 0),
                backgroundColor: Object.values(CONFIG.moods).map(m => m.color)
            }]
        };

        createChart('pie', chartData);
    }

    function createChart(type, data) {
        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(chartCanvas, {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: type === 'bar' ? { y: { beginAtZero: true, ticks: { stepSize: 1 } } } : {},
            }
        });
    }

    // --- RENDERIZAÇÃO E NAVEGAÇÃO ---

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentDate);
        currentMonthYearEl.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) { calendarGrid.appendChild(document.createElement('div')); }

        for (let day = 1; day <= lastDateOfMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day');
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayCell.dataset.date = dateKey;

            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);

            const dataString = localStorage.getItem(dateKey);
            if (dataString) {
                const data = JSON.parse(dataString);
                const summaryDiv = document.createElement('div');
                summaryDiv.className = 'day-summary';
                
                if (data.mood && CONFIG.moods[data.mood]) {
                    const moodSummary = document.createElement('div');
                    moodSummary.className = 'mood-summary';
                    moodSummary.textContent = CONFIG.moods[data.mood].emoji;
                    summaryDiv.appendChild(moodSummary);
                }

                const classSummary = document.createElement('div');
                classSummary.className = 'class-summary';
                if (data.manha?.aula) classSummary.innerHTML += '<span>☀️</span>';
                if (data.tarde?.aula) classSummary.innerHTML += '<span>🌆</span>';
                if (data.noite?.aula) classSummary.innerHTML += '<span>🌙</span>';
                if (classSummary.innerHTML !== '') summaryDiv.appendChild(classSummary);

                if (data.habits && data.habits.length > 0) {
                    const habitsSummary = document.createElement('div');
                    habitsSummary.className = 'habits-summary';
                    habitsSummary.textContent = `${data.habits.length} hábito(s)`;
                    summaryDiv.appendChild(habitsSummary);
                }
                
                dayCell.appendChild(summaryDiv);
            }

            dayCell.addEventListener('click', () => showDailyView(dateKey));
            calendarGrid.appendChild(dayCell);
        }
    }

    function showMonthlyView() {
        monthlyView.classList.add('active');
        dailyView.classList.remove('active');
        renderCalendar();
    }
    
    function showDailyView(dateKey) {
        selectedDate = dateKey;
        const date = new Date(dateKey + 'T00:00:00');
        selectedDateEl.textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date);
        loadDailyData(dateKey);
        monthlyView.classList.remove('active');
        dailyView.classList.add('active');
    }

    // --- EVENT LISTENERS ---
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    backToMonthBtn.addEventListener('click', showMonthlyView);
    dailyForm.addEventListener('submit', (e) => { e.preventDefault(); saveDailyData(); });
    downloadBtn.addEventListener('click', downloadTxt);

    // Listeners para os gráficos
    showHabitChartBtn.addEventListener('click', () => {
        modalTitle.textContent = "Hábitos dos Últimos 30 Dias";
        renderHabitChart();
        chartView.classList.add('active');
    });
    showMoodChartBtn.addEventListener('click', () => {
        modalTitle.textContent = "Humor dos Últimos 30 Dias";
        renderMoodChart();
        chartView.classList.add('active');
    });
    closeChartBtn.addEventListener('click', () => {
        chartView.classList.remove('active');
    });
    downloadChartBtn.addEventListener('click', downloadChart);
    
    // --- INÍCIO ---
    showMonthlyView();
});