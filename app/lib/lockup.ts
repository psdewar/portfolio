export const LOCKUP_CSS = `
.lockup { font-size: calc(0.7445 * var(--lockup-h)); line-height: 1; white-space: nowrap; }
.lockup-img { display: inline-block; height: var(--lockup-h); width: auto; vertical-align: calc(-0.2835 * var(--lockup-h)); margin-right: calc(0.14 * var(--lockup-h)); }
.lockup-records { font-family: var(--font-fira-sans), sans-serif; font-weight: 500; color: #ffffff; }
`;

export function lockupHtml(src: string): string {
  return `<div class="lockup"><img src="${src}" alt="Lyrist" class="lockup-img" /><span class="lockup-records">Records</span></div>`;
}
