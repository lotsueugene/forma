import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPricingPlans = [
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Perfect for side projects and personal use',
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: 'Lightning',
    popular: false,
    ctaText: 'Start Free',
    ctaLink: null,
    features: JSON.stringify([
      { text: '3 forms', included: true },
      { text: '100 submissions/month', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Community support', included: true },
      { text: 'Webhooks', included: false },
      { text: 'Custom branding', included: false },
      { text: 'Team members', included: false },
    ]),
    sortOrder: 0,
    active: true,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For growing teams and businesses',
    monthlyPrice: 15,
    yearlyPrice: 12.50,
    icon: 'Crown',
    popular: true,
    ctaText: 'Start Trial',
    ctaLink: null,
    features: JSON.stringify([
      { text: 'Unlimited forms', included: true },
      { text: '10,000 submissions/month', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Webhooks & integrations', included: true },
      { text: 'Custom branding', included: true },
      { text: '5 team members', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: true },
    ]),
    sortOrder: 1,
    active: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For large organizations with custom needs',
    monthlyPrice: null,
    yearlyPrice: null,
    icon: 'Buildings',
    popular: false,
    ctaText: 'Contact Sales',
    ctaLink: '/contact',
    features: JSON.stringify([
      { text: 'Everything in Pro', included: true },
      { text: 'Unlimited submissions', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'HIPAA compliance', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'SLA guarantee', included: true },
      { text: 'Custom integrations', included: true },
    ]),
    sortOrder: 2,
    active: true,
  },
];

async function main() {
  console.log('Seeding database...');

  // Seed pricing plans
  for (const plan of defaultPricingPlans) {
    const existing = await prisma.pricingPlan.findUnique({
      where: { slug: plan.slug },
    });

    if (!existing) {
      await prisma.pricingPlan.create({ data: plan });
      console.log(`Created pricing plan: ${plan.name}`);
    } else {
      console.log(`Pricing plan already exists: ${plan.name}`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
