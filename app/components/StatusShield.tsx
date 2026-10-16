const CSS = `
.status-shield { display: none; position: fixed; top: 0; left: 0; right: 0; height: calc(env(safe-area-inset-top, 0px) + 6px); background: var(--shield-bg); pointer-events: none; }
@media (hover: none) and (pointer: coarse) { .status-shield { display: block; } }
`;

export default function StatusShield({ color, zIndex }: { color: string; zIndex: number }) {
  return (
    <>
      <style>{CSS}</style>
      <div
        className="status-shield"
        aria-hidden="true"
        style={{ "--shield-bg": color, zIndex } as React.CSSProperties}
      />
    </>
  );
}
