/**
 * Логика игрока (player.c)
 */

import { updateCharacter } from './character.js';
import { getControl } from './input.js';
import {
  ET_JEWEL, ET_KNIFE, ET_EXIT, ET_UNUSED,
  MOVE_NORMAL, MOVE_KNIFE, MOVE_PICKAX,
  PS_IDLE, PS_ATTACK, PS_MOVE, PS_FALL, PS_JUMP,
  GATE_LOCK_DOWN_TILE, BLANK_TILE, PICKAX_TILE,
  EFX_HIT, EFX_DOOR
} from './constants.js';
import { MAP_W } from './constants.js';
import { getTileIndex, updateMapDataByPosition } from './gameUtil.js';
import { putGateTiles } from './gate.js';
import { isIntersectRect } from './gameUtil.js';

/** Sets entity state and optionally movetype, resets frame and delay. */
function changeObjectState(entity, state, movetype) {
  entity.state = state;
  entity.movetype = movetype ?? entity.movetype;
  entity.frame = 0;
  entity.delay = 0;
}

/** Returns the first entity of the given type or null. */
function findObjectByType(entities, type) {
  return entities.find(e => e.type === type) || null;
}

/** Returns the entity at the given tile position in the room or null. */
function findObjectByTileIndex(entities, roomId, tileX, tileY) {
  const x = tileX * 8;
  const y = tileY * 8;
  return entities.find(e => e.roomId === roomId && e.x === x && e.y === y) || null;
}

/** Handles tile-based interactions: pickax pickup and gate lock activation. */
export function processTileObjectInteraction(player, roomData, entities, curRoomId, mapData, onScore) {
  if (player.movetype !== MOVE_NORMAL) return;
  for (let i = 0; i < 2; i++) {
    const x = (player.x + 4) & 0xFF;
    const y = (player.y + i * 8) & 0xFF;
    const tile = getTileIndex(roomData, x, y);
    if (tile === PICKAX_TILE) {
      updateMapDataByPosition(roomData, x, y, BLANK_TILE);
      player.movetype = MOVE_PICKAX;
    }
    if (tile === GATE_LOCK_DOWN_TILE) {
      const obj = findObjectByTileIndex(entities, curRoomId, (x >> 3) + 2, y >> 3);
      if (obj && obj.type === ET_EXIT && obj.extra !== 1) {
        obj.extra = 1;
        obj.state = PS_ATTACK;
        obj.frame = 0;
      }
    }
  }
}

/** Handles entity interactions: jewel collection, knife pickup, exit trigger. */
export function processObjectInteraction(player, roomData, entities, curRoomId, mapData, jewelsCount, onJewelCollect, onExit, onPlayEffect) {
  for (const obj of entities) {
    if (obj.state === 3 || obj.roomId !== curRoomId) continue;
    if (obj.type === ET_JEWEL) {
      if (isIntersectRect(player.x - 4, player.y, 8, 16, obj.x, obj.y, 8, 8)) {
        updateMapDataByPosition(roomData, obj.x, obj.y, BLANK_TILE);
        updateMapDataByPosition(roomData, obj.x, obj.y - 8, BLANK_TILE);
        updateMapDataByPosition(roomData, obj.x - 8, obj.y, BLANK_TILE);
        updateMapDataByPosition(roomData, obj.x + 8, obj.y, BLANK_TILE);
        obj.type = ET_UNUSED;
        onJewelCollect?.(2000);
        onPlayEffect?.(EFX_HIT);
        if (jewelsCount === 1) {
          const exit = findObjectByType(entities, ET_EXIT);
          if (exit) {
            const roomData = mapData.rooms[exit.roomId];
            const tileX = exit.x >> 3;
            const tileY = exit.y >> 3;
            putGateTiles(roomData, tileX - 1, tileY, 2);
            updateMapDataByPosition(roomData, exit.x - 16, exit.y, GATE_LOCK_DOWN_TILE);
            exit.state = PS_ATTACK;
            exit.extra = 0;
            onPlayEffect?.(EFX_DOOR);
          }
        }
      }
    } else if (obj.type === ET_KNIFE) {
      if (player.movetype === MOVE_NORMAL && obj.state === PS_IDLE && player.state !== PS_FALL && player.state !== PS_JUMP) {
        if (isIntersectRect(player.x - 4, player.y, 8, 16, obj.x, obj.y, 8, 8)) {
          obj.state = PS_MOVE;
          changeObjectState(player, PS_MOVE, MOVE_KNIFE);
          player.item = obj.identifier;
        }
      }
    } else if (obj.type === ET_EXIT && obj.state === PS_ATTACK) {
      const px = player.x - 4;
      const inX = px >= obj.x && px <= obj.x + 8;
      if (inX && (player.y + 16) === (obj.y + obj.height) && obj.extra === 1) {
        player.frame = 0;
        onExit?.(obj);
      }
    }
  }
}

/** Updates player: reads input, updates character, processes tile and object interactions. */
export function updatePlayer(entity, roomData, ctx) {
  const control = getControl();
  const { entities, mapData, curRoomId, playerInfo, jewelsCount, findEntity, roomCount, onJewelCollect, onExit, onPlayEffect } = ctx;
  updateCharacter(entity, roomData, control, {
    playerInfo,
    entities,
    findEntity,
    roomCount,
    onPlayEffect
  });
  processTileObjectInteraction(entity, roomData, entities, curRoomId, mapData);
  processObjectInteraction(entity, roomData, entities, curRoomId, mapData, jewelsCount, onJewelCollect, onExit, onPlayEffect);
}
