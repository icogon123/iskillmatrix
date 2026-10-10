import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Menu, X, LayoutDashboard, UserPlus, Users, ShieldCheck, QrCode, Banknote, Cog, Network, BookOpen, FileBarChart, GraduationCap, Package,
  Settings, ScrollText, LogOut, KeyRound, HandCoins,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../common/Logo';
import Avatar from '../common/Avatar';
import ThemeToggle from '../common/ThemeToggle';
import { selectUser } from '../../features/auth/authSlice';
import { toggleSidebar } from '../../features/ui/uiSlice';
import { useLogoutMutation, useChangePasswordMutation } from '../../api/publicApi';
import { errorMessage } from '../../app/api';
import { Modal, Button } from '../ui';
import PasswordInput from '../common/PasswordInput';
import { useAdminDashboardQuery } from '../../api/adminApi';
import { usePageTitle } from '../../lib/usePageTitle';

const NAV = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    group: 'Approvals',
    items: [
      { to: '/admin/registrations', label: 'Registrations', icon: UserPlus, count: 'pendingRegistrations' },
      { to: '/admin/payments', label: 'Payment Verification', icon: QrCode, count: 'pendingPayments' },
      { to: '/admin/deposits', label: 'Fund Deposits', icon: HandCoins, count: 'pendingDeposits' },
      { to: '/admin/kyc', label: 'KYC Approvals', icon: ShieldCheck, count: 'pendingKyc' },
      { to: '/admin/withdrawals', label: 'Withdrawals', icon: Banknote, count: 'pendingWithdrawals' },
    ],
  },
  {
    group: 'Network & Income',
    items: [
      { to: '/admin/members', label: 'Members', icon: Users },
      { to: '/admin/network', label: 'Network Tree', icon: Network },
      { to: '/admin/processing', label: 'Income Processing', icon: Cog },
      { to: '/admin/ledger', label: 'Financial Ledger', icon: BookOpen },
      { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { to: '/admin/courses', label: 'Course Catalog', icon: GraduationCap },
      { to: '/admin/bundles', label: 'Bundles & Income', icon: Package },
      { to: '/admin/settings', label: 'System Settings', icon: Settings },
      { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
];

/** Label of the menu item that matches the current URL (longest match wins), for the browser tab title. */
const navLabel = (items, pathname) =>
  items.filter((n) => pathname === n.to || pathname.startsWith(`${n.to}/`)).sort((a, b) => b.to.length - a.to.length)[0]?.label;

function ChangePasswordModal({ open, onClose }) {
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [change, { isLoading }] = useChangePasswordMutation();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const close = () => { setForm(empty); onClose(); };
  const submit = async (e) => {
    e.preventDefault();
    try {
      await change(form).unwrap();
      toast.success('Password changed');
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <Modal open={open} onClose={close} size="sm" title="Change admin password" subtitle="8+ characters with a letter, a number and a symbol">
      <form onSubmit={submit} className="space-y-3">
        <PasswordInput label="Current password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} required />
        <PasswordInput label="New password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} required />
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button type="submit" loading={isLoading}>Update password</Button>
        </div>
      </form>
    </Modal>
  );
}

function SideNav({ onNavigate }) {
  const user = useSelector(selectUser);
  const { data } = useAdminDashboardQuery(undefined, { pollingInterval: 60000 });
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <div className="flex h-16 items-center gap-2 px-5">
        <Logo to="/admin" />
        <span className="rounded-md bg-gold-400/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-400">ADMIN</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 pb-1.5 text-[10px] font-bold tracking-widest text-subtle uppercase">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map(({ to, label, icon: Icon, end, count }) => (
                <NavLink key={to} to={to} end={end} onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-gradient-to-r from-brand-500/25 to-brand-500/5 text-fg ring-1 ring-brand-500/30' : 'text-muted hover:bg-fg/[0.04] hover:text-fg'
                    }`}>
                  <Icon className="size-[18px]" />
                  <span className="flex-1">{label}</span>
                  {count && data?.queues?.[count] > 0 && (
                    <span className="rounded-full bg-gold-400 px-1.5 py-px text-[10px] font-bold text-ink-950">{data.queues[count]}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t border-line p-4">
        <Avatar name={user?.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.fullName}</p>
          <p className="text-xs text-muted">@{user?.username}</p>
        </div>
        <ThemeToggle className="rounded-lg p-2" iconClassName="size-4" />
        <button type="button" title="Change password" aria-label="Change password" onClick={() => setPwOpen(true)}
          className="rounded-lg p-2 text-muted hover:bg-fg/5 hover:text-fg">
          <KeyRound className="size-4" />
        </button>
        <button type="button" title="Logout" aria-label="Logout"
          onClick={async () => { await logout(); navigate('/admin/login'); }}
          className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger">
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.sidebarOpen);
  const { pathname } = useLocation();
  usePageTitle(`${navLabel(NAV.flatMap((g) => g.items), pathname) || 'Admin'} · Admin`);

  useEffect(() => {
    dispatch(toggleSidebar(false));
  }, [pathname, dispatch]);

  return (
    <div className="min-h-dvh bg-ink-950 lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-ink-900/90 lg:block">
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
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-ink-950/80 px-4 backdrop-blur-xl lg:hidden">
        <button type="button" className="rounded-lg p-1.5" onClick={() => dispatch(toggleSidebar(true))} aria-label="Open menu">
          <Menu className="size-6" />
        </button>
        <Logo to="/admin" />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
