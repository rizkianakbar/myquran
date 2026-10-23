/**
 * iOS shows a launch image only when one matches the screen exactly (CSS
 * size and pixel ratio, portrait). Without one the installed app opens on
 * a blank screen. Rendered by `bun pwa:splash`; linked from the root head.
 */
const SCREENS: [width: number, height: number, scale: number][] = [
  [440, 956, 3], // iPhone 16/17 Pro Max
  [420, 912, 3], // iPhone Air
  [402, 874, 3], // iPhone 16/17 Pro, 17
  [430, 932, 3], // iPhone 14/15 Pro Max, 15/16 Plus
  [393, 852, 3], // iPhone 14/15 Pro, 15, 16
  [428, 926, 3], // iPhone 12/13 Pro Max, 14 Plus
  [390, 844, 3], // iPhone 12, 13, 14, 12/13 Pro
  [375, 812, 3], // iPhone X, XS, 11 Pro, 12/13 mini
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [414, 896, 2], // iPhone XR, 11
  [414, 736, 3], // iPhone 6–8 Plus
  [375, 667, 2], // iPhone 6–8, SE (2nd, 3rd)
  [1032, 1376, 2], // iPad Pro 13" (M4)
  [1024, 1366, 2], // iPad Pro 12.9", iPad Air 13"
  [834, 1210, 2], // iPad Pro 11" (M4)
  [834, 1194, 2], // iPad Pro 11"
  [820, 1180, 2], // iPad Air
  [744, 1133, 2], // iPad mini (6th, 7th)
  [768, 1024, 2], // older iPads
];

export const IOS_SPLASH_SCREENS = SCREENS.map(([width, height, scale]) => ({
  width,
  height,
  scale,
  // PNG: the format Apple documents for launch images (iOS ignored JPEGs).
  file: `/splash/ios-${width}x${height}@${scale}x.png`,
  media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: portrait)`,
}));
