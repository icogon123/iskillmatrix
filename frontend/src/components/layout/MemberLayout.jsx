import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Menu, Bell, Home, Users, IndianRupee, Wallet, MoreHorizontal, LayoutDashboard, BookCheck, ShieldCheck, Network, GraduationCap, Map as MapIcon,
  Banknote, Award, Share2, UserCog, LogOut, X, Eye, EyeOff, UserPlus, UserRoundPlus, HandCoins, ArrowLeftRight,
} from 'lucide-react';
import Logo from '../common/Logo';
import Avatar from '../common/Avatar';
import ThemeToggle from '../common/ThemeToggle';
import { selectUser } from '../../features/auth/authSlice';
import { toggleSidebar, toggleAmounts } from '../../features/ui/uiSlice';
import { useLogoutMutation } from '../../api/publicApi';
import { useNotificationsQuery } from '../../api/memberApi';
import { firstName } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';

export const MEMBER_NAV = [
  {
    group: null,
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/courses', label: 'My Courses', icon: GraduationCap },
      { to: '/app/activate', label: 'Activate Bundle', icon: BookCheck },
      { to: '/app/p2p', label: 'P2P Activation', icon: UserPlus },
    ],
  },
  {
    group: 'Wallet',
    items: [
      { to: '/app/wallet', label: 'Wallets & Ledger', icon: Wallet },
      { to: '/app/deposit', label: 'Deposit Fund', icon: HandCoins },
      { to: '/app/transfer', label: 'Transfer Fund', icon: ArrowLeftRight },
      { to: '/app/withdraw', label: 'Withdraw', icon: Banknote },
    ],
  },
  {
    group: 'Earnings & team',
    items: [
      { to: '/app/income', label: 'Income', icon: IndianRupee },
      { to: '/app/plan', label: 'Income Plan', icon: MapIcon },
      { to: '/app/achievements', label: 'Achievements', icon: Award },
      { to: '/app/team', label: 'My Team', icon: Users },
      { to: '/app/genealogy', label: 'Genealogy', icon: Network },
      { to: '/app/join', label: 'Join Member', icon: UserRoundPlus },
      { to: '/app/referral', label: 'Refer & Earn', icon: Share2 },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/app/kyc', label: 'KYC', icon: ShieldCheck },
      { to: '/app/notifications', label: 'Notifications', icon: Bell },
      { to: '/app/profile', label: 'Profile & Security', icon: UserCog },
    ],
  },
];
const NAV_ITEMS = MEMBER_NAV.flatMap((g) => g.items);

/** Label of the menu item that matches the current URL (longest match wins), for the browser tab title. */
const navLabel = (items, pathname) =>
  items.filter((n) => pathname === n.to || pathname.startsWith(`${n.to}/`)).sort((a, b) => b.to.length - a.to.length)[0]?.label;

const BOTTOM = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/team', label: 'Team', icon: Users },
  { to: '/app/income', label: 'Earning', icon: IndianRupee },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet },
];

function SideNav({ onNavigate }) {
  const user = useSelector(selectUser);
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo to="/app" />
      </div>
      <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-line bg-fg/[0.03] p-3">
        <Avatar name={user?.fullName} src={user?.avatar} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user?.fullName}</p>
          <p className="text-xs text-muted">{user?.memberId} · {user?.package?.name || 'No bundle'}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {MEMBER_NAV.map((g) => (
          <div key={g.group || 'main'}>
            {g.group && <p className="px-3 pb-1.5 text-[10px] font-bold tracking-widest text-subtle uppercase">{g.group}</p>}
            <div className="space-y-0.5">
              {g.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? 'bg-gradient-to-r from-brand-500/25 to-brand-500/5 text-fg ring-1 ring-brand-500/30' : 'text-muted hover:bg-fg/[0.04] hover:text-fg'
                    }`}>
                  <Icon className="size-[18px]" />
                  {label}
                  {to === '/app/activate' && !user?.isPackageActive && <span className="ml-auto size-2 rounded-full bg-gold-400" />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <button type="button"
          onClick={async () => { await logout(); navigate('/login'); }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-danger/10 hover:text-danger">
          <LogOut className="size-[18px]" /> Logout
        </button>
      </div>
    </div>
  );
}

export default function MemberLayout() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const open = useSelector((s) => s.ui.sidebarOpen);
  const hidden = useSelector((s) => s.ui.hideAmounts);
  const { pathname } = useLocation();
  usePageTitle(navLabel(NAV_ITEMS, pathname) || 'My account');
  const { data: notif } = useNotificationsQuery({ limit: 1 }, { pollingInterval: 60000 });

  useEffect(() => {
    dispatch(toggleSidebar(false));
    window.scrollTo(0, 0);
  }, [pathname, dispatch]);

  return (
    <div className="min-h-dvh bg-ink-950 lg:pl-72">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(60%_40%_at_70%_0%,color-mix(in_oklab,var(--color-brand-600)_16%,transparent),transparent)]" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-ink-900/90 backdrop-blur-xl lg:block">
        <SideNav />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/70" onClick={() => dispatch(toggleSidebar(false))} />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs border-r border-line bg-ink-900">
            <button type="button" className="absolute top-4 right-3 rounded-lg p-1.5 text-muted" onClick={() => dispatch(toggleSidebar(false))} aria-label="Close menu">
              <X className="size-5" />
            </button>
            <SideNav onNavigate={() => dispatch(toggleSidebar(false))} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-line/60 bg-ink-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button type="button" className="-ml-1 rounded-lg p-1.5 text-fg lg:hidden" onClick={() => dispatch(toggleSidebar(true))} aria-label="Open menu">
            <Menu className="size-6" />
          </button>
          <h2 className="flex-1 truncate text-lg font-bold">Hi, {firstName(user?.fullName)}</h2>
          <button type="button" onClick={() => dispatch(toggleAmounts())} className="rounded-xl p-2 text-muted hover:bg-fg/5 hover:text-fg"
            aria-label={hidden ? 'Show amounts' : 'Hide amounts'} title={hidden ? 'Show amounts' : 'Hide amounts'}>
            {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
          <ThemeToggle />
          <Link to="/app/notifications" className="relative rounded-xl p-2 text-fg hover:bg-fg/5" aria-label="Notifications">
            <Bell className="size-5" />
            {notif?.unread > 0 && (
              <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-ink-950">
                {notif.unread > 9 ? '9+' : notif.unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:pb-12">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {BOTTOM.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${isActive ? 'text-fg' : 'text-subtle'}`}>
              {({ isActive }) => (
                <>
                  <Icon className={`size-5 ${isActive ? 'text-brand-300' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
          <button type="button" onClick={() => dispatch(toggleSidebar(true))} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-subtle">
            <MoreHorizontal className="size-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
