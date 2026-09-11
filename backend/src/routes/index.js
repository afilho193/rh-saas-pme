import express from 'express';
import * as authController from '../controllers/authController.js';
import * as employeeController from '../controllers/employeeController.js';
import * as documentController from '../controllers/documentController.js';
import * as payrollController from '../controllers/payrollController.js';
import * as leaveController from '../controllers/leaveController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as usersController from '../controllers/usersController.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Auth
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Protected routes
router.use(authMiddleware);

// Users (team) — reading the team is fine for any authenticated user; inviting someone
// new, like every other mutation below, is admin-only.
router.get('/users', usersController.listUsers);
router.post('/users', requireAdmin, usersController.inviteUser);

// Employees
router.get('/employees', employeeController.getEmployees);
router.post('/employees', requireAdmin, employeeController.createEmployee);
router.put('/employees/:id', requireAdmin, employeeController.updateEmployee);
router.delete('/employees/:id', requireAdmin, employeeController.deleteEmployee);

// Documents
router.get('/documents/:employeeId', documentController.getDocuments);
router.post('/documents/:employeeId', requireAdmin, documentController.uploadDocument);
router.delete('/documents/:id', requireAdmin, documentController.deleteDocument);
router.get('/documents/expiring/list', documentController.getExpiringDocuments);

// Payroll
router.get('/payroll', payrollController.getPayrolls);
router.post('/payroll', requireAdmin, payrollController.createPayroll);
router.get('/payroll/:id/details', payrollController.getPayrollDetails);
router.post('/payroll/:id/items', requireAdmin, payrollController.addPayrollItem);
router.put('/payroll/:id/items/:itemId', requireAdmin, payrollController.updatePayrollItem);
router.post('/payroll/:id/approve', requireAdmin, payrollController.approvePayroll);

// Leave
router.get('/leave-requests', leaveController.getLeaveRequests);
router.post('/leave-requests', requireAdmin, leaveController.createLeaveRequest);
router.put('/leave-requests/:id/approve', requireAdmin, leaveController.approveLeaveRequest);
router.put('/leave-requests/:id/reject', requireAdmin, leaveController.rejectLeaveRequest);
router.get('/leave-balance/:employeeId', leaveController.getLeaveBalance);

// Dashboard
router.get('/dashboard/summary', dashboardController.getSummary);

export default router;
