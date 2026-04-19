import './landing.css';
import Navigation from '@/components/landing/Navigation';
import HeroSection from '@/components/landing/HeroSection';
import MarqueeSection from '@/components/landing/MarqueeSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import PricingSection from '@/components/landing/PricingSection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import Footer from '@/components/landing/Footer';

// Force dynamic rendering so Footer fetches fresh data from database
export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <main style={{ background: '#ffffff', color: '#0a0a0a' }}>
      <Navigation />
      <HeroSection />
      <MarqueeSection />
      <FeaturesSection />
      <PricingSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}
