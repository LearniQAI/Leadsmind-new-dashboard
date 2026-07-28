import React from 'react';

const ITEMS = [
  'Built for African business',
  'Fair, local pricing',
  'Compliance-minded by design',
  'Support that speaks your language',
];

/** Small trust-indicator row shown directly below a Solutions module page hero. */
export default function TrustStrip() {
  return (
    <div className="border-t border-b border-[#E2E8F0] bg-[#FAFBFF] py-4">
      <div className="container mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] font-semibold !text-[#64748B] text-center">
        {ITEMS.map((item, i) => (
          <React.Fragment key={item}>
            {i > 0 && <span className="hidden sm:inline !text-[#CBD5E1]">&middot;</span>}
            <span>{item}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
