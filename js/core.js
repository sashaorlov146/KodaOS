const APPS = ['app', 'code', 'info', 'seti', 'system', 'text', 'os' , 'pp'];
let topZ = 1000;
const SNAP = 20;
document.addEventListener('contextmenu', e => e.preventDefault());
const Kernel = {
    syscall(action, params) {
        const { id, data, name } = params || {};

        switch (action) {
            case 'LOAD': {
                const item = localStorage.getItem(id);
                if (item === null) return null;
                try {
                    return (item.startsWith('{') || item.startsWith('[')) ? JSON.parse(item) : item;
                } catch {
                    return item;
                }
            }
            case 'SAVE':
                return localStorage.setItem(id, typeof data === 'object' ? JSON.stringify(data) : data);
            case 'RESET':
                localStorage.clear();
                return location.reload();
            case 'OPEN':
                return Win.show(name);
            case 'KILL':
                return Win.hide(name);
            case 'APPLY_SETTINGS':
                return this.applySettings();
            default:
                console.warn(`Unknown syscall: ${action}`);
        }
    },

    setWallpaper(url) {
        if (!url) return;
        Object.assign(document.body.style, {
            backgroundImage: `url(${url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            backgroundRepeat: 'no-repeat'
        });
    },

    applySettings() {
        const settings = {
            bg: document.getElementById('set-bg')?.value,
            txt: document.getElementById('set-txt')?.value,
            winCol: document.getElementById('set-win')?.value,
            bar: document.getElementById('set-bar')?.value,
            wpFile: document.getElementById('set-wp')?.files[0]
        };

        if (settings.bg) {
            document.body.style.backgroundColor = settings.bg;
            this.syscall('SAVE', { id: 'cfg_bg', data: settings.bg });
        }
        if (settings.txt) {
            document.body.style.color = settings.txt;
            this.syscall('SAVE', { id: 'cfg_txt', data: settings.txt });
        }
        if (settings.winCol) {
            document.querySelectorAll(APPS.map(a => `.${a}`).join(',')).forEach(w => w.style.backgroundColor = settings.winCol);
            this.syscall('SAVE', { id: 'cfg_win', data: settings.winCol });
        }
        if (settings.bar) {
            document.querySelectorAll('h1, .title-bar, .bar').forEach(h => h.style.backgroundColor = settings.bar);
            this.syscall('SAVE', { id: 'cfg_bar', data: settings.bar });
        }
        if (settings.wpFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target.result;
                this.setWallpaper(result);
                this.syscall('SAVE', { id: 'cfg_wp', data: result });
            };
            reader.readAsDataURL(settings.wpFile);
        }
    },

    loadTheme() {
        const themeMap = {
            bg: (val) => { document.body.style.backgroundColor = val; },
            txt: (val) => { document.body.style.color = val; },
            win: (val) => { 
                document.querySelectorAll(APPS.map(a => `.${a}`).join(',')).forEach(w => w.style.backgroundColor = val); 
            },
            bar: (val) => { 
                document.querySelectorAll('h1, .title-bar, .bar').forEach(h => h.style.backgroundColor = val); 
            },
            wp: (val) => { this.setWallpaper(val); }
        };

        Object.keys(themeMap).forEach(key => {
            const val = this.syscall('LOAD', { id: `cfg_${key}` });
            if (val) themeMap[key](val);
        });
    }
};

const Win = {
    show(name) {
        const el = document.querySelector(`.${name}`);
        if (!el) return;

        el.style.display = 'flex';
        el.style.zIndex = ++topZ;

        const pos = Kernel.syscall('LOAD', { id: `p_${name}` });
        
        // Используем деструктуризацию, если pos существует
        if (pos && typeof pos === 'object') {
            const { l, t } = pos;
            el.style.left = `${l}px`;
            el.style.top = `${t}px`;
        }

        Kernel.syscall('SAVE', { id: `on_${name}`, data: '1' });
    },

    hide(name) {
        const el = document.querySelector(`.${name}`);
        if (el) {
            el.style.display = 'none';
        }
        // Заменил на Kernel.syscall для единообразия, если это предусмотрено твоей системой
        // Либо оставляем прямой доступ к localStorage, если syscall 'SAVE' с null не удаляет данные
        localStorage.removeItem(`on_${name}`);
    },

    all(act) {
        APPS.forEach(n => act === 'off' ? this.hide(n) : this.show(n));
    }
};

const UI = {
    makeDraggable(el, handle, key) {
        if (!handle) return;

        handle.addEventListener('mousedown', (e) => {
            // Список тегов-исключений для перетаскивания
            const ignoredTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA'];
            if (ignoredTags.includes(e.target.tagName)) return;

            el.style.zIndex = ++topZ;

            const sx = e.clientX - el.offsetLeft;
            const sy = e.clientY - el.offsetTop;

            const moveHandler = (ev) => {
                let x = ev.clientX - sx;
                let y = ev.clientY - sy;

                // Прилипание (Snapping)
                if (Math.abs(x) < SNAP) x = 0;
                if (Math.abs(y) < SNAP) y = 0;

                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
            };

            const upHandler = () => {
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);

                if (key) {
                    Kernel.syscall('SAVE', { 
                        id: key, 
                        data: { l: el.offsetLeft, t: el.offsetTop } 
                    });
                }
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    // Инициализация приложений
    APPS.forEach(name => {
        const winEl = document.querySelector(`.${name}`);
        if (!winEl) return;

        const handle = winEl.querySelector('h1') || winEl.querySelector('.title-bar') || winEl;
        
        UI.makeDraggable(winEl, handle, `p_${name}`);
        
        if (Kernel.syscall('LOAD', { id: `on_${name}` }) === '1') {
            Win.show(name);
        }
    });

    // Обновление часов
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        const updateClock = () => {
            const now = new Date();
            
            const timeParts = [
                now.getHours(),
                now.getMinutes(),
                now.getSeconds()
            ].map(num => String(num).padStart(2, '0'));

            const dateParts = [
                now.getDate(),
                now.getMonth() + 1,
                now.getFullYear()
            ].map((num, i) => i === 2 ? num : String(num).padStart(2, '0'));

            // Очищаем и создаем структуру без innerHTML для производительности
            clockEl.replaceChildren(); 
            
            const timeDiv = document.createElement('div');
            timeDiv.textContent = timeParts.join(':');
            
            const dateDiv = document.createElement('div');
            dateDiv.style.cssText = 'font-size: 10px; opacity: 0.6;';
            dateDiv.textContent = dateParts.join('.');

            clockEl.append(timeDiv, dateDiv);
        };

        setInterval(updateClock, 1000);
        updateClock();
    }

    // Текстовый редактор
    const textWin = document.querySelector('.text textarea');
    if (textWin) {
        const savedText = Kernel.syscall('LOAD', { id: 'text_save' });
        if (savedText) {
            textWin.value = savedText;
        }

        textWin.addEventListener('input', () => {
            Kernel.syscall('SAVE', { id: 'text_save', data: textWin.value });
        });
    }

    Kernel.loadTheme();
});
function terminal(cmdLine, term) {
    const trimmed = cmdLine.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    term.style.whiteSpace = 'pre-wrap';
    term.style.wordWrap = 'break-word';

    const manual = {
        'ls': 'LS(1) — Выводит список файлов в текущей директории. В KodaOS отображает доступные системные модули.',
        'open': 'OPEN(1) — Запуск приложения или модуля. Использование: open [имя_программы].',
        'kill': 'KILL(1) — Принудительное завершение процесса. Посылает сигнал SIGTERM выбранному модулю.',
        'stats': 'STATS(1) — Выводит статистику использования локального хранилища (localStorage).',
        'neofetch': 'NEOFETCH(1) — Отображает информацию о системе: версию, ядро и объем памяти в красивом формате.',
        'cls': 'CLS(1) — Полная очистка окна терминала от предыдущего вывода.',
        'ver': 'VER(1) — Показывает текущую версию KodaOS и кодовое имя релиза.',
        'man': 'MAN(1) — Справочное руководство. Используйте "man [команда]", чтобы узнать, что она делает.',
        'echo': 'ECHO(1) — Выводит строку текста, переданную в качестве аргумента.'
    };

    const cmds = {
        'help': () => "Доступные инструменты: " + Object.keys(cmds).join(', ') + ". Используйте 'man [команда]' для справки.",
        
        'man': () => {
            const target = args[0];
            if (!target) return 'Какую команду нужно объяснить? Пример: man open';
            return manual[target] || `Справочная запись для "${target}" не найдена.`;
        },

        'ls': () => "app/ [seti, text, system]",

        'open': () => {
            const name = args[0];
            if (!name) return 'ошибка: укажите имя модуля. См. "man open"';
            if (typeof APPS !== 'undefined' && APPS.includes(name)) {
                openApp(name);
                return `[OK] Процесс ${name} инициирован.`;
            }
            return `ошибка: исполняемый файл ${name} не найден.`;
        },

        'ver': () => "KodaOS 0.9 Zuckerberg ",

        'stats': () => {
            const used = (JSON.stringify(localStorage).length / 1024).toFixed(2);
            return `Storage: ${used}KB / 5120KB`;
        },

        'cls': () => { term.value = ''; return null; },

        'neofetch': () => {
            const mem = (JSON.stringify(localStorage).length / 1024).toFixed(2);
            return `
   Zuckerberg@KodaOS
   -----------------
   OS: KodaOS 0.9
   Kernel: KodaCore 5.0
   Shell: zsh-style
   Memory: ${mem}KB / 5120KB
   Uptime: ${Math.floor(performance.now()/1000)}s`;
        },

        'echo': () => args.join(' ')
    };

    let out;
    if (cmds[cmd]) {
        out = cmds[cmd]();
    } else {
        out = `zsh: команда не найдена: ${cmd}. Введите 'help' или 'man man'.`;
    }

    if (out !== null) {
        term.value += (term.value.endsWith('\n') ? '' : '\n') + out + '\n';
        term.scrollTop = term.scrollHeight;
    }
}
const t = document.querySelector('.code textarea');
const prompt = 'Zuckerberg@koda:~$ ';

if (t) {
    const dailyQuote = "«" + ["Двигайся быстро.", "Ломай стереотипы.", "Создавай будущее."][Math.floor(Math.random() * 3)] + "»";
    t.value = `KodaOS 0.9 | ${dailyQuote}\n` + prompt;
    
    t.onkeydown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const lines = t.value.split('\n');
            const command = lines[lines.length - 1].replace(prompt, '').trim();
            terminal(command, t);
            t.value += prompt;
            t.scrollTop = t.scrollHeight;
        }
    };
}