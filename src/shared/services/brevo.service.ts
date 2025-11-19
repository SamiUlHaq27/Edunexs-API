import { Injectable } from '@nestjs/common';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import { getSecretValue } from 'src/config/secret.config';
import { EmailOptions } from '../interfaces';

@Injectable()
export class BrevoService {
  private apiInstance: TransactionalEmailsApi;
  private defaultSender: { name: string; email: string };

  constructor() {
    this.apiInstance = new TransactionalEmailsApi();
    const auth = this.apiInstance as unknown as {
      authentications?: { apiKey?: { apiKey?: string } };
    };
    // Ensure the structure exists before assigning to avoid unsafe any access
    if (!auth.authentications) {
      auth.authentications = { apiKey: {} };
    } else if (!auth.authentications.apiKey) {
      auth.authentications.apiKey = {};
    }
    if (auth.authentications.apiKey) {
      auth.authentications.apiKey.apiKey =
        getSecretValue('BREVO_API_KEY') || '';
    }

    this.defaultSender = {
      name: getSecretValue('BREVO_SENDER_NAME') || 'Edunexs',
      email: getSecretValue('BREVO_SENDER_EMAIL') || 'no-reply@edunexs.dev',
    };
  }

  async sendEmail(options: EmailOptions): Promise<any> {
    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.htmlContent;
    sendSmtpEmail.sender = options.sender || this.defaultSender;
    sendSmtpEmail.to = options.to;

    if (options.replyTo) {
      sendSmtpEmail.replyTo = options.replyTo;
    }

    if (options.params) {
      sendSmtpEmail.params = options.params;
    }

    try {
      const data = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Email sent successfully');
      return data;
    } catch (e) {
      console.error(
        'Failed to send email:',
        e instanceof Error ? e?.message : '',
      );
      throw e;
    }
  }

  async sendWelcomeEmail(
    email: string,
    name: string,
    username: string,
  ): Promise<any> {
    return this.sendEmail({
      to: [{ email, name }],
      subject: 'Welcome to Edunexs!',
      htmlContent: `
        <html>
          <body>
            <h1>Welcome ${name}!</h1>
            <p>Thank you for signing up with username: <strong>${username}</strong></p>
            <p>We're excited to have you on board!</p>
          </body>
        </html>
      `,
    });
  }
}
