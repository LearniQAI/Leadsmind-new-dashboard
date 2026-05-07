'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowRight, Zap, Shield, BarChart3, Users, Globe, MessageSquare } from 'lucide-react';
import { createCheckoutSession, getSaaSTiers } from '@/app/actions/finance';
import { toast } from 'sonner';

const LandingPage = () => {
  const [tiers, setTiers] = React.useState<any[]>([]);
  const [isAnnual, setIsAnnual] = React.useState(false);

  React.useEffect(() => {
    getSaaSTiers().then(setTiers);
  }, []);

  const handleCheckout = async (tierId: string) => {
    if (tierId === 'starter') {
      window.location.href = '/auth/signup-basic';
      return;
    }

    const res = await createCheckoutSession(tierId, isAnnual ? 'year' : 'month');
    if (res.error) {
      toast.error(res.error);
      if (res.error === 'Not authenticated') {
        window.location.href = '/auth/signin-basic';
      }
    } else if (res.url) {
      window.location.href = res.url;
    }
  };

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-[#0A0F3D] text-white font-body selection:bg-primary selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0A0F3D]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="relative w-8 h-8 bg-gradientPrimary rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
             </div>
             <span className="text-xl font-black uppercase tracking-tighter">LeadsMind</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#about" className="hover:text-white transition-colors">About</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin-basic">
              <Button variant="ghost" className="text-white hover:bg-white/5">Login</Button>
            </Link>
            <Link href="/auth/signup-basic">
              <Button className="bg-gradientPrimary hover:opacity-90 border-none px-6">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-radial from-primary/20 to-transparent opacity-50 pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div {...fadeUp}>
             <span className="inline-block py-1 px-4 rounded-full bg-white/5 border border-white/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
               New: CRM Automation 2.0
             </span>
             <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1]">
               Close More Deals. <br />
               <span className="text-transparent bg-clip-text bg-gradientPrimary">Grow Faster.</span>
             </h1>
             <p className="max-w-2xl mx-auto text-lg text-white/60 mb-10 leading-relaxed">
               LeadsMind is the all-in-one business operating system designed to bring your sales, 
               marketing, and operations into one unified, high-performance platform.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Button className="h-14 px-8 text-lg bg-gradientPrimary border-none group">
                 Start Free Trial <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </Button>
               <Button variant="outline" className="h-14 px-8 text-lg border-white/10 bg-white/5 hover:bg-white/10 text-white">
                 Watch Demo
               </Button>
             </div>
          </motion.div>

          {/* Dashboard Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-2xl shadow-2xl">
               <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-warning/10 rounded-2xl pointer-events-none" />
               <img 
                 src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070" 
                 alt="Dashboard Mockup" 
                 className="rounded-xl w-full border border-white/5 shadow-inner"
               />
            </div>
            {/* Floaties */}
            <div className="absolute -top-10 -right-10 hidden lg:block animate-bounce-slow">
               <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-4 rounded-xl shadow-xl">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                        <Users className="w-5 h-5" />
                     </div>
                     <div>
                        <div className="text-[10px] uppercase font-bold text-white/40">New Leads</div>
                        <div className="text-xl font-bold">+1,284</div>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Marquee */}
      <section className="py-20 border-y border-white/5 bg-[#0b0b1a]">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm font-bold text-white/20 uppercase tracking-[0.3em] mb-12">Trusted by fast-growing teams</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale">
            <span className="text-2xl font-black">ACME CORP</span>
            <span className="text-2xl font-black">TECHGROW</span>
            <span className="text-2xl font-black">NEXUS</span>
            <span className="text-2xl font-black">SOLARIS</span>
            <span className="text-2xl font-black">QUANTUM</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Everything you need <br />in <span className="text-primary">one system</span>.</h2>
            <p className="text-white/60 max-w-xl mx-auto text-lg">Stop jumping between 10 different tools. We consolidated your entire stack.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Smart CRM", desc: "Manage every interaction with deep intelligence and automated follow-ups.", icon: <Users className="w-6 h-6" /> },
              { title: "Visual Pipelines", desc: "Track deals through customizable stages with drag-and-drop simplicity.", icon: <BarChart3 className="w-6 h-6" /> },
              { title: "Social Inbox", desc: "Connect all your channels (WhatsApp, IG, FB) into one unified conversation stream.", icon: <MessageSquare className="w-6 h-6" /> },
              { title: "Global Reach", desc: "Built-in telephony and SMS capabilities to reach clients anywhere, anytime.", icon: <Globe className="w-6 h-6" /> },
              { title: "Bank-Grade Security", desc: "Your data is encrypted and protected by enterprise-level security protocols.", icon: <Shield className="w-6 h-6" /> },
              { title: "Instant Insights", desc: "Real-time reporting on revenue, team performance, and campaign ROI.", icon: <Zap className="w-6 h-6" /> }
            ].map((f, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }}>
                <Card className="bg-white/5 border-white/10 hover:border-primary/50 transition-colors group">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                      {f.icon}
                    </div>
                    <CardTitle className="text-xl font-bold text-white">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/60 leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-[#0b0b1a] relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Simple, transparent <span className="text-warning">pricing</span>.</h2>
            
            <div className="flex items-center justify-center gap-4 mt-8">
               <span className={`text-sm ${!isAnnual ? 'text-white' : 'text-white/40'}`}>Monthly</span>
               <button 
                 onClick={() => setIsAnnual(!isAnnual)}
                 className="w-12 h-6 rounded-full bg-white/10 relative p-1 transition-colors"
               >
                 <div className={`w-4 h-4 rounded-full bg-primary transition-transform ${isAnnual ? 'translate-x-6' : ''}`} />
               </button>
               <span className={`text-sm ${isAnnual ? 'text-white' : 'text-white/40'}`}>Annual <span className="text-success text-xs ml-1">(Save 20%)</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers.map((tier, i) => (
              <motion.div key={tier.id} {...fadeUp} transition={{ delay: i * 0.1 }}>
                <Card className={`h-full border-white/10 bg-white/5 backdrop-blur-xl flex flex-col ${tier.id === 'pro' ? 'ring-2 ring-primary border-transparent' : ''}`}>
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-white uppercase tracking-wider">{tier.name}</CardTitle>
                    <CardDescription className="text-white/40 mt-2">
                       {tier.id === 'starter' ? 'Perfect for solo entrepreneurs.' : tier.id === 'pro' ? 'For growing businesses.' : 'Scale without limits.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-4xl font-black text-white">${isAnnual ? Math.floor(tier.monthlyPrice * 0.8) : tier.monthlyPrice}</span>
                      <span className="text-white/40">/mo</span>
                    </div>
                    <ul className="space-y-4">
                      {tier.features.map((feature: string, j: number) => (
                        <li key={j} className="flex items-center gap-3 text-sm text-white/70">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button 
                      onClick={() => handleCheckout(tier.id)}
                      className={`w-full h-12 font-bold ${tier.id === 'pro' ? 'bg-gradientPrimary border-none' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                      {tier.id === 'starter' ? 'Sign Up Free' : 'Get Started'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="relative rounded-[2rem] bg-gradientPrimary p-12 md:p-24 overflow-hidden text-center">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
             </div>
             
             <motion.div {...fadeUp} className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 text-white">Ready to lead your industry?</h2>
                <p className="text-white/80 text-xl max-w-2xl mx-auto mb-12">
                   Join 5,000+ businesses using LeadsMind to automate their operations and skyrocket their growth.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                   <Button className="h-16 px-10 text-xl bg-white text-primary hover:bg-white/90 border-none font-black uppercase">
                      Start Your Free Trial
                   </Button>
                   <p className="text-white/60 text-sm">No credit card required. Cancel anytime.</p>
                </div>
             </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="relative w-6 h-6 bg-gradientPrimary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span className="text-lg font-black uppercase tracking-tighter">LeadsMind</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                Everything your business needs. <br />One system. One unified platform.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-white/40">
                <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Integrations</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Enterprise</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Solutions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-white/40">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-white/40">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Docs</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Community</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 text-xs text-white/20 font-bold uppercase tracking-widest">
            <p>© 2026 LeadsMind. All rights reserved.</p>
            <div className="flex gap-8 mt-4 md:mt-0">
               <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
               <Link href="#" className="hover:text-white transition-colors">LinkedIn</Link>
               <Link href="#" className="hover:text-white transition-colors">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
