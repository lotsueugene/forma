import GridOverlay from '@/components/landing/GridOverlay';
import Navigation from '@/components/landing/Navigation';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import PricingSection from '@/components/landing/PricingSection';
import ComparisonSection from '@/components/landing/ComparisonSection';
import Footer from '@/components/landing/Footer';

// Force dynamic rendering so Footer fetches fresh data from database
export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <main className="relative bg-background">
      <GridOverlay />
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <ComparisonSection />

      {/* Help CTA */}
      <section className="py-16 sm:py-24 bg-gray-50 text-center">
        <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-9">
          <p className="text-gray-900 font-medium text-lg mb-2">Need help?</p>
          <p className="text-gray-600 text-sm mb-6">
            Can&apos;t find what you&apos;re looking for? Reach out to our support team.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-sm font-mono text-[13px] uppercase tracking-[-0.015rem] bg-safety-orange text-white hover:bg-accent-200 transition-all duration-150"
          >
            Contact Support
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
