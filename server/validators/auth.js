const { z } = require('zod');

const emailSchema = z.string().trim().toLowerCase().email('Invalid email address');

const registerSchema = z.object({
  name:         z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email:        emailSchema,
  password:     z.string().min(6, 'Password must be at least 6 characters'),
  referralCode: z.string().trim().toUpperCase().optional(),
});

const loginSchema = z.object({
  email:    emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const googleSchema = z.object({
  accessToken: z.string().min(1, 'Google access token is required'),
});

const profileSchema = z.object({
  name:  z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
}).refine(d => d.name !== undefined || d.email !== undefined || d.phone !== undefined, {
  message: 'Provide at least one field to update',
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword:     z.string().min(6, 'New password must be at least 6 characters'),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const verifyEmailSchema = z.object({
  otp: z.string().trim().length(6, 'Please enter the 6-digit code.'),
});

module.exports = {
  registerSchema,
  loginSchema,
  googleSchema,
  profileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
};
