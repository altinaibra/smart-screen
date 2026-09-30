import { useBranding } from '../branding';

/** Logo e biznesit (nga Cilësimet). Pa logo të ngarkuar shfaqet inicialja e emrit. */
export default function Logo({ size = 32, withText = false, tagline = false }: { size?: number; withText?: boolean; tagline?: boolean }) {
  const b = useBranding();
  const name = b?.businessName ?? '';

  return (
    <span className="logo">
      {b?.logoUrl
        ? <img src={b.logoUrl} width={size} height={size} alt={name} style={{ objectFit: 'contain' }} />
        : <span className="logo-initial" style={{ width: size, height: size, fontSize: size * 0.5, background: b?.primaryColor }}>{name.charAt(0)}</span>}
      {withText && (
        <span className="logo-text">
          <span className="logo-name">{name}</span>
          {tagline && b?.tagline && <span className="logo-tagline" style={{ color: b.accentColor }}>{b.tagline}</span>}
        </span>
      )}
    </span>
  );
}
