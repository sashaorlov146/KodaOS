const startBtn = document.getElementById('start-button');
const menu = document.getElementById('pysk');

// Переключение меню по клику на кнопку
startBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Чтобы страница не прыгала вверх при клике на #
    menu.classList.toggle('active');
});

// Закрытие меню при клике вне его области
document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== startBtn) {
        menu.classList.remove('active');
    }
});