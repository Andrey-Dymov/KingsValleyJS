/**
 * HUD — счёт, жизни, уровень
 */

export function renderHUD(ctx, playerInfo, lives, stage) {
  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.fillText(`SCORE: ${playerInfo.score || 0}`, 8, 8);
  ctx.fillText(`LIVES: ${lives}`, 120, 8);
  ctx.fillText(`STAGE: ${stage}`, 200, 8);
}
