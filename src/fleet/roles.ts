/** Group roles and their colors (spec habillage §4.1, §11.2). */
export type RoleId = "frontend" | "backend" | "testers" | "reviewers" | "design" | "docs" | "security" | "general";

export interface Role {
  label: string;
  color: string;
}

export const ROLES: Record<RoleId, Role> = {
  frontend: { label: "Frontend", color: "#C18E57" },
  backend: { label: "Backend", color: "#AA88D2" },
  testers: { label: "Testeurs", color: "#86A174" },
  reviewers: { label: "Relecteurs", color: "#90B1D4" },
  design: { label: "Design", color: "#CE7B8F" },
  docs: { label: "Docs", color: "#77B7C0" },
  security: { label: "Sécurité", color: "#D88479" },
  general: { label: "Général", color: "#8A8A80" },
};

export const ROLE_ORDER = Object.keys(ROLES) as RoleId[];

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ROLES, value);
}
