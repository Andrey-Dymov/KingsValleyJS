/**
 * AudioManager — Web Audio API
 * WAV: bgm, gameover, start, caught
 * TEMP: generated — EFX_START, EFX_DOOR, EFX_DIG, EFX_HIT
 */

import { SONG_IN_GAME, SONG_GAME_OVER, SONG_GAME_START } from './constants.js';
import { EFX_START, EFX_DOOR, EFX_DIG, EFX_HIT, EFX_DEAD } from './constants.js';

let ctx = null;
const buffers = {};
const sources = {};

/** Creates or returns the Web Audio context (requires user gesture). */
async function initContext() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

/** Loads and decodes a WAV file into an audio buffer. */
async function loadWav(url) {
  const c = await initContext();
  const res = await fetch(url);
  const buf = await c.decodeAudioData(await res.arrayBuffer());
  return buf;
}

/** Plays a short tone using Web Audio oscillator (for generated sound effects). */
function playTone(freq, duration, type = 'square') {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/** Loads all WAV audio files from the given base path. */
export async function loadAudio(basePath = 'assets/audio') {
  const c = await initContext();
  try {
    buffers.bgm = await loadWav(`${basePath}/bgm.wav`);
    buffers.gameover = await loadWav(`${basePath}/gameover.wav`);
    buffers.start = await loadWav(`${basePath}/start.wav`);
    buffers.caught = await loadWav(`${basePath}/caught.wav`);
  } catch (e) {
    console.warn('Audio load failed:', e);
  }
  return true;
}

/** Sets up audio: loads on first user click (browser autoplay policy). */
export function initAudio() {
  document.body.addEventListener('click', async () => {
    await initContext();
    await loadAudio('assets/audio');
  }, { once: true });
}

/** Plays a music track by ID, stopping any current music first. */
export function playMusic(song) {
  if (!ctx) return;
  stopMusic();
  const key = song === SONG_IN_GAME ? 'bgm' : song === SONG_GAME_OVER ? 'gameover' : song === SONG_GAME_START ? 'start' : null;
  if (!key || !buffers[key]) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[key];
  src.loop = key === 'bgm';
  src.connect(ctx.destination);
  src.start(0);
  sources.music = src;
}

/** Stops the currently playing music. */
export function stopMusic() {
  if (sources.music) {
    try { sources.music.stop(); } catch (_) {}
    sources.music = null;
  }
}

/** Plays a sound effect by ID (WAV or generated tone). */
export function playEffect(effect) {
  if (!ctx) return;
  if (effect === EFX_DEAD && buffers.caught) {
    const src = ctx.createBufferSource();
    src.buffer = buffers.caught;
    src.connect(ctx.destination);
    src.start(0);
    return;
  }
  // TEMP: generated
  if (effect === EFX_START) playTone(440, 0.1);
  else if (effect === EFX_DOOR) playTone(330, 0.15);
  else if (effect === EFX_DIG) playTone(200, 0.08);
  else if (effect === EFX_HIT) playTone(880, 0.1);
  else if (effect === EFX_DEAD) playTone(220, 0.3); // fallback when caught.wav missing
}
