/**
 * Entity — сущность игры (из game.h struct entity)
 */

import {
  ET_PLAYER, ET_ENEMY, ET_KNIFE, ET_JEWEL, ET_TRAP, ET_EXIT, ET_PUSHDOOR,
  PS_IDLE, PS_NONE,
  ENEMY_REBORN_CYCLE,
  BLANK_TILE, MOVABLE_DOOR_TILE1, MOVABLE_DOOR_TILE2, MOVABLE_DOOR_TILE3, MOVABLE_DOOR_TILE4
} from './constants.js';
import { getTileIndex, updateMapDataByPosition } from './gameUtil.js';

/** Creates an entity object from parsed data with default values. */
export function createEntity(data) {
  return {
    type: data.type ?? 0,
    subtype: data.subtype ?? 0,
    state: data.state ?? PS_IDLE,
    movetype: data.movetype ?? 0,
    control: data.control ?? 0,
    pat: data.pat ?? 0,
    identifier: data.identifier ?? 0,
    roomId: data.roomId ?? 0,
    x: (data.x ?? 0) & 0xFF,
    y: (data.y ?? 0) & 0xFF,
    regentime: data.regentime ?? 0,
    thinkingtime: data.thinkingtime ?? 0,
    width: data.width ?? 8,
    height: data.height ?? 8,
    pivot_x: data.pivot_x ?? 0,
    pivot_y: data.pivot_y ?? 0,
    dir: data.dir ?? 0,
    delay: data.delay ?? 0,
    frame: data.frame ?? 0,
    strategy: data.strategy ?? 0,
    extra: (data.extra ?? 0) & 0xFF,
    extra2: data.extra2 ?? 0,
    flags: data.flags ?? 0,
    temp: data.temp ?? 0,
    item: data.item ?? 0,
    update: data.update ?? null
  };
}

/** Initializes entities array from parsed map data, applying type-specific setup. */
export function initMapEntities(entities, parsedEntities, assets) {
  entities.length = 0;

  for (const e of parsedEntities) {
    const entity = createEntity(e);

    switch (entity.type) {
      case ET_PLAYER:
        entity.pivot_x = 4;
        entity.pivot_y = 0;
        entity.x = (entity.x + entity.pivot_x) & 0xFF;
        entity.y = (entity.y + entity.pivot_y) & 0xFF;
        entity.width = 8;
        entity.height = 16;
        break;
      case ET_ENEMY:
        entity.pivot_x = 4;
        entity.pivot_y = 0;
        entity.x = (entity.x + entity.pivot_x) & 0xFF;
        entity.y = (entity.y + entity.pivot_y) & 0xFF;
        entity.width = 8;
        entity.height = 16;
        entity.regentime = ENEMY_REBORN_CYCLE * 2;
        entity.state = PS_NONE;
        entity.subtype = entity.extra & 0x0f;
        entity.flags = entity.extra & ~0x0f;
        break;
      case ET_KNIFE:
        entity.width = 8;
        entity.height = 8;
        break;
      case ET_JEWEL:
      case ET_TRAP:
        entity.width = 8;
        entity.height = 8;
        break;
      case ET_EXIT:
        entity.width = 16;
        entity.height = 24;
        break;
      case ET_PUSHDOOR:
        entity.width = 8;
        entity.dir = entity.extra;  // направление: extra 1 = вправо, 0 = влево
        break;
    }

    entities.push(entity);
  }
}

/** Places pushable door tiles on the map and sets door height. */
export function setupMovableDoor(door, mapData) {
  const roomData = mapData?.rooms?.[door.roomId];
  if (!roomData) return;
  let height = 0;
  while (true) {
    const tileIdx = getTileIndex(roomData, door.x, door.y - height);
    if (tileIdx !== BLANK_TILE) break;
    const ty = door.y - height;
    if (door.extra === 1) {
      updateMapDataByPosition(roomData, door.x, ty, MOVABLE_DOOR_TILE1);
      updateMapDataByPosition(roomData, door.x + 8, ty, MOVABLE_DOOR_TILE2);
    } else {
      updateMapDataByPosition(roomData, door.x, ty, MOVABLE_DOOR_TILE4);
      updateMapDataByPosition(roomData, door.x + 8, ty, MOVABLE_DOOR_TILE3);
    }
    height += 8;
  }
  door.height = height;
}
