/**
 * Утилиты игры (из game_util.c)
 */

import { MAP_W } from './constants.js';
import {
  SOLID_TILE, SOLID_TILE2, MOVABLE_DOOR_TILE1, MOVABLE_DOOR_TILE2,
  MOVABLE_DOOR_TILE3, MOVABLE_DOOR_TILE4, BLANK_TILE,
  STAIR_RIGHT_DOWN_TILE, STAIR_LEFT_DOWN_TILE, STAIR_RIGHT_UP_TILE, STAIR_LEFT_UP_TILE
} from './constants.js';

/** Returns the tile index at the given pixel position in room data. */
export function getTileIndex(roomData, x, y) {
  const tx = (x >> 3) & 0xFF;
  const ty = (y >> 3) & 0xFF;
  const idx = tx + ty * MAP_W;
  return roomData[idx] ?? 0;
}

/** Sets the tile at the given pixel position in room data. */
export function updateMapDataByPosition(roomData, x, y, tileIndex) {
  const tx = (x >> 3) & 0xFF;
  const ty = (y >> 3) & 0xFF;
  const idx = tx + ty * MAP_W;
  roomData[idx] = tileIndex & 0xFF;
}

/** Returns true if the tile index represents a solid (collidable) tile. */
export function isSolidTile(tileIndex) {
  const t = tileIndex & 0xFF;
  return t === 2 || t === 3 || t === 65 || t === SOLID_TILE || t === 115 ||
    t === 116 || t === 130 || t === 131 ||
    t === MOVABLE_DOOR_TILE1 || t === MOVABLE_DOOR_TILE2 ||
    t === MOVABLE_DOOR_TILE3 || t === MOVABLE_DOOR_TILE4;
}

/** Returns true if the tile is a stair tile for going down. */
export function isStairTile(tileIndex) {
  const t = tileIndex & 0xFF;
  return t === 116 || t === 131 || t === 117 || t === 118;
}

/** Returns true if the tile is a stair tile for going up. */
export function isStairTile2(tileIndex) {
  const t = tileIndex & 0xFF;
  return t === 116 || t === 131 || t === 132 || t === 133;
}

/** Returns true if the tile can be dug or moved (blank, stair parts). */
export function isMovableTile(tileIndex) {
  const t = tileIndex & 0xFF;
  return t === BLANK_TILE || t === 132 || t === 133 || t === 117 || t === 118;
}

/** Returns true if there is solid floor under the given x range at y. */
export function checkFloor(roomData, x, y, width) {
  const t1 = getTileIndex(roomData, x, y);
  const t2 = getTileIndex(roomData, x + width, y);
  return isSolidTile(t1) || isSolidTile(t2);
}

/** Returns true if the tile at the given position blocks movement. */
export function isMapBlocked(roomData, x, y) {
  return isSolidTile(getTileIndex(roomData, x, y));
}


/** Returns true if two rectangles overlap. */
export function isIntersectRect(x1, y1, w1, h1, x2, y2, w2, h2) {
  if (x1 + w1 <= x2) return false;
  if (x2 + w2 <= x1) return false;
  if (y1 + h1 <= y2) return false;
  if (y2 + h2 <= y1) return false;
  return true;
}
