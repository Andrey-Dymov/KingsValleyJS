# King's Valley JS

Порт классической MSX-игры **King's Valley** (Konami, 1985) на JavaScript / Canvas 2D. Ванильный JS без фреймворков, рендеринг через `<canvas>` 256×184 px.

---

## Запуск

**Вариант 1.** Открыть `index.html` напрямую в браузере (могут быть ограничения CORS при загрузке модулей).

**Вариант 2.** Через локальный HTTP-сервер:

```bash
# Python
python -m http.server 8000

# Node.js (npx)
npx serve
```

Затем открыть `http://localhost:8000` (или указанный порт).

> **Примечание:** Аудио инициализируется после первого клика по странице (ограничение Web Audio API).

---

## Управление

| Клавиша | Действие |
|---------|----------|
| ← → | Движение влево / вправо |
| ↑ | Подъём по лестнице |
| ↓ | Спуск по лестнице |
| ↑/↓ + ←/→ | Движение по лестнице с направлением |
| Space / Enter / Z | Прыжок / Атака ножом / Копание киркой |
| Escape | (зарезервировано) |

---

## Игровой процесс

### Цель
Собрать все **jewel** (украшения) на уровне и выйти через **EXIT**. Враги и ловушки отнимают жизнь.

### Предметы
- **Нож (KNIFE)** — подбирается при касании. Позволяет бросать нож (Space) для убийства врагов (+1000 очков).
- **Кирка (PICKAX)** — подбирается при касании. Позволяет копать блоки (Space у стены).
- **Jewel** — собираются при касании (+2000 очков). После сбора последнего jewel выход разблокируется.

### Враги
Пять типов ИИ: статичный, горизонтальное движение, блуждание, блуждание по лестницам, преследование игрока. При касании — потеря жизни.

### Ловушки и двери
- **TRAP** — падающие колонны при прохождении под ними.
- **PUSHDOOR** — толкаемая дверь (толкать в направлении открытия ~30 кадров).
- **EXIT** — выход. Сначала замок (GATE_LOCK_DOWN_TILE), после сбора всех jewel — можно подойти и выйти.

### Жизни и уровни
- 2 жизни на игру. Смерть → перезапуск уровня (если есть жизни) или Game Over.
- 15 уровней (map1–map15). После прохождения — экран «CONGRATUATION».

---

## Структура проекта

```
/
├── index.html              # Точка входа, canvas 256×184
├── js/
│   ├── main.js             # Игровой цикл, машина состояний
│   ├── constants.js       # Тайлы, направления, тайминги, enum
│   ├── assetLoader.js     # Загрузка PNG, JSON
│   ├── mapLoader.js      # Парсинг Tiled JSON
│   ├── entity.js         # Создание сущностей
│   ├── character.js      # Физика: IDLE, MOVE, FALL, JUMP, STAIR, ATTACK, DIGGING
│   ├── player.js         # Взаимодействие с предметами, выход
│   ├── enemy.js          # ИИ врагов (5 стратегий)
│   ├── knife.js          # Логика ножа (полёт, коллизия, падение)
│   ├── trap.js           # Ловушки (падающие колонны)
│   ├── gate.js           # Ворота, катсцены входа/выхода
│   ├── pushdoor.js       # Толкаемая дверь
│   ├── tileRenderer.js   # Отрисовка тайлов 8×8
│   ├── spriteRenderer.js# Отрисовка спрайтов 16×16
│   ├── hud.js            # Счёт, жизни, уровень
│   ├── input.js          # Битовая маска клавиш
│   ├── audio.js          # Web Audio API, WAV
│   └── gameUtil.js       # Утилиты: тайлы, коллизии
├── assets/
│   ├── sprites/          # tiles, p_move, enemy, knife, gate и др. (PNG)
│   ├── maps/             # title.json, map1–15.json (Tiled JSON)
│   └── audio/            # bgm, gameover, start, caught (WAV)
├── donors/
│   ├── kingsvalley/      # Базовый C-проект (ubox, SDL2)
│   ├── divby00-kings-valley/
│   └── denitdao-King-s-Valley/
├── PLAN.MD               # План портирования
└── README.md
```

---

## Технические детали

| Параметр | Значение |
|----------|----------|
| Разрешение | 256×184 px (32×23 тайла × 8 px) |
| FPS | 30, фиксированный шаг |
| Тайлы | 8×8 px, tileset 256×64 |
| Спрайты | 16×16 px |
| Формат карт | Tiled JSON, слои Map + Entities |

Карты поддерживают несколько комнат (32×23 каждая). Спрайты используют magenta и тёмно-серый как прозрачность (стиль MSX).

---

## Исходный проект

Порт основан на C/SDL2-реализации для MSX. Локальная копия: `donors/kingsvalley`  
Оригинал: [https://github.com/mcolom/kingsvalley](https://github.com/mcolom/kingsvalley)

---

## Другие порты Konami King's Valley (MSX, 1985)

Проверено: только проекты, являющиеся портированием платформера Konami (пирамида, jewel, мумии, нож, кирка). Исключены: настольная игра Logygames King's Valley, пустые/удалённые репозитории.

### C / C++
- [Desturx/Kings-Valley-2](https://github.com/Desturx/Kings-Valley-2) — ~35%: 2 карты, Player, Enemy, Door, Tool; карта уровней нет, музыка нет, спрайты есть, вступление нет, переход Map1→Map2 есть
- [denitdao/King-s-Valley](https://github.com/denitdao/King-s-Valley) — ~50%: Hero, Mummy, coin, levels; карта уровней нет, музыка (sounds) есть, картинки есть, вступление нет, переход map_part 1↔2 есть

### Java
- [BIGduzy/kingsValley](https://github.com/BIGduzy/kingsValley) — LibGDX, android/desktop/html; карта/музыка/вступление/переходы — не проверено
- [DeYoran/KingsValley1](https://github.com/DeYoran/KingsValley1) — LibGDX; карта/музыка/вступление/переходы — не проверено
- [Beagon/Kings-Valley-Java](https://github.com/Beagon/Kings-Valley-Java) — LibGDX; карта/музыка/вступление/переходы — не проверено
- [JasonV1/KingsValleyJava](https://github.com/JasonV1/KingsValleyJava) — LibGDX; карта/музыка/вступление/переходы — не проверено
- [PUCRSOpenSource/kings-valley](https://github.com/PUCRSOpenSource/kings-valley) — Java; карта/музыка/вступление/переходы — не проверено

### JavaScript / TypeScript
- [Andrey-Dymov/KingsValleyJS](https://github.com/Andrey-Dymov/KingsValleyJS) — ~85%: 15 уровней, 5 типов врагов, jewel/knife/pickax/trap/pushdoor; карта уровней нет (только title), музыка WAV есть, спрайты есть, вступление (title) есть, переходы gate-катсцены есть

### GDScript (Godot)
- [divby00/kings-valley](https://github.com/divby00/kings-valley) — ~90%: PyramidMap, Konami, TJewel, TMummy, TVick, TDagger; карта уровней есть, музыка OGG+WAV есть, pics есть, вступление TKonami есть, переходы TPyramidScreen есть
- [bloempot71/kings-valley](https://github.com/bloempot71/kings-valley) — ~25%: Player, Sword, walls, stairs; карта уровней нет, музыка нет, картинки есть, вступление нет, переходы нет

---

## Проекты с музыкальными фрагментами

| Репозиторий | Музыка | Звуковые эффекты |
|-------------|--------|-------------------|
| [divby00/kings-valley](https://github.com/divby00/kings-valley) | **assets/music/** — EndingGame.ogg, GameOver.ogg, GetReady.ogg, Menu.ogg, Music01–05.ogg, PyramidMap.ogg | **assets/sound/** — dead.wav, digger.wav, door.wav, hit.wav, jump.wav, start.wav и др. (WAV) |

Репозиторий **divby00/kings-valley** (Godot, GDScript) содержит полный набор аудио: фоновую музыку в OGG и звуковые эффекты в WAV. Можно использовать как источник для портирования.
