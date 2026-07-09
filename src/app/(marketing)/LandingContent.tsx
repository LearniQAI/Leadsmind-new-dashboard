'use client';

import React from 'react';
import { toast } from 'sonner';
import { createCheckoutSession } from '@/app/actions/finance';
import './landing/landing.css';
import ScrollProgress from './landing/ScrollProgress';
import Navbar from './landing/Navbar';
import Hero from './landing/Hero';
import SocialProof from './landing/SocialProof';
import Problem from './landing/Problem';
import Solution from './landing/Solution';
import FeaturesDeepDive from './landing/FeaturesDeepDive';
import Lena from './landing/Lena';
import SouthAfrica from './landing/SouthAfrica';
import HowItWorks from './landing/HowItWorks';
import Pricing from './landing/Pricing';
import Testimonials from './landing/Testimonials';
import FAQ from './landing/FAQ';
import FinalCTA from './landing/FinalCTA';
import Footer from './landing/Footer';

const LandingContent = ({ user }: { user?: any }) => {
  const handleSelectTier = async (tierId: string, interval: 'month' | 'year') => {
    if (tierId === 'spark') {
      window.location.href = '/auth/signup-basic';
      return;
    }

    const res = await createCheckoutSession(tierId, interval);
    if (res.error) {
      toast.error(res.error);
      if (res.error === 'Not authenticated') {
        window.location.href = '/auth/signup-basic';
      }
    } else if (res.url) {
      window.location.href = res.url;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans antialiased">
      <ScrollProgress />
      <Navbar user={user} />
      <Hero />
      <SocialProof />
      <Problem />
      <Solution />
      <FeaturesDeepDive />
      <Lena />
      <SouthAfrica />
      <HowItWorks />
      <Pricing onSelectTier={handleSelectTier} />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default LandingContent;
