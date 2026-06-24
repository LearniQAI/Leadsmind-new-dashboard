import { sendEmail } from '@/lib/email';

export async function sendVerificationEmail(email: string, token: string) {
  const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token_hash=${token}&type=signup&next=/`;
  
  await sendEmail({
    to: email,
    subject: 'Verify your LeadsMind account',
    html: `
      <div style="font-family: sans-serif; padding: 40px; color: #333; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
          <h2 style="color: #6c47ff; font-size: 24px; font-weight: 900; margin-bottom: 20px;">WELCOME TO THE ACADEMY</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #666;">You're just one step away from dominating your industry. Verify your account to get started.</p>
          <div style="margin: 40px 0;">
            <a href="${verificationLink}" style="background-color: #6c47ff; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; display: inline-block;">Verify Account</a>
          </div>
          <p style="font-size: 12px; color: #999;">If you didn't create an account, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px;">&copy; 2026 LeadsMind Digital Solutions</p>
        </div>
      </div>
    `
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token_hash=${token}&type=recovery&next=/auth/reset-password`;

  await sendEmail({
    to: email,
    subject: 'Reset your LeadsMind password',
    html: `
      <div style="font-family: sans-serif; padding: 40px; color: #333; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
          <h2 style="color: #6c47ff; font-size: 24px; font-weight: 900; margin-bottom: 20px;">PASSWORD RESET</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #666;">We received a request to reset your password. Click the button below to secure your account.</p>
          <div style="margin: 40px 0;">
            <a href="${resetLink}" style="background-color: #6c47ff; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #999;">If you didn't request a password reset, please secure your account immediately.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px;">&copy; 2026 LeadsMind Digital Solutions</p>
        </div>
      </div>
    `
  });
}
