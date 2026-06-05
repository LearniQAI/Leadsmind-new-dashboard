import MetaData from '@/hooks/useMetaData'
import Wrapper from '@/components/layouts/DefaultWrapper'
import SocialPlannerClient from './SocialPlannerClient'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentWorkspaceId } from '@/lib/auth'

export default async function SocialPlannerPage() {
  const workspaceId = await getCurrentWorkspaceId()
  const supabase = await createServerClient()
  
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, credentials, status')
    .eq('workspace_id', workspaceId!)
    .eq('status', 'connected')
    .in('platform', ['facebook', 'instagram'])

  const { data: recentPosts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('workspace_id', workspaceId!)
    .order('published_at', { ascending: false })
    .limit(10)

  return (
    <MetaData pageTitle="Social Planner">
      <Wrapper>
        <SocialPlannerClient 
          connections={connections || []} 
          recentPosts={recentPosts || []}
        />
      </Wrapper>
    </MetaData>
  )
}
