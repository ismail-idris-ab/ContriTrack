const { z } = require('zod');

const rotationTypes = ['fixed', 'join-order', 'random', 'bid'];

const createGroupSchema = z.object({
  name:               z.string().trim().min(1, 'Group name is required').max(100),
  description:        z.string().max(500).optional().default(''),
  contributionAmount: z.coerce.number().min(0).optional().default(0),
  dueDay:             z.coerce.number().int().min(1).max(28).optional().default(25),
  graceDays:          z.coerce.number().int().min(0).max(7).optional().default(3),
  rotationType:       z.enum(rotationTypes).optional().default('fixed'),
});

const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(1, 'Invite code is required'),
});

const updateGroupSchema = z.object({
  name:               z.string().trim().min(1, 'Group name cannot be empty').max(100).optional(),
  description:        z.string().max(500).optional(),
  contributionAmount: z.coerce.number().min(0, 'contributionAmount must be a non-negative number').optional(),
});

const updateSettingsSchema = z.object({
  name:               z.string().trim().min(1, 'Group name is required').max(100).optional(),
  description:        z.string().max(500).optional(),
  contributionAmount: z.coerce.number().min(0, 'Invalid contribution amount').optional(),
  dueDay:             z.coerce.number().int().min(1, 'Due day must be between 1 and 28').max(28, 'Due day must be between 1 and 28').optional(),
  graceDays:          z.coerce.number().int().min(0, 'Grace period must be between 0 and 7 days').max(7, 'Grace period must be between 0 and 7 days').optional(),
  rotationType:       z.enum(rotationTypes, { errorMap: () => ({ message: 'Invalid rotation type' }) }).optional(),
});

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
