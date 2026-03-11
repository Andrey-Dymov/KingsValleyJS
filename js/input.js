/**
 * InputManager — битовая маска клавиш
 * Маппинг: стрелки, Space (Fire1), Escape
 */

export const CTL_UP = 1;
export const CTL_DOWN = 2;
export const CTL_LEFT = 4;
export const CTL_RIGHT = 8;
export const CTL_FIRE1 = 16;
export const CTL_FIRE2 = 32;
export const CTL_EXIT = 0x64;

let keys = 0;

const KEY_MAP = {
  ArrowUp: CTL_UP,
  ArrowDown: CTL_DOWN,
  ArrowLeft: CTL_LEFT,
  ArrowRight: CTL_RIGHT,
  Space: CTL_FIRE1,
  Enter: CTL_FIRE1,
  KeyZ: CTL_FIRE1,
  Escape: CTL_EXIT,
};

/** Adds key mask to pressed keys state on keydown. */
function onKeyDown(e) {
  const mask = KEY_MAP[e.code];
  if (mask) {
    keys |= mask;
    e.preventDefault();
  }
}

/** Removes key mask from pressed keys state on keyup. */
function onKeyUp(e) {
  const mask = KEY_MAP[e.code];
  if (mask) {
    keys &= ~mask;
    e.preventDefault();
  }
}

/** Registers keyboard event listeners for game input. */
export function initInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

/** Returns the current bitmask of pressed control keys. */
export function getControl() {
  return keys;
}
