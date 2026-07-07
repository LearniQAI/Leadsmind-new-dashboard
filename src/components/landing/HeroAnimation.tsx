'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function HeroAnimation() {
  return (
    <div className="w-full flex justify-center items-center py-8">
      <div
        className="w-full max-w-2xl mx-auto"
        style={{
          filter: 'drop-shadow(0 20px 60px rgba(79, 70, 229, 0.15))',
        }}
      >
        <DotLottieReact
          src="https://lottie.host/3bab0acc-66c3-4b4b-ac62-96f0ccfdbef2/YNYndjRjA4.lottie"
          loop
          autoplay
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}
