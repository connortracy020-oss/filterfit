export type ParsedSize = {
  width: number;
  height: number;
  thickness: number;
};

export function parseSize(input: string | null | undefined): ParsedSize | null {
  if (!input) return null;
  const normalized = input.replace(/×/g, 'x');
  const matches = normalized.match(/\d+/g);
  if (!matches || matches.length < 3) {
    return null;
  }
  const [width, height, thickness] = matches.slice(0, 3).map((value) => Number.parseInt(value, 10));
  if ([width, height, thickness].some((value) => Number.isNaN(value))) {
    return null;
  }
  return { width, height, thickness };
}
