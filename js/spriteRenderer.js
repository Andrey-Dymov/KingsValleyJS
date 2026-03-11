/**
 * Отрисовка спрайтов 16×16
 */

import {
  DIR_LEFT, ET_PLAYER, ET_ENEMY, ET_KNIFE, ET_EXIT, ET_JEWEL,
  JEWEL_TILE, JEWEL_EFFECT_UP_TILE, JEWEL_EFFECT_LEFT_TILE, JEWEL_EFFECT_RIGHT_TILE,
  FRAME_WAIT
} from './constants.js';
import {
  PS_IDLE, PS_MOVE, PS_FALL, PS_JUMP, PS_STAIR, PS_ATTACK, PS_DIGGING,
  PS_NONE, PS_MOVABLE_DOOR, MOVE_NORMAL, MOVE_KNIFE, MOVE_PICKAX,
  WALK_CYCLE, STAIR_CYCLE, ATTACK_CYCLE, KNIFE_CYCLE, DIGGING_CYCLE,
  ACTION_STAIR_LEFT_UP, ACTION_STAIR_RIGHT_UP, ACTION_STAIR_LEFT_DOWN, ACTION_STAIR_RIGHT_DOWN
} from './constants.js';

const SPRITE_SIZE = 16;

const ENEMY_COLORS = {
  0: null,              // STATIC — белый (без перекраски)
  1: [221, 102, 102],   // MOVE — красный (MSX color 8)
  2: null,              // WANDERER — белый (без перекраски)
  3: [119, 221, 221],   // WANDERER_STAIR — голубой (MSX color 7)
  4: [187, 85, 85],     // TRACER — тёмно-красный (MSX color 6)
  5: [204, 204, 85],    // доп. тип — жёлтый (MSX color 10)
};

const spriteCache = new Map();

/** Returns true if the given RGB color is magenta or dark gray (used for transparency). */
function isTransparent(r, g, b) {
  return (r > 0xF0 && g < 0x20 && b > 0xF0) ||  // magenta
    (r < 0x30 && g < 0x30 && b < 0x30);          // тёмно-серый
}

/** Extracts a frame from sprite sheet, applies transparency and optional recolor, caches result. */
function getProcessedFrame(img, frameIndex, recolor = null) {
  const key = `${img.src || img.width}_${frameIndex}` + (recolor ? `_${recolor.join(',')}` : '');
  if (spriteCache.has(key)) return spriteCache.get(key);
  const cvs = document.createElement('canvas');
  cvs.width = SPRITE_SIZE;
  cvs.height = SPRITE_SIZE;
  const c = cvs.getContext('2d');
  c.drawImage(img, frameIndex * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
  const id = c.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  for (let i = 0; i < id.data.length; i += 4) {
    if (isTransparent(id.data[i], id.data[i + 1], id.data[i + 2])) {
      id.data[i + 3] = 0;
    } else if (recolor && id.data[i] > 200 && id.data[i + 1] > 200 && id.data[i + 2] > 200) {
      id.data[i] = recolor[0];
      id.data[i + 1] = recolor[1];
      id.data[i + 2] = recolor[2];
    }
  }
  c.putImageData(id, 0, 0);
  spriteCache.set(key, cvs);
  return cvs;
}

// Кадры анимации (индексы в спрайтшите)
const WALK_FRAMES = [0, 1, 0, 2];
const STAIR_FRAMES = [0, 1];
const ATTACK_FRAMES = [0, 1];
const KNIFE_FRAMES = [0, 1, 2, 3];
const DIGGING_FRAMES = [0, 1];

/** Returns the animation frame index based on entity frame counter and frame array. */
function getFrameIndex(entity, cycle, frames) {
  const idx = Math.floor(entity.frame / 2) % frames.length;
  return frames[idx];
}

/** Draws a sprite frame at given position with optional horizontal flip and recolor. */
export function drawSprite(ctx, img, frameIndex, x, y, flip = false, recolor = null) {
  const src = getProcessedFrame(img, frameIndex, recolor);
  ctx.save();
  if (flip) {
    ctx.translate(x + SPRITE_SIZE, y);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0, SPRITE_SIZE, SPRITE_SIZE, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
  } else {
    ctx.drawImage(src, 0, 0, SPRITE_SIZE, SPRITE_SIZE, x, y, SPRITE_SIZE, SPRITE_SIZE);
  }
  ctx.restore();
}

/** Renders the player sprite based on current state, movetype and animation frame. */
export function renderPlayerSprite(ctx, entity, images) {
  const flip = entity.dir === DIR_LEFT;
  let img, frameIdx;

  if (entity.state === PS_ATTACK) {
    img = images.p_attack;
    frameIdx = getFrameIndex(entity, ATTACK_CYCLE, ATTACK_FRAMES);
  } else if (entity.state === PS_DIGGING) {
    img = images.p_dig;
    frameIdx = getFrameIndex(entity, DIGGING_CYCLE, DIGGING_FRAMES);
  } else if (entity.state === PS_JUMP || entity.state === PS_FALL) {
    img = entity.movetype === MOVE_KNIFE ? images.p_knife
        : entity.movetype === MOVE_PICKAX ? images.p_pickax
        : images.p_move;
    frameIdx = 0;
  } else if (entity.movetype === MOVE_KNIFE) {
    img = images.p_knife;
    frameIdx = getFrameIndex(entity, KNIFE_CYCLE, KNIFE_FRAMES);
  } else if (entity.movetype === MOVE_PICKAX) {
    img = images.p_pickax;
    frameIdx = getFrameIndex(entity, WALK_CYCLE, WALK_FRAMES);
  } else {
    img = images.p_move;
    frameIdx = getFrameIndex(entity, WALK_CYCLE, WALK_FRAMES);
  }

  let drawX = (entity.x - entity.pivot_x) & 0xFF;
  const drawY = entity.y & 0xFF;
  if (entity.state === PS_STAIR) {
    const a = entity.extra2 || 0;
    if (a === ACTION_STAIR_LEFT_UP || a === ACTION_STAIR_RIGHT_DOWN) drawX = (drawX - 2) & 0xFF;
    else if (a === ACTION_STAIR_RIGHT_UP || a === ACTION_STAIR_LEFT_DOWN) drawX = (drawX + 2) & 0xFF;
  }
  drawSprite(ctx, img, frameIdx, drawX, drawY, flip);
}

/** Renders the enemy sprite with subtype-based color tint and animation. */
export function renderEnemySprite(ctx, entity, images) {
  const flip = entity.dir === DIR_LEFT;
  const img = images.enemy;
  const frameIdx = entity.state === PS_NONE
    ? (4 + Math.floor(entity.regentime / 2) % 2)
    : getFrameIndex(entity, 2, WALK_FRAMES);
  const drawX = (entity.x - entity.pivot_x) & 0xFF;
  const drawY = entity.y & 0xFF;
  const color = ENEMY_COLORS[entity.subtype] ?? null;
  drawSprite(ctx, img, frameIdx, drawX, drawY, flip, color);
}

/** Renders the thrown knife sprite with 4-frame animation. */
export function renderKnifeSprite(ctx, entity, images) {
  const flip = entity.dir === DIR_LEFT;
  const frameIdx = entity.frame % 4;
  const drawX = (entity.x - (entity.pivot_x ?? 0)) & 0xFF;
  const drawY = entity.y & 0xFF;
  drawSprite(ctx, images.knife, frameIdx, drawX, drawY, flip);
}

/** Draws a single 8x8 tile from the tileset at the given screen position. */
function drawTile(ctx, tilesImg, tileIdx, x, y) {
  const TILE = 8;
  const COLS = 32;
  const sx = (tileIdx % COLS) * TILE;
  const sy = Math.floor(tileIdx / COLS) * TILE;
  ctx.drawImage(tilesImg, sx, sy, TILE, TILE, x, y, TILE, TILE);
}

/** Renders a jewel with optional sparkle effect tiles on first frame. */
export function renderJewel(ctx, entity, tilesImg) {
  drawTile(ctx, tilesImg, JEWEL_TILE + (entity.extra || 0), entity.x, entity.y);
  if (entity.frame === 0) {
    drawTile(ctx, tilesImg, JEWEL_EFFECT_UP_TILE, entity.x, entity.y - 8);
    drawTile(ctx, tilesImg, JEWEL_EFFECT_LEFT_TILE, entity.x - 8, entity.y);
    drawTile(ctx, tilesImg, JEWEL_EFFECT_RIGHT_TILE, entity.x + 8, entity.y);
  }
}

/** Dispatches rendering to the appropriate sprite function based on entity type. */
export function renderEntity(ctx, entity, images, tilesImg, curRoomId) {
  if (entity.type === 0) return;
  if (entity.roomId !== curRoomId) return;

  switch (entity.type) {
    case ET_PLAYER:
      renderPlayerSprite(ctx, entity, images);
      break;
    case ET_ENEMY:
      if (entity.state !== 3) renderEnemySprite(ctx, entity, images); // PS_DEAD
      break;
    case ET_KNIFE:
      if (entity.state !== 4) renderKnifeSprite(ctx, entity, images); // не рендерить когда держим (PS_MOVE)
      break;
    case ET_JEWEL:
      renderJewel(ctx, entity, tilesImg);
      break;
    case ET_EXIT:
      // Ворота рисуются в gate.js
      break;
    default:
      break;
  }
}
