import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useMeQuery } from './api/publicApi';
import PublicLayout from './components/layout/PublicLayout';
import MemberLayout from './components/layout/MemberLayout';
import AdminLayout from './components/layout/AdminLayout';
import RequireAuth from './components/layout/RequireAuth';
import { PageLoader } from './components/ui';
import Home from './pages/public/Home';

const page = (loader) => lazy(loader);

const About = page(() => import('./pages/public/About'));
const Plan = page(() => import('./pages/public/Plan'));
const Packages = page(() => import('./pages/public/Packages'));
const Contact = page(() => import('./pages/public/Contact'));
const Login = page(() => import('./pages/public/Login'));
const Register = page(() => import('./pages/public/Register'));
const ForgotPassword = page(() => import('./pages/public/ForgotPassword'));
const ResetPassword = page(() => import('./pages/public/ResetPassword'));
const NotFound = page(() => import('./pages/public/NotFound'));

const Dashboard = page(() => import('./pages/member/Dashboard'));
const Activate = page(() => import('./pages/member/Activate'));
const Kyc = page(() => import('./pages/member/Kyc'));
const Team = page(() => import('./pages/member/Team'));
const Genealogy = page(() => import('./pages/member/Genealogy'));
const Income = page(() => import('./pages/member/Income'));
const WalletPage = page(() => import('./pages/member/Wallet'));
const Withdraw = page(() => import('./pages/member/Withdraw'));
const Achievements = page(() => import('./pages/member/Achievements'));
const Referral = page(() => import('./pages/member/Referral'));
const Notifications = page(() => import('./pages/member/Notifications'));
const Profile = page(() => import('./pages/member/Profile'));

const AdminDashboard = page(() => import('./pages/admin/Dashboard'));
const Registrations = page(() => import('./pages/admin/Registrations'));
const Members = page(() => import('./pages/admin/Members'));
const MemberDetail = page(() => import('./pages/admin/MemberDetail'));
const AdminKyc = page(() => import('./pages/admin/Kyc'));
const Payments = page(() => import('./pages/admin/Payments'));
const Withdrawals = page(() => import('./pages/admin/Withdrawals'));
const Processing = page(() => import('./pages/admin/Processing'));
const RunDetail = page(() => import('./pages/admin/RunDetail'));
const NetworkPage = page(() => import('./pages/admin/Network'));
const Ledger = page(() => import('./pages/admin/Ledger'));
const Reports = page(() => import('./pages/admin/Reports'));
const AdminPackages = page(() => import('./pages/admin/Packages'));
const Settings = page(() => import('./pages/admin/Settings'));
const Audit = page(() => import('./pages/admin/Audit'));

export default function App() {
  useMeQuery(); // establishes the session on load

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="plan" element={<Plan />} />
          <Route path="packages" element={<Packages />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        <Route path="login" element={<Login />} />
        <Route path="admin/login" element={<Login admin />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        <Route path="app" element={<RequireAuth role="member" />}>
          <Route element={<MemberLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="activate" element={<Activate />} />
            <Route path="kyc" element={<Kyc />} />
            <Route path="team" element={<Team />} />
            <Route path="genealogy" element={<Genealogy />} />
            <Route path="income" element={<Income />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="withdraw" element={<Withdraw />} />
            <Route path="achievements" element={<Achievements />} />
            <Route path="referral" element={<Referral />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="admin" element={<RequireAuth role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="registrations" element={<Registrations />} />
            <Route path="members" element={<Members />} />
            <Route path="members/:id" element={<MemberDetail />} />
            <Route path="kyc" element={<AdminKyc />} />
            <Route path="payments" element={<Payments />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="processing" element={<Processing />} />
            <Route path="processing/:id" element={<RunDetail />} />
            <Route path="network" element={<NetworkPage />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="reports" element={<Reports />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit" element={<Audit />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
