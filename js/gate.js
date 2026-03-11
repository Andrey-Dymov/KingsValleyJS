/**
 * Ворота и катсцены (gate.c)
 */

import { BLANK_TILE, GATE_LOCK_DOWN_TILE } from './constants.js';
import { updateMapDataByPosition } from './gameUtil.js';

const GATE_TILES = [
  [108, 109, 110, 99, 0, 102, 100, 0, 103, 123, 124, 125],
  [111, 112, 114, 95, 113, 96, 96, 126, 98, 127, 128, 129],
  [0, 0, 0, 108, 109, 110, 123, 124, 125, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

export function putGateTiles(roomData, tileX, tileY, step) {
  const tiles = GATE_TILES[step] || GATE_TILES[0];
  for (let i = 0; i < 12; i++) {
    const x = (tileX + Math.floor(i / 3)) * 8;
    const y = (tileY + (i % 3)) * 8;
    updateMapDataByPosition(roomData, x, y, tiles[i]);
  }
}

export function updateExit(exit, roomData, curRoomId) {
  if (exit.roomId !== curRoomId || exit.state !== 2) return; // PS_ATTACK
  const tileX = exit.x >> 3;
  const tileY = exit.y >> 3;
  exit.delay = (exit.delay || 0) + 1;
  if (exit.delay >= 2) {
    exit.delay = 0;
    const t = (exit.frame % 4) ? GATE_LOCK_DOWN_TILE : BLANK_TILE;
    updateMapDataByPosition(roomData, (tileX - 2) * 8, tileY * 8, t);
  }
  exit.frame = (exit.frame + 1) % 4;
}
