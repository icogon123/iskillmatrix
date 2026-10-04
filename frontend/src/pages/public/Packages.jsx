import { usePackagesQuery } from '../../api/publicApi';
import { PageLoader } from '../../components/ui';
import { PageHero, PackageCard, CtaBand } from './sections';

export default function Packages() {
  const { data, isLoading } = usePackagesQuery();
  return (
    <>
      <PageHero kicker="One-time purchase" title="Choose your" gold="package" sub="Every package unlocks a set of trending skills and a level of the income plan. Package upgrades are not required — choose once." />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {data?.packages.map((p) => <PackageCard key={p.key} pkg={p} featured={p.key === 'pro'} />)}
          </div>
        )}
        <p className="mt-8 text-center text-xs text-subtle">
          Payment is made by scanning the company QR code after your registration is approved. Your package activates once the admin verifies the payment.
        </p>
      </section>
      <CtaBand />
    </>
  );
}
