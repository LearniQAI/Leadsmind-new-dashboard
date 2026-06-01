import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { publishEvent } from "@/lib/events/EventBus";

/**
 * PayFast Webhook Receiver Route
 * Handles purchase notifications from PayFast payment processor.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    } else {
      payload = await req.json();
    }

    console.log("[PayFast Webhook] Received payment notification:", payload);

    const {
      payment_status,
      email_address,
      m_payment_id,
      custom_str1, // workspace_id
      custom_str2, // contact_id
      custom_str3, // course_id
      item_name,
      amount_gross
    } = payload;

    // Check if the payment status is COMPLETE
    if (payment_status !== "COMPLETE") {
      console.log(`[PayFast Webhook] Ignored non-COMPLETE status: ${payment_status}`);
      return NextResponse.json({ received: true, status: "ignored" });
    }

    const supabase = await createServerClient();

    // 1. Resolve Workspace ID
    const workspaceId = custom_str1 || process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;
    if (!workspaceId) {
      console.error("[PayFast Webhook] Missing workspace_id");
      return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });
    }

    // 2. Resolve Contact ID
    let contactId = custom_str2;
    if (!contactId && email_address) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", email_address)
        .single();

      if (contact) {
        contactId = contact.id;
      } else {
        // Auto-create contact record
        const { data: newContact, error: contactErr } = await supabase
          .from("contacts")
          .insert({
            workspace_id: workspaceId,
            email: email_address,
            first_name: email_address.split("@")[0] || "Customer",
            last_name: "",
            source: "PayFast"
          })
          .select("id")
          .single();

        if (!contactErr && newContact) {
          contactId = newContact.id;
        }
      }
    }

    if (!contactId) {
      console.error("[PayFast Webhook] Could not resolve contact for email:", email_address);
      return NextResponse.json({ error: "Could not resolve contact" }, { status: 400 });
    }

    // 3. Resolve Course ID (if not explicitly passed, try to match by name or payment id)
    let courseId = custom_str3;
    if (!courseId && item_name) {
      const { data: course } = await supabase
        .from("courses")
        .select("id")
        .eq("workspace_id", workspaceId)
        .ilike("title", item_name)
        .limit(1)
        .maybeSingle();

      if (course) {
        courseId = course.id;
      }
    }

    // 4. Log the transaction/activity
    await supabase.from("contact_activities").insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      type: "edit",
      description: `Paid R${amount_gross || "0.00"} via PayFast for item: ${item_name || "Course"}`,
      metadata: { payfast_payload: payload, type: "payment" }
    });

    // 5. Emit Event Bus Trigger (19-point matrix trigger #19)
    await publishEvent(workspaceId, "payfast_payment_course", contactId, {
      courseId,
      paymentId: m_payment_id,
      amount: amount_gross,
      itemName: item_name
    });

    return NextResponse.json({ success: true, processed: true });
  } catch (err: any) {
    console.error("[PayFast Webhook] Exception occurred:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
