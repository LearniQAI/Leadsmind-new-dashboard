import "../style/index.scss";
import "./globals.css";
import AppProvider from "@/lib/contextApi/AppProvider";
import ReduxProvider from "@/redux/provider";
import { DirectionProvider } from "@/hooks/useDirection";
import Setting from "@/common/setting/Setting";
import { Toaster } from "sonner";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentWorkspace, getUserRole, getUserAccessInfo } from "@/lib/auth";
import { fetchBranding } from "@/lib/branding";
import { DashboardProvider } from "@/components/layouts/DashboardProvider";
import { BrandingProvider } from "@/components/branding/BrandingProvider";
import { WorkspaceSync } from "@/components/auth/WorkspaceSync";
import AIChatbot from "@/components/common/AIChatbot";

export default async function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const supabase = await createServerClient();
 const { data: { user: authUser } } = await supabase.auth.getUser();

 let user = null;
 let workspaceData = null;
 let role = null;
 let permissions: string[] = [];
 let branding = null;

 if (authUser) {
  const [profile, workspace, accessInfo] = await Promise.all([
   getCurrentProfile(authUser),
   getCurrentWorkspace(authUser),
   getUserAccessInfo(),
  ]);

  role = accessInfo.role;
  permissions = accessInfo.permissions;
  
  workspaceData = workspace ? {
   id: workspace.id,
   name: workspace.name,
   logoUrl: workspace.logoUrl ?? null,
   plan: workspace.plan,
  } : null;

  user = {
   id: authUser.id,
   email: authUser.email,
   firstName: profile?.firstName || authUser.user_metadata?.full_name?.split(' ')[0] || authUser.email?.split('@')[0] || 'User',
   avatarUrl: profile?.avatarUrl ?? null,
  };

  if (workspaceData) {
   branding = await fetchBranding(workspaceData.id);
  }
 }
 
 return (
  <>
   <html lang="en">
    <head>
     <meta httpEquiv="x-ua-compatible" content="ie=edge" />
     <title>LeadsMind | All-in-One Business Operating System</title>
     <meta name="description" content="LeadsMind is a next-generation all-in-one business operating system designed for high-frequency operations, CRM, and marketing automation." />
     <meta name="robots" content="noindex, follow" />
     <meta
      name="viewport"
      content="width=device-width, initial-scale=1, shrink-to-fit=no"
     />
     <link rel="icon" href="/favicon.ico" />
     <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/icon?family=Material+Icons"
     />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
    </head>

    <body suppressHydrationWarning={true} className="body-area">
     <ReduxProvider>
      <AppProvider>
       <DirectionProvider>
        <WorkspaceSync workspaceId={workspaceData?.id ?? null} />
        <DashboardProvider 
         user={user} 
         workspace={workspaceData} 
         role={role} 
         permissions={permissions}
         branding={branding ? { platformName: branding.platform_name, logoUrl: branding.logo_url } : null}
        >
         <BrandingProvider 
          primaryColor={branding?.primary_color ?? undefined}
          platformName={branding?.platform_name ?? undefined}
         >
          {children}
          <AIChatbot />
         </BrandingProvider>
        </DashboardProvider>
       </DirectionProvider>
      </AppProvider>
      <Toaster position="top-center" richColors />
     </ReduxProvider>
    </body>
   </html>
  </>
 );
}
