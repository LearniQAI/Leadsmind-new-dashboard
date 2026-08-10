"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";

export default function NotFoundPage() {
    const { user } = useDashboardContext();

    const primaryHref = user ? "/dashboard" : "/";
    const primaryLabel = user ? "Back to Dashboard" : "Back to Home";

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-6 py-12">
            <div className="max-w-3xl w-full bg-white dark:bg-card-dark rounded-2xl shadow-lg border border-dash-border p-8 lg:p-12 text-center">
                <div className="flex items-center justify-center mb-6">
                    <Image
                        src="/assets/images/brand/LeadsMind_Logo.png.png"
                        alt="LeadsMind"
                        width={160}
                        height={40}
                        className="object-contain"
                    />
                </div>

                <div className="mb-6">
                    <h1 className="text-3xl md:text-4xl font-extrabold !text-dash-text mb-3">
                        Page not found
                    </h1>
                    <p className="text-sm md:text-base !text-dash-textMuted max-w-[640px] mx-auto">
                        Looks like you’ve reached a page that doesn’t exist anymore — it may have been
                        moved or the link is out of date. Let’s get you back where you belong.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                    <Link
                        href={primaryHref}
                        className="inline-flex items-center justify-center bg-dash-accent hover:bg-dash-accent/90 text-white rounded-full px-6 py-3 font-semibold shadow-sm transition-colors"
                    >
                        {primaryLabel}
                    </Link>

                    <Link
                        href="/support"
                        className="text-sm text-dash-textMuted hover:!text-dash-text mt-1 sm:mt-0"
                    >
                        Contact support
                    </Link>
                </div>

                <div className="mt-8 opacity-80">
                    <svg width="240" height="84" viewBox="0 0 480 168" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                        <defs>
                            <linearGradient id="g1" x1="0" x2="1">
                                <stop offset="0%" stopColor="#1359FF"/>
                                <stop offset="100%" stopColor="#7B3FF2"/>
                            </linearGradient>
                        </defs>
                        <rect x="0" y="20" width="480" height="128" rx="24" fill="url(#g1)" opacity="0.08" />
                        <circle cx="110" cy="84" r="36" fill="#1359FF" opacity="0.12" />
                        <circle cx="370" cy="84" r="26" fill="#7B3FF2" opacity="0.10" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
