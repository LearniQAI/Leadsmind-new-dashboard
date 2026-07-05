'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { DatabaseError, toClientError } from '@/shared/errors/AppError';

// Helper to generate OpenAI embeddings for search matching
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text.replace(/\n/g, ' '),
        model: 'text-embedding-3-small'
      })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data[0].embedding;
  } catch (err) {
    logger.error({ err }, 'forum.embedding.generate.failed');
    return null;
  }
}

// 1. Create a new forum post (Supports public anonymous posting)
export async function createForumPost(board: string, title: string, content: string, visitorName?: string) {
  try {
    const supabase = await createServerClient();
    
    // Check user session
    let user = null;
    try {
      user = await getUser();
    } catch (e) {
      // User is not authenticated
    }

    // Get workspace context
    let wsId = null;
    try {
      wsId = await getCurrentWorkspaceId();
    } catch (e) {
      // Not in workspace context
    }

    if (!wsId) {
      // Fallback: Use first workspace in database to preserve integrity constraints
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      if (workspaces && workspaces.length > 0) {
        wsId = workspaces[0].id;
      } else {
        throw new DatabaseError('No workspaces configured in the database bedrock.');
      }
    }

    const authorName = user 
      ? (user.email?.split('@')[0] || 'Workspace Member') 
      : (visitorName?.trim() || 'Anonymous Client');

    // Insert user post
    const { data: post, error } = await supabase
      .from('forum_posts')
      .insert({
        workspace_id: wsId,
        author_id: user?.id || null,
        author_name: authorName,
        board,
        title,
        content
      })
      .select('*')
      .single();

    if (error) throw error;

    // Trigger LENA automated forum moderator matching index
    try {
      const cleanTitle = title.trim();
      const cleanContent = content.trim();
      const queryText = `${cleanTitle} ${cleanContent}`;

      let matchFound = false;
      let matchedArticle: any = null;

      // Try vector match if key exists
      const embedding = await generateEmbedding(queryText);
      if (embedding) {
        const { data: vectorMatches, error: vecErr } = await supabase.rpc('match_help_articles', {
          query_embedding: embedding,
          match_threshold: 0.70, // 70% similarity threshold
          match_count: 1
        });
        if (!vecErr && vectorMatches && vectorMatches.length > 0) {
          matchedArticle = vectorMatches[0];
          matchFound = true;
        }
      }

      // Text match fallback
      if (!matchFound) {
        const { data: textMatches } = await supabase
          .from('help_articles')
          .select('id, slug, title, body_plain, category, content_json, faq_json')
          .or(`title.ilike.%${cleanTitle}%,body_plain.ilike.%${cleanTitle}%`)
          .limit(1);

        if (textMatches && textMatches.length > 0) {
          matchedArticle = textMatches[0];
          matchFound = true;
        }
      }

      if (matchFound && matchedArticle) {
        // Build moderator response content
        const steps = matchedArticle.content_json || [];
        const stepsFormatted = steps
          .map((s: any, idx: number) => `**Step ${idx + 1}: ${s.title}** - ${s.description}`)
          .join('\n\n');

        // Fetch screenshot if available to embed screenshot overlay
        let screenshotMarkdown = '';
        const { data: screenshots } = await supabase
          .from('help_screenshots')
          .select('image_url, image_alt')
          .eq('article_id', matchedArticle.id)
          .limit(1);

        if (screenshots && screenshots.length > 0) {
          screenshotMarkdown = `\n\n![Visual Walkthrough Annotation](${screenshots[0].image_url})`;
        }

        const replyContent = `🤖 **LENA AI Forum Moderator**:\n\nHello @${authorName}, it looks like you are asking about a topic matching our help center documentation!\n\nHere are the setup steps from our verified guide: **[${matchedArticle.title}](/articles/${matchedArticle.slug})**:\n\n${stepsFormatted}${screenshotMarkdown}\n\nHope this resolves your setup query! Let me know if you need additional diagnostics context.`;

        // Insert LENA auto-reply
        await supabase
          .from('forum_comments')
          .insert({
            post_id: post.id,
            author_name: 'LENA AI Moderator',
            content: replyContent,
            is_lena: true
          });
      }
    } catch (moderationErr) {
      logger.error({ err: moderationErr, postId: post.id }, 'forum.post.moderation_listener.failed');
    }

    revalidatePath('/community/forums');
    return { success: true, post };

  } catch (error: any) {
    logger.error({ err: error, board }, 'forum.post.create.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

// 2. Fetch posts by board channel (Public-friendly)
export async function getForumPosts(board: string) {
  try {
    const supabase = await createServerClient();
    
    let wsId = null;
    try {
      wsId = await getCurrentWorkspaceId();
    } catch (e) {
      // Ignore
    }

    if (!wsId) {
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      if (workspaces && workspaces.length > 0) {
        wsId = workspaces[0].id;
      } else {
        throw new DatabaseError('No active workspace configured.');
      }
    }

    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select('id, title, content, author_name, created_at, board')
      .eq('workspace_id', wsId)
      .eq('board', board)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: posts || [] };
  } catch (error: any) {
    logger.error({ err: error, board }, 'forum.posts.fetch.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

// 3. Fetch detailed post & comments
export async function getPostDetails(postId: string) {
  try {
    const supabase = await createServerClient();
    
    // Post
    const { data: post, error: postErr } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postErr) throw postErr;

    // Comments
    const { data: comments, error: commentErr } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentErr) throw commentErr;

    return { data: { post, comments: comments || [] } };
  } catch (error: any) {
    logger.error({ err: error, postId }, 'forum.post_details.fetch.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

// 4. Add comment to a post (Supports public comments)
export async function addCommentToPost(postId: string, content: string, visitorName?: string) {
  try {
    const supabase = await createServerClient();
    
    let user = null;
    try {
      user = await getUser();
    } catch (e) {
      // Unauthenticated
    }

    const authorName = user 
      ? (user.email?.split('@')[0] || 'Workspace Member') 
      : (visitorName?.trim() || 'Anonymous Client');

    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        author_id: user?.id || null,
        author_name: authorName,
        content,
        is_lena: false
      })
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/community/forums');
    return { success: true, comment };
  } catch (error: any) {
    logger.error({ err: error, postId }, 'forum.comment.add.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}
