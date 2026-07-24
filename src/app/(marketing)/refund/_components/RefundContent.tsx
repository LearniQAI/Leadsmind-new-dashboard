import { Check } from 'lucide-react';
import '../../landing/landing.css';
import Navbar from '../../landing/Navbar';
import Footer from '../../landing/Footer';

const ROYAL = '#1359FF';

type Bullet = { label?: string; text: string };
type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: Bullet[] };

type Section = {
  title: string;
  blocks: Block[];
};

const sections: Section[] = [
  {
    title: '1. Subscription Plans',
    blocks: [
      {
        type: 'p',
        text: 'LeadsMind subscription plans are billed on a recurring basis (monthly or annually, depending on the plan you choose).',
      },
      {
        type: 'ul',
        items: [
          {
            label: 'Cancelling your subscription:',
            text: 'You may cancel your subscription at any time from your account settings, or by contacting our support team. Cancellation stops all future billing.',
          },
          {
            label: 'Access after cancellation:',
            text: 'When you cancel, you retain access to your paid features until the end of your current billing period. You will not be charged again after that period ends.',
          },
          {
            label: 'Refunds for subscription payments:',
            text: 'Subscription fees already charged for the current billing period are non-refundable, except where required by law or at our discretion in cases of billing error, duplicate charges, or service unavailability caused by us.',
          },
          {
            label: 'Free trials:',
            text: 'If your plan includes a free trial, you will not be charged until the trial period ends. You can cancel at any time during the trial with no charge.',
          },
        ],
      },
    ],
  },
  {
    title: '2. Course Purchases',
    blocks: [
      {
        type: 'p',
        text: "For individual courses or learning content purchased through LeadsMind's Learning Management System:",
      },
      {
        type: 'ul',
        items: [
          {
            label: 'Refund window:',
            text: 'You may request a full refund within 7 days of purchase, provided you have not completed more than 20% of the course content.',
          },
          {
            label: 'How to request:',
            text: 'Contact our support team with your order/invoice reference and reason for the request.',
          },
          {
            label: 'Non-refundable circumstances:',
            text: 'Refunds are not available once a course completion certificate has been issued, or after the 7-day window has passed.',
          },
        ],
      },
    ],
  },
  {
    title: '3. Bookings & Consultations',
    blocks: [
      {
        type: 'p',
        text: 'For paid bookings, consultations, or scheduled sessions made through LeadsMind:',
      },
      {
        type: 'ul',
        items: [
          {
            label: 'Cancelling a booking:',
            text: 'You may cancel or reschedule a booking up to 24 hours before the scheduled time for a full refund or free rescheduling.',
          },
          {
            label: 'Late cancellations:',
            text: 'Cancellations made less than 24 hours before the scheduled time may not be eligible for a refund, at the discretion of the service provider.',
          },
          {
            label: 'No-shows:',
            text: 'If you do not attend a scheduled session without prior cancellation, the booking fee is non-refundable.',
          },
        ],
      },
    ],
  },
  {
    title: '4. How to Request a Refund',
    blocks: [
      {
        type: 'p',
        text: 'To request a refund under any of the above, please contact us with:',
      },
      {
        type: 'ul',
        items: [
          { text: 'Your name and the email address used for the purchase' },
          { text: 'The transaction/invoice reference number' },
          { text: 'The reason for your refund request' },
        ],
      },
      { type: 'p', text: 'Email: support@leadsmind.io' },
      {
        type: 'p',
        text: 'We aim to respond to all refund requests within 3 business days. Approved refunds are processed back to your original payment method and may take 3-10 business days to reflect in your account, depending on your bank or card issuer.',
      },
    ],
  },
  {
    title: '5. Payment Processing',
    blocks: [
      {
        type: 'p',
        text: 'Payments on LeadsMind are processed securely through our payment partners. Processing/transaction fees charged by our payment provider for completing a transaction are non-refundable, as this reflects a service already rendered at the time of payment.',
      },
    ],
  },
  {
    title: '6. Changes to This Policy',
    blocks: [
      {
        type: 'p',
        text: 'We may update this policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of LeadsMind after a change constitutes acceptance of the revised policy.',
      },
    ],
  },
  {
    title: '7. Contact Us',
    blocks: [
      {
        type: 'p',
        text: 'If you have any questions about this policy, please reach out to:',
      },
      { type: 'p', text: 'LeadsMind (Pty) Ltd\nEmail: support@leadsmind.io' },
    ],
  },
];

export default function RefundContent({ user }: { user?: any }) {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar user={user} />

      {/* HERO */}
      <section
        className="relative overflow-hidden pt-[140px] pb-14 md:pt-[168px] md:pb-16"
        style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${ROYAL}12 100%)` }}
      >
        <div className="absolute inset-0 lm-dot-grid-light opacity-60 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10 max-w-3xl">
          <div className="text-xs font-bold uppercase tracking-[0.25em] mb-5" style={{ color: ROYAL }}>
            Legal
          </div>
          <p className="text-sm !text-[#94A3B8] mb-3">Last updated: July 2026</p>
          <h1 className="text-[clamp(30px,4.5vw,44px)] font-extrabold !text-[#0F172A] leading-tight tracking-tight mb-6">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-base !text-[#64748B] leading-relaxed max-w-2xl">
            This policy explains how refunds and cancellations work for LeadsMind (Pty) Ltd (&ldquo;LeadsMind&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;), covering our subscription plans, one-time course purchases, and paid
            booking/consultation services.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-6 max-w-3xl space-y-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg md:text-xl font-bold !text-[#0F172A] mb-4">{section.title}</h2>
              {section.blocks.map((block, i) => {
                if (block.type === 'p') {
                  return (
                    <p
                      key={i}
                      className="text-[15px] !text-[#64748B] leading-relaxed mb-4 whitespace-pre-line"
                    >
                      {block.text}
                    </p>
                  );
                }
                return (
                  <ul key={i} className="space-y-3 mb-4">
                    {block.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check className="w-4 h-4 mt-1 shrink-0" style={{ color: ROYAL }} />
                        <span className="text-[15px] !text-[#64748B] leading-relaxed">
                          {item.label && (
                            <span className="font-semibold !text-[#0F172A]">{item.label} </span>
                          )}
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
