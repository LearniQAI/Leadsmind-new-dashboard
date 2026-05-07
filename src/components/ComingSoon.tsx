'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Rocket } from 'lucide-react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import Image from 'next/image';

interface ComingSoonProps {
  title: string;
}

const ComingSoon = ({ title }: ComingSoonProps) => {
  return (
    <Wrapper>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 mb-8 relative">
           <Image 
             src="/assets/images/brand/LeadsMind Logo.png" 
             alt="LeadsMind" 
             fill
             className="object-contain animate-pulse"
           />
        </div>
        <h1 className="text-4xl font-black tracking-tighter mb-4 uppercase">{title}</h1>
        <p className="text-white/40 max-w-md mx-auto mb-8 text-lg">
          We're building something amazing. This feature is part of the LeadsMind migration and will be available soon.
        </p>
        <Link href="/dashboard">
          <Button className="bg-gradientPrimary border-none px-8 h-12 font-bold uppercase tracking-widest">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </Wrapper>
  );
};

export default ComingSoon;
