import "../style/index.scss";
import "./globals.css";
import type { Metadata } from "next";
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
// import AIChatbot from "@/components/common/AIChatbot";

// NOTE: this layout wraps the entire app (marketing + dashboard + portal + admin).
// `robots` stays noindex by default here to protect authenticated/tenant routes;
// the public marketing pages opt back into indexing individually
// (see src/app/(marketing)/layout.tsx, blog/page.tsx, terms/page.tsx, privacy-policy/page.tsx).
export const metadata: Metadata = {
 metadataBase: new URL("https://www.leadsmind.io"),
 title: {
  default: "LeadsMind | All-in-One Business Operating System",
  template: "%s | LeadsMind",
 },
 description:
  "LeadsMind is a next-generation all-in-one business operating system designed for high-frequency operations, CRM, and marketing automation.",
 authors: [{ name: "LeadsMind" }],
 creator: "LeadsMind (Pty) Ltd",
 robots: {
  index: false,
  follow: true,
 },
};

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
   lastName: profile?.lastName || authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
   avatarUrl: profile?.avatarUrl ?? null,
   oauthImage: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
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
     <meta
      name="viewport"
      content="width=device-width, initial-scale=1, shrink-to-fit=no"
     />
     <meta name="apple-mobile-web-app-title" content="LeadsMind" />
     <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/icon?family=Material+Icons"
     />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
          {/* <AIChatbot /> */}
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
