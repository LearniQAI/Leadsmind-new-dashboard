import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/shared/logger'

const ALLOWED_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

/**
 * Ensures the just-authenticated user has a workspace. Runs for every code
 * exchange that lands here — email confirmation links AND OAuth (Google /
 * Facebook) sign-ins — so a first-time social sign-up gets a real account +
 * real workspace exactly like an email/password sign-up does, instead of
 * landing on the dashboard with zero workspaces and getting bounced to
 * /auth/signin-basic?error=no_workspace.
 *
 * Uses the passed-in client, which already carries the fresh session from
 * exchangeCodeForSession() — a separate server client built from cookies()
 * would not see the just-set auth cookies within this same request.
 */
async function ensureWorkspace(
  supabase: ReturnType<typeof createServerClient>,
  response: NextResponse,
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing?.workspace_id) {
    response.cookies.set('active_workspace_id', existing.workspace_id, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
    return
  }

  // Brand-new user (no membership yet, e.g. a first-time OAuth sign-up) — honor a
  // pending team invite for their email instead of always auto-creating them a
  // lone personal workspace via setup_workspace below. This is the "use Google/
  // Facebook to accept an invite" path for someone with no prior LeadsMind
  // account; the email/password accept flow (src/app/actions/invitations.ts)
  // never reaches setup_workspace at all, so this check only ever matters here.
  // Uses the admin client for the actual membership write rather than the
  // session client, matching the rest of the invite-accept flow.
  if (user.email) {
    const adminClient = createAdminClient()
    const { data: invite } = await adminClient
      .from('workspace_invitations')
      .select('id, workspace_id, role, permissions, expires_at')
      .ilike('email', user.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()

    if (invite) {
      const { error: memberError } = await adminClient.from('workspace_members').insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
        permissions: Array.isArray(invite.permissions) ? invite.permissions : [],
      })

      if (!memberError) {
        await adminClient.from('workspace_invitations').update({ status: 'accepted' }).eq('id', invite.id)
        response.cookies.set('active_workspace_id', invite.workspace_id, {
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
        })
        return
      }

      logger.error({ err: memberError, inviteId: invite.id, userId: user.id }, 'auth.callback.ensure_workspace.invite_accept.failed')
      // Fall through to the normal auto-create path below rather than leaving
      // the user stuck with no workspace at all.
    }
  }

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>
  const displayName =
    meta.full_name || meta.name || meta.user_name || (user.email ? user.email.split('@')[0] : 'My')
  const nameParts = displayName.trim().split(/\s+/)
  const firstName = nameParts[0] || 'User'
  const lastName = nameParts.slice(1).join(' ')
  const workspaceName = `${displayName}'s Workspace`

  await supabase
    .from('users')
    .upsert(
      { id: user.id, email: user.email, first_name: firstName, last_name: lastName },
      { onConflict: 'id', ignoreDuplicates: true },
    )

  const { data: workspaceId, error: setupError } = await supabase.rpc('setup_workspace', {
    p_user_id: user.id,
    p_workspace_name: workspaceName,
    p_slug: slugify(workspaceName),
  })

  if (!setupError && workspaceId) {
    response.cookies.set('active_workspace_id', workspaceId, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // OAuth provider errors (user denied / cancelled the consent screen, or the
  // provider rejected the request) come back here as query params with no code.
  // Forward the reason to the sign-in page instead of a generic failure.
  const oauthError = searchParams.get('error')
  if (oauthError && !code) {
    const reason = searchParams.get('error_description') || oauthError
    const dest = new URL(`${origin}/auth/signin-basic`)
    dest.searchParams.set('error', oauthError)
    dest.searchParams.set('error_description', reason)
    return NextResponse.redirect(dest)
  }

  const response = NextResponse.redirect(`${origin}${next}`)

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await ensureWorkspace(supabase, response)
      return response
    }
  }

  // Also handle token_hash for email verification / password reset links
  const token_hash = searchParams.get('token_hash')
  const rawType = searchParams.get('type')
  const type = ALLOWED_OTP_TYPES.find((t) => t === rawType)

  if (token_hash && type) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      await ensureWorkspace(supabase, response)
      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/signin-basic?error=Verification failed`)
}
