import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as dashboardService from "../services/dashboard.service";

export async function getMyDashboard(req: Request, res: Response) {
  const { id, roleName } = req.user!;

  if (roleName === "Admin") {
    return success(res, { role: "Admin", ...(await dashboardService.getAdminDashboard()) });
  }
  if (roleName === "Mentor") {
    return success(res, { role: "Mentor", ...(await dashboardService.getMentorDashboard(id)) });
  }
  if (roleName === "Cohort Manager") {
    return success(res, { role: "Cohort Manager", ...(await dashboardService.getManagerDashboard(id)) });
  }
  return success(res, { role: "Student", ...(await dashboardService.getStudentDashboard(id)) });
}
