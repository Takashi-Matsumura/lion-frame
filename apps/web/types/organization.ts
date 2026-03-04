import type { DataManagementTranslation } from "@/app/admin/data-management/translations";

/**
 * Manager reference (used in org tree)
 */
export interface OrgManager {
  id: string;
  name: string;
  position: string;
}

/**
 * Course in organization tree
 */
export interface OrgCourse {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  manager: OrgManager | null;
}

/**
 * Section in organization tree
 */
export interface OrgSection {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  courses: OrgCourse[];
  manager: OrgManager | null;
}

/**
 * Department in organization tree
 */
export interface OrgDepartment {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  sections: OrgSection[];
  manager: OrgManager | null;
}

/**
 * Organization summary
 */
export interface OrgSummary {
  id: string;
  name: string;
  employeeCount: number;
}

/**
 * Organization tree data (from /api/admin/organization)
 */
export interface OrganizationData {
  organization: OrgSummary | null;
  departments: OrgDepartment[];
}

/**
 * Employee data for organization view
 */
export interface OrgEmployeeData {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  position: string;
  email: string | null;
  isActive: boolean;
  department: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
}

/**
 * Organization unit type
 */
export type UnitType = "department" | "section" | "course";

/**
 * Selected unit for manager assignment
 */
export interface SelectedUnit {
  type: UnitType;
  id: string;
  name: string;
  currentManager: OrgManager | null;
}

/**
 * Organization publish status
 */
export type OrganizationStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED";

/**
 * Auto-assign manager result
 */
export interface AutoAssignResult {
  type: "department" | "section" | "course";
  unitId: string;
  unitName: string;
  managerId: string;
  managerName: string;
  managerPosition: string;
  positionLevel: string;
}

/**
 * Auto-assign skipped entry
 */
export interface AutoAssignSkipped {
  type: string;
  unitId: string;
  unitName: string;
  reason: "already_assigned" | "no_candidates";
}

/**
 * Publish settings for organization
 */
export interface PublishSettings {
  id: string;
  name: string;
  status: OrganizationStatus;
  publishAt: string | null;
  publishedAt: string | null;
}

/**
 * Manager candidate (from manager-candidates API)
 */
export interface ManagerCandidate {
  id: string;
  employeeId: string;
  name: string;
  position: string;
}

/**
 * OrganizeTab component props
 */
export interface OrganizeTabProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
}

/**
 * Group-level manager map (name-based lookup for cross-org comparison)
 */
export interface GroupManagerMap {
  departments: Map<string, OrgManager>;
  sections: Map<string, OrgManager>;   // key: "deptName\0sectName"
  courses: Map<string, OrgManager>;    // key: "deptName\0sectName\0courseName"
}
