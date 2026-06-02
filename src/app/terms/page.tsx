import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — LeadsMind',
  description: 'LeadsMind Terms of Service',
}

export default function TermsPage() {
  return (
    <div style={{
      backgroundColor: '#04091a',
      minHeight: '100vh',
      fontFamily: "'DM Sans', sans-serif",
      color: '#eef2ff',
    }}>

      {/* Same header as privacy policy */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '20px',
          fontWeight: 700,
          color: '#eef2ff',
        }}>
          LEADS<span style={{ color: '#3b82f6' }}>MIND</span>
        </span>
        <Link href="/" style={{
          color: '#94a3c8',
          fontSize: '13px',
          textDecoration: 'none',
        }}>
          ← Back to LeadsMind
        </Link>
      </div>

      <div style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '60px 40px',
      }}>
        <p style={{ color: '#4a5a82', fontSize: '12px', marginBottom: '8px' }}>
          Last updated: June 2026
        </p>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '36px',
          fontWeight: 700,
          marginBottom: '8px',
          color: '#eef2ff',
        }}>
          Terms of Service
        </h1>
        <p style={{ color: '#94a3c8', fontSize: '15px', marginBottom: '48px' }}>
          LeadsMind Operating System — leadsmind.io
        </p>

        {[
          {
            title: '1. Acceptance of Terms',
            content: `By accessing and using LeadsMind ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. These terms apply to all users, administrators, and anyone who accesses or uses the LeadsMind platform.`
          },
          {
            title: '2. Description of Service',
            content: `LeadsMind is a business operating system that provides CRM, unified inbox, email marketing, invoicing, course management, reputation management, and AI-powered business tools. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.`
          },
          {
            title: '3. Account Registration',
            content: `To use LeadsMind, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.`
          },
          {
            title: '4. Acceptable Use',
            content: `You agree not to use LeadsMind to send spam or unsolicited communications; violate any applicable laws or regulations; infringe on intellectual property rights; transmit harmful, offensive, or illegal content; attempt to gain unauthorized access to our systems; or use the platform in any way that could damage, disable, or impair our services.`
          },
          {
            title: '5. Meta Platform Integration',
            content: `When using LeadsMind's Meta integrations (Facebook, Instagram, WhatsApp), you agree to comply with Meta's Terms of Service and Platform Policies in addition to these terms. You are responsible for ensuring your use of Meta platform data through LeadsMind complies with all applicable Meta policies and guidelines.`
          },
          {
            title: '6. Payment and Billing',
            content: `LeadsMind operates on a subscription basis. By subscribing, you authorize us to charge your payment method on a recurring basis. All fees are non-refundable unless otherwise stated. We reserve the right to change our pricing with 30 days notice. Failure to pay may result in suspension or termination of your account.`
          },
          {
            title: '7. Data Ownership',
            content: `You retain ownership of all data you input into LeadsMind, including contacts, messages, invoices, and course content. By using our platform, you grant us a limited license to store and process your data solely to provide our services. We do not claim ownership of your data.`
          },
          {
            title: '8. Intellectual Property',
            content: `The LeadsMind platform, including its design, features, and underlying technology, is owned by LeadsMind and protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of our platform without our explicit written permission.`
          },
          {
            title: '9. Limitation of Liability',
            content: `LeadsMind shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability to you for any claims arising from these terms or your use of the platform shall not exceed the amount you paid us in the 12 months preceding the claim.`
          },
          {
            title: '10. Termination',
            content: `We reserve the right to suspend or terminate your account at any time for violation of these terms. You may terminate your account at any time by contacting support@leadsmind.io. Upon termination, your right to use the platform ceases immediately. We may retain certain data as required by law.`
          },
          {
            title: '11. Governing Law',
            content: `These Terms of Service shall be governed by and construed in accordance with the laws of South Africa. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the South African courts.`
          },
          {
            title: '12. Contact',
            content: `For questions about these Terms of Service, contact us at:\n\nLeadsMind\nEmail: legal@leadsmind.io\nWebsite: https://leadsmind.io`
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '18px',
              fontWeight: 600,
              color: '#eef2ff',
              marginBottom: '12px',
            }}>
              {section.title}
            </h2>
            <p style={{
              color: '#94a3c8',
              fontSize: '14px',
              lineHeight: '1.8',
              whiteSpace: 'pre-line',
            }}>
              {section.content}
            </p>
          </div>
        ))}

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '32px',
          marginTop: '48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#4a5a82', fontSize: '12px' }}>
            © 2026 LeadsMind. All rights reserved.
          </span>
          <Link href="/privacy-policy" style={{
            color: '#3b82f6',
            fontSize: '13px',
            textDecoration: 'none',
          }}>
            ← Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
