import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { lms_enroll, lms_enroll_bundle } from "@/lib/automation/lms_actions";

/**
 * API route to execute inline page-builder button background automation actions
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
