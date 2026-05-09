const { z } = require('zod');

const createContributionSchema = z.object({
  amount:      z.coerce.number().positive('Amount must be a positive number').max(100_000_000),
  month:       z.coerce.number().int().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12'),
  year:        z.coerce.number().int().min(2020, 'Year is out of valid range').max(2100, 'Year is out of valid range'),
  note:        z.string().max(500).optional().default(''),
  groupId:     z.string().optional(),
  cycleNumber: z.coerce.number().int().min(1).optional().default(1),
});

const updateStatusSchema = z.object({
  status:        z.enum(['verified', 'rejected', 'pending'], { errorMap: () => ({ message: 'Invalid status' }) }),
  rejectionNote: z.string().max(500).optional(),
});

const resubmitSchema = z.object({
  note: z.string().max(500).optional(),
});

module.exports = { createContributionSchema, updateStatusSchema, resubmitSchema };
