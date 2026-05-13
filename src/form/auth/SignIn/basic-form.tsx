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
import { setActiveWorkspace, notifySignIn } from "@/app/actions/auth";

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
   // Step 1: Authenticate
   const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    // The UI uses 'name' for Email or Username, we map it to email for Supabase
    email: values.name,
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
    toast.success("Logged in successfully!");
    setTimeout(() => {
     window.location.href = next || "/";
    }, 100);
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
    console.warn("[LoginForm] No workspaces found — redirecting to dashboard to auto-create");
    toast.success("Logged in! Setting up your workspace...");
    setTimeout(() => {
     window.location.href = next || "/";
    }, 100);
    return;
   }

   if (formattedWorkspaces.length === 1) {
    await fetch("/api/workspace/active", {
     method: "POST",
     body: JSON.stringify({ workspaceId: formattedWorkspaces[0].id }),
    });
    toast.success("Welcome back!");
    setTimeout(() => {
     window.location.href = next || "/";
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
  await setActiveWorkspace(workspace.id);
  toast.success(`Switched to ${workspace.name}`);
  setTimeout(() => {
   window.location.href = next || "/";
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
    <div className="from__input-box">
     <div className="form__input-title">
      <label htmlFor="nameEmail">Email or Username</label>
     </div>
     <div className="form__input">
      <input
       className="form-control"
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
     <div className="form__input-title flex justify-between">
      <label htmlFor="passwordInput">Password</label>
      <Link href="/auth/auth-forgot-password-basic">
       <small>Forgot Password?</small>
      </Link>
     </div>
     <div className="form__input">
      <input
       className="form-control"
       type={isPasswordVisible ? "text" : "password"}
       id="passwordInput"
       disabled={isLoading}
       {...register("password", { required: "Password is required" })}
      />
      <ErrorMessage error={errors.password} />
      <div className="pass-icon" onClick={togglePasswordVisibility}>
       <i
        className={`fa-sharp fa-light ${
         isPasswordVisible ? "fa-eye" : "fa-eye-slash"
        }`}
       ></i>
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
         {...register("rememberMe")}
        />
       }
       label="Remember Me"
      />
     </div>
    </div>
    <div className="mb-4">
     <button className="btn btn-gradient w-full" type="submit" disabled={isLoading}>
      {isLoading ? "Signing in..." : "Sign in"}
     </button>
    </div>
   </form>
  </>
 );
};

export default SignInBasicForm;
