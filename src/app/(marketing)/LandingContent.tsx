'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowRight, Zap, Shield, BarChart3, Users, Globe, MessageSquare, Play, Sparkles, Layers, Target } from 'lucide-react';
import { createCheckoutSession, getSaaSTiers } from '@/app/actions/finance';
import { toast } from 'sonner';

const LandingContent = ({ user }: { user?: any }) => {
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
    window.location.href = '/auth/signup-basic';
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
     <div className="flex items-center gap-3">
       <Link href="/" className="relative h-10 px-4 bg-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform overflow-hidden">
        <Image 
         src="/assets/images/brand/LeadsMind_Logo.png.png" 
         alt="LeadsMind" 
         width={140}
         height={35}
         className="object-contain"
         priority
        />
       </Link>
     </div>
     <div className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-white/60">
      <Link href="#features" className="hover:text-white transition-colors">Features</Link>
      <Link href="#solutions" className="hover:text-white transition-colors">Solutions</Link>
      <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
     </div>
     <div className="flex items-center gap-4">
      {user ? (
       <Link href="/dashboard">
        <Button className="bg-primary hover:bg-primary/90 border-none px-6 text-xs font-black uppercase tracking-widest h-10 shadow-lg shadow-primary/20">Dashboard</Button>
       </Link>
      ) : (
       <>
        <Link href="/auth/signin-basic">
         <Button variant="ghost" className="text-white hover:bg-white/5 text-xs font-bold uppercase tracking-widest">Login</Button>
        </Link>
        <Link href="/auth/signup-basic">
         <Button className="bg-primary hover:bg-primary/90 border-none px-6 text-xs font-black uppercase tracking-widest h-10 shadow-lg shadow-primary/20">Get Started</Button>
        </Link>
       </>
      )}
     </div>
    </div>
   </nav>

   {/* Hero Section */}
   <section className="relative pt-40 pb-20 overflow-hidden">
    {/* Animated Background Elements */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-primary/20 via-transparent to-transparent opacity-50 pointer-events-none" />
    <div className="absolute top-1/4 -left-20 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
    <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
    
    <div className="container mx-auto px-6 relative z-10 text-center">
     <motion.div {...fadeUp}>
       <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-8">
        <Sparkles className="w-3 h-3" />
        The Future of Business Operating Systems
       </div>
       <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] uppercase">
        Scale Your <br />
        <span className="text-transparent bg-clip-text bg-gradientPrimary">Dominance.</span>
       </h1>
       <p className="max-w-2xl mx-auto text-xl text-white/50 mb-12 leading-relaxed font-medium">
        LeadsMind isn't just a CRM. It's an intelligent ecosystem that automates your growth, 
        unifies your team, and turns leads into loyal advocates.
       </p>
       <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <Link href="/auth/signup-basic">
         <Button className="h-16 px-10 text-lg bg-primary hover:bg-primary/90 border-none group shadow-2xl shadow-primary/30 font-black uppercase tracking-widest">
          Claim Your Free Trial <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
         </Button>
        </Link>
        <button 
         onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}
         className="flex items-center gap-3 text-white/80 hover:text-white transition-colors group"
        >
         <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
           <Play className="w-5 h-5 fill-current ml-1" />
         </div>
         <span className="font-bold uppercase tracking-widest text-sm">See it in action</span>
        </button>
       </div>
     </motion.div>

     {/* Luxury Dashboard Showcase */}
     <motion.div 
      id="showcase"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
      className="mt-24 relative max-w-6xl mx-auto px-4"
     >
      <div className="relative rounded-[2.5rem] border border-white/10 bg-[#0b0b1a]/50 p-3 backdrop-blur-3xl shadow-[0_0_100px_rgba(19,89,255,0.15)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-warning/10 rounded-[2.5rem] pointer-events-none opacity-50" />
        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-[#0A0F3D] to-transparent z-10" />
        <img 
         src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426" 
         alt="LeadsMind Intelligence Hub" 
         className="rounded-[2rem] w-full border border-white/5 shadow-inner scale-[1.01]"
        />
      </div>
      
      {/* Dynamic UI Floaties */}
      <div className="absolute -top-12 -right-12 hidden lg:block animate-float">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-2xl">
         <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success/40 to-success/10 flex items-center justify-center text-success border border-success/20">
            <Users className="w-7 h-7" />
           </div>
           <div>
            <div className="text-xs uppercase font-black tracking-widest text-white/40 mb-1">Active Leads</div>
            <div className="text-3xl font-black tabular-nums">24,582</div>
           </div>
         </div>
        </div>
      </div>
      
      <div className="absolute -bottom-8 -left-12 hidden lg:block animate-float-delayed">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-2xl">
         <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <BarChart3 className="w-7 h-7" />
           </div>
           <div>
            <div className="text-xs uppercase font-black tracking-widest text-white/40 mb-1">Conversion Rate</div>
            <div className="text-3xl font-black tabular-nums">14.8%</div>
           </div>
         </div>
        </div>
      </div>
     </motion.div>
    </div>
   </section>

   {/* Social Proof */}
   <section id="solutions" className="py-24 border-y border-white/5 bg-[#0b0b1a]/50">
    <div className="container mx-auto px-6">
     <p className="text-center text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-16">Powering the world's most aggressive teams</p>
     <div className="flex flex-wrap justify-center items-center gap-16 md:gap-32 opacity-20 grayscale hover:opacity-50 transition-opacity duration-700">
      <span className="text-3xl font-black tracking-tighter">VANGUARD</span>
      <span className="text-3xl font-black tracking-widest">NEXUS.AI</span>
      <span className="text-3xl font-black uppercase">Titan Group</span>
      <span className="text-3xl font-black lowercase tracking-tighter">velocity.</span>
      <span className="text-3xl font-black uppercase tracking-[0.2em]">Oracle</span>
     </div>
    </div>
   </section>

   {/* Feature Section with Bento Layout */}
   <section id="features" className="py-40">
    <div className="container mx-auto px-6">
     <div className="max-w-3xl mb-24">
      <div className="text-primary font-black uppercase tracking-[0.3em] text-xs mb-6 flex items-center gap-3">
        <div className="w-10 h-[2px] bg-primary" />
        Unrivaled Capabilities
      </div>
      <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-8 leading-[1.1] uppercase">
       The Only Operating <br />System You'll <span className="text-primary">Ever Need</span>.
      </h2>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Large Feature */}
      <div className="md:col-span-8 group">
        <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 hover:border-primary/50 transition-all duration-500 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-primary/20 transition-all" />
         <div className="relative z-10 h-full flex flex-col">
           <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-8 border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-500">
            <MessageSquare className="w-8 h-8" />
           </div>
           <h3 className="text-3xl font-black mb-6 uppercase">Universal Social Inbox</h3>
           <p className="text-white/40 text-lg leading-relaxed max-w-md mb-8">
            Centralize every conversation from WhatsApp, Instagram, Facebook, and Email into a single, lightning-fast interface. Never miss a lead again.
           </p>
           <div className="mt-auto pt-8 border-t border-white/5 flex gap-4">
            <div className="py-2 px-4 rounded-full bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest border border-white/10">WhatsApp</div>
            <div className="py-2 px-4 rounded-full bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest border border-white/10">Instagram</div>
            <div className="py-2 px-4 rounded-full bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest border border-white/10">SMS</div>
           </div>
         </div>
        </div>
      </div>

      {/* Small Feature */}
      <div className="md:col-span-4 group">
        <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 hover:border-warning/50 transition-all duration-500 relative overflow-hidden">
         <div className="relative z-10">
           <div className="w-16 h-16 rounded-2xl bg-warning/20 flex items-center justify-center text-warning mb-8 border border-warning/20 group-hover:bg-warning group-hover:text-white transition-all duration-500">
            <Zap className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-black mb-4 uppercase">AI Automations</h3>
           <p className="text-white/40 leading-relaxed">
            Deploy autonomous agents that qualify leads, book appointments, and follow up 24/7 while you sleep.
           </p>
         </div>
        </div>
      </div>

      {/* Grid Features */}
      {[
       { title: "Visual CRM", icon: <Layers className="w-6 h-6" />, color: "primary" },
       { title: "Funnel Builder", icon: <Target className="w-6 h-6" />, color: "secondary" },
       { title: "Telephony", icon: <Globe className="w-6 h-6" />, color: "info" },
       { title: "Reputation", icon: <Shield className="w-6 h-6" />, color: "success" }
      ].map((f: any, i: number) => (
       <div key={i} className="md:col-span-3 group">
        <div className="h-full bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 transition-all duration-300 text-center flex flex-col items-center">
         <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-${f.color}/10 text-${f.color} border border-${f.color}/20 group-hover:scale-110 transition-transform`}>
          {f.icon}
         </div>
         <h4 className="font-black uppercase tracking-widest text-sm">{f.title}</h4>
        </div>
       </div>
      ))}
     </div>
    </div>
   </section>

   {/* Pricing Section - Ultra Premium */}
   <section id="pricing" className="py-40 bg-[#0b0b1a] relative overflow-hidden">
    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -mr-96 -mt-96 pointer-events-none" />
    <div className="container mx-auto px-6 relative z-10">
     <div className="text-center mb-24">
      <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 uppercase">Choose Your <span className="text-warning">Weapon.</span></h2>
      
      <div className="inline-flex items-center gap-4 mt-8 p-1 rounded-full bg-white/5 border border-white/10">
        <button 
         onClick={() => setIsAnnual(false)}
         className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${!isAnnual ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
        >
         Monthly
        </button>
        <button 
         onClick={() => setIsAnnual(true)}
         className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${isAnnual ? 'bg-primary text-white' : 'text-white/40 hover:text-white'}`}
        >
         Annual <span className="text-[10px] ml-1 opacity-70">(-20%)</span>
        </button>
      </div>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {tiers.map((tier: any, i: number) => (
       <motion.div key={tier.id} {...fadeUp} transition={{ delay: i * 0.1 }}>
        <Card className={`h-full border-white/10 bg-white/5 backdrop-blur-3xl flex flex-col relative overflow-hidden group ${tier.id === 'pro' ? 'ring-2 ring-primary scale-105 z-20' : 'scale-95 opacity-80 hover:opacity-100 transition-all'}`}>
         {tier.id === 'pro' && (
          <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black uppercase px-6 py-1.5 rotate-45 translate-x-8 translate-y-4 shadow-xl">
           Most Popular
          </div>
         )}
         <CardHeader className="p-8 pb-0">
          <CardTitle className="text-3xl font-black text-white uppercase tracking-tighter mb-2">{tier.name}</CardTitle>
          <CardDescription className="text-white/30 font-bold uppercase tracking-widest text-[10px]">
            {tier.id === 'starter' ? 'The Foundation' : tier.id === 'pro' ? 'The Growth Engine' : 'The Enterprise Beast'}
          </CardDescription>
         </CardHeader>
         <CardContent className="p-8 flex-grow">
          <div className="flex items-baseline gap-2 mb-10">
           <span className="text-6xl font-black text-white tabular-nums">${isAnnual ? Math.floor(tier.monthlyPrice * 0.8) : tier.monthlyPrice}</span>
           <span className="text-white/30 font-bold uppercase tracking-widest text-xs">/month</span>
          </div>
          <ul className="space-y-5">
           {tier.features.map((feature: string, j: number) => (
            <li key={j} className="flex items-start gap-3 text-sm text-white/70">
             <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5 border border-primary/20">
              <Check className="w-3 h-3 stroke-[4px]" />
             </div>
             <span className="font-medium">{feature}</span>
            </li>
           ))}
          </ul>
         </CardContent>
         <div className="p-8 pt-0">
          <Button 
           onClick={() => handleCheckout(tier.id)}
           className={`w-full h-16 font-black uppercase tracking-[0.2em] text-sm ${tier.id === 'pro' ? 'bg-primary hover:bg-primary/90 border-none shadow-xl shadow-primary/30' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
          >
           {tier.id === 'starter' ? 'Start Free' : 'Subscribe'}
          </Button>
         </div>
        </Card>
       </motion.div>
      ))}
     </div>
    </div>
   </section>

   {/* CTA Section - Aggressive */}
   <section className="py-40 relative">
    <div className="container mx-auto px-6">
     <div className="relative rounded-[3rem] bg-primary p-12 md:p-32 overflow-hidden text-center shadow-[0_0_100px_rgba(19,89,255,0.4)]">
       <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30" />
       </div>
       
       <motion.div {...fadeUp} className="relative z-10">
        <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-10 text-white uppercase leading-[0.85]">Stop Guessing. <br />Start Winning.</h2>
        <p className="text-white/80 text-2xl max-w-3xl mx-auto mb-16 font-medium leading-relaxed">
          Join the 1% of elite businesses that have unified their operations and achieved total market dominance with LeadsMind.
        </p>
        <div className="flex flex-col items-center gap-8">
          <Link href="/auth/signup-basic">
           <Button className="h-20 px-16 text-2xl bg-white text-primary hover:scale-105 border-none font-black uppercase tracking-[0.2em] transition-all shadow-2xl">
            Start Your Empire Now
           </Button>
          </Link>
          <div className="flex items-center gap-6 text-white/60 text-xs font-black uppercase tracking-[0.3em]">
           <div className="flex items-center gap-2"><Check className="w-4 h-4" /> No Credit Card</div>
           <div className="flex items-center gap-2"><Check className="w-4 h-4" /> 14-Day Free Trial</div>
           <div className="flex items-center gap-2"><Check className="w-4 h-4" /> Instant Setup</div>
          </div>
        </div>
       </motion.div>
     </div>
    </div>
   </section>

   {/* Footer */}
   <footer className="py-32 border-t border-white/5 bg-[#050510]">
    <div className="container mx-auto px-6">
     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-24">
      <div className="col-span-2">
       <div className="flex items-center gap-3 mb-8">
         <Link href="/" className="relative h-10 px-4 bg-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform overflow-hidden">
          <Image 
           src="/assets/images/logo/logo.svg" 
           alt="LeadsMind" 
           width={120}
           height={30}
           className="object-contain"
          />
         </Link>
       </div>
       <p className="text-white/30 text-base leading-relaxed max-w-sm mb-8 font-medium">
        The definitive business operating system for high-performance teams. Build, automate, and scale with absolute precision.
       </p>
       <div className="flex gap-6">
         {/* Social Icons Placeholder */}
         <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer text-white/40 hover:text-white font-bold">𝕏</div>
         <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer text-white/40 hover:text-white font-bold">in</div>
         <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer text-white/40 hover:text-white font-bold">ig</div>
       </div>
      </div>
      
      <div className="md:col-span-1">
       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-8">Platform</h4>
       <ul className="space-y-4 text-sm font-bold text-white/40 uppercase tracking-widest">
        <li><Link href="#" className="hover:text-primary transition-colors">CRM</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Marketing</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Automations</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Integrations</Link></li>
       </ul>
      </div>
      
      <div className="md:col-span-1">
       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-8">Solutions</h4>
       <ul className="space-y-4 text-sm font-bold text-white/40 uppercase tracking-widest">
        <li><Link href="#" className="hover:text-primary transition-colors">Agencies</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Real Estate</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">E-commerce</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">SaaS</Link></li>
       </ul>
      </div>

      <div className="md:col-span-1">
       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-8">Resources</h4>
       <ul className="space-y-4 text-sm font-bold text-white/40 uppercase tracking-widest">
        <li><Link href="#" className="hover:text-primary transition-colors">Docs</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Community</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Support</Link></li>
       </ul>
      </div>

      <div className="md:col-span-1">
       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-8">Legal</h4>
       <ul className="space-y-4 text-sm font-bold text-white/40 uppercase tracking-widest">
        <li><Link href="#" className="hover:text-primary transition-colors">Privacy</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Terms</Link></li>
        <li><Link href="#" className="hover:text-primary transition-colors">Security</Link></li>
       </ul>
      </div>
     </div>
     
     <div className="flex flex-col md:flex-row items-center justify-between pt-16 border-t border-white/5 text-[10px] text-white/20 font-black uppercase tracking-[0.5em]">
      <p>© 2026 LeadsMind. Built for the 1%.</p>
      <div className="mt-8 md:mt-0 flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        System Status: Operational
      </div>
     </div>
    </div>
   </footer>
  </div>
 );
};

export default LandingContent;
