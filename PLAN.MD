# План портирования King's Valley 1 на JavaScript

> Основано на детальном анализе проекта-донора `donors/kingsvalley/` (C, ubox, SDL2).

---

## Целевая платформа

| Компонент | Описание |
|-----------|----------|
| **Сервер** | Небольшой веб-сервер (например `python -m http.server`, `npx serve` или аналог) для раздачи статики |
| **Точка входа** | HTML-файл (index.html), открывается в браузере |
| **Логика** | JavaScript — основной рабочий код игры (без фреймворков, ванильный JS или ES-модули) |
| **Вывод** | Canvas 2D — весь рендеринг через `<canvas>` (256×184px игровое поле + HUD) |

**Схема:** Браузер загружает HTML → подключает JS → Canvas отрисовывает игру. Ассеты (PNG, JSON, WAV) загружаются по HTTP с того же сервера.

**Структура проекта:**
```
/
├── index.html          # Точка входа, <canvas>, подключение JS
├── assets/             # PNG, JSON, WAV
├── js/                 # Исходный код (или src/)
│   ├── main.js
│   ├── constants.js
│   └── ...
└── PLAN.MD
```

Canvas: игровое поле 256×184px. Масштабирование через CSS (`image-rendering: pixelated`) для чёткого пиксель-арта.

---

## 1. Подготовка ассетов

### 1.1 Источники (donors/kingsvalley/game/data/)

| Тип | Файлы | Путь |
|-----|-------|------|
| **Тайлы** | tiles.png | 256×64px, 8×8 тайл, 32 колонки, firstgid=1 |
| **Игрок** | p_move.png, p_knife.png, p_pickax.png, p_attack.png, p_dig.png | 16×16 спрайты (sprite1 или sprite2) |
| **Враги** | enemy.png | 16×16, 6 кадров |
| **Предметы** | knife.png, gate.png | нож, дверь |
| **Аудио** | bgm.wav, GameOver.wav, Start.wav, Caught.wav | game/data/audio/ |

**Примечание:** В репозитории есть дубликаты в `res/sprite1/`, `res/sprite2/`, `res/pattern/` — выбрать один набор (например `game/data/`). Для веба — единый регистр имён (например, lowercase) во избежание проблем на разных ОС.

### 1.2 Карты

| Набор | Путь | Описание |
|-------|------|----------|
| **remake** | game/data/res/map/remake/map1–8.json | Основные уровни (32×23) |
| **original** | game/data/res/map/original/map1–15.json | Оригинальные карты |
| **title** | game/data/title.json | Титульный экран (32×24) |
| **Прямые** | game/data/map1–8.json | Уже в корне data |

**Действие:** Скопировать в `assets/` PNG, WAV, title.json, map1–8.json (из remake или data).

---

## 2. Инфраструктура движка

### 2.1 AssetLoader

- Параллельная загрузка через `Promise.all`
- PNG: tiles.png + все спрайты (p_move, enemy, knife, gate и т.д.)
- JSON: title.json, map1.json … map8.json
- WAV: bgm, GameOver, Start, Caught
- **Важно:** Web Audio API требует пользовательского жеста для воспроизведения — инициализация после первого клика/касания

### 2.2 InputManager

- Битовая маска клавиш (keydown/keyup)
- Маппинг: стрелки (←→↑↓), Space/Fire1 (действие), Escape
- Замена `ubox_read_ctl()` / `ubox_read_keys()` из донора

### 2.3 AudioManager

Замена вызовов mplayer из донора:

| Вызов | Контекст | Файл |
|-------|----------|------|
| `mplayer_init(SONG, SONG_SILENCE)` | Тишина | main.c, player.c, game.c |
| `mplayer_init(SONG, SONG_IN_GAME)` | Вход в уровень | game.c |
| `mplayer_init(SONG, SONG_GAME_OVER)` | Game Over | main.c |
| `mplayer_init(SONG, SONG_GAME_START)` | Старт игры | main.c |
| `mplayer_play_effect_p(EFX_START, ...)` | Fire1 на титуле | main.c |
| `mplayer_play_effect_p(EFX_DOOR, ...)` | Открытие двери | game.c |
| `mplayer_play_effect_p(EFX_DIG, ...)` | Копание | character.c |
| `mplayer_play_effect_p(EFX_HIT, ...)` | Сбор jewel | player.c |
| `mplayer_play_effect_p(EFX_DEAD, ...)` | Смерть | player.c |

**Эффекты:** EFX_START, EFX_DOOR, EFX_DIG, EFX_HIT, EFX_DEAD  
**Музыка:** SONG_SILENCE, SONG_IN_GAME, SONG_GAME_OVER, SONG_GAME_START  

Реализовать обёртку над Web Audio API (~60–80 строк).

---

## 3. Рендеринг

### 3.1 TileRenderer

- Canvas 256×184px (32×23 тайлов × 8px)
- tiles.png: 256×64, tile 8×8, firstgid=1
- Слой Map: `data[]` — индексы тайлов (Tiled 1-based → вычесть firstgid для 0-based)
- Отрисовка через `drawImage(tilesImg, sx, sy, 8, 8, dx, dy, 8, 8)`

### 3.2 SpriteRenderer

- Спрайты 16×16px
- Анимация по `frame` и `dir`: WALK_CYCLE=4, STAIR_CYCLE=2, ATTACK_CYCLE=2, KNIFE_CYCLE=4, DIGGING_CYCLE=2
- Горизонтальный флип: `ctx.scale(-1, 1)` при DIR_LEFT
- Паттерны: PAT_PLAYER_MOVE, PAT_KNIFE, PAT_ENEMY, PAT_ATTACK, PAT_DIGGING, PAT_DOOR

### 3.3 HUD

- Верхняя/нижняя полосы: счёт (`g_player_info.score`), жизни (`lives`), номер уровня (`g_stage`)

---

## 4. Данные и сущности

### 4.1 MapLoader — разбор Tiled JSON

**Формат карты (map1.json):**

```json
{
  "width": 32, "height": 23,
  "tilewidth": 8, "tileheight": 8,
  "layers": [
    { "name": "Map", "type": "tilelayer", "data": [...] },
    { "name": "Entities", "type": "objectgroup", "objects": [...] }
  ],
  "tilesets": [{ "name": "default", "firstgid": 1, "image": "tiles.png" }]
}
```

**Объекты Entities:**

| name | type (entity_type) | properties.extra | Примечание |
|------|--------------------|------------------|------------|
| PLAYER | ET_PLAYER | — | Точка спавна |
| START | ET_START | — | Альтернативная точка входа (если есть) |
| EXIT | ET_EXIT | extra (room) | Выход |
| ENEMY | ET_ENEMY | subtype + flags | extra: младшие 4 бита = subtype, старшие = flags |
| JEWEL | ET_JEWEL | extra | Тип украшения |
| KNIFE | ET_KNIFE | — | Предмет нож (подбираемый) |
| PICKAX | ET_PICKAX | — | Предмет кирка (подбираемый) |
| LOCK | ET_LOCK | — | Замок (взаимодействие с ключом) |
| TRAP | ET_TRAP | extra | Тайл колонны (132 и т.д.) |
| PUSHDOOR | ET_PUSHDOOR | dir | Толкаемая дверь |

**Координаты:** `x`, `y` в пикселях. Направление: `param`=1 → DIR_LEFT (бит 128 в type).

**Важно:** Донор использует бинарный формат (map.py → apultra) и `ap_uncompress`. Для JS — читать Tiled JSON напрямую, декомпрессор Aplib не нужен.

### 4.2 constants.js — из game.h

**Карта:** MAP_W=32, MAP_H=23  
**Тайлы:** BLANK_TILE=0, EXIT_TILE=19, LAST_SOLID_TILE=10, SOLID_TILE=64, SOLID_TILE2=2, BROKEN_SOLID_TILE=67, STAIR_*=116/131/133/118/84, GATE_LOCK_*=92/93, LOCK_TILE=146, MOVABLE_DOOR_*=104/105/119/120, KNIFE_TILE=75, PICKAX_TILE=76, JEWEL_TILE=134, JEWEL_EFFECT_*=81/82/83  

**Лимиты:** MAX_LIVES=2, MAX_ENTITIES=30, MAX_ROOM_COUNT=5  
**Направления:** DIR_LEFT=1, DIR_RIGHT=0, DIR_DOWN=2, DIR_UP=3, DIR_FLAG=128  
**Тайминги:** FRAME_WAIT=2, INVUL_TIME=64, GAMEOVER_DELAY=72, ENEMY_FRAME_WAIT=2, ENEMY_REBORN_CYCLE=2  

**Enum:** GAME_STATE, entity_type, player_state, player_move_type, character_action, pattern_type

### 4.3 Entity и initMapEntities()

**Структура entity (game.h):** type, subtype, state, movetype, control, pat, identifier, roomId, x, y, regentime, thinkingtime, width, height, pivot_x/y, dir, delay, frame, strategy, extra, extra2, flags, temp, item, `update()`

**initMapEntities()** — заполнение массива из JSON: маппинг name→type, obj.id→identifier, properties.extra→extra, param→dir. Назначение `update` по типу: update_player, update_enemy, update_jewel, update_knife, update_exit, update_trap, update_pushdoor, update_item.

---

## 5. Игровая логика

### 5.1 character.c — физика

**Состояния (player_state):** PS_IDLE, PS_MOVE, PS_FALL, PS_STAIR, PS_JUMP, PS_ATTACK, PS_DIGGING, PS_MOVABLE_DOOR  

**Функции:** update_character_idle, update_character_move, update_character_fall, update_character_stair, update_character_jump, update_character_attack, update_character_digging, update_character_movable_door, update_character_room (переход комнат по X)  

**Важно:** маска `& 0xFF` для uint8_t при переполнении координат.

### 5.2 player.c

- Чтение ввода, invuln-таймер
- process_tile_object_interaction: PICKAX_TILE, GATE_LOCK_DOWN_TILE
- process_object_interaction: ET_JEWEL (сбор, EFX_HIT), ET_KNIFE (подбор), ET_EXIT (выход)
- player_die: lives--, EFX_DEAD, STATE_GAME_OVER или STATE_GAME_RESET

### 5.3 enemy.c — пять стратегий ИИ

| subtype | Стратегия | Описание |
|--------|-----------|----------|
| 0 | ENEMY_STATIC | Не двигается |
| 1 | ENEMY_MOVE | Движение по горизонтали |
| 2 | ENEMY_WANDERER | Блуждание |
| 3 | ENEMY_WANDERER_STAIR | Блуждание по лестницам |
| 4 | ENEMY_TRACER | Преследование игрока |

Возрождение: `regentime`, `state` PS_NONE → PS_IDLE.

### 5.4 Объекты

- **jewel.c** — анимация мерцания (JEWEL_EFFECT_UP/LEFT/RIGHT), рендер в текущей комнате
- **knife.c** — PS_IDLE/ATTACK/FALL, полёт, коллизия, приземление, переход комнат
- **trap.c** — PS_IDLE/ATTACK/DEAD, коллизия с игроком, колонна SOLID_TILE сверху вниз (30 кадров)
- **gate.c** — put_gate_tiles, update_exit (анимация замка), run_door_opening, run_door_exit
- **pushdoor.c** — толкание (extra++ > 30), PS_MOVABLE_DOOR

---

## 6. Игровой цикл

### 6.1 Машина состояний (main.c)

```
STATE_TITLE → (Fire1) → STATE_GAME_RESET
STATE_GAME_RESET → draw "STAGE N" → STATE_IN_GAME_ENTER
STATE_IN_GAME_ENTER → EFX_DOOR, run_door_opening → STATE_IN_GAME
STATE_IN_GAME → process_game() → (exit) → STATE_IN_GAME_EXIT
STATE_IN_GAME_EXIT → run_door_exit → STATE_GAME_CLEAR
STATE_GAME_CLEAR → "STAGE CLEAR" → STATE_GAME_RESET (stage++)
STATE_GAME_OVER → "GAME OVER" → STATE_TITLE
STATE_NO_MAP → "CONGRATUATION" → STATE_TITLE
```

### 6.2 Реализация

- `requestAnimationFrame` с фиксированным шагом 1/30 с (или ~33 ms)
- Экраны: титул (title.json), «STAGE X», «GAME OVER», «CONGRATULATION»
- Катсцены: run_door_opening (вход), run_door_exit (выход)

---

## 7. Дополнительно

### 7.1 Комнаты

Карты могут содержать несколько комнат (MAP_W×MAP_H каждая). Донор разбивает по 32×23. В Tiled JSON — одна карта 32×23 или 32×46 (2 комнаты) и т.д. MapLoader должен поддерживать `height` кратный 23.

### 7.2 map_conf.json

Используется map.py для маппинга имён сущностей. Для JS MapLoader — жёсткий маппинг name→entity_type по таблице выше.

### 7.3 Порядок портирования

0. **Базовая оболочка** — index.html, `<canvas>`, минимальный JS, запуск локального сервера
1. AssetLoader + копирование assets из донора
2. constants.js + MapLoader + Entity
3. TileRenderer + SpriteRenderer + HUD
4. InputManager + AudioManager
5. character.c → Character
6. player.c, enemy.c
7. jewel, knife, trap, gate, pushdoor
8. main loop + экраны + катсцены
