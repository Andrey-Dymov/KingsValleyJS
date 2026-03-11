/**
 * Загрузка ассетов (PNG, JSON, WAV)
 */

const BASE = 'assets';

async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  });
  return img;
}

async function loadJson(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to load JSON: ${src}`);
  return res.json();
}

async function loadAudioBuffer(ctx, src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to load audio: ${src}`);
  const arrayBuffer = await res.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

export async function loadAllAssets() {
  const sprites = [
    'tiles', 'p_move', 'p_knife', 'p_pickax', 'p_attack', 'p_dig',
    'enemy', 'knife', 'gate'
  ];
  const maps = ['title', ...Array.from({ length: 15 }, (_, i) => `map${i + 1}`)];
  const audio = ['bgm', 'gameover', 'start', 'caught'];

  const images = {};
  const mapData = {};
  const audioFiles = {};

  const imagePromises = sprites.map(name =>
    loadImage(`${BASE}/sprites/${name}.png`).then(img => { images[name] = img; })
  );

  const mapPromises = maps.map(name =>
    loadJson(`${BASE}/maps/${name}.json`).then(data => { mapData[name] = data; })
  );

  await Promise.all([...imagePromises, ...mapPromises]);

  return {
    images,
    mapData,
    audioFiles, // WAV загружаются в AudioManager после user gesture
  };
}
