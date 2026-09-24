import dashboardNav from "@/data/dashboard-nav";
import { ALWAYS_GRANTED, roleImpliedModules, type ModuleKey } from "@/lib/permissions/modules";

export interface PermissionModuleOption {
  id: ModuleKey;
  label: string;
  icon: string; // same FA/icomoon class the sidebar renders
}

/** The Team modals' "Module permissions" list — literally the sidebar's sections, in order. */
export const PERMISSION_MODULES: PermissionModuleOption[] = dashboardNav.map((m) => ({
  id: m.module,
  label: m.label,
  icon: m.icon,
}));

/** Modules shown as ticked-and-locked for this role (can't be unticked meaningfully). */
export function lockedModulesForRole(role: string): ModuleKey[] {
  return [...ALWAYS_GRANTED, ...roleImpliedModules(role)];
}
