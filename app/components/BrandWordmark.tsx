const SWEEP_STYLE: React.CSSProperties = {
  WebkitTextFillColor: "transparent",
  backgroundImage: "linear-gradient(to right, #fb923c 0%, #ec4899 50%, currentColor 50% 100%)",
  backgroundSize: "200% 100%",
  transition: "background-position 400ms ease",
};

export default function BrandWordmark() {
  return (
    <>
      <span>PEYT</span>
      <span aria-hidden>&nbsp;</span>
      <span className="bg-clip-text bg-[position:100%_0%] group-hover:bg-[position:0%_0%]" style={SWEEP_STYLE}>
        SPENCER
      </span>
    </>
  );
}
