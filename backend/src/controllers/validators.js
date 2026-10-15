import { z } from 'zod';

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character (e.g. @ # $)');

export const txnPasswordRule = z.string().min(6, 'Transaction password must be at least 6 characters').max(64);

export const registerSchema = z
  .object({
    sponsorId: z.string().trim().min(1, 'Sponsor ID / referral code is required'),
    fullName: z.string().trim().min(2, 'Enter your full name').max(80),
    mobile: z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    dob: z.coerce.date({ error: 'Enter your date of birth' }),
    country: z.string().trim().min(2).default('India'),
    aadhaar: z.string().trim().regex(/^\d{12}$/, 'Aadhaar number must be 12 digits'),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{4,20}$/, 'Username must be 4–20 letters, numbers or underscore'),
    password: passwordRule,
    confirmPassword: z.string(),
    txnPassword: txnPasswordRule,
    confirmTxnPassword: z.string(),
    packageId: z.string().min(1, 'Select a course bundle'),
    otp: z.string().trim().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
  .refine((d) => d.txnPassword === d.confirmTxnPassword, { message: 'Transaction passwords do not match', path: ['confirmTxnPassword'] })
  .refine((d) => d.txnPassword !== d.password, { message: 'Transaction password must be different from login password', path: ['txnPassword'] })
  .refine(
    (d) => {
      const age = (Date.now() - d.dob.getTime()) / (365.25 * 86400000);
      return age >= 18 && age < 110;
    },
    { message: 'You must be at least 18 years old', path: ['dob'] },
  );

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your username or member ID'),
  password: z.string().min(1, 'Enter your password'),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordRule, confirmPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export const changeTxnPasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your login password'), newTxnPassword: txnPasswordRule, confirmTxnPassword: z.string() })
  .refine((d) => d.newTxnPassword === d.confirmTxnPassword, { message: 'Transaction passwords do not match', path: ['confirmTxnPassword'] });

export const kycSchema = z.object({
  aadhaarNumber: z.string().trim().regex(/^\d{12}$/, 'Aadhaar number must be 12 digits'),
  panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  bankName: z.string().trim().min(2, 'Enter bank name'),
  accountHolder: z.string().trim().min(2, 'Enter account holder name'),
  accountNumber: z.string().trim().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
  ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC (e.g. SBIN0001234)'),
});

export const withdrawalSchema = z.object({
  amount: z.coerce.number().positive('Enter a valid amount'),
  txnPassword: z.string().min(1, 'Enter your transaction password'),
  otp: z.string().trim().optional(),
});

export const withdrawalOtpSchema = z.object({ amount: z.coerce.number().positive('Enter a valid amount') });

export const registerOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  fullName: z.string().trim().max(80).optional(),
});

const usernameRef = z.string().trim().toLowerCase().max(40).optional();

export const transferSchema = z
  .object({
    target: z.enum(['self', 'member'], { error: 'Choose where to transfer the money' }),
    username: usernameRef,
    amount: z.coerce.number().positive('Enter a valid amount'),
    txnPassword: z.string().min(1, 'Enter your transaction password'),
    remarks: z.string().trim().max(120).optional(),
  })
  .refine((d) => d.target === 'self' || Boolean(d.username), { message: 'Enter the member’s username', path: ['username'] });

export const walletPurchaseSchema = z.object({
  packageId: z.string().min(1, 'Select a course bundle'),
  wallet: z.enum(['main', 'activation'], { error: 'Choose the wallet to pay from' }),
  username: usernameRef,
  txnPassword: z.string().min(1, 'Enter your transaction password'),
});
