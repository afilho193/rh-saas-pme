import express from 'express';
import * as authController from '../controllers/authController.js';
import * as employeeController from '../controllers/employeeController.js';
import * as documentController from '../controllers/documentController.js';
import * as payrollController from '../controllers/payrollController.js';
import * as leaveController from '../controllers/leaveController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Auth
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Protected routes
router.use(authMiddleware);

// Employees
router.get('/employees', employeeController.getEmployees);
router.post('/employees', employeeController.createEmployee);
router.put('/employees/:id', employeeController.updateEmployee);
router.delete('/employees/:id', employeeController.deleteEmployee);

// Documents
router.get('/documents/:employeeId', documentController.getDocuments);
router.post('/documents/:employeeId', documentController.uploadDocument);
router.delete('/documents/:id', documentController.deleteDocument);
router.get('/documents/expiring/list', documentController.getExpiringDocuments);

// Payroll
router.get('/payroll', payrollController.getPayrolls);
router.post('/payroll', payrollController.createPayroll);
router.get('/payroll/:id/details', payrollController.getPayrollDetails);
router.post('/payroll/:id/items', payrollController.addPayrollItem);
router.put('/payroll/:id/items/:itemId', payrollController.updatePayrollItem);
router.post('/payroll/:id/approve', payrollController.approvePayroll);

// Leave
router.get('/leave-requests', leaveController.getLeaveRequests);
router.post('/leave-requests', leaveController.createLeaveRequest);
router.put('/leave-requests/:id/approve', leaveController.approveLeaveRequest);
router.put('/leave-requests/:id/reject', leaveController.rejectLeaveRequest);
router.get('/leave-balance/:employeeId', leaveController.getLeaveBalance);

// Dashboard
router.get('/dashboard/summary', dashboardController.getSummary);

export default router;
