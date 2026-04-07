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
      <section className="py-12 bg-gray-50 text-center">
        <p className="text-gray-600 mb-2">Need help?</p>
        <p className="text-sm text-gray-500 mb-4">Can&apos;t find what you&apos;re looking for? Reach out to our support team.</p>
        <a href="/contact" className="btn btn-secondary">Contact Support</a>
      </section>

      <Footer />
    </main>
  );
}
