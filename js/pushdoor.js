/**
 * Толкаемая дверь (pushdoor.c)
 */

import { PS_MOVE, PS_MOVABLE_DOOR } from './constants.js';

/** Updates pushdoor: detects when player pushes long enough, flips door and triggers push state. */
export function updatePushdoor(door, player, curRoomId, changePlayerState) {
  if (door.roomId !== curRoomId) return;
  if (player.state !== PS_MOVE) {
    door.extra = 0;
    return;
  }
  if (player.y + 8 !== door.y) return;
  if (!player.dir && door.dir) {
    if ((player.x + 8) === door.x) door.extra++;
  } else if (player.dir && !door.dir) {
    if ((player.x - 16) === door.x) door.extra++;
  }
  if (door.extra > 30) {
    door.dir ^= 1;
    door.extra = 0;
    changePlayerState?.(player, PS_MOVABLE_DOOR);
    player.extra = door.x;
    player.extra2 = Math.max(1, door.height / 8);
  }
}
