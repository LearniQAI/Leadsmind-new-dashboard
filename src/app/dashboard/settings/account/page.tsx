import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import {
 requireAuth,
 getCurrentProfile,
 getUserWorkspaces,
 getCurrentWorkspaceId
} from '@/lib/auth'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { PasswordForm } from '@/components/settings/PasswordForm'
import { WorkspaceList } from '@/components/settings/WorkspaceList'
import { IntegrationsList } from '@/components/settings/IntegrationsList'
import Wrapper from '@/components/layouts/DefaultWrapper'
import Breadcrumb from '@/common/Breadcrumb/breadcrumb'

export const metadata: Metadata = {
 title: 'Account Settings | LeadsMind',
 description: 'Manage your profile, security, and workspaces.',
}

export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
 const authUser = await requireAuth()
 const profile = await getCurrentProfile(authUser)
 const workspaces = await getUserWorkspaces()
 const activeWorkspaceId = await getCurrentWorkspaceId()

 if (!activeWorkspaceId) {
  if (workspaces.length > 0) {
   const { setActiveWorkspace } = await import('@/app/actions/auth');
   await setActiveWorkspace(workspaces[0].id);
  } else {
   redirect('/auth/signin-basic')
  }
 }

 if (!profile) {
  return <div>Error loading profile</div>
 }

 const profileData = {
  id: profile.id,
  email: profile.email,
  firstName: profile.firstName,
  lastName: profile.lastName,
  avatarUrl: profile.avatarUrl ?? '',
 }

 return (
  <Wrapper>
   <div className="app__slide-wrapper">
    <Breadcrumb breadTitle="Account Settings" subTitle="Dashboard" />
    
    <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
     <div className="col-span-12 xxl:col-span-8">
      <div className="flex flex-col gap-y-6">
       <section id="profile">
        <ProfileForm user={profileData} />
       </section>

       <section id="security">
        <PasswordForm />
       </section>

       <section id="workspaces">
        <WorkspaceList
         workspaces={workspaces}
         activeWorkspaceId={activeWorkspaceId!}
        />
       </section>

       <section id="integrations">
        <IntegrationsList />
       </section>
      </div>
     </div>
    </div>
   </div>
  </Wrapper>
 )
}
