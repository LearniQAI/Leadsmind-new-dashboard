'use client';

import React, { useState, useEffect } from 'react';
import { Check, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProfilesTabProps {
  expert: any;
  onSave: (updatedExpert: any) => void;
  supabase: any;
}

export default function ProfilesTab({ expert, onSave, supabase }: ProfilesTabProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (expert) {
      setName(expert.name || '');
      setEmail(expert.email || '');
      setLanguages((expert.languages || []).join(', '));
      setSpecializations((expert.specializations || []).join(', '));
      setHourlyRate(expert.hourly_rate || 0);
      setCurrency(expert.currency || 'USD');
      setBio(expert.bio || '');
    }
  }, [expert]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const langArray = languages.split(',').map(s => s.trim()).filter(Boolean);
    const specArray = specializations.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const { error } = await supabase
        .from('lms_expert_profiles')
        .update({
          name,
          email,
          languages: langArray,
          specializations: specArray,
          hourly_rate: hourlyRate,
          currency,
          bio
        })
        .eq('id', expert.id);

      if (error) throw error;
      
      toast.success('Expert profile saved successfully!');
      onSave({
        ...expert,
        name,
        email,
        languages: langArray,
        specializations: specArray,
        hourly_rate: hourlyRate,
        currency,
        bio
      });
    } catch (err: any) {
      toast.error('Failed to save profile: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Full Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full bg-[#04091a]/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all font-bold" 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full bg-[#04091a]/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all font-mono" 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Languages (comma-separated)</label>
          <input 
            type="text" 
            value={languages} 
            onChange={e => setLanguages(e.target.value)} 
            placeholder="English, Spanish, Zulu" 
            className="w-full bg-[#04091a]/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all" 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Specializations (comma-separated)</label>
          <input 
            type="text" 
            value={specializations} 
            onChange={e => setSpecializations(e.target.value)} 
            placeholder="Strategy, Tech support, CRM integration" 
            className="w-full bg-[#04091a]/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all" 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Hourly Advisory Rate</label>
          <div className="relative">
            <DollarSign size={12} className="absolute left-4 top-4 text-white/40" />
            <input 
              type="number" 
              value={hourlyRate} 
              onChange={e => setHourlyRate(parseFloat(e.target.value) || 0)} 
              className="w-full bg-[#04091a]/60 border border-white/5 rounded-xl pl-9 pr-4 py-3 text-xs text-white outline-none focus:border-primary transition-all font-mono font-bold" 
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Currency Code</label>
          <input 
            type="text" 
            value={currency} 
            onChange={e => setCurrency(e.target.value)} 
            className="w-full bg-[#04091a]/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all font-mono uppercase font-bold" 
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Professional Biography</label>
        <textarea 
          rows={4} 
          value={bio} 
          onChange={e => setBio(e.target.value)} 
          className="w-full bg-[#04091a]/60 border border-white/5 rounded-xl px-4 py-3.5 text-xs text-white outline-none focus:border-primary transition-all leading-relaxed" 
        />
      </div>

      <div className="pt-2">
        <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 flex items-center gap-1.5">
          <Check size={14} /> {savingProfile ? 'Saving...' : 'Save Profile Settings'}
        </Button>
      </div>
    </div>
  );
}
