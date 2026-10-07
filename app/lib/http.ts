export const publicCache = (sMaxAge: number, swr?: number) =>
  `public, s-maxage=${sMaxAge}${swr === undefined ? "" : `, stale-while-revalidate=${swr}`}`;
