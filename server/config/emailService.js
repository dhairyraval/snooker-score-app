import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MY_GMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendAlertEmail({ subject, text, html }) {
  const mailOptions = {
    from: `"App Notification" <${process.env.MY_GMAIL}>`,
    to: process.env.MY_GMAIL,
    subject: subject || '🚨 Alert from Snooker-Score-App',
    text: text,
    html: html,
  };
  return await transporter.sendMail(mailOptions);
}