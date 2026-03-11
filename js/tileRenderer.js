/**
 * Отрисовка тайловой карты
 */

import { MAP_W, MAP_H } from './constants.js';

const TILE_SIZE = 8;
const TILESET_COLS = 32;

/** Draws a room by rendering all tiles from roomData using the tileset image. */
export function renderRoom(ctx, tilesImg, roomData) {
  for (let i = 0; i < roomData.length; i++) {
    const tileIdx = roomData[i] & 0xFF;
    const x = (i % MAP_W) * TILE_SIZE;
    const y = Math.floor(i / MAP_W) * TILE_SIZE;
    const sx = (tileIdx % TILESET_COLS) * TILE_SIZE;
    const sy = Math.floor(tileIdx / TILESET_COLS) * TILE_SIZE;
    ctx.drawImage(tilesImg, sx, sy, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE);
  }
}
