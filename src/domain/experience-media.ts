/** Only repository-owned raster assets can be embedded in experience Markdown. */
export function isExperienceMediaPath(value: string): boolean {
  return /^\/media\/experiences\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp|gif)$/u.test(
    value,
  );
}
