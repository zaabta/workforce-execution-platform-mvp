/** Permission codes that govern the Daily Plan feature (SDD 8.2, 12.3). */
export const DAILY_PLAN_PERMISSIONS = {
  CREATE: 'daily_plan.create',
  UPDATE: 'daily_plan.update',
  DELETE: 'daily_plan.delete',
  ASSIGN: 'daily_plan.assign',
  START_EXECUTION: 'daily_plan.start_execution',
  SUBMIT: 'daily_plan.submit',
  RESUBMIT: 'daily_plan.resubmit',
  APPROVE_SITE_CHIEF: 'daily_plan.approve.site_chief',
  APPROVE_PROJECT_MANAGER: 'daily_plan.approve.project_manager',
  REJECT: 'daily_plan.reject',
  COMPLETE: 'daily_plan.complete',
} as const;
