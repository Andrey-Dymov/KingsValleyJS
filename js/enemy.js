/**
 * ИИ врагов (enemy.c)
 * STATIC, MOVE, WANDERER, WANDERER_STAIR, TRACER
 */

import {
  PS_NONE, PS_DEAD, PS_IDLE, PS_MOVE, PS_STAIR, PS_JUMP, PS_ATTACK,
  ENEMY_REBORN_CYCLE,
  STAIR_LEFT_UP_TILE, STAIR_LEFT_DOWN_TILE, STAIR_RIGHT_UP_TILE, STAIR_RIGHT_DOWN_TILE
} from './constants.js';
import { getTileIndex, checkFloor, isMapBlocked } from './gameUtil.js';
import { updateCharacter } from './character.js';
import { isIntersectRect } from './gameUtil.js';

const CTL_UP = 1; const CTL_DOWN = 2; const CTL_LEFT = 4; const CTL_RIGHT = 8; const CTL_FIRE1 = 16;

/** Updates enemy: common state, AI control, character logic, and player collision. */
export function updateEnemy(enemy, roomData, player, entities, roomCount, onPlayerDie, invuln = 0, gameoverDelay = 0) {
  updateCommonState(enemy);
  const control = getEnemyControl(enemy, roomData, player);
  updateCharacter(enemy, roomData, control, {
    playerInfo: {},
    entities,
    findEntity: () => null,
    roomCount
  });
  if (enemy.state !== PS_DEAD && enemy.state !== PS_NONE) {
    if (!gameoverDelay && !invuln) processIntersectPlayer(enemy, player, onPlayerDie);
  }
}

/** Handles enemy spawn (PS_NONE) and death (PS_DEAD) state transitions. */
function updateCommonState(enemy) {
  if (enemy.state === PS_NONE) {
    enemy.delay = (enemy.delay || 0) + 1;
    if (enemy.delay >= 20) {
      enemy.delay = 0;
      enemy.frame = (enemy.frame + 1) % ENEMY_REBORN_CYCLE;
      if (enemy.regentime > 0) enemy.regentime--;
      else {
        enemy.state = PS_IDLE;
        enemy.regentime = 10;
      }
    }
  } else if (enemy.state === PS_DEAD) {
    enemy.delay = (enemy.delay || 0) + 1;
    if (enemy.delay >= 20) {
      enemy.delay = 0;
      if (enemy.frame < 1) enemy.frame++;
      else enemy.state = PS_NONE;
    }
  }
}

/** Checks if enemy overlaps player and triggers death callback if so. */
function processIntersectPlayer(enemy, player, onPlayerDie) {
  if (player.roomId !== enemy.roomId) return;
  if (player.state === PS_STAIR && enemy.state !== PS_STAIR) return;
  if (enemy.state === PS_STAIR && player.state !== PS_STAIR) return;
  const r1 = { x: player.x + 1, y: player.y, w: player.width - 1, h: player.height - 3 };
  const r2 = { x: enemy.x + 1, y: enemy.y + 3, w: enemy.width - 1, h: enemy.height - 3 };
  if (isIntersectRect(r1.x, r1.y, r1.w, r1.h, r2.x, r2.y, r2.w, r2.h)) {
    onPlayerDie?.();
  }
}

/** STATIC enemy strategy: periodically flips direction. */
function strategyLookAround(enemy) {
  enemy.frame = 3;
  enemy.delay = (enemy.delay || 0) + 1;
  if (enemy.delay >= 30) {
    enemy.delay = 0;
    enemy.dir ^= 1;
  }
  return 0;
}

/** MOVE enemy strategy: walks in current direction, jumps when blocked. */
function strategyMove(enemy, roomData) {
  let ctrl = enemy.dir ? CTL_LEFT : CTL_RIGHT;
  const xOff = enemy.dir ? -1 : 8;
  if (isMapBlocked(roomData, enemy.x + xOff, enemy.y + 15) || isMapBlocked(roomData, enemy.x + xOff, enemy.y + 7)) {
    if (!isMapBlocked(roomData, enemy.x + xOff, enemy.y + 7) && !isMapBlocked(roomData, enemy.x + xOff, enemy.y - 1) && !isMapBlocked(roomData, enemy.x, enemy.y - 1))
      ctrl |= CTL_FIRE1;
    else
      ctrl = enemy.dir ? CTL_RIGHT : CTL_LEFT;
  }
  return ctrl;
}

/** Prevents enemy from walking off ledge: reverses or jumps when no floor ahead. */
function strategyNoFall(enemy, roomData, baseCtrl) {
  const xOff = enemy.dir ? -8 : 8;
  if (!checkFloor(roomData, enemy.x + xOff, enemy.y + 16, 6) && !checkFloor(roomData, enemy.x + xOff, enemy.y + 24, 6)) {
    if (checkFloor(roomData, enemy.x + xOff * 2, enemy.y + 16, 6))
      return baseCtrl | CTL_FIRE1;
    return enemy.dir ? CTL_RIGHT : CTL_LEFT;
  }
  return baseCtrl;
}

/** Stair strategy: adds up/down input when enemy is near stairs and player is above/below. */
function strategyStair(enemy, roomData, player, baseCtrl) {
  if (enemy.state !== PS_MOVE) return baseCtrl;
  if (!(enemy.flags & 64)) {
    const nf = strategyNoFall(enemy, roomData, baseCtrl);
    if (nf !== baseCtrl) return nf;
  }
  if (player.y < enemy.y) {
    if (enemy.dir && getTileIndex(roomData, enemy.x, enemy.y + 15) === STAIR_LEFT_UP_TILE)
      return baseCtrl | CTL_UP;
    if (!enemy.dir && getTileIndex(roomData, enemy.x + 8, enemy.y + 15) === STAIR_RIGHT_UP_TILE)
      return baseCtrl | CTL_UP;
  } else if (player.y > enemy.y) {
    if (enemy.dir && getTileIndex(roomData, enemy.x, enemy.y + 16) === STAIR_LEFT_DOWN_TILE)
      return baseCtrl | CTL_DOWN;
    if (!enemy.dir && getTileIndex(roomData, enemy.x + 8, enemy.y + 16) === STAIR_RIGHT_DOWN_TILE)
      return baseCtrl | CTL_DOWN;
  }
  return baseCtrl;
}

/** Returns control bitmask for enemy based on subtype and current strategy. */
function getEnemyControl(enemy, roomData, player) {
  if (enemy.state === PS_NONE || enemy.state === PS_DEAD) return 0;
  const subtype = enemy.subtype;
  let ctrl = 0;
  switch (subtype) {
    case 0: // STATIC
      strategyLookAround(enemy);
      return 0;
    case 1: // MOVE
      ctrl = strategyMove(enemy, roomData);
      return strategyNoFall(enemy, roomData, ctrl);
    case 2: // WANDERER
      enemy.thinkingtime = (enemy.thinkingtime || 0) + 1;
      if (enemy.thinkingtime > 150) {
        enemy.thinkingtime = 0;
        if (enemy.state === PS_MOVE || enemy.state === PS_IDLE) {
          enemy.strategy = (enemy.strategy + 1) % 3;
          enemy.delay = 0;
          enemy.frame = 0;
        }
      }
      if (enemy.strategy === 0) ctrl = strategyMove(enemy, roomData);
      else if (enemy.strategy === 1) return strategyLookAround(enemy) || 0;
      else ctrl = strategyStair(enemy, roomData, player, strategyMove(enemy, roomData));
      return ctrl;
    case 3: // WANDERER_STAIR
      ctrl = strategyStair(enemy, roomData, player, strategyMove(enemy, roomData));
      return strategyNoFall(enemy, roomData, ctrl);
    case 4: // TRACER
      ctrl = strategyMove(enemy, roomData);
      if (ctrl & CTL_FIRE1) return ctrl;
      return strategyStair(enemy, roomData, player, ctrl);
    default:
      return strategyMove(enemy, roomData);
  }
}
