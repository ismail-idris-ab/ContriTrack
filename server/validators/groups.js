const { z } = require('zod');

const rotationTypes = ['fixed', 'join-order', 'random', 'bid'];
const frequencies   = ['weekly', 'biweekly', 'monthly', 'yearly'];

const frequencyFields = {
  contributionFrequency: z.enum(frequencies).optional().default('monthly'),
  startDate:      z.coerce.date().optional().nullable(),
  dueDayOfWeek:   z.coerce.number().int().min(0).max(6).optional().nullable(),
  dueDayOfMonth:  z.coerce.number().int().min(1).max(28).optional().nullable(),
  dueMonth:       z.coerce.number().int().min(1).max(12).optional().nullable(),
};

function addFrequencyRefine(schema) {
  return schema.superRefine((data, ctx) => {
    const freq = data.contributionFrequency || 'monthly';
    if ((freq === 'weekly' || freq === 'biweekly') && data.dueDayOfWeek == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDayOfWeek'], message: 'dueDayOfWeek is required for weekly/biweekly circles' });
    }
    if ((freq === 'weekly' || freq === 'biweekly') && !data.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'startDate is required for weekly/biweekly circles' });
    }
    if (freq === 'yearly' && data.dueMonth == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueMonth'], message: 'dueMonth is required for yearly circles' });
    }
    if (freq === 'yearly' && data.dueDayOfMonth == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDayOfMonth'], message: 'dueDayOfMonth is required for yearly circles' });
    }
  });
}

const createGroupSchema = addFrequencyRefine(z.object({
  name:               z.string().trim().min(1, 'Group name is required').max(100),
  description:        z.string().max(500).optional().default(''),
  contributionAmount: z.coerce.number().min(0).optional().default(0),
  dueDay:             z.coerce.number().int().min(1).max(28).optional().default(25),
  graceDays:          z.coerce.number().int().min(0).max(7).optional().default(3),
  rotationType:       z.enum(rotationTypes).optional().default('fixed'),
  ...frequencyFields,
}));

const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(1, 'Invite code is required'),
});

const updateGroupSchema = z.object({
  name:               z.string().trim().min(1, 'Group name cannot be empty').max(100).optional(),
  description:        z.string().max(500).optional(),
  contributionAmount: z.coerce.number().min(0, 'contributionAmount must be a non-negative number').optional(),
});

const updateSettingsSchema = addFrequencyRefine(z.object({
  name:               z.string().trim().min(1, 'Group name is required').max(100).optional(),
  description:        z.string().max(500).optional(),
  contributionAmount: z.coerce.number().min(0, 'Invalid contribution amount').optional(),
  dueDay:             z.coerce.number().int().min(1, 'Due day must be between 1 and 28').max(28, 'Due day must be between 1 and 28').optional(),
  graceDays:          z.coerce.number().int().min(0, 'Grace period must be between 0 and 7 days').max(7, 'Grace period must be between 0 and 7 days').optional(),
  rotationType:       z.enum(rotationTypes, { errorMap: () => ({ message: 'Invalid rotation type' }) }).optional(),
  ...frequencyFields,
}));

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'], { errorMap: () => ({ message: 'Role must be "admin" or "member"' }) }),
});

const saveTemplateSchema = z.object({
  name:        z.string().trim().min(1, 'Template name is required').max(80),
  description: z.string().max(200).optional().default(''),
  icon:        z.string().optional().default('◎'),
});

module.exports = {
  createGroupSchema,
  joinGroupSchema,
  updateGroupSchema,
  updateSettingsSchema,
  updateMemberRoleSchema,
  saveTemplateSchema,
};
