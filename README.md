# King's Valley JS

Порт классической MSX-игры **King's Valley** (Konami, 1985) на JavaScript / Canvas 2D.

## Запуск

Открыть `index.html` в браузере (или через локальный HTTP-сервер).

## Управление

| Клавиша | Действие |
|---------|----------|
| ← → | Движение |
| ↑ / ↓ + направление | Лестница |
| Space | Прыжок / Атака / Копание |

## Структура

```
js/           — игровая логика (character, enemy, knife, pushdoor и др.)
assets/       — спрайты, тайлы, карты, звуки
index.html    — точка входа
```

## Исходный проект

Порт основан на C/SDL2-реализации для MSX:
[https://github.com/mcolom/kingsvalley](https://github.com/mcolom/kingsvalley)
