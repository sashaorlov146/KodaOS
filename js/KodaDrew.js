const app = document.getElementById('paint-app');
const canvas = document.getElementById('kodaCanvas');
const ctx = canvas.getContext('2d', { desynchronized: true }); // Оптимизация задержки

function resize() {
    const data = canvas.toDataURL(); // Сохраняем рисунок перед ресайзом
    const img = new Image();
    img.src = data;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    
    img.onload = () => ctx.drawImage(img, 0, 0); // Возвращаем рисунок на место
}

window.addEventListener('resize', resize);
setTimeout(resize, 0); // Начальная калибровка

const colors = ['#ff3b30', '#4cd964', '#007aff', '#ffcc00', '#ffffff', '#000000'];
let color = colors[0];
let size = 5;
let painting = false;
let lastX = 0;
let lastY = 0;

const menu = document.createElement('div');
menu.className = 'paint-menu';

colors.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'color-btn';
    btn.style.background = c;
    btn.onclick = () => { color = c; };
    menu.appendChild(btn);
});

const sizeInput = document.createElement('input');
sizeInput.type = 'range'; sizeInput.min = '1'; sizeInput.max = '50';
sizeInput.value = size;
sizeInput.oninput = (e) => { size = e.target.value; };
menu.appendChild(sizeInput);

const clearBtn = document.createElement('button');
clearBtn.className = 'action-btn';
clearBtn.textContent = 'Очистить холст'; // Apple Style
clearBtn.onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
menu.appendChild(clearBtn);

const saveBtn = document.createElement('button');
saveBtn.className = 'action-btn';
saveBtn.textContent = 'Экспортировать'; // Apple Style
saveBtn.onclick = () => {
    const link = document.createElement('a');
    link.download = 'qdynamics-capture.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
};
menu.appendChild(saveBtn);

app.insertBefore(menu, canvas);

function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Исправлен баг с учетом зума и прокрутки
    return { 
        x: (clientX - rect.left) * (canvas.width / rect.width), 
        y: (clientY - rect.top) * (canvas.height / rect.height) 
    };
}

function start(e) {
    painting = true;
    const { x, y } = getCoords(e);
    [lastX, lastY] = [x, y];
    draw(e); // Позволяет ставить точки
}

function stop() {
    painting = false;
    ctx.beginPath();
}

function draw(e) {
    if (!painting) return;
    if (e.cancelable) e.preventDefault();
    
    const { x, y } = getCoords(e);
    
    ctx.lineWidth = size;
    ctx.strokeStyle = color;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    [lastX, lastY] = [x, y];
}

canvas.addEventListener('mousedown', start);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stop);
canvas.addEventListener('touchstart', start, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stop);