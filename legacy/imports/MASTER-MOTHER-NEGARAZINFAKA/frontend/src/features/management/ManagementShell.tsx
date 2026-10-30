import { useCallback, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { StatusChip } from '../../components/StatusChip';
import { ManagementMenu } from './ManagementMenu';
import { titleForRoute } from '../navigation/menu';
import { brand } from '../../lib/brand';
import { usePlatformCall } from '../../lib/usePlatformCall';
import { platformApi } from '../../lib/http/platform';
import { useIsSignedIn, useSignOut } from '../../lib/useSession';

/**
 * The management shell.
 *
 * Navigation is whatever the platform publishes for this session, read from `/api/v1/menu/tree`. The module
 * cards in `features/catalog` answer a different question — how much of each screen the running host serves —
 * and are reported on the public modules page; they are not a second navigation, because a client that keeps
 * its own copy of the menu will keep offering sections the platform has withdrawn or the caller's roles have
 * lost.
 *
 * When there is no session the shell says so rather than listing what a hypothetical role would see.
 */
export function ManagementShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const signedIn = useIsSignedIn();
  const signOut = useSignOut();
  const principal = usePlatformCall((signal) => platformApi.me(signal), [signedIn]);
  const menu = usePlatformCall(
    (signal) => platformApi.menuTree(signal),
    [signedIn],
  );

  const closeSidebar = useCallback(() => {
    setOpen(false);
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
    closeSidebar();
  }, [closeSidebar, signOut]);

  const currentTitle =
    menu.state.status === 'ready'
      ? titleForRoute(menu.state.value.menus, location.pathname, brand.managementName)
      : brand.managementName;

  return (
    <div className="shell">
      {open && (
        <button type="button" className="shell__scrim" aria-label="بستن نوار کناری" onClick={closeSidebar} />
      )}

      <aside className="shell__sidebar" data-open={open}>
        <NavLink to="/" className="shell__brand" aria-label={brand.productName}>
          <Brand tone="inverse" />
        </NavLink>

        <ManagementMenu call={menu} onNavigate={closeSidebar} />

        <span className="spacer" />

        <nav className="shell__nav">
          <NavLink to="/" className="shell__nav-link shell__nav-link--external">
            بازگشت به سایت عمومی
          </NavLink>
          <button type="button" className="shell__nav-link" onClick={handleSignOut} disabled={!signedIn}>
            خروج از حساب
          </button>
        </nav>
      </aside>

      <div className="shell__main">
        <header className="shell__topbar">
          <button
            type="button"
            className="button button--secondary shell__toggle"
            onClick={() => {
              setOpen((value) => !value);
            }}
          >
            نوار کناری
          </button>
          <div className="shell__topbar-titles">
            <span className="shell__topbar-title">{currentTitle}</span>
            <span className="shell__topbar-sub">{brand.managementName}</span>
          </div>

          <div className="cluster cluster--tight">
            <SessionChip state={principal.state.status} signedIn={signedIn} />
            <NavLink to="/status" className="button button--ghost">
              وضعیت سرویس
            </NavLink>
            <NavLink to="/" className="button button--secondary">
              سایت عمومی
            </NavLink>
          </div>
        </header>

        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * The session indicator.
 *
 * It reports what the platform said, not what the client assumed: an anonymous tab reads as anonymous even
 * when it holds a token, because a token the service rejects is worth less than no token at all.
 */
function SessionChip({ state, signedIn }: { state: string; signedIn: boolean }) {
  if (!signedIn) {
    return <StatusChip label="بدون نشست" tone="caution" dot />;
  }

  if (state === 'loading') {
    return <StatusChip label="در حال بررسی نشست" tone="neutral" dot />;
  }

  if (state === 'failed') {
    return <StatusChip label="نشست معتبر نیست" tone="critical" dot />;
  }

  return <StatusChip label="نشست برقرار" tone="positive" dot />;
}
