/**
 * Разбор Tiled JSON карт
 */

import { MAP_W, MAP_H } from './constants.js';

/** Finds a layer by name in Tiled JSON data, throws if not found. */
function findLayer(data, name) {
  const layer = data.layers?.find(l => l.name === name);
  if (!layer) throw new Error(`Layer "${name}" not found`);
  return layer;
}

/** Finds a tileset by name in Tiled JSON data, throws if not found. */
function findTileset(data, name = 'default') {
  const ts = data.tilesets?.find(t => t.name === name);
  if (!ts) throw new Error(`Tileset "${name}" not found`);
  return ts;
}

/** Parses Tiled JSON map into array of rooms (each 32×23 tiles). */
export function parseMap(data) {
  const mapLayer = findLayer(data, 'Map');
  const tileset = findTileset(data);
  const firstGid = tileset.firstgid ?? 1;
  const rawData = mapLayer.data;
  const mapWidth = data.width || mapLayer.width;
  const mapHeight = data.height || mapLayer.height;

  const roomWidth = MAP_W;
  const roomHeight = MAP_H;
  const roomsX = Math.floor(mapWidth / roomWidth);
  const roomsY = Math.floor(mapHeight / roomHeight);
  const roomCount = roomsX * roomsY;

  const rooms = [];
  for (let ry = 0; ry < roomsY; ry++) {
    for (let rx = 0; rx < roomsX; rx++) {
      const room = [];
      for (let y = 0; y < roomHeight; y++) {
        for (let x = 0; x < roomWidth; x++) {
          const gx = rx * roomWidth + x;
          const gy = ry * roomHeight + y;
          const idx = gy * mapWidth + gx;
          const tileId = rawData[idx] ?? 0;
          room.push(Math.max(0, tileId - firstGid) & 0xFF);
        }
      }
      rooms.push(room);
    }
  }

  return { rooms, firstGid, roomCount };
}

/** Parses Entities layer into array of entity objects with room and type info. */
export function parseEntities(data, roomCount) {
  let entitiesLayer;
  try {
    entitiesLayer = findLayer(data, 'Entities');
  } catch {
    return [];
  }

  const objects = entitiesLayer.objects || [];
  const tileWidth = data.tilewidth || 8;
  const tileHeight = data.tileheight || 8;
  const mapWidth = data.width || 32;
  const roomWidth = MAP_W;
  const roomHeight = MAP_H;

  const nameToType = {
    PLAYER: 1, ENEMY: 2, JEWEL: 3, KNIFE: 4, PICKAX: 5,
    START: 6, EXIT: 7, LOCK: 8, TRAP: 9, PUSHDOOR: 10
  };

  const roomPixelW = roomWidth * tileWidth;
  const roomPixelH = roomHeight * tileHeight;
  const roomsX = Math.floor(mapWidth / roomWidth);

  return objects.map(obj => {
    const name = (obj.name || '').toUpperCase();
    const type = nameToType[name] ?? 0;

    const roomX = Math.floor(obj.x / roomPixelW);
    const roomY = Math.floor(obj.y / roomPixelH);
    const roomId = Math.min(roomY * roomsX + roomX, roomCount - 1);

    const x = (obj.x % roomPixelW) & 0xFF;
    const y = (obj.y % roomPixelH) & 0xFF;

    let extra = 0;
    const props = obj.properties || [];
    for (const p of props) {
      if (p.name === 'extra') extra = parseInt(p.value, 10) || 0;
    }
    let param = 0;
    for (const p of props) {
      if (p.name === 'param') param = parseInt(p.value, 10) || 0;
    }
    const dir = param === 1 ? 1 : 0; // DIR_LEFT = 1

    return {
      type,
      subtype: type === 2 ? (extra & 0x0f) : 0,
      state: 1,
      movetype: 0,
      control: 0,
      pat: 0,
      identifier: obj.id || 0,
      roomId,
      x: x & 0xFF,
      y: y & 0xFF,
      regentime: 0,
      thinkingtime: 0,
      width: obj.width || 8,
      height: obj.height || 8,
      pivot_x: 0,
      pivot_y: 0,
      dir,
      delay: 0,
      frame: 0,
      strategy: 0,
      extra: extra & 0xFF,
      extra2: 0,
      flags: type === 2 ? (extra & ~0x0f) : 0,
      temp: 0,
      item: 0,
      update: null
    };
  });
}
