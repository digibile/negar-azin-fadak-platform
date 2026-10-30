import { NavLink, Outlet } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { brand } from '../../lib/brand';
import { useIsSignedIn, useSignOut } from '../../lib/useSession';

const PUBLIC_LINKS = [
  { to: '/', label: 'خانه', end: true },
  { to: '/modules', label: 'ماژول‌ها', end: false },
  { to: '/status', label: 'وضعیت سرویس', end: false },
] as const;

/** Header, content column and footer shared by every screen outside the management shell. */
export function SiteLayout() {
  const signedIn = useIsSignedIn();
  const signOut = useSignOut();

  return (
    <div className="site">
      <header className="site__header">
        <div className="site__header-inner">
          <NavLink to="/" className="site__brand-link" aria-label={brand.productName}>
            <Brand />
          </NavLink>

          <span className="spacer" />

          <nav className="site__nav" aria-label="ناوبری عمومی">
            {PUBLIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className="site__nav-link">
                {link.label}
              </NavLink>
            ))}
            {signedIn ? (
              <>
                <NavLink to="/management" className="site__nav-link">
                  {brand.managementName}
                </NavLink>
                <button type="button" className="button button--ghost" onClick={signOut}>
                  خروج
                </button>
              </>
            ) : (
              <NavLink to="/login" className="button site__nav-cta">
                ورود به پلتفرم
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="site__main">
        <Outlet />
      </main>

      <footer className="site__footer">
        <div className="site__footer-inner">
          <div className="stack stack--tight">
            <strong>{brand.productName}</strong>
            <span>{brand.tagline}</span>
          </div>
          <div className="stack stack--tight text-sm">
            <span>{brand.companyName}</span>
            <a href="/openapi/v1.json" target="_blank" rel="noreferrer">
              مستند سرویس OpenAPI
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
