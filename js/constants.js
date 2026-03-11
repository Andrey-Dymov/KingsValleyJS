/**
 * Константы из game.h и main.h
 */

// Карта
export const MAP_W = 32;
export const MAP_H = 23;

// Тайлы
export const BLANK_TILE = 0;
export const EXIT_TILE = 19;
export const LAST_SOLID_TILE = 10;
export const SOLID_TILE = 64;
export const SOLID_TILE2 = 2;
export const BROKEN_SOLID_TILE = 67;
export const STAIR_RIGHT_DOWN_TILE = 116;
export const STAIR_LEFT_DOWN_TILE = 131;
export const STAIR_RIGHT_UP_TILE = 133;
export const STAIR_LEFT_UP_TILE = 118;
export const STAIR_PART_TILE = 84;
export const GATE_LOCK_DOWN_TILE = 92;
export const GATE_LOCK_UP_TILE = 93;
export const LOCK_TILE = 146;
export const MOVABLE_DOOR_TILE1 = 104;
export const MOVABLE_DOOR_TILE2 = 105;
export const MOVABLE_DOOR_TILE3 = 119;
export const MOVABLE_DOOR_TILE4 = 120;
export const KNIFE_TILE = 75;
export const PICKAX_TILE = 76;
export const JEWEL_TILE = 134;
export const JEWEL_EFFECT_UP_TILE = 81;
export const JEWEL_EFFECT_LEFT_TILE = 82;
export const JEWEL_EFFECT_RIGHT_TILE = 83;
export const WARP_TILE = 83;

// Лимиты
export const MAX_LIVES = 2;
export const MAX_ENTITIES = 30;
export const MAX_ROOM_COUNT = 5;

// Направления
export const DIR_FLAG = 128;
export const DIR_LEFT = 1;
export const DIR_RIGHT = 0;
export const DIR_DOWN = 2;
export const DIR_UP = 3;

// Тайминги
export const ENEMY_FRAME_WAIT = 2;
export const FRAME_WAIT = 2;
export const INVUL_TIME = 64;
export const GAMEOVER_DELAY = 72;
export const ENEMY_REBORN_CYCLE = 2;

// Циклы анимации
export const WALK_CYCLE = 4;
export const STAIR_CYCLE = 2;
export const ATTACK_CYCLE = 2;
export const KNIFE_CYCLE = 4;
export const DIGGING_CYCLE = 2;

// Enum: GAME_STATE
export const STATE_TITLE = 0;
export const STATE_IN_GAME_ENTER = 1;
export const STATE_IN_GAME_EXIT = 2;
export const STATE_IN_GAME = 3;
export const STATE_NO_MAP = 4;
export const STATE_GAME_OVER = 5;
export const STATE_GAME_CLEAR = 6;
export const STATE_GAME_RESET = 7;
export const STATE_EXIT = 8;

// Enum: entity_type
export const ET_UNUSED = 0;
export const ET_PLAYER = 1;
export const ET_ENEMY = 2;
export const ET_JEWEL = 3;
export const ET_KNIFE = 4;
export const ET_PICKAX = 5;
export const ET_START = 6;
export const ET_EXIT = 7;
export const ET_LOCK = 8;
export const ET_TRAP = 9;
export const ET_PUSHDOOR = 10;

// Enum: player_state
export const PS_NONE = 0;
export const PS_IDLE = 1;
export const PS_ATTACK = 2;
export const PS_DEAD = 3;
export const PS_MOVE = 4;
export const PS_FALL = 5;
export const PS_MOVABLE_DOOR = 6;
export const PS_STAIR = 7;
export const PS_JUMP = 8;
export const PS_DIGGING = 9;

// Enum: player_move_type
export const MOVE_NORMAL = 0;
export const MOVE_KNIFE = 1;
export const MOVE_PICKAX = 2;

// Enum: character_action
export const ACTION_IDLE = 0;
export const ACTION_LEFT_JUMP = 1;
export const ACTION_RIGHT_JUMP = 2;
export const ACTION_JUMP_IN_PLACE = 3;
export const ACTION_LEFT_MOVE = 4;
export const ACTION_RIGHT_MOVE = 5;
export const ACTION_STAIR_UP = 6;
export const ACTION_STAIR_LEFT_UP = 7;
export const ACTION_STAIR_RIGHT_UP = 8;
export const ACTION_STAIR_DOWN = 9;
export const ACTION_STAIR_LEFT_DOWN = 10;
export const ACTION_STAIR_RIGHT_DOWN = 11;
export const ACTION_ATTACK_KNIFE = 12;
export const ACTION_PICKAX_DIGGING = 13;

// Enum: pattern_type
export const PAT_ENEMY = 0;
export const PAT_ENEMY_FLIP = 1;
export const PAT_KNIFE = 2;
export const PAT_KNIFE_FLIP = 3;
export const PAT_ATTACK = 4;
export const PAT_ATTACK_FLIP = 5;
export const PAT_DIGGING = 6;
export const PAT_DIGGING_FLIP = 7;
export const PAT_PLAYER_MOVE = 8;
export const PAT_PLAYER_MOVE_FLIP = 9;
export const PAT_PLAYER_PICKAX = 10;
export const PAT_PLAYER_PICKAX_FLIP = 11;
export const PAT_PLAYER_KNIFE = 12;
export const PAT_PLAYER_KNIFE_FLIP = 13;
export const PAT_DOOR = 14;
export const PAT_DOOR_FLIP = 15;

// Аудио (main.h)
export const SONG_SILENCE = 0;
export const SONG_IN_GAME = 1;
export const SONG_GAME_OVER = 2;
export const SONG_GAME_START = 3;
export const EFX_CHAN_NO = 2;
export const EFX_NONE = 0;
export const EFX_START = 1;
export const EFX_DOOR = 2;
export const EFX_DIG = 3;
export const EFX_HIT = 4;
export const EFX_DEAD = 5;
