const openBtn = document.getElementById('openPlayer');
const panel = document.getElementById('smPanel');
let timer;

// Функция управления видимостью
const togglePanel = (forceState) => {
    const isActive = (forceState !== undefined) ? forceState : panel.classList.toggle('active');
    
    // Сохраняем состояние в localStorage, чтобы другие страницы узнали об этом
    localStorage.setItem('smPlayerActive', isActive);

    clearTimeout(timer);
    if (isActive) {
        timer = setTimeout(() => {
            panel.classList.remove('active');
            localStorage.setItem('smPlayerActive', false);
        }, 5000);
    }
};

if (openBtn && panel) {
    // 1. Клик по кнопке (открыть/закрыть)
    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        togglePanel();
    });

    // 2. Логика таймера (пауза при наведении)
    panel.addEventListener('mouseenter', () => clearTimeout(timer));
    
    panel.addEventListener('mouseleave', () => {
        if (panel.classList.contains('active')) {
            timer = setTimeout(() => {
                panel.classList.remove('active');
                localStorage.setItem('smPlayerActive', false);
            }, 5000);
        }
    });

    // 3. СИНХРОНИЗАЦИЯ МЕЖДУ ВКЛАДКАМИ/СТРАНИЦАМИ
    window.addEventListener('storage', (e) => {
        if (e.key === 'smPlayerActive') {
            const shouldBeActive = e.newValue === 'true';
            if (shouldBeActive) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        }
    });

    // 4. Проверка состояния при загрузке новой страницы
    if (localStorage.getItem('smPlayerActive') === 'true') {
        panel.classList.add('active');
    }
}