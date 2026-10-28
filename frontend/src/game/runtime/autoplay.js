// Predict a nearby gate's opening and the ninja's short-term vertical position.
// Pure data in/out so this controller can be checked without a renderer.
export function getAutoplayAction({ x, y, velocityY, height, obstacles }) {
  const next = obstacles
    .filter((o) => o.isGate && o.x + o.displayWidth / 2 > x - 20)
    .sort((a, b) => a.x - b.x)[0];
  let target = height * 0.5;
  if (next) {
    const topEdge = next.y + next.displayHeight / 2;
    // Static gates also need their bottom partner to measure the opening.
    const bottom = next.paired;
    if (bottom) target = (topEdge + bottom.y - bottom.displayHeight / 2) / 2;
  }
  target = Math.max(100, Math.min(height - 100, target));
  const predictedY = y + velocityY * 0.06 + 0.5 * 900 * 0.06 ** 2;
  return { jump: velocityY >= 0 && predictedY > target + 35 };
}
