/**
 * Логика ножа (knife.c)
 */

import { PS_IDLE, PS_ATTACK, PS_FALL, ET_ENEMY, ET_JEWEL, ET_KNIFE, EFX_HIT, MAP_H } from './constants.js';
import { getTileIndex, checkFloor, isMapBlocked } from './gameUtil.js';
import { isIntersectRect } from './gameUtil.js';
import { KNIFE_TILE } from './constants.js';

const KNIFE_SPEED = 3;
const ROOM_MAX_Y = (MAP_H * 8) - 1;  // 183 — без & 0xFF, чтобы не переносить кинжал наверх
const HEIGHT_VARIATION = [1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1];

/** Returns true if the tile is a static object (knife, pickax, jewel pickup spot). */
function isStaticObject(tileIndex) {
  return tileIndex === 75 || tileIndex === 76 || tileIndex === 134; // KNIFE_TILE, PICKAX_TILE, JEWEL_TILE
}

/** Switches knife to fall state and sets bounce direction based on collision type. */
function initKnifeFall(knife, collisionType) {
  knife.state = PS_FALL;
  knife.dir ^= 1;
  knife.subtype = 1;
  knife.extra = 0;
  knife.extra2 = 8 * collisionType;
  knife.pivot_x = knife.dir ? 8 : 0;
  knife.extra2 += knife.dir ? -(knife.x % 8) : ((knife.x % 8) ? 8 - (knife.x % 8) : 0);
}

/** Updates knife: handles attack flight or fall animation based on state. */
export function updateKnife(knife, mapData, entities, curRoomId, onEnemyKill, updateMapTile, onPlayEffect) {
  if (knife.state === PS_IDLE) return;
  const roomCount = mapData?.roomCount ?? 1;
  if (knife.roomId >= roomCount) knife.roomId = roomCount - 1;
  knife.delay = (knife.delay || 0) + 1;
  if (knife.delay >= 2) {
    knife.delay = 0;
    knife.frame = (knife.frame + 1) % 4;
  }
  if (knife.state === PS_ATTACK) {
    const roomData = mapData?.rooms?.[knife.roomId];
    if (roomData) processKnifeAttack(knife, roomData, entities, roomCount, onEnemyKill, onPlayEffect);
  } else if (knife.state === PS_FALL) {
    processKnifeFall(knife, mapData, curRoomId, roomCount, updateMapTile);
  }
}

/** Moves thrown knife in flight, checks collisions with walls and enemies. */
function processKnifeAttack(knife, roomData, entities, roomCount, onEnemyKill, onPlayEffect) {
  const offset = knife.dir ? 0 : 7;
  let nextX = knife.x;
  if (!knife.dir) {
    if (nextX + offset < 248) nextX += KNIFE_SPEED;
  } else {
    nextX -= KNIFE_SPEED;
  }
  const tile = getTileIndex(roomData, nextX + offset, knife.y);
  if (isMapBlocked(roomData, nextX + offset, knife.y) || isStaticObject(tile)) {
    initKnifeFall(knife, 0);
    return;
  }
  if (knife.dir) {
    if (nextX < 8) { nextX = 247; knife.roomId = Math.max(0, knife.roomId - 1); }
  } else {
    if (nextX + offset >= 248) { nextX = 0; knife.roomId = Math.min(knife.roomId + 1, roomCount - 1); }
  }
  knife.x = nextX;
  for (const obj of entities) {
    if (obj.type !== ET_ENEMY || obj.state === 0 || obj.state === 3) continue;
    if (isIntersectRect(knife.x, knife.y, 8, 8, obj.x - 4, obj.y, 8, 16)) {
      initKnifeFall(knife, 1);
      obj.state = 3; // PS_DEAD
      obj.frame = 0;
      onEnemyKill?.(1000);
      onPlayEffect?.(EFX_HIT);
      return;
    }
  }
}

/** Handles knife fall: arc trajectory, landing, and placing knife tile on ground. */
function processKnifeFall(knife, mapData, curRoomId, roomCount, updateMapTile) {
  const roomData = mapData?.rooms?.[knife.roomId];
  if (!roomData) return;
  if (knife.subtype === 1) {
    const hvUp = HEIGHT_VARIATION[Math.min(knife.extra, 13)] ?? 0;
    knife.y = Math.max(0, knife.y - hvUp);
    if (knife.extra2 !== 0 && (knife.extra % 2) === 0) {
      knife.x = knife.dir ? (knife.x - 1) & 0xFF : (knife.x + 1) & 0xFF;
      knife.extra2--;
    }
    if (knife.extra >= 14) knife.subtype = 2;
    knife.extra++;
  } else {
    const hv = HEIGHT_VARIATION[Math.min(knife.extra, 13)] ?? 0;
    knife.y = Math.min(ROOM_MAX_Y, knife.y + hv);
    if (knife.extra === 0) {
      knife.y = Math.min(ROOM_MAX_Y, knife.y + (HEIGHT_VARIATION[0] ?? 0));
      if (checkFloor(roomData, knife.x, knife.y + 8, 7)) {
        knife.subtype = 0;
        knife.state = PS_IDLE;
        knife.extra = 0;
        knife.x = (knife.x >> 3) * 8;
        knife.y = (knife.y >> 3) * 8;
        if (knife.roomId === curRoomId) updateMapTile?.(roomData, knife.x, knife.y, KNIFE_TILE);
      }
    } else {
      if (knife.extra2 !== 0 && (knife.extra % 2) === 0) {
        if (knife.dir) {
          if (knife.x === 0) { knife.x = 255; knife.roomId = Math.max(0, knife.roomId - 1); }
          else knife.x = (knife.x - 1) & 0xFF;
        } else {
          if (knife.x === 255) { knife.x = 0; knife.roomId = Math.min(knife.roomId + 1, roomCount - 1); }
          else knife.x = (knife.x + 1) & 0xFF;
        }
        knife.extra2--;
      }
      knife.extra--;
    }
  }
}
