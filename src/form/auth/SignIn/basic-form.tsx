"use client";
import ErrorMessage from "@/components/error-message/ErrorMessage";
import { ISignInForm } from "@/interface";
import { Checkbox, FormControlLabel } from "@mui/material";
import Link from "next/link";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WorkspacePicker } from "@/components/auth/WorkspacePicker";
import { Workspace } from "@/types/workspace.types";
import { setActiveWorkspace, notifySignIn, getEmailByUsername } from "@/app/actions/auth";
import { Eye, EyeOff } from "lucide-react";

const inputClass =
 "w-full px-4 py-3 border-[1.5px] border-[#E2E8F0] rounded-[10px] text-[15px] text-[#0F172A] bg-white outline-none transition-colors duration-150 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 disabled:opacity-60";
const labelClass = "block text-[13px] font-semibold text-[#374151] mb-1.5";

const SignInBasicForm = () => {
 const [isPasswordVisible, setIsPasswordVisible] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [showPicker, setShowPicker] = useState(false);
 const [workspaces, setWorkspaces] = useState<(Workspace & { role: string })[]>([]);
 
 const router = useRouter();
 const searchParams = useSearchParams();
 const next = searchParams ? searchParams.get('next') : null;
 const supabase = createClient();

 const {
  register,
  handleSubmit,
  formState: { errors },
 } = useForm<ISignInForm>();

 const onSubmit = async (values: ISignInForm) => {
  setIsLoading(true);
  try {
    let emailToUse = values.name.trim();

    // Resolve username to email if it does not look like an email address
    if (!emailToUse.includes('@')) {
     const resolveRes = await getEmailByUsername(emailToUse);
     if (resolveRes.success && resolveRes.email) {
      emailToUse = resolveRes.email;
     } else {
      toast.error("Incorrect email/username or password. Please try again.");
      setIsLoading(false);
      return;
     }
    }

    // Step 1: Authenticate
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
     email: emailToUse,
     password: values.password,
    });

   if (authError) {
    toast.error("Incorrect email or password. Please try again.");
    return;
   }

   if (!authData.user) {
    toast.error("Login succeeded but no user session returned. Please try again.");
    return;
   }

   // Notify user of sign-in
   notifySignIn(authData.user.email!).catch(console.error);

   // Step 2: Fetch workspace memberships
   const { data: memberships, error: wsError } = await supabase
    .from("workspace_members")
    .select(`
     role,
     workspaces (
      id, name, slug, logo_url, owner_id, plan_tier, created_at
     )
    `)
    .eq("user_id", authData.user.id);

   if (wsError) {
    console.error("[LoginForm] Error fetching workspaces:", wsError);
    toast.error("Unable to load your workspace. Please try again.");
    return;
   }

   interface RawWorkspace {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    owner_id: string;
    plan_tier: "free" | "pro" | "enterprise";
    created_at: string;
   }

   const formattedWorkspaces = (memberships ?? [])
    .filter((m) => m.workspaces)
    .map((m) => {
     const ws = m.workspaces as unknown as RawWorkspace;
     return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      logoUrl: ws.logo_url,
      ownerId: ws.owner_id,
      plan: ws.plan_tier,
      createdAt: ws.created_at,
      role: m.role,
     } as Workspace & { role: string };
    });

   if (formattedWorkspaces.length === 0) {
    toast.error("No workspace found for this account.");
    window.location.href = "/auth/signin-basic?error=no_workspace";
    return;
   }

   if (formattedWorkspaces.length === 1) {
    const switchResult = await setActiveWorkspace(formattedWorkspaces[0].id);
    if (!switchResult.success) {
     toast.error(switchResult.error || "Unable to switch workspace. Please try again.");
     setIsLoading(false);
     return;
    }
    toast.success("Welcome back!");
    setTimeout(() => {
     window.location.href = next || "/dashboard";
    }, 100);
   } else {
    setWorkspaces(formattedWorkspaces);
    setShowPicker(true);
    setIsLoading(false);
   }
  } catch (error) {
   console.error("[LoginForm] Unexpected error:", error);
   toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
  } finally {
   setIsLoading(false);
  }
 };

 async function handleWorkspaceSelect(workspace: Workspace) {
  const switchResult = await setActiveWorkspace(workspace.id);
  if (!switchResult.success) {
   toast.error(switchResult.error || "Unable to switch workspace. Please try again.");
   return;
  }
  toast.success(`Switched to ${workspace.name}`);
  setTimeout(() => {
   window.location.href = next || "/dashboard";
  }, 100);
 }

 //password visibility handle
 const togglePasswordVisibility = () => {
  setIsPasswordVisible(!isPasswordVisible);
 };

 if (showPicker) {
  return (
   <div className="animate-fade-up">
    <WorkspacePicker workspaces={workspaces} onSelect={handleWorkspaceSelect} />
   </div>
  );
 }

 return (
  <>
   <form onSubmit={handleSubmit(onSubmit)}>
    <div className="flex flex-col gap-3 mb-5">
     <div className="from__input-box">
      <label htmlFor="nameEmail" className={labelClass}>Email or Username</label>
      <div className="form__input">
       <input
        className={inputClass}
        id="nameEmail"
        type="text"
        disabled={isLoading}
        {...register("name", {
         required: "Email or Username is required",
        })}
       />
       <ErrorMessage error={errors.name} />
      </div>
     </div>
     <div className="from__input-box">
      <div className="flex justify-between items-center mb-1.5">
       <label htmlFor="passwordInput" className="text-[13px] font-semibold text-[#374151]">Password</label>
       <Link href="/auth/forgot-password-basic">
        <small className="text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors">Forgot Password?</small>
       </Link>
      </div>
      <div className="form__input relative">
       <input
        className={`${inputClass} pr-11`}
        type={isPasswordVisible ? "text" : "password"}
        id="passwordInput"
        disabled={isLoading}
        {...register("password", { required: "Password is required" })}
       />
       <div
        className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-[#94A3B8] hover:text-[#4F46E5] transition-colors"
        onClick={togglePasswordVisibility}
       >
        {isPasswordVisible ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
       </div>
       <ErrorMessage error={errors.password} />
      </div>
     </div>
    </div>
    <div className="mb-4">
     <div className="form-check">
      <FormControlLabel
       control={
        <Checkbox
         className="custom-checkbox"
         disabled={isLoading}
         sx={{ color: "#CBD5E1", "&.Mui-checked": { color: "#4F46E5" } }}
         {...register("rememberMe")}
        />
       }
       label={<span className="text-[13px] font-medium text-[#374151]">Remember Me</span>}
      />
     </div>
    </div>
    <div>
     <button
      className="w-full rounded-[10px] py-3.5 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      style={{ background: "linear-gradient(135deg, #4F46E5, #6366F1)" }}
      type="submit"
      disabled={isLoading}
     >
      {isLoading ? "Signing in..." : "Sign in"}
     </button>
    </div>
   </form>
  </>
 );
};

export default SignInBasicForm;
