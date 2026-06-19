import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    this.fromAddress = process.env.SMTP_FROM?.trim() || user || 'prm-tool@localhost';

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async send(message: EmailMessage): Promise<void> {
    const recipients = message.to.filter(Boolean);
    if (recipients.length === 0) return;

    if (!this.transporter) {
      console.log(
        `[Email] (SMTP not configured — logged only)\n`
        + `  To: ${recipients.join(', ')}\n`
        + `  Subject: ${message.subject}\n`
        + `  Body:\n${message.text}\n`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: recipients.join(', '),
      subject: message.subject,
      text: message.text,
    });
  }
}
