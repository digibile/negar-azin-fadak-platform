import { NavLink } from 'react-router-dom';
import { State } from '../../components/State';
import { entriesOf, isLinkable, type MenuEntry } from '../navigation/menu';
import type { Call } from '../../lib/usePlatformCall';
import type { EffectiveMenuTree } from '../../lib/http/platform';

/**
 * The central management menu, as the platform publishes it.
 *
 * Every link here comes from `GET /api/v1/menu/tree`. The platform has already applied the caller's
 * permissions and withheld anything withdrawn, so this component renders what it is given and decides
 * nothing about visibility. That is the whole point of reading navigation from the server: a list compiled
 * into the bundle can only agree with the platform on the day it was written, and it fails in the direction
 * that hurts — it keeps offering sections the operator's roles no longer open.
 *
 * When the platform has no menu to give, the component says so. Substituting a built-in list of links would
 * put a second, ungoverned navigation in front of the operator, and it would be the one that keeps working
 * after the real menu is withdrawn.
 */
export function ManagementMenu({ call, onNavigate }: { call: Call<EffectiveMenuTree>; onNavigate: () => void }) {
  if (call.state.status === 'loading') {
    return (
      <div className="shell__nav-group" aria-busy="true">
        <p className="shell__group-label">در حال خواندن منو</p>
      </div>
    );
  }

  if (call.state.status === 'failed') {
    const { failure } = call.state;
    return (
      <div className="shell__nav-group">
        <p className="shell__group-label">منو در دسترس نیست</p>
        <State tone={failure.tone} title={failure.title} body={failure.body} meta={failure.meta} />
      </div>
    );
  }

  const { menus, sectionCount } = call.state.value;
  const navigable = menus.filter((menu) => entriesOf(menu).length > 0);

  if (navigable.length === 0 || sectionCount === 0) {
    return (
      <div className="shell__nav-group">
        <p className="shell__group-label">منو</p>
        <State
          tone="empty"
          title="منویی برای این نشست وجود ندارد"
          body="پلتفرم برای سطحی که در آن هستید منویی منتشر نکرده است. تا زمانی که منوی پایه منتشر نشود، بخش‌هایی که مجاز به آن‌ها هستید در نوار کناری نمایش داده نمی‌شوند."
        />
      </div>
    );
  }

  return (
    <>
      {navigable.map((menu) => (
        <div className="shell__nav-group" key={menu.id}>
          <p className="shell__group-label">{menu.title}</p>
          <nav className="shell__nav">
            {entriesOf(menu).map((entry) => (
              <MenuLink entry={entry} key={entry.node.id} onNavigate={onNavigate} />
            ))}
          </nav>
        </div>
      ))}
    </>
  );
}

/**
 * One section, as a link when it opens something and as a heading when it does not.
 *
 * A grouping section keeps its children, so it is rendered as a non-interactive row rather than dropped: an
 * operator who arranged their menu into groups would otherwise see a flat list and conclude the structure was
 * lost.
 */
function MenuLink({ entry, onNavigate }: { entry: MenuEntry; onNavigate: () => void }) {
  const { node, to } = entry;
  const indent = { paddingInlineStart: `${1 + entry.depth * 0.75}rem` };

  if (!isLinkable(node) || to === null) {
    return (
      <p className="shell__nav-heading" style={indent}>
        {node.title}
      </p>
    );
  }

  return (
    <NavLink to={to} className="shell__nav-link" style={indent} onClick={onNavigate}>
      {node.title}
    </NavLink>
  );
}
