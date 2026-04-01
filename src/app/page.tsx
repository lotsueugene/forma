import GridOverlay from '@/components/landing/GridOverlay';
import Navigation from '@/components/landing/Navigation';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import PricingSection from '@/components/landing/PricingSection';
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
      <Footer />
    </main>
  );
}
