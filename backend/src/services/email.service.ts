import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface SendShareEmailOptions {
  to: string;
  recipientName?: string | null;
  sharerName?: string | null;
  sharerEmail: string;
  resourceName: string;
  resourceType: 'file' | 'folder';
  role: 'viewer' | 'editor';
  accessUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  simulated?: boolean;
  rawMessage?: any;
  error?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor(customTransporter?: Transporter) {
    if (customTransporter) {
      this.transporter = customTransporter;
      this.isConfigured = true;
    } else {
      this.initTransporter();
    }
  }

  /**
   * Initializes the Nodemailer SMTP transporter using environment variables.
   */
  private initTransporter(): void {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        },
        connectionTimeout: 10000 // 10 seconds timeout
      });
      this.isConfigured = true;
      logger.info(`📧 Nodemailer SMTP transporter configured (${env.SMTP_HOST}:${env.SMTP_PORT})`);
    } else {
      this.isConfigured = false;
      logger.info('ℹ️ SMTP is not fully configured. Email notifications will run in simulated logging mode.');
    }
  }

  /**
   * Check if SMTP is configured.
   */
  public hasSmtpConfig(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Verifies SMTP connection health.
   */
  public async verifyConnection(): Promise<{ ok: boolean; message?: string }> {
    if (!this.transporter || !this.isConfigured) {
      return { ok: false, message: 'SMTP credentials are not configured in environment.' };
    }

    try {
      await this.transporter.verify();
      return { ok: true };
    } catch (err: any) {
      logger.error(`SMTP verification failed: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  /**
   * Sends an email notification when a file or folder is shared with a user.
   */
  public async sendShareNotification(options: SendShareEmailOptions): Promise<SendEmailResult> {
    const {
      to,
      recipientName,
      sharerName,
      sharerEmail,
      resourceName,
      resourceType,
      role,
      accessUrl = `${env.CLIENT_ORIGIN}/dashboard?tab=shared`
    } = options;

    const senderDisplay = sharerName ? `${sharerName} (${sharerEmail})` : sharerEmail;
    const recipientGreeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
    const capitalizedType = resourceType === 'file' ? 'File' : 'Folder';
    const roleBadge = role === 'editor' ? 'Editor (Can View & Edit)' : 'Viewer (Read Only)';
    const roleColor = role === 'editor' ? '#8b5cf6' : '#3b82f6';
    const subject = `${senderDisplay} shared a ${resourceType} with you: "${resourceName}"`;

    const textContent = `
${recipientGreeting}

${senderDisplay} has shared a ${resourceType} with you on CloudVault.

Item Details:
- Name: ${resourceName}
- Type: ${capitalizedType}
- Access Level: ${roleBadge}

Access it here: ${accessUrl}

If you did not expect this email, please contact support or ignore this message.
CloudVault Media Storage Service
`.trim();

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background: linear-gradient(180deg, #161e2e 0%, #0f172a 100%);
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
      border-bottom: 1px solid #1e293b;
      text-align: center;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 9999px;
      color: #818cf8;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .header-title {
      margin: 16px 0 0 0;
      color: #f8fafc;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 15px;
      color: #94a3b8;
      margin-bottom: 16px;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #cbd5e1;
      margin-bottom: 24px;
    }
    .resource-box {
      background-color: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .resource-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #1e293b;
    }
    .resource-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .resource-label {
      font-size: 13px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .resource-value {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      word-break: break-all;
    }
    .role-tag {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
      background-color: ${roleColor};
    }
    .cta-container {
      text-align: center;
      margin-top: 32px;
      margin-bottom: 20px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 36px;
      border-radius: 10px;
      box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);
    }
    .footer {
      padding: 24px 32px;
      border-top: 1px solid #1e293b;
      background-color: #090d16;
      text-align: center;
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-badge">☁️ CloudVault Share</div>
        <h1 class="header-title">${capitalizedType} Shared With You</h1>
      </div>
      <div class="content">
        <p class="greeting">${recipientGreeting}</p>
        <p class="message">
          <strong>${senderDisplay}</strong> has granted you access to a ${resourceType} on CloudVault.
        </p>

        <div class="resource-box">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 13px; font-weight: 600;">ITEM NAME</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #f1f5f9; font-size: 14px; font-weight: 600; text-align: right;">${resourceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 13px; font-weight: 600;">TYPE</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #cbd5e1; font-size: 14px; text-align: right;">${capitalizedType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">PERMISSIONS</td>
              <td style="padding: 8px 0; text-align: right;">
                <span class="role-tag">${roleBadge}</span>
              </td>
            </tr>
          </table>
        </div>

        <div class="cta-container">
          <a href="${accessUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">
            Open Shared ${capitalizedType} &rarr;
          </a>
        </div>
      </div>
      <div class="footer">
        <p>This automated message was sent by CloudVault Media Storage Service because a resource was shared with your email address.</p>
        <p>&copy; ${new Date().getFullYear()} CloudVault. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

    // If SMTP is not configured, gracefully simulate and log
    if (!this.transporter || !this.isConfigured) {
      logger.info(`[Email Simulation] Would send share notification to: ${to}`);
      logger.info(`[Email Simulation] Subject: ${subject}`);
      logger.info(`[Email Simulation] Resource: ${resourceName} (${capitalizedType}) for ${senderDisplay}`);
      return {
        success: true,
        simulated: true,
        messageId: `simulated-${Date.now()}`
      };
    }

    try {
      const mailOptions = {
        from: env.SMTP_FROM,
        to,
        subject,
        text: textContent,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);

      logger.info(`✅ Share notification email sent successfully to ${to} (MessageId: ${info.messageId})`);
      if (previewUrl) {
        logger.info(`📨 Test email preview URL: ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: previewUrl || undefined,
        simulated: false,
        rawMessage: (info as any).message
      };
    } catch (error: any) {
      logger.error(`❌ Failed to send share notification email to ${to}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const emailService = new EmailService();
