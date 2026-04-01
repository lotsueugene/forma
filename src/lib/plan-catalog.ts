import { PLAN_LIMITS } from './stripe';

/** Marketing copy — keep in sync with Stripe prices you configure */
export const PRO_MONTHLY_PRICE_LABEL = '$29/mo';
export const PRO_YEARLY_TOTAL = 290;
export const PRO_YEARLY_PRICE_LABEL = `$${PRO_YEARLY_TOTAL}/yr`;
export const PRO_YEARLY_EQUIV_LABEL = '~$24/mo';
export const PRO_YEARLY_SAVINGS_LABEL = 'Save vs monthly';

export const CTA_VIEW_PLANS = 'View plans';
export const CTA_UPGRADE_PRO_MONTHLY = `Upgrade to Pro — ${PRO_MONTHLY_PRICE_LABEL}`;

function lim(n: number): string {
  return n === -1 ? 'Unlimited' : String(n);
}

function yn(v: boolean): string {
  return v ? 'Included' : '—';
}

export interface PlanComparisonRow {
  label: string;
  free: string;
  trial: string;
  pro: string;
}

export function getPlanComparisonRows(): PlanComparisonRow[] {
  const f = PLAN_LIMITS.free;
  const t = PLAN_LIMITS.trial;
  const p = PLAN_LIMITS.pro;

  return [
    {
      label: 'Submissions / month',
      free: lim(f.submissions),
      trial: lim(t.submissions),
      pro: lim(p.submissions),
    },
    {
      label: 'Forms',
      free: lim(f.forms),
      trial: lim(t.forms),
      pro: lim(p.forms),
    },
    {
      label: 'Team members (seats)',
      free: lim(f.members),
      trial: lim(t.members),
      pro: lim(p.members),
    },
    {
      label: 'Team invites & collaboration',
      free: yn(f.features.teamMembers),
      trial: yn(t.features.teamMembers),
      pro: yn(p.features.teamMembers),
    },
    {
      label: 'Analytics',
      free: yn(f.features.analytics),
      trial: yn(t.features.analytics),
      pro: yn(p.features.analytics),
    },
    {
      label: 'API access',
      free: yn(f.features.apiAccess),
      trial: yn(t.features.apiAccess),
      pro: yn(p.features.apiAccess),
    },
    {
      label: 'Custom domain',
      free: yn(f.features.customDomain),
      trial: yn(t.features.customDomain),
      pro: yn(p.features.customDomain),
    },
    {
      label: 'Webhooks',
      free: yn(f.features.webhooks),
      trial: yn(t.features.webhooks),
      pro: yn(p.features.webhooks),
    },
  ];
}
