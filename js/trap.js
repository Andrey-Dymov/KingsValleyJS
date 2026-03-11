/**
 * Ловушки (trap.c)
 */

import { PS_IDLE, PS_ATTACK, PS_DEAD } from './constants.js';
import { SOLID_TILE, SOLID_TILE2 } from './constants.js';
import { updateMapDataByPosition } from './gameUtil.js';
import { isIntersectRect } from './gameUtil.js';

/** Updates trap: activates when player is in column, then extends solid tiles upward. */
export function updateTrap(trap, player, roomData, curRoomId) {
  if (trap.roomId !== curRoomId || trap.state === PS_DEAD) return;
  if (trap.state === PS_IDLE) {
    const tileX = player.x >> 3;
    if (tileX === (trap.x >> 3)) {
      const h = (trap.extra & 0x7f) || 1;
      if (isIntersectRect(player.x, player.y, player.width, player.height, trap.x, trap.y, 8, 8 * h)) {
        trap.state = PS_ATTACK;
        trap.extra2 = 0;
        trap.delay = 0;
      }
    }
  } else if (trap.state === PS_ATTACK) {
    trap.delay = (trap.delay || 0) + 1;
    if (trap.delay >= 30) {
      trap.delay = 0;
      const solidTile = (trap.extra & 128) ? SOLID_TILE2 : SOLID_TILE;
      const y = trap.y + trap.extra2 * 8;
      updateMapDataByPosition(roomData, trap.x, y, solidTile);
      trap.extra2++;
      const height = trap.extra & 0x7f;
      if (trap.extra2 >= height) {
        trap.state = PS_DEAD;
      }
    }
  }
}
