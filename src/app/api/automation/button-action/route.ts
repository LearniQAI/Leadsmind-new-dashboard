import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { lms_enroll, lms_enroll_bundle } from "@/lib/automation/lms_actions";

/**
 * API route to execute inline page-builder button background automation actions.
 *
 * This is invoked from a button rendered on a public, published site page (see
 * components/builder/user/Button.tsx) — the workspaceId comes from the page's own build
 * config, not a selection the visitor makes, and any authenticated platform user (not
 * necessarily a workspace_members row) is a legitimate caller here, since the intended
 * audience is site visitors/students self-enrolling, not internal team members. A
 * `requireWorkspaceRole()`-style membership check would incorrectly reject every real visitor.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { action, courseId, bundleId, lessonId, workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    // Verify the course/bundle being acted on actually belongs to the claimed workspaceId —
    // closes the mismatched-id path where a tampered request pairs one workspace's id with a
    // different workspace's real course/bundle id.
    const adminClient = createAdminClient();
    if (courseId) {
      const { data: course } = await adminClient.from("courses").select("id").eq("id", courseId).eq("workspace_id", workspaceId).maybeSingle();
      if (!course) {
        return NextResponse.json({ error: "Course not found in this workspace" }, { status: 404 });
      }
    }
    if (bundleId) {
      const { data: bundle } = await adminClient.from("lms_bundles").select("id").eq("id", bundleId).eq("workspace_id", workspaceId).maybeSingle();
      if (!bundle) {
        return NextResponse.json({ error: "Bundle not found in this workspace" }, { status: 404 });
      }
    }

    // Resolve contact record for user
    let { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", user.email)
      .single();

    if (!contact) {
      // Auto-create contact record
      const { data: newContact, error: contactErr } = await supabase
        .from("contacts")
        .insert({
          workspace_id: workspaceId,
          email: user.email,
          first_name: user.email?.split("@")[0] || "Student",
          last_name: "",
          source: "Button Action Client"
        })
        .select("id")
        .single();

      if (contactErr || !newContact) {
        return NextResponse.json({ error: "Failed to create contact context" }, { status: 500 });
      }
      contact = newContact;
    }

    let redirectUrl = "";
    let message = "Action completed successfully";

    switch (action) {
      case "enroll_course": {
        if (!courseId) {
          return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
        }
        // Run enrollment executor
        await lms_enroll(workspaceId, contact.id, {
          courseId,
          access_type: "full",
          welcome_email_enabled: true
        });
        redirectUrl = `/courses/${courseId}/learn`;
        message = "Enrolled in course successfully!";
        break;
      }

      case "enroll_bundle": {
        if (!bundleId) {
          return NextResponse.json({ error: "Missing bundleId" }, { status: 400 });
        }
        // Run bundle enrollment executor
        await lms_enroll_bundle(workspaceId, contact.id, {
          bundleId,
          child_privileges: {},
          welcome_email_enabled: true
        });
        redirectUrl = "/courses"; // Redirect to general catalog page
        message = "Enrolled in bundle successfully!";
        break;
      }

      case "open_player": {
        if (!courseId) {
          return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
        }
        redirectUrl = `/courses/${courseId}/learn`;
        break;
      }

      case "deep_link": {
        if (!courseId || !lessonId) {
          return NextResponse.json({ error: "Missing courseId or lessonId" }, { status: 400 });
        }
        redirectUrl = `/courses/${courseId}/learn?lessonId=${lessonId}`;
        break;
      }

      case "start_trial": {
        if (!courseId) {
          return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
        }
        // Enroll in course with a 7-day limited trial mode
        await lms_enroll(workspaceId, contact.id, {
          courseId,
          access_type: "audit",
          duration_days: 7,
          welcome_email_enabled: true
        });
        redirectUrl = `/courses/${courseId}/learn`;
        message = "Free trial started!";
        break;
      }

      case "book_lesson": {
        redirectUrl = "/apps/calendar"; // Redirect to booking widget panel
        break;
      }

      case "go_checkout": {
        if (!courseId) {
          return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
        }
        // Generates or redirects to a mock billing/checkout URL
        redirectUrl = `/checkout?courseId=${courseId}`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, redirectUrl, message });
  } catch (err: any) {
    console.error("[Button Action API] Failure:", err);
    return NextResponse.json({ error: "Action failed. Please try again." }, { status: 500 });
  }
}
