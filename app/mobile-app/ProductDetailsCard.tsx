import type { ReactNode } from 'react';
import type { FormState } from '../InputFlow';
import { jurisdictionCountryName } from '../InputFlow';
import { US_STATES } from '../../lib/usTierRules';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">{label}</div>
      <div className="font-semibold text-sm leading-snug break-words">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pt-3 first:pt-0">
      <h4 className="font-display font-bold text-xs text-tc-navy mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
}

const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`;
const money = (n: number) => `$${n.toFixed(2)}`;

export default function ProductDetailsCard({
  form,
  title,
  categoryName,
}: {
  form: FormState;
  title: string;
  categoryName: string;
}) {
  const price = Number(form.productPrice) || 0;
  const stateName = US_STATES.find((s) => s.state_code === form.usState)?.state_name;
  const countryName = jurisdictionCountryName(form.jurisdiction);
  const hasImpliedRights = form.jurisdiction !== 'other';

  return (
    <div className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-tc-border">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-display font-bold text-lg leading-tight pr-2">{title}</h3>
        <span className="font-numeric font-bold text-tc-lime-dark text-xl">${price.toFixed(0)}</span>
      </div>

      <div className="divide-y divide-tc-border">
        <div className="pb-4">
          <Section title="What you bought">
            <Field label="Product type" value={categoryName} />
            <Field label="Price paid" value={money(price)} />
            <Field label="Keeping it for" value={years(form.ownershipYears)} />
            <Field label="Manufacturer warranty" value={years(form.mfrYears)} />
          </Section>
        </div>

        <div className="py-4">
          <Section title="Your consumer rights">
            <Field label="Country" value={countryName} />
            {stateName && <Field label="State" value={stateName} />}
            {hasImpliedRights && (
              <Field label="Avoiding hassle is worth" value={money(form.frictionCost)} />
            )}
          </Section>
        </div>

        <div className="py-4">
          <Section title="Card protection">
            <Field
              label="Extra cover"
              value={form.ccExtensionMonths > 0 ? `${form.ccExtensionMonths} months` : 'None'}
            />
            <Field label="Card excess" value={money(form.ccExcess)} />
            <Field
              label="Purchase protection"
              value={form.purchaseProtectionDays > 0 ? `${form.purchaseProtectionDays} days` : 'None'}
            />
          </Section>
        </div>

        <div className="pt-4">
          <Section title="Paid warranty offer">
            <Field label="Cover length" value={years(form.extendedWarrantyYears)} />
            <Field
              label="Warranty price"
              value={form.quotedPremium === '' ? 'Not entered' : money(Number(form.quotedPremium))}
            />
            <Field
              label="Accidental damage"
              value={form.includesAccidental ? `Yes, ${money(form.quotedExcess)} excess` : 'No'}
            />
            {hasImpliedRights && (
              <Field label="Days overseas per year" value={`${form.daysOutsideAustralia} days`} />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
