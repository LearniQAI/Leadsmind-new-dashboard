import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getContact } from '@/app/actions/contacts';
import { 
 getContactActivities, 
 getContactNotes, 
 getContactTasks 
} from '@/app/actions/contacts';
import { getAutomationLogsForContact } from '@/app/actions/automation';
import { ContactDetailLayout } from '@/components/crm/ContactDetailLayout';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { NotesSection } from '@/components/crm/NotesSection';
import { TasksSection } from '@/components/crm/TasksSection';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
 History, 
 MessageSquare, 
 CheckSquare,
 FileText,
 Zap,
 ReceiptText
} from 'lucide-react';
import { getContactDocuments } from '@/app/actions/media';
import { DocumentsSection } from '@/components/crm/DocumentsSection';
import { AutomationLogsSection } from '@/components/crm/AutomationLogsSection';
import { getInvoices, getQuotes } from '@/app/actions/finance';
import { ContactInvoicesSection } from '@/components/crm/ContactInvoicesSection';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function ContactDetailPage({
 params,
}: {
 params: { id: string };
}) {
 await requireAuth();
 const { id } = params;
 const workspaceId = await getCurrentWorkspaceId();

 const [
  contactResult, 
  activitiesResult, 
  notesResult, 
  tasksResult,
  docsResult,
  automationLogsResult,
  invoices,
  quotes
 ] = await Promise.all([
  getContact(id),
  getContactActivities(id),
  getContactNotes(id),
  getContactTasks(id),
  getContactDocuments(id),
  getAutomationLogsForContact(id),
  getInvoices(workspaceId!, id),
  getQuotes(workspaceId!, id)
 ]);

 if (!contactResult.success || !contactResult.data) {
  notFound();
 }

 const activities = activitiesResult.success ? (activitiesResult.data ?? []) : [];
 const notes = notesResult.success ? (notesResult.data ?? []) : [];
 const tasks = tasksResult.success ? (tasksResult.data ?? []) : [];
 const documents = docsResult || [];

 return (
  <MetaData pageTitle="Contact Details">
   <Wrapper>
    <div className="py-10 px-4 max-w-7xl mx-auto">
     <ContactDetailLayout contact={contactResult.data}>
      <Tabs defaultValue="activity" className="space-y-8">
       <TabsList className="bg-[#0b0b10] border border-white/5 p-1 rounded-2xl h-14 w-full justify-start overflow-x-auto no-scrollbar">
        <TabsTrigger value="activity" className="rounded-xl px-6 data-[state=active]:bg-white/5 data-[state=active]:text-[#6c47ff] gap-2 font-bold transition-all">
         <History className="h-4 w-4" />
         <span>Timeline</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="rounded-xl px-6 data-[state=active]:bg-white/5 data-[state=active]:text-[#6c47ff] gap-2 font-bold transition-all">
         <MessageSquare className="h-4 w-4" />
         <span>Notes</span>
        </TabsTrigger>
        <TabsTrigger value="tasks" className="rounded-xl px-6 data-[state=active]:bg-white/5 data-[state=active]:text-[#6c47ff] gap-2 font-bold transition-all">
         <CheckSquare className="h-4 w-4" />
         <span>Tasks</span>
        </TabsTrigger>
        <TabsTrigger value="documents" className="rounded-xl px-6 data-[state=active]:bg-white/5 data-[state=active]:text-[#6c47ff] gap-2 font-bold transition-all">
         <FileText className="h-4 w-4" />
         <span>Documents</span>
        </TabsTrigger>
        <TabsTrigger value="automation" className="rounded-xl px-6 data-[state=active]:bg-white/5 data-[state=active]:text-[#6c47ff] gap-2 font-bold transition-all">
         <Zap className="h-4 w-4" />
         <span>Automation</span>
        </TabsTrigger>
        <TabsTrigger value="invoices" className="rounded-xl px-6 data-[state=active]:bg-white/5 data-[state=active]:text-[#6c47ff] gap-2 font-bold transition-all">
         <ReceiptText className="h-4 w-4" />
         <span>Invoices</span>
        </TabsTrigger>
       </TabsList>

       <TabsContent value="activity" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <ActivityTimeline activities={activities} />
       </TabsContent>

       <TabsContent value="notes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <NotesSection contactId={id} notes={notes} />
       </TabsContent>

       <TabsContent value="tasks" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <TasksSection contactId={id} tasks={tasks} />
       </TabsContent>

       <TabsContent value="documents" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <DocumentsSection contactId={id} documents={documents} />
       </TabsContent>

       <TabsContent value="automation" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <AutomationLogsSection logs={automationLogsResult || []} />
       </TabsContent>

       <TabsContent value="invoices" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <ContactInvoicesSection 
         contactId={id} 
         invoices={invoices || []} 
         quotes={quotes || []} 
        />
       </TabsContent>
      </Tabs>
     </ContactDetailLayout>
    </div>
   </Wrapper>
  </MetaData>
 );
}
