"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Loader2,
  Users,
  ShieldCheck,
  CreditCard,
  Gift,
  Tag,
  RefreshCw,
  Lock,
  Info,
  Mail,
  Zap,
  Eye,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { updateCoursePricing, getWorkspacePaymentIntegration } from "@/app/actions/courseCommerce";
import {
  SettingsPanel,
  SettingsHeader,
  SettingsBody,
  SettingsFooter,
  Field,
  FieldGroup,
  SectionLabel,
  TextInput,
  Select,
  InputAffix,
  OptionCard,
  PrimaryButton,
  Toggle,
} from "./settings/primitives";

const START_METHODS = [
  {
    id: "instant_payment",
    label: "Instant access after payment",
    desc: "Pay once (or start a subscription) and land straight in the course. Today's default.",
    icon: <Zap />,
  },
  {
    id: "email_access_link",
    label: "Email access link",
    desc: "Student signs up, then gets a real access link by email — sent automatically or held for your approval.",
    icon: <Mail />,
  },
  {
    id: "free_preview_then_paywall",
    label: "Free preview, then paywall",
    desc: "The first N lessons (by real position) are open to anyone. The rest require payment.",
    icon: <Eye />,
  },
  {
    id: "payment_plan",
    label: "Payment plan (installments)",
    desc: "A fixed number of payments unlocks full access. Large feature — schema in place, checkout build in progress (see report).",
    icon: <CalendarClock />,
  },
] as const;

interface CoursePricingFormProps {
  course: any;
  onSaved: (updatedCourse: any) => void;
}

const MODELS = [
  { id: "free", label: "Free access", desc: "Open entry. Students skip checkout entirely.", icon: <Gift /> },
  { id: "one_time", label: "One-time", desc: "Fixed price. A single successful payment unlocks the course.", icon: <Tag /> },
  { id: "subscription", label: "Subscription", desc: "Recurring billing on a monthly or yearly cycle.", icon: <RefreshCw /> },
  { id: "hybrid", label: "Free preview", desc: "Open preview lessons, premium lessons behind checkout.", icon: <Lock /> },
] as const;

export default function CoursePricingForm({ course, onSaved }: CoursePricingFormProps) {
  const [isPending, startTransition] = useTransition();

  const [pricingModel, setPricingModel] = useState<"free" | "one_time" | "subscription" | "hybrid">(
    course.pricing_model || "free"
  );
  const [price, setPrice] = useState<string>(course.price?.toString() || "0.00");
  const [subInterval, setSubInterval] = useState<"month" | "year">(
    (course.subscription_interval as any) || "month"
  );
  const [enrolmentCap, setEnrolmentCap] = useState<string>(course.enrolment_cap?.toString() || "");

  // Course Start Methods — shared selector (Method 1 build). One method per course, matching
  // pricing_model's own single-value shape (see the client guide's own stated assumption;
  // flagged again in the final report).
  const [startMethod, setStartMethod] = useState<
    "instant_payment" | "email_access_link" | "free_preview_then_paywall" | "payment_plan"
  >((course.start_method as any) || "instant_payment");
  const [autoSendAccess, setAutoSendAccess] = useState<boolean>(course.email_access_auto_send !== false);
  const [freeLessonCount, setFreeLessonCount] = useState<string>(
    course.free_lesson_count != null ? String(course.free_lesson_count) : ""
  );
  const [numberOfPayments, setNumberOfPayments] = useState<string>(
    course.number_of_payments != null ? String(course.number_of_payments) : ""
  );
  const [paymentFailurePolicy, setPaymentFailurePolicy] = useState<
    "pause_immediately" | "grace_period" | "retry_keep_access"
  >((course.payment_failure_policy as any) || "grace_period");

  const [gatewayStatus, setGatewayStatus] = useState<{ connected: boolean }>({ connected: false });
  const [checkingGateway, setCheckingGateway] = useState(true);

  useEffect(() => {
    async function checkGateway() {
      const status = await getWorkspacePaymentIntegration();
      setGatewayStatus(status);
      setCheckingGateway(false);
    }
    checkGateway();
  }, []);

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const numericPrice = parseFloat(price);
      if (pricingModel !== "free" && (isNaN(numericPrice) || numericPrice < 0)) {
        toast.error("Invalid price value");
        return;
      }

      const parsedCap = enrolmentCap.trim() === "" ? null : parseInt(enrolmentCap);
      if (parsedCap !== null && (isNaN(parsedCap) || parsedCap < 0)) {
        toast.error("Invalid enrolment cap value");
        return;
      }

      const parsedFreeLessonCount =
        startMethod === "free_preview_then_paywall"
          ? freeLessonCount.trim() === "" ? null : parseInt(freeLessonCount)
          : undefined;
      if (
        startMethod === "free_preview_then_paywall" &&
        (parsedFreeLessonCount === null || isNaN(parsedFreeLessonCount as number) || (parsedFreeLessonCount as number) < 0)
      ) {
        toast.error("Enter how many lessons should be free (0 or more).");
        return;
      }

      const parsedNumberOfPayments =
        startMethod === "payment_plan"
          ? numberOfPayments.trim() === "" ? null : parseInt(numberOfPayments)
          : undefined;
      if (
        startMethod === "payment_plan" &&
        (parsedNumberOfPayments === null || isNaN(parsedNumberOfPayments as number) || (parsedNumberOfPayments as number) < 2)
      ) {
        toast.error("Enter a number of payments (2 or more — 1 payment is just instant access).");
        return;
      }

      const res = await updateCoursePricing(course.id, {
        pricing_model: pricingModel,
        price: pricingModel === "free" ? 0 : numericPrice,
        subscription_interval: pricingModel === "subscription" ? subInterval : null,
        enrolment_cap: parsedCap,
        start_method: startMethod,
        email_access_auto_send: startMethod === "email_access_link" ? autoSendAccess : undefined,
        free_lesson_count: parsedFreeLessonCount,
        number_of_payments: parsedNumberOfPayments,
        payment_failure_policy: startMethod === "payment_plan" ? paymentFailurePolicy : undefined,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Pricing saved.");
        onSaved({
          ...course,
          pricing_model: pricingModel,
          price: pricingModel === "free" ? 0 : numericPrice,
          subscription_interval: pricingModel === "subscription" ? subInterval : null,
          enrolment_cap: parsedCap,
          start_method: startMethod,
          email_access_auto_send: autoSendAccess,
          free_lesson_count: parsedFreeLessonCount,
          number_of_payments: parsedNumberOfPayments,
          payment_failure_policy: paymentFailurePolicy,
        });
      }
    });
  };

  const showPrice = pricingModel !== "free";
  const showInterval = pricingModel === "subscription";

  return (
    <form onSubmit={handleSavePricing}>
      <SettingsPanel>
        <SettingsHeader
          eyebrow="Pricing"
          title="Pricing & checkout"
          description="Choose how students pay for this course and where the money goes."
        />

        <SettingsBody className="space-y-8">
          <div className="space-y-3">
            <SectionLabel>Pricing model</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODELS.map((model) => (
                <OptionCard
                  key={model.id}
                  selected={pricingModel === model.id}
                  onClick={() => {
                    setPricingModel(model.id);
                    if (model.id === "free") setPrice("0.00");
                  }}
                  title={model.label}
                  description={model.desc}
                  icon={model.icon}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel>Course start method</SectionLabel>
            <p className="text-[12px] text-dash-textMuted">
              How a student actually gets from signup into this course. One method per course.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {START_METHODS.map((method) => (
                <OptionCard
                  key={method.id}
                  selected={startMethod === method.id}
                  onClick={() => setStartMethod(method.id)}
                  title={method.label}
                  description={method.desc}
                  icon={method.icon}
                />
              ))}
            </div>

            {startMethod === "email_access_link" && (
              <Toggle
                checked={autoSendAccess}
                onChange={setAutoSendAccess}
                label="Send access link automatically on signup"
                description={
                  autoSendAccess
                    ? "A student gets real access and the access-link email the moment they sign up."
                    : "Signups are held as pending — review them in the Enrollments tab and Approve to grant access + send the email."
                }
              />
            )}

            {startMethod === "free_preview_then_paywall" && (
              <Field
                label="Free lessons before payment required"
                htmlFor="pr-free-lessons"
                hint="Counted by real lesson position across the whole course (module order, then lesson order) — not manually flagged per lesson."
              >
                <TextInput
                  id="pr-free-lessons"
                  type="number"
                  min="0"
                  step="1"
                  value={freeLessonCount}
                  onChange={(e) => setFreeLessonCount(e.target.value)}
                  placeholder="e.g. 3"
                  className="max-w-[220px] font-mono"
                  required
                />
              </Field>
            )}

            {startMethod === "payment_plan" && (
              <FieldGroup>
                <Field
                  label="Number of payments"
                  htmlFor="pr-num-payments"
                  hint="A fixed Stripe billing schedule — access continues once all payments complete. See Pricing model above for the amount/interval per payment."
                >
                  <TextInput
                    id="pr-num-payments"
                    type="number"
                    min="2"
                    step="1"
                    value={numberOfPayments}
                    onChange={(e) => setNumberOfPayments(e.target.value)}
                    placeholder="e.g. 3"
                    className="max-w-[220px] font-mono"
                    required
                  />
                </Field>
                <Field
                  label="If a payment fails"
                  htmlFor="pr-failure-policy"
                  hint="What happens to access while a scheduled payment hasn't gone through."
                >
                  <Select
                    id="pr-failure-policy"
                    value={paymentFailurePolicy}
                    onChange={(e) => setPaymentFailurePolicy(e.target.value as any)}
                    className="max-w-[260px]"
                  >
                    <option value="grace_period">Grace period, then pause access</option>
                    <option value="pause_immediately">Pause access immediately</option>
                    <option value="retry_keep_access">Keep access, just retry the charge</option>
                  </Select>
                </Field>
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12px] leading-relaxed text-amber-800">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Checkout for this method (the real Stripe Subscription Schedule + webhook
                  handling) is a separate, larger build — see the Method 4 report. Saving these
                  fields does not yet change what happens at checkout.
                </div>
              </FieldGroup>
            )}
          </div>

          <div className="space-y-1">
              <SectionLabel>Terms</SectionLabel>
              <FieldGroup>
                {showPrice && (
                  <Field label="Price" htmlFor="pr-price">
                    <InputAffix affix="$">
                      <TextInput
                        id="pr-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="max-w-[220px] pl-7 font-mono"
                        required
                      />
                    </InputAffix>
                  </Field>
                )}

                {showInterval && (
                  <Field label="Billing interval" htmlFor="pr-interval">
                    <Select
                      id="pr-interval"
                      value={subInterval}
                      onChange={(e) => setSubInterval(e.target.value as "month" | "year")}
                      className="max-w-[220px]"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </Select>
                  </Field>
                )}

                <Field label="Enrolment cap" htmlFor="pr-cap">
                  <InputAffix affix={<Users className="size-3.5" />}>
                    <TextInput
                      id="pr-cap"
                      type="number"
                      min="1"
                      value={enrolmentCap}
                      onChange={(e) => setEnrolmentCap(e.target.value)}
                      placeholder="Unlimited"
                      className="max-w-[220px] pl-8 font-mono"
                    />
                  </InputAffix>
                </Field>
              </FieldGroup>
          </div>

          <div className="space-y-3">
            <SectionLabel>Checkout routing</SectionLabel>
            {checkingGateway ? (
              <div className="flex items-center gap-2 rounded-xl border border-dash-border bg-dash-surface px-4 py-3.5 text-[12px] text-dash-textMuted">
                <Loader2 className="size-3.5 animate-spin text-sky-500" />
                Checking your Stripe connection…
              </div>
            ) : gatewayStatus.connected ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <div className="space-y-0.5">
                  <div className="text-[13px] font-semibold text-emerald-800">
                    Connected to your Stripe account
                  </div>
                  <p className="text-[12px] leading-relaxed text-emerald-700/90">
                    Checkouts route straight to your linked Stripe account with no marketplace fee.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div className="space-y-0.5">
                  <div className="text-[13px] font-semibold text-amber-800">
                    Using system default checkout
                  </div>
                  <p className="text-[12px] leading-relaxed text-amber-700/90">
                    Connect your own Stripe account in workspace integrations to route payments directly to you.
                  </p>
                </div>
              </div>
            )}
          </div>
        </SettingsBody>

        <SettingsFooter
          hint={
            <span className="inline-flex items-center gap-1.5">
              <Info className="size-3.5" />
              Changes apply to new enrolments only.
            </span>
          }
        >
          <PrimaryButton type="submit" loading={isPending}>
            {isPending ? "Saving…" : "Save pricing"}
          </PrimaryButton>
        </SettingsFooter>
      </SettingsPanel>
    </form>
  );
}
