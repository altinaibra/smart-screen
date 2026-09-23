/** Logo e Smart Screen (e njëjta me /logo.svg). */
export default function Logo({ size = 32, withText = false, tagline = false }: { size?: number; withText?: boolean; tagline?: boolean }) {
  return (
    <span className="logo">
      <img src="/logo.svg" width={size} height={size} alt="Smart Screen" />
      {withText && (
        <span className="logo-text">
          <span className="logo-name">Smart Screen</span>
          {tagline && <span className="logo-tagline">Digital Signage</span>}
        </span>
      )}
    </span>
  );
}
