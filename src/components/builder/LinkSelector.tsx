"use client";

import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Link2, FileText, Anchor, Zap } from 'lucide-react';

import { useBuilder } from './BuilderContext';

export interface LinkObject {
  type: 'url' | 'page' | 'section' | 'action';
  value: string;
}

interface LinkSelectorProps {
  value: string | LinkObject;
  onChange: (val: LinkObject) => void;
  pages?: { id: string; name: string; slug: string }[];
}

export const LinkSelector = ({ value, onChange, pages: propPages }: LinkSelectorProps) => {
  const { pages: contextPages, funnelId, websiteId } = useBuilder();
  const pages = propPages || contextPages || [];
  
  // Standardize the value to LinkObject
  const linkObj: LinkObject = typeof value === 'string' 
    ? { type: value.startsWith('#') ? 'section' : 'url', value } 
    : value || { type: 'url', value: '' };

  const handleTypeChange = (type: LinkObject['type']) => {
    onChange({ type, value: '' });
  };

  const handleValueChange = (val: string | null) => {
    onChange({ ...linkObj, value: val || '' });
  };

  const types = [
    { id: 'url', label: 'External URL', icon: Link2 },
    { id: 'page', label: 'Internal Page', icon: FileText },
    { id: 'section', label: 'Scroll to Section', icon: Anchor },
    { id: 'action', label: 'Action', icon: Zap },
  ];

  const isFunnel = !!funnelId;

  const actions = [
    ...(isFunnel ? [
      { id: 'next_step', label: 'Next Step in Funnel' },
      { id: 'prev_step', label: 'Previous Step' },
    ] : []),
    { id: 'submit_form', label: 'Submit Form' },
    { id: 'open_popup', label: 'Open Popup' },
    { id: 'close_popup', label: 'Close Popup' },
    { id: 'enroll_course', label: 'Enroll in Course' },
    { id: 'enroll_bundle', label: 'Enroll in Bundle' },
    { id: 'open_player', label: 'Open Course Player' },
    { id: 'deep_link', label: 'Go to Lesson Deep Link' },
    { id: 'start_trial', label: 'Start Free Trial' },
    { id: 'book_lesson', label: 'Book a Live Lesson' },
    { id: 'go_checkout', label: 'Go to Course Checkout' },
  ];

  const [courses, setCourses] = React.useState<{ id: string; title: string }[]>([]);
  const [bundles, setBundles] = React.useState<{ id: string; name: string }[]>([]);
  const [lessons, setLessons] = React.useState<{ id: string; title: string; course_id: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (linkObj.type !== 'action') return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: coursesData } = await supabase.from('courses').select('id, title');
        if (coursesData) setCourses(coursesData);
        const { data: bundlesData } = await supabase.from('lms_bundles').select('id, name');
        if (bundlesData) setBundles(bundlesData);
        const { data: lessonsData } = await supabase.from('lessons').select('id, title, modules!inner(course_id)');
        if (lessonsData) {
          setLessons(lessonsData.map((l: any) => ({
            id: l.id,
            title: l.title,
            course_id: l.modules?.course_id
          })));
        }
      } catch (err) {
        console.error('Selector loading failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [linkObj.type]);

  const activeActionType = linkObj.value.split(':')[0] || '';

  return (
    <div className="space-y-3 p-3 bg-white/5 rounded-xl border border-white/5">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Destination Type</Label>
        <div className="grid grid-cols-4 gap-1">
          {types.map((t) => {
            const Icon = t.icon;
            const active = linkObj.type === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTypeChange(t.id as any)}
                title={t.label}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border ${active ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-black/20 border-white/5 text-muted-foreground hover:text-white'}`}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">
          {types.find(t => t.id === linkObj.type)?.label}
        </Label>
        
        {linkObj.type === 'url' && (
          <Input 
            value={linkObj.value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="https://example.com"
            className="h-8 bg-black/20 border-white/5 text-[11px]"
          />
        )}

        {linkObj.type === 'page' && (
          <Select value={linkObj.value} onValueChange={handleValueChange}>
            <SelectTrigger className="h-8 bg-black/20 border-white/5 text-[11px]">
              <SelectValue placeholder="Select a page..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              {pages.length > 0 ? pages.map(p => (
                <SelectItem key={p.id} value={p.slug} className="text-[11px]">
                  {p.name} ({p.slug})
                </SelectItem>
              )) : (
                <SelectItem value="none" disabled className="text-[11px]">No pages found</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}

        {linkObj.type === 'section' && (
          <div className="flex gap-1 items-center">
            <span className="text-muted-foreground text-xs pl-2">#</span>
            <Input 
              value={linkObj.value.replace('#', '')}
              onChange={(e) => handleValueChange('#' + e.target.value.replace('#', ''))}
              placeholder="section-id"
              className="h-8 bg-black/20 border-white/5 text-[11px]"
            />
          </div>
        )}

        {linkObj.type === 'action' && (
          <div className="space-y-2">
            <Select 
              value={activeActionType} 
              onValueChange={(val) => {
                if (val === 'enroll_course' || val === 'open_player' || val === 'start_trial' || val === 'go_checkout') {
                  const firstCourse = courses[0]?.id || '';
                  handleValueChange(`${val}:${firstCourse}`);
                } else if (val === 'enroll_bundle') {
                  const firstBundle = bundles[0]?.id || '';
                  handleValueChange(`${val}:${firstBundle}`);
                } else if (val === 'deep_link') {
                  const firstCourse = courses[0]?.id || '';
                  const courseLessons = lessons.filter(l => l.course_id === firstCourse);
                  const firstLesson = courseLessons[0]?.id || '';
                  handleValueChange(`${val}:${firstCourse}:${firstLesson}`);
                } else {
                  handleValueChange(val);
                }
              }}
            >
              <SelectTrigger className="h-8 bg-black/20 border-white/5 text-[11px]">
                <SelectValue placeholder={loading ? "Loading..." : "Select an action..."} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                {actions.map(a => (
                  <SelectItem key={a.id} value={a.id} className="text-[11px]">
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(activeActionType === 'enroll_course' || 
              activeActionType === 'open_player' || 
              activeActionType === 'start_trial' || 
              activeActionType === 'go_checkout') && (
              <div className="space-y-1 pl-2 border-l border-white/10">
                <Label className="text-[9px] text-muted-foreground">Select Course</Label>
                <Select 
                  value={linkObj.value.split(':')[1] || ''} 
                  onValueChange={(courseId) => {
                    handleValueChange(`${activeActionType}:${courseId}`);
                  }}
                >
                  <SelectTrigger className="h-8 bg-black/20 border-white/5 text-[11px]">
                    <SelectValue placeholder="Choose course..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-[11px]">
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeActionType === 'enroll_bundle' && (
              <div className="space-y-1 pl-2 border-l border-white/10">
                <Label className="text-[9px] text-muted-foreground">Select Bundle</Label>
                <Select 
                  value={linkObj.value.split(':')[1] || ''} 
                  onValueChange={(bundleId) => {
                    handleValueChange(`enroll_bundle:${bundleId}`);
                  }}
                >
                  <SelectTrigger className="h-8 bg-black/20 border-white/5 text-[11px]">
                    <SelectValue placeholder="Choose bundle..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {bundles.map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-[11px]">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeActionType === 'deep_link' && (
              <div className="space-y-2 pl-2 border-l border-white/10">
                <div className="space-y-1">
                  <Label className="text-[9px] text-muted-foreground">Select Course</Label>
                  <Select 
                    value={linkObj.value.split(':')[1] || ''} 
                    onValueChange={(courseId) => {
                      const courseLessons = lessons.filter(l => l.course_id === courseId);
                      const firstLesson = courseLessons[0]?.id || '';
                      handleValueChange(`deep_link:${courseId}:${firstLesson}`);
                    }}
                  >
                    <SelectTrigger className="h-8 bg-black/20 border-white/5 text-[11px]">
                      <SelectValue placeholder="Choose course..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-[11px]">
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] text-muted-foreground">Select Lesson</Label>
                  <Select 
                    value={linkObj.value.split(':')[2] || ''} 
                    onValueChange={(lessonId) => {
                      const courseId = linkObj.value.split(':')[1] || '';
                      handleValueChange(`deep_link:${courseId}:${lessonId}`);
                    }}
                  >
                    <SelectTrigger className="h-8 bg-black/20 border-white/5 text-[11px]">
                      <SelectValue placeholder="Choose lesson..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {lessons.filter(l => l.course_id === (linkObj.value.split(':')[1] || '')).map(l => (
                        <SelectItem key={l.id} value={l.id} className="text-[11px]">
                          {l.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <p className="text-[9px] text-muted-foreground px-1">
        {linkObj.type === 'url' && "Directs the user to an external website."}
        {linkObj.type === 'page' && "Seamlessly links to another page in this site."}
        {linkObj.type === 'section' && "Smooth-scrolls to a specific ID on this page."}
        {linkObj.type === 'action' && "Triggers a dynamic flow like course enrollment."}
      </p>
    </div>
  );
};
