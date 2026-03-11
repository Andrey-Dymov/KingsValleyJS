/**
 * Физика персонажа (character.c)
 * IDLE, MOVE, FALL
 */

import {
  PS_IDLE, PS_MOVE, PS_FALL, PS_JUMP, PS_STAIR, PS_ATTACK, PS_DIGGING, PS_MOVABLE_DOOR,
  MOVE_NORMAL, MOVE_KNIFE, MOVE_PICKAX,
  DIR_LEFT, DIR_RIGHT,
  WALK_CYCLE, FRAME_WAIT,
  MOVABLE_DOOR_TILE1, MOVABLE_DOOR_TILE2, MOVABLE_DOOR_TILE3, MOVABLE_DOOR_TILE4,
  ACTION_IDLE, ACTION_LEFT_MOVE, ACTION_RIGHT_MOVE, ACTION_LEFT_JUMP, ACTION_RIGHT_JUMP,
  ACTION_JUMP_IN_PLACE, ACTION_ATTACK_KNIFE, ACTION_PICKAX_DIGGING,
  ACTION_STAIR_UP, ACTION_STAIR_LEFT_UP, ACTION_STAIR_RIGHT_UP,
  ACTION_STAIR_DOWN, ACTION_STAIR_LEFT_DOWN, ACTION_STAIR_RIGHT_DOWN,
  STAIR_CYCLE, DIGGING_CYCLE, SOLID_TILE, SOLID_TILE2, BLANK_TILE, BROKEN_SOLID_TILE,
  EFX_DIG, MAP_H
} from './constants.js';
import {
  getTileIndex, checkFloor, isMapBlocked, isSolidTile, isStairTile, isStairTile2,
  isMovableTile, updateMapDataByPosition
} from './gameUtil.js';

const JUMP_VELOCITY = 6;
const ROOM_MAX_Y = (MAP_H * 8) - 1;  // 183 — верхняя граница, чтобы не вылетать за экран

/** Sets entity state and optionally movetype, resets frame and delay. */
function changeState(entity, state, movetype) {
  entity.state = state;
  entity.movetype = movetype ?? entity.movetype;
  entity.frame = 0;
  entity.delay = 0;
}

/** Updates falling entity: moves down until floor is hit, then switches to IDLE. */
export function updateCharacterFall(entity, roomData) {
  const nextY = (entity.y + 4) & 0xFF;
  if (checkFloor(roomData, entity.x, nextY + 16, 7)) {
    entity.y = ((nextY >> 3) * 8) & 0xFF;
    entity.state = PS_IDLE;
    return;
  }
  entity.y = nextY;
}

/** Moves entity one pixel left if path is not blocked. */
function moveLeft(entity, roomData) {
  if (isMapBlocked(roomData, entity.x, entity.y + 15) || isMapBlocked(roomData, entity.x, entity.y + 7))
    return;
  entity.x = (entity.x - 1) & 0xFF;
}

/** Moves entity one pixel right if path is not blocked. */
function moveRight(entity, roomData) {
  if (isMapBlocked(roomData, entity.x + 8, entity.y + 15) || isMapBlocked(roomData, entity.x + 8, entity.y + 7))
    return;
  entity.x = (entity.x + 1) & 0xFF;
}

/** Processes left movement action: sets direction and moves left if not blocked. */
function processActionLeft(entity, roomData) {
  if (isMapBlocked(roomData, entity.x - 1, entity.y + 15) || isMapBlocked(roomData, entity.x - 1, entity.y + 7))
    return;
  entity.dir = DIR_LEFT;
  entity.x = (entity.x - 1) & 0xFF;
}

/** Processes right movement action: sets direction and moves right if not blocked. */
function processActionRight(entity, roomData) {
  if (isMapBlocked(roomData, entity.x + 8, entity.y + 15) || isMapBlocked(roomData, entity.x + 8, entity.y + 7))
    return;
  entity.dir = DIR_RIGHT;
  entity.x = (entity.x + 1) & 0xFF;
}

/** Initiates digging state when pickax hits a diggable tile above solid ground. */
function processDigging(entity, roomData, playerInfo = {}) {
  let posX = entity.x;
  if (entity.dir === DIR_LEFT) {
    if ((entity.x % 8) < 4) posX -= 8;
  } else {
    if ((entity.x % 8) < 4) posX += 8;
    else posX += 16;
  }
  const tileIdx = getTileIndex(roomData, posX, entity.y + 15);
  if (!isMovableTile(tileIdx)) return;
  const tileIdx2 = getTileIndex(roomData, posX, entity.y + 16);
  if (tileIdx2 !== SOLID_TILE && tileIdx2 !== SOLID_TILE2) return;
  changeState(entity, PS_DIGGING, MOVE_PICKAX);
  entity.extra = posX;
  entity.extra2 = entity.y + 16;
  playerInfo.digging_count = 0;
}

/** Maps control input bits to a character action (move, jump, attack, stair, etc). */
function getCharacterAction(entity, control) {
  const right = !!(control & 8);
  const left = !!(control & 4);
  const up = !!(control & 1);
  const down = !!(control & 2);
  const fire = !!(control & 16);
  if (left) entity.dir = DIR_LEFT;
  else if (right) entity.dir = DIR_RIGHT;
  if (fire) {
    if (entity.movetype === MOVE_KNIFE) return ACTION_ATTACK_KNIFE;
    if (entity.movetype === MOVE_PICKAX) return ACTION_PICKAX_DIGGING;
    if (left) return ACTION_LEFT_JUMP;
    if (right) return ACTION_RIGHT_JUMP;
    return ACTION_JUMP_IN_PLACE;
  }
  if (up) {
    if (left) return ACTION_STAIR_LEFT_UP;
    if (right) return ACTION_STAIR_RIGHT_UP;
    return ACTION_STAIR_UP;
  }
  if (down) {
    if (left) return ACTION_STAIR_LEFT_DOWN;
    if (right) return ACTION_STAIR_RIGHT_DOWN;
    return ACTION_STAIR_DOWN;
  }
  if (left) return ACTION_LEFT_MOVE;
  if (right) return ACTION_RIGHT_MOVE;
  return ACTION_IDLE;
}

/** Handles stair climbing: moves entity up/down on stair tiles when action is valid. */
function processStairAction(entity, roomData, control, action) {
  if (entity.state === PS_MOVE) {
    if (entity.dir === DIR_LEFT) moveLeft(entity, roomData);
    else moveRight(entity, roomData);
  }
  // Ранний выход: уже стоим на лестнице (центр на tile 118/133) — не дублировать
  if (action === ACTION_STAIR_LEFT_UP || action === ACTION_STAIR_RIGHT_UP) {
    const t = getTileIndex(roomData, entity.x + 4, entity.y + 15);
    if (t === 118 || t === 133) return;
  }
  if (action === ACTION_STAIR_LEFT_DOWN || action === ACTION_STAIR_RIGHT_DOWN) {
    const t = getTileIndex(roomData, entity.x + 8, entity.y + 16);
    if (t === 116 || t === 131) return;
  }
  let isStair = false;
  let offset = 0;
  if (action === ACTION_STAIR_LEFT_UP && entity.dir === DIR_LEFT) {
    isStair = getTileIndex(roomData, entity.x, entity.y + 15) === 118;
    offset = -1;
  } else if (action === ACTION_STAIR_RIGHT_UP && entity.dir === DIR_RIGHT) {
    isStair = getTileIndex(roomData, entity.x + 7, entity.y + 15) === 133;
    offset = -1;
  } else if (action === ACTION_STAIR_LEFT_DOWN && entity.dir === DIR_LEFT) {
    isStair = getTileIndex(roomData, entity.x + 7, entity.y + 16) === 131;
    offset = 1;
  } else if (action === ACTION_STAIR_RIGHT_DOWN && entity.dir === DIR_RIGHT) {
    isStair = getTileIndex(roomData, entity.x, entity.y + 16) === 116;
    offset = 1;
  } else if (action === ACTION_STAIR_UP) {
    const t = getTileIndex(roomData, entity.x + 4, entity.y + 15);
    if (t === 118 || t === 133) { isStair = true; offset = -1; }
  } else if (action === ACTION_STAIR_DOWN) {
    const t = getTileIndex(roomData, entity.x + 4, entity.y + 16);
    if (t === 116 || t === 131) { isStair = true; offset = 1; }
  }
  if (isStair && offset !== 0) {
    entity.y = (entity.y + offset) & 0xFF;
    entity.state = PS_STAIR;
    entity.extra2 = action;
  }
}

/** Updates idle character: handles stair input, movement start, jump and attack/dig. */
export function updateCharacterIdle(entity, roomData, control, playerInfo = {}) {
  const up = !!(control & 1);
  const down = !!(control & 2);
  const left = !!(control & 4);
  const right = !!(control & 8);
  const moved = left || right;
  entity.frame = 0;

  // Приоритет: Up+направление = лестница (если в зоне лестницы)
  if (up || down) {
    if (left) entity.dir = DIR_LEFT;
    else if (right) entity.dir = DIR_RIGHT;
    const action = up
      ? (left ? ACTION_STAIR_LEFT_UP : right ? ACTION_STAIR_RIGHT_UP : ACTION_STAIR_UP)
      : (left ? ACTION_STAIR_LEFT_DOWN : right ? ACTION_STAIR_RIGHT_DOWN : ACTION_STAIR_DOWN);
    processStairAction(entity, roomData, control, action);
    if (entity.state === PS_STAIR) return;
  }

  if (moved) {
    entity.state = PS_MOVE;
    return;
  }

  if (control & 16) { // FIRE1
    if (entity.movetype === MOVE_KNIFE) {
      entity.state = PS_ATTACK;
    } else if (entity.movetype === MOVE_PICKAX) {
      processDigging(entity, roomData, playerInfo);
    } else {
      if (!isMapBlocked(roomData, entity.x, entity.y - 8) && !isMapBlocked(roomData, entity.x + 7, entity.y - 8)) {
        changeState(entity, PS_JUMP, entity.movetype);
        entity.extra = entity.y;
        entity.extra2 = -JUMP_VELOCITY;
        entity.temp = 0;
      }
    }
  }
}

/** Updates moving character: walk animation, actions, and fall detection. */
export function updateCharacterMove(entity, roomData, control, playerInfo = {}) {
  if (entity.delay++ === FRAME_WAIT) {
    entity.delay = 0;
    entity.frame = (entity.frame + 1) % WALK_CYCLE;
  }
  const action = getCharacterAction(entity, control);
  if (action === ACTION_IDLE) { entity.state = PS_IDLE; entity.frame = 0; return; }
  if (action === ACTION_RIGHT_MOVE) processActionRight(entity, roomData);
  else if (action === ACTION_LEFT_MOVE) processActionLeft(entity, roomData);
  else if (action === ACTION_ATTACK_KNIFE) changeState(entity, PS_ATTACK, MOVE_KNIFE);
  else if (action === ACTION_PICKAX_DIGGING) processDigging(entity, roomData, playerInfo);
  else if (action === ACTION_JUMP_IN_PLACE) {
    if (!isMapBlocked(roomData, entity.x, entity.y - 8) && !isMapBlocked(roomData, entity.x + 7, entity.y - 8)) {
      changeState(entity, PS_JUMP, entity.movetype);
      entity.extra = entity.y;
      entity.extra2 = -JUMP_VELOCITY;
      entity.temp = 0;
    }
  } else if (action === ACTION_LEFT_JUMP || action === ACTION_RIGHT_JUMP) {
    const xOff = entity.dir === DIR_LEFT ? -8 : 8;
    const checkX = (entity.x >> 3) * 8 + xOff;
    const checkY = (entity.y >> 3) * 8 - 8;
    if (!isMapBlocked(roomData, entity.x, entity.y - 8) && !isMapBlocked(roomData, entity.x + 7, entity.y - 8) &&
        !isMapBlocked(roomData, checkX, checkY)) {
      changeState(entity, PS_JUMP, entity.movetype);
      entity.extra2 = -JUMP_VELOCITY;
      entity.extra = entity.y;
      entity.temp = 1;
    }
  } else if ([ACTION_STAIR_LEFT_UP, ACTION_STAIR_RIGHT_UP, ACTION_STAIR_LEFT_DOWN, ACTION_STAIR_RIGHT_DOWN, ACTION_STAIR_UP, ACTION_STAIR_DOWN].includes(action)) {
    processStairAction(entity, roomData, control, action);
  }
  if (entity.state === PS_MOVE && !checkFloor(roomData, entity.x, entity.y + 16, 6)) {
    entity.state = PS_FALL;
    entity.frame = 0;
    entity.x = (entity.x >> 3) * 8;
    entity.y = (((entity.y + 16) >> 3) * 8 - 16) & 0xFF;
  }
}

/** Returns true if either tile at x or x+7 is blocked by solid tile. */
function isBlocked(roomData, x, y) {
  return isMapBlocked(roomData, x, y) || isMapBlocked(roomData, x + 7, y);
}

/** Updates jump: applies velocity, handles horizontal movement, collision and fall transition. */
export function updateCharacterJump(entity, roomData) {
  let nextX = entity.x;
  let nextY = entity.y + entity.extra2;
  if (entity.temp === 1) {
    nextX = entity.dir === DIR_LEFT ? (entity.x - 2) & 0xFF : (entity.x + 2) & 0xFF;
  }
  const minY = Math.max(0, entity.extra - 16);  // верхняя граница прыжка, без wrap
  if (nextY < minY) nextY = minY;
  if (nextY > ROOM_MAX_Y) nextY = ROOM_MAX_Y;  // не вылетать ниже экрана
  if (entity.extra2 < 0) {
    if (isBlocked(roomData, nextX, nextY + 8)) {
      if (isBlocked(roomData, nextX, nextY + 16)) {
        if (!(nextY > (entity.extra - 8) && !isBlocked(roomData, nextX, nextY))) {
          changeState(entity, PS_FALL, entity.movetype);
          return;
        }
      }
    }
  } else {
    if (isBlocked(roomData, nextX, nextY + 15)) {
      changeState(entity, PS_FALL, entity.movetype);
      return;
    }
  }
  entity.x = nextX;
  entity.y = nextY;
  if (entity.extra2 < JUMP_VELOCITY) entity.extra2++;
}

/** Updates character on stairs: moves up/down along stair tiles based on control input. */
export function updateCharacterStair(entity, roomData, control) {
  const moveOffset = (entity.flags & 128) ? 2 : 1;
  let nextX = entity.x, nextY = entity.y;
  // extra2 = ACTION: RIGHT_UP(8), LEFT_DOWN(10) — вверх при RIGHT, вниз при LEFT
  const goUp = entity.extra2 === 8 || entity.extra2 === 10;
  if (control & 8) {
    nextX = (entity.x + moveOffset) & 0xFF;
    entity.dir = DIR_RIGHT;
    nextY = goUp ? (entity.y - moveOffset) & 0xFF : (entity.y + moveOffset) & 0xFF;
  } else if (control & 4) {
    nextX = (entity.x - moveOffset) & 0xFF;
    entity.dir = DIR_LEFT;
    nextY = goUp ? (entity.y + moveOffset) & 0xFF : (entity.y - moveOffset) & 0xFF;
  } else return;
  const nextTile = goUp
    ? getTileIndex(roomData, nextX + 8, nextY + 16)
    : getTileIndex(roomData, nextX, nextY + 16);
  const onStair = goUp ? isStairTile2(nextTile) : isStairTile(nextTile);
  if (onStair) { entity.x = nextX; entity.y = nextY; }
  else if (!isStairTile(getTileIndex(roomData, nextX, nextY + 16)) && !isStairTile(getTileIndex(roomData, nextX + 8, nextY + 16)))
    changeState(entity, PS_FALL, entity.movetype);
  else { entity.x = nextX; entity.y = nextY; }
  if (entity.delay++ === 4) {
    entity.delay = 0;
    entity.frame = (entity.frame + 1) % WALK_CYCLE;
  }
}

/** Updates attack state: after wind-up delay, launches knife and returns to idle. */
export function updateCharacterAttack(entity, entities, findEntity) {
  if (entity.delay++ !== 4) return;
  entity.delay = 0;
  if (entity.frame === 0) {
    entity.frame = 1;  // фаза замаха -> фаза выпуска (ещё 4 тика до броска)
    return;
  }
  // frame === 1: бросок после паузы замаха
  const knife = entity.item ? findEntity(entity.item) : null;
  if (knife) {
    knife.state = PS_ATTACK;
    knife.dir = entity.dir;
    knife.x = entity.x;
    knife.y = entity.y;
    knife.roomId = entity.roomId;
    knife.pivot_x = entity.dir ? 8 : 0;
    entity.item = 0;
  }
  changeState(entity, PS_IDLE, MOVE_NORMAL);
}

/** Updates digging: animates tile break, plays effect, switches to fall when done. */
export function updateCharacterDigging(entity, roomData, playerInfo, onPlayEffect) {
  if (entity.delay++ !== 4) return;
  entity.delay = 0;
  const tileX = entity.extra;
  const tileY = entity.extra2;
  if (entity.frame < 2) {
    updateMapDataByPosition(roomData, tileX, tileY, 67 + entity.frame);
  }
  entity.frame++;
  if (entity.frame === DIGGING_CYCLE) {
    onPlayEffect?.(EFX_DIG);
    updateMapDataByPosition(roomData, tileX, tileY, BLANK_TILE);
    entity.frame = 0;
    entity.extra2 = (entity.extra2 + 8) & 0xFF;
    playerInfo.digging_count = (playerInfo.digging_count || 0) + 1;
  }
  const tileNow = getTileIndex(roomData, entity.extra, entity.extra2);
  const stillSolid = tileNow === SOLID_TILE || tileNow === SOLID_TILE2 ||
    tileNow === BROKEN_SOLID_TILE || tileNow === BROKEN_SOLID_TILE + 1;
  if ((playerInfo.digging_count || 0) === 2 || !stillSolid) {
    changeState(entity, PS_FALL, MOVE_NORMAL);
  }
}

/** Updates movable door push animation: draws door tiles and moves entity to destination. */
export function updateCharacterMovableDoor(entity, roomData) {
  const x = entity.extra;
  const y = entity.y + 8;
  const height = entity.extra2 || 1;
  const destX = entity.dir ? (x - 8) & 0xFF : (x + 16) & 0xFF;
  entity.delay = (entity.delay || 0) + 1;
  if (entity.delay < 15) {
    for (let i = 0; i < height; i++) {
      const ty = y - i * 8;
      if (!entity.dir) {
        updateMapDataByPosition(roomData, x, ty, 106);
        updateMapDataByPosition(roomData, x + 8, ty, 107);
      } else {
        updateMapDataByPosition(roomData, x, ty, 122);
        updateMapDataByPosition(roomData, x + 8, ty, 121);
      }
    }
  } else if (entity.delay < 40) {
    for (let i = 0; i < height; i++) {
      const ty = y - i * 8;
      updateMapDataByPosition(roomData, x, ty, 84);
      updateMapDataByPosition(roomData, x + 8, ty, 85);
    }
  } else {
    for (let i = 0; i < height; i++) {
      const ty = y - i * 8;
      if (entity.dir) {
        updateMapDataByPosition(roomData, x, ty, MOVABLE_DOOR_TILE1);
        updateMapDataByPosition(roomData, x + 8, ty, MOVABLE_DOOR_TILE2);
      } else {
        updateMapDataByPosition(roomData, x, ty, MOVABLE_DOOR_TILE4);
        updateMapDataByPosition(roomData, x + 8, ty, MOVABLE_DOOR_TILE3);
      }
    }
  }
  if (((entity.x) & 0xFF) !== destX) {
    if (entity.delay % 2 === 0) {
      entity.x = entity.dir ? (entity.x - 1) & 0xFF : (entity.x + 1) & 0xFF;
    }
    if (entity.delay % 4 === 0) {
      entity.frame = (entity.frame + 1) % WALK_CYCLE;
    }
  }
  if (((entity.x) & 0xFF) === destX && entity.delay > 50) {
    changeState(entity, PS_IDLE, MOVE_NORMAL);
  }
}

/** Handles room transition when entity crosses left/right screen boundary during move or jump. */
export function updateCharacterRoom(entity, roomCount) {
  if (entity.state === PS_JUMP || entity.state === PS_MOVE) {
    if (entity.dir === DIR_RIGHT) {
      if (entity.x >= 247) {
        entity.x = 1;
        entity.roomId = Math.min(entity.roomId + 1, roomCount - 1);
      }
    } else {
      if (entity.x <= 4) {
        entity.roomId = Math.max(entity.roomId - 1, 0);
        entity.x = 247;
      }
    }
  }
}

/** Main character update dispatcher: calls the appropriate handler for current state. */
export function updateCharacter(entity, roomData, control, ctx = {}) {
  const { playerInfo = {}, entities = [], findEntity = () => null, roomCount = 1, onPlayEffect } = ctx;
  switch (entity.state) {
    case PS_IDLE: updateCharacterIdle(entity, roomData, control, playerInfo); break;
    case PS_MOVE: updateCharacterMove(entity, roomData, control, playerInfo); break;
    case PS_FALL: updateCharacterFall(entity, roomData); break;
    case PS_JUMP: updateCharacterJump(entity, roomData); break;
    case PS_STAIR: updateCharacterStair(entity, roomData, control); break;
    case PS_ATTACK: updateCharacterAttack(entity, entities, findEntity); break;
    case PS_DIGGING: updateCharacterDigging(entity, roomData, playerInfo, onPlayEffect); break;
    case PS_MOVABLE_DOOR: updateCharacterMovableDoor(entity, roomData); break;
    default: break;
  }
  updateCharacterRoom(entity, roomCount);
}
