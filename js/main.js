/**
 * King's Valley — точка входа
 */

import { loadAllAssets } from './assetLoader.js';
import { parseMap, parseEntities } from './mapLoader.js';
import { renderRoom } from './tileRenderer.js';
import { initMapEntities, setupMovableDoor } from './entity.js';
import { renderEntity } from './spriteRenderer.js';
import { initInput, getControl } from './input.js';
import { updatePlayer } from './player.js';
import { updateKnife } from './knife.js';
import { updateEnemy } from './enemy.js';
import { updateTrap } from './trap.js';
import { updatePushdoor } from './pushdoor.js';
import { renderHUD } from './hud.js';
import { updateMapDataByPosition, isMapBlocked } from './gameUtil.js';
import { updateExit, putGateTiles } from './gate.js';
import { initAudio, playMusic, stopMusic, playEffect } from './audio.js';
import { ET_PLAYER, ET_KNIFE, ET_JEWEL, ET_ENEMY, ET_TRAP, ET_PUSHDOOR, ET_EXIT, GAMEOVER_DELAY, MAX_LIVES, SONG_GAME_START, SONG_IN_GAME, SONG_GAME_OVER, EFX_START, EFX_DOOR, EFX_DIG, EFX_HIT, EFX_DEAD, GATE_LOCK_UP_TILE, FRAME_WAIT } from './constants.js';

const GAME_W = 256;
const GAME_H = 184;
const FPS = 30;
const DT = 1 / FPS;

let canvas, ctx;
let scale = 1;
let assets = null;
let currentMap = null;
let mapData = null;
let entities = [];
let curRoomId = 0;
let player = null;
let playerInfo = { score: 0, jewels: 0, digging_count: 0 };
let lives = 2;
let stage = 2;  // для теста — начать со 2-го уровня
let acc = 0;
let gameState = 'title';
let gameoverDelay = 0;
let invuln = 0;
let doorStep = 0;
let doorCount = 0;
let entranceGate = null;  // { tileX, tileY, roomId }
let exitGate = null;      // { roomId, tileX, tileY } для катсцены выхода
let screenDelay = 0;
let exitCount = 0;

/** Adjusts canvas size and scale to fit the window while keeping game resolution. */
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  scale = Math.max(1, Math.floor(Math.min(w / GAME_W, h / GAME_H)));
  canvas.width = GAME_W;
  canvas.height = GAME_H;
  canvas.style.width = (GAME_W * scale) + 'px';
  canvas.style.height = (GAME_H * scale) + 'px';
}

/** Finds an entity in the entities array by its identifier. */
function findEntity(id) {
  return entities.find(e => e.identifier === id) || null;
}

/** Handles player death: decrements lives, plays effect, switches to gameover or reset state. */
function playerDie() {
  lives--;
  invuln = 64; // INVUL_TIME
  playEffect(EFX_DEAD);
  if (lives <= 0) {
    gameState = 'gameover';
    gameoverDelay = GAMEOVER_DELAY;
    stopMusic();
    playMusic(SONG_GAME_OVER);
  } else {
    gameState = 'reset';
    gameoverDelay = GAMEOVER_DELAY;
  }
}

/** Main game loop tick: updates game state, entities, and handles all state transitions. */
function tick() {
  if (gameState === 'title') {
    if ((getControl() & 16) || (getControl() & 8) || (getControl() & 4)) {
      playEffect(EFX_START);
      gameState = 'game_reset';
      lives = MAX_LIVES;
      stage = 2;  // для теста
      playerInfo.score = 0;
      playerInfo.jewels = 0;
      screenDelay = 60;
    }
    return;
  }
  if (gameState === 'game_reset' && screenDelay === 60) {
    playMusic(SONG_GAME_START);
  }
  if (gameState === 'in_game_enter') {
    const room = entranceGate && mapData?.rooms?.[entranceGate.roomId];
    if (!room || !player) { gameState = 'in_game'; return; }
    const tx = entranceGate.tileX;
    const ty = entranceGate.tileY;
    doorCount++;
    if (doorStep === 0) {
      putGateTiles(room, tx, ty, 0);
      updateMapDataByPosition(room, (tx - 1) * 8, ty * 8, GATE_LOCK_UP_TILE);  // замок над воротами
      if (doorCount > 30) { doorStep = 1; doorCount = 0; }
    } else if (doorStep === 1) {
      if (doorCount % 2 === 0 && !isMapBlocked(room, player.x - 2, player.y + 16) && !isMapBlocked(room, player.x - 2 + 7, player.y + 16)) {
        player.x = (player.x - 2) & 0xFF;
        player.y = (player.y + 1) & 0xFF;
        player.frame = (player.frame + 1) % 4;
      }
      if (doorCount > 30) { doorStep = 2; doorCount = 0; }
    } else if (doorStep === 2) {
      if (doorCount > 30) { doorStep = 3; doorCount = 0; }
    } else if (doorStep === 3) {
      putGateTiles(room, tx, ty, 1);
      if (doorCount > 30) { doorStep = 4; doorCount = 0; }
    } else if (doorStep === 4) {
      putGateTiles(room, tx, ty, 2);
      if (doorCount > 30) { doorStep = 5; doorCount = 0; }
    } else if (doorStep === 5) {
      updateMapDataByPosition(room, (tx - 1) * 8, ty * 8, doorCount % 4 ? GATE_LOCK_UP_TILE : 0);
      if (doorCount > 30) { doorStep = 6; doorCount = 0; }
    } else if (doorStep === 6) {
      putGateTiles(room, tx, ty, 3);
      updateMapDataByPosition(room, (tx - 1) * 8, ty * 8, 0);
      entranceGate = null;
      gameState = 'in_game';
    }
    return;
  }
  if (gameState === 'game_reset') {
    if (screenDelay <= 0) {
      if (loadLevel(stage)) {
        playEffect(EFX_DOOR);
        playMusic(SONG_IN_GAME);
        gameState = 'in_game_enter';
        doorStep = 0;
        doorCount = 0;
        if (player) {
          entranceGate = { tileX: (player.x >> 3) - 1, tileY: (player.y >> 3) - 1, roomId: player.roomId };
          player.x = (player.x + 8) & 0xFF;
          player.y = (player.y - 8) & 0xFF;
          player.dir = 1;
        }
      } else {
        gameState = 'no_map';
        screenDelay = 180;
      }
    } else {
      screenDelay--;
    }
    return;
  }
  if (gameState === 'in_game_exit') {
    if (!player) { gameState = 'game_clear'; screenDelay = 120; return; }
    if (exitCount === 0 && exitGate) {
      const room = mapData?.rooms?.[exitGate.roomId];
      if (room) putGateTiles(room, exitGate.tileX, exitGate.tileY, 3);
    }
    if (exitCount < 15 && exitCount % 2 === 0) {
      player.x = Math.min(255, (player.x || 0) + 1);
      player.y = Math.max(0, (player.y || 0) - 2);
      player.frame = (player.frame + 1) % 4;
    }
    exitCount++;
    if (exitCount > 30) {
      gameState = 'game_clear';
      screenDelay = 120;
      exitCount = 0;
      exitGate = null;
    }
    return;
  }
  if (gameState === 'game_clear') {
    screenDelay--;
    if (screenDelay <= 0) {
      stage++;
      if (stage > 15) {
        gameState = 'no_map';
        screenDelay = 180;
      } else {
        gameState = 'game_reset';
        screenDelay = 60;
      }
    }
    return;
  }
  if (gameState === 'gameover') {
    screenDelay--;
    if (screenDelay <= 0) {
      stopMusic();
      gameState = 'title';
    }
    return;
  }
  if (gameState === 'no_map') {
    screenDelay--;
    if (screenDelay <= 0) {
      stopMusic();
      gameState = 'title';
    }
    return;
  }
  if (gameoverDelay > 0) {
    gameoverDelay--;
    if (gameoverDelay <= 0) {
      if (gameState === 'gameover') { screenDelay = 180; }
      else { gameState = 'game_reset'; screenDelay = 60; }
    }
    return;
  }
  if (gameState === 'gameover' && screenDelay > 0) {
    screenDelay--;
    if (screenDelay <= 0) gameState = 'title';
    return;
  }
  if (invuln > 0) invuln--;
  if (!player || !currentMap || gameState !== 'in_game') return;
  curRoomId = player.roomId;
  const roomData = mapData.rooms[curRoomId];
  for (const e of entities) {
    if (e.type === ET_PUSHDOOR) {
      updatePushdoor(e, player, curRoomId, (p, state) => {
        p.state = state; p.delay = 0; p.frame = 0;
      });
    } else if (e.type === ET_TRAP) {
      updateTrap(e, player, roomData, curRoomId);
    }
  }
  updatePlayer(player, roomData, {
    entities,
    mapData,
    curRoomId,
    playerInfo,
    jewelsCount: entities.filter(e => e.type === ET_JEWEL).length,
    findEntity,
    roomCount: mapData.roomCount,
    onJewelCollect: (pts) => { playerInfo.score = (playerInfo.score || 0) + pts; playerInfo.jewels++; },
    onExit: (exit) => {
      if (exit) {
        exitGate = { roomId: exit.roomId, tileX: (exit.x >> 3) - 1, tileY: exit.y >> 3 };
        exitCount = 0;
      }
      gameState = 'in_game_exit';
    },
    onPlayEffect: playEffect
  });
  for (const e of entities) {
    if (e.type === ET_KNIFE) {
      if (mapData.rooms[e.roomId] !== undefined) {
        updateKnife(e, mapData, entities, curRoomId,
          (pts) => { playerInfo.score = (playerInfo.score || 0) + pts; },
          (rd, x, y, tile) => updateMapDataByPosition(rd, x, y, tile),
          playEffect);
      }
    } else if (e.type === ET_JEWEL && e.roomId === curRoomId) {
      e.delay = (e.delay || 0) + 1;
      if (e.delay === FRAME_WAIT) {
        e.delay = 0;
        e.frame = (e.frame + 1) % FRAME_WAIT;
      }
    } else if (e.type === ET_ENEMY) {
      const enemyRoom = mapData.rooms[e.roomId];
      if (enemyRoom) {
        updateEnemy(e, enemyRoom, player, entities, mapData.roomCount, playerDie, invuln, gameoverDelay);
      }
    } else if (e.type === ET_EXIT) {
      updateExit(e, roomData, curRoomId);
    }
  }
}

/** Loads a level by parsing map data, initializing entities and setting up the player. */
function loadLevel(stageNum) {
  const rawMap = assets.mapData[`map${stageNum}`];
  if (!rawMap) return false;
  currentMap = parseMap(rawMap);
  mapData = { rooms: currentMap.rooms.map(r => [...r]), roomCount: currentMap.roomCount };
  const parsedEntities = parseEntities(rawMap, currentMap.roomCount);
  entities.length = 0;
  initMapEntities(entities, parsedEntities, assets);
  for (const e of entities) {
    if (e.type === ET_PUSHDOOR) setupMovableDoor(e, mapData);
  }
  player = entities.find(e => e.type === ET_PLAYER);
  curRoomId = player?.roomId ?? 0;
  if (player) {
    const room = mapData.rooms[player.roomId];
    if (room) {
      const tileX = player.x >> 3;
      const tileY = player.y >> 3;
      putGateTiles(room, tileX - 1, tileY - 1, 0);
      updateMapDataByPosition(room, (tileX - 2) * 8, (tileY - 1) * 8, GATE_LOCK_UP_TILE);
    }
  }
  return true;
}

/** Draws a full-screen text overlay with main text and optional subtext. */
function drawTextScreen(text, subtext = '') {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, GAME_W / 2, GAME_H / 2 - 8);
  if (subtext) ctx.fillText(subtext, GAME_W / 2, GAME_H / 2 + 8);
  ctx.textAlign = 'left';
}

/** Main render loop: accumulates time, runs tick, draws current game state, requests next frame. */
function loop(now = 0) {
  acc += Math.min(0.05, (performance.now() - (loop.last || now)) / 1000);
  loop.last = performance.now();

  while (acc >= DT) {
    tick();
    acc -= DT;
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  if (gameState === 'title') {
    if (assets?.mapData?.title) {
      const titleMap = parseMap(assets.mapData.title);
      if (titleMap.rooms[0]) renderRoom(ctx, assets.images.tiles, titleMap.rooms[0]);
    }
    drawTextScreen("KING'S VALLEY", "PRESS FIRE TO START");
  } else if (gameState === 'gameover') {
    drawTextScreen('GAME OVER', '');
  } else if (gameState === 'game_clear') {
    if (currentMap && assets) {
      renderRoom(ctx, assets.images.tiles, mapData?.rooms?.[curRoomId] || []);
      renderHUD(ctx, playerInfo, lives, stage);
    }
    drawTextScreen('STAGE CLEAR', '');
  } else if (gameState === 'no_map') {
    drawTextScreen('CONGRATUATION', '(PRESS FIRE)');
  } else if (gameState === 'game_reset') {
    drawTextScreen(`STAGE ${stage}`, '');
  } else if (currentMap && assets && mapData) {
    renderRoom(ctx, assets.images.tiles, mapData.rooms[curRoomId]);
    for (const e of entities) {
      if (e.type === ET_PLAYER && invuln & 1) continue;
      renderEntity(ctx, e, assets.images, assets.images.tiles, curRoomId);
    }
    renderHUD(ctx, playerInfo, lives, stage);
  }

  requestAnimationFrame(loop);
}

/** Initializes canvas, input, audio, loads assets and starts the game loop. */
async function init() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  initInput();
  initAudio();

  assets = await loadAllAssets();
  const rawMap = assets.mapData.map1;
  currentMap = parseMap(rawMap);
  mapData = {
    rooms: currentMap.rooms.map(r => [...r]),
    roomCount: currentMap.roomCount
  };
  const parsedEntities = parseEntities(rawMap, currentMap.roomCount);
  initMapEntities(entities, parsedEntities, assets);
  player = entities.find(e => e.type === ET_PLAYER);
  curRoomId = player?.roomId ?? 0;
  console.log('Assets loaded, player:', !!player);

  requestAnimationFrame(loop);
}

init();
