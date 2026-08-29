import nodemailer from 'nodemailer';
import { EmailInterface } from '@gitroom/nestjs-libraries/emails/email.interface';
import { htmlToText } from '@gitroom/helpers/utils/html.to.text';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: +process.env.EMAIL_PORT!,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export class NodeMailerProvider implements EmailInterface {
  name = 'nodemailer';
  validateEnvKeys = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_SECURE',
    'EMAIL_USER',
    'EMAIL_PASS',
  ];
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    emailFromName: string,
    emailFromAddress: string
  ) {
    const sends = await transporter.sendMail({
      from: `${emailFromName} <${emailFromAddress}>`, // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      // Never the markup itself: whatever prefers text/plain (the SES inbound
      // forwarder, notification previews, text-only clients) would render the
      // raw HTML source, and a plain part that mismatches the html one scores
      // as spam.
      text: htmlToText(html), // plain text body
      html: html, // html body
    });

    return sends;
  }
}
