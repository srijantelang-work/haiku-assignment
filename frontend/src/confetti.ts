import confetti from "canvas-confetti";

export function fireConfettiSideCannons() {
  const end = Date.now() + 2.5 * 1000;
  // Refined palette: Botanical Emerald, Soft Violet, Mint, Warm Gold, Rose
  const colors = ["#0D483F", "#5B4DF0", "#0D8065", "#10B981", "#F59E0B", "#EC4899", "#A78BFA"];

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 3,
      angle: 60,
      spread: 60,
      startVelocity: 55,
      origin: { x: 0, y: 0.65 },
      colors: colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 60,
      startVelocity: 55,
      origin: { x: 1, y: 0.65 },
      colors: colors,
      zIndex: 9999,
    });

    requestAnimationFrame(frame);
  };

  frame();
}
