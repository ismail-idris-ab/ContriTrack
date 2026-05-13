import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import PricingSection from '../components/landing/PricingSection';
import FAQSection from '../components/landing/FAQSection';
import SchedulesSection from '../components/landing/SchedulesSection';
import FinalCTASection from '../components/landing/FinalCTASection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  useDocumentTitle('ROTARA — Ajo & Savings Circle Manager for Nigeria');
  const navigate = useNavigate();
  const { user } = useAuth();

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div>
      <LandingNavbar scrollTo={scrollTo} />
      <HeroSection navigate={navigate} scrollTo={scrollTo} user={user} />
      <HowItWorksSection />
      <SchedulesSection />
      <FeaturesSection navigate={navigate} user={user} />
      <TestimonialsSection />
      <PricingSection navigate={navigate} />
      <FAQSection />
      <FinalCTASection navigate={navigate} />
      <LandingFooter navigate={navigate} scrollTo={scrollTo} />
    </div>
  );
}
