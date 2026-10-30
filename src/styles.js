// mode: none | invert | text (gradient text on dark) | paper (gradient paper, dark text)
//       | duo (custom: any text colour on any background colour)
export const STYLES = [
  { id: 'original', name: 'Original', mode: 'none' },
  { id: 'invert', name: 'Night', mode: 'invert' },
  { id: 'marmalade', name: 'Marmalade', mode: 'text', stops: ['#ffc46b', '#ff7a3d'] },
  { id: 'yarn', name: 'Yarn Ball', mode: 'text', stops: ['#ff8fb1', '#ffd36e'] },
  { id: 'catnip', name: 'Catnip', mode: 'text', stops: ['#d4ff6b', '#3ee6a8'] },
  { id: 'aurora', name: 'Aurora', mode: 'text', stops: ['#5ef2c0', '#4fa8ff', '#c27bff'] },
  { id: 'sunbeam', name: 'Sunbeam', mode: 'paper', stops: ['#fff1d6', '#ffd2bd'] },
  { id: 'milk', name: 'Milk', mode: 'paper', stops: ['#e8f1ff', '#f4e6ff'] },
  { id: 'mint', name: 'Mint', mode: 'paper', stops: ['#e2fff1', '#dcefff'] },
];

export const ANGLE = 135;
export const cssGradient = (stops) => `linear-gradient(${ANGLE}deg, ${stops.join(', ')})`;

export function hslHex(h, s, l) {
  s /= 100; l /= 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// One slider covers everything: 0..NEUTRAL is black → grey → white (solid),
// above that every hue as a soft two-colour gradient.
export const NEUTRAL = 40;
export const TONE_MAX = 100;
const toneHue = (v) => Math.round(((v - NEUTRAL - 1) / (TONE_MAX - NEUTRAL - 1)) * 330);
export function tone(v) {
  if (v <= NEUTRAL) {
    const g = Math.round((v / NEUTRAL) * 255).toString(16).padStart(2, '0');
    return [`#${g}${g}${g}`, `#${g}${g}${g}`];
  }
  const h = toneHue(v);
  return [hslHex(h, 85, 55), hslHex((h + 35) % 360, 85, 55)];
}
// The slider track: grey ramp, then the hue rainbow.
export const toneTrack = (dir = 'to top') => {
  const hues = Array.from({ length: 12 }, (_, i) => {
    const v = NEUTRAL + 1 + (i * (TONE_MAX - NEUTRAL - 1)) / 11;
    return `${tone(Math.round(v))[0]} ${(v / TONE_MAX) * 100}%`;
  });
  return `linear-gradient(${dir}, #000 0%, #fff ${(NEUTRAL / TONE_MAX) * 100}%, ${hues.join(', ')})`;
};

export function customStyle(bgTone, textTone, n) {
  return {
    id: `custom-${bgTone}-${textTone}`, name: n ? `Custom ${n}` : 'Custom', mode: 'duo',
    bgTone, textTone, bg: tone(bgTone), stops: tone(textTone),
  };
}
