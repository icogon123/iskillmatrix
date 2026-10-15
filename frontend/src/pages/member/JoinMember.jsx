import { useState } from 'react';
import { UserRoundPlus, Lock, CheckCircle2 } from 'lucide-react';
import { useProfileQuery } from '../../api/memberApi';
import { PageHeader, Card, Button, PageLoader, ErrorState, Notice } from '../../components/ui';
import { RegisterForm, RegisteredIds } from '../public/Register';

/** Lets an activated member register a new member directly under themselves. */
export default function JoinMember() {
  const { data, isLoading, error, refetch } = useProfileQuery();
  const [done, setDone] = useState(null);
  const [formKey, setFormKey] = useState(0);
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { user } = data;

  const header = <PageHeader icon={UserRoundPlus} title="Join Member" subtitle="Register a new member directly into your team." />;

  if (!user.isPackageActive) {
    return (
      <div>
        {header}
        <Notice tone="gold" icon={Lock} title="Your ID is not activated yet"
          action={<Button to="/app/activate" variant="gold" size="sm">Buy a bundle</Button>}>
          Buy at least one course bundle to activate your ID. After that you can join and invite new members.
        </Notice>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        {header}
        <Card className="card-pad mx-auto max-w-lg text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success"><CheckCircle2 className="size-7" /></span>
          <p className="mt-4 font-semibold">Member registered</p>
          <p className="mt-1 text-sm text-muted">Share these login details with the new member. They can log in now; their ID activates once they buy a course bundle.</p>
          <RegisteredIds done={done} />
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button variant="solid" onClick={() => { setDone(null); setFormKey((k) => k + 1); }}>Join another member</Button>
            <Button to="/app/team" variant="outline">View my team</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {header}
      <RegisterForm key={formKey} fixedSponsor={{ memberId: user.memberId, fullName: user.fullName }} onDone={setDone} />
    </div>
  );
}
