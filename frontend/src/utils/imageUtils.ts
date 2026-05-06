export function getHeroImageUrl(name: string): string {
  // Format name for Fandom Wiki (replace spaces with underscores)
  const formattedName = name.replace(/ /g, '_');
  return `https://mobile-legends.fandom.com/wiki/Special:FilePath/${formattedName}.png`;
}
