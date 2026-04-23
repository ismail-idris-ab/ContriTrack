export default function Skeleton({ width = '100%', height = 18, borderRadius = 8, count = 1, gap = 10, style = {} }) {
  const base = {
    width,
    height,
    borderRadius,
    background: 'linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.06) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.4s ease infinite',
    flexShrink: 0,
    ...style,
  };

  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap, width }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={base} />
        ))}
      </div>
    </>
  );
}
