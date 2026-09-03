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
} from "./settings/primitives";

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

      const res = await updateCoursePricing(course.id, {
        pricing_model: pricingModel,
        price: pricingModel === "free" ? 0 : numericPrice,
        subscription_interval: pricingModel === "subscription" ? subInterval : null,
        enrolment_cap: parsedCap,
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
