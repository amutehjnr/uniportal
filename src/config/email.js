'use strict';
const nodemailer = require('nodemailer');
const logger = require('./logger');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  pool: true,
  maxConnections: 5,
  rateDelta: 20000,
  rateLimit: 5,
});

const emailTemplates = {
  welcome: (data) => ({
    subject: `Welcome to UniPortal, ${data.firstName}!`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1a56db">Welcome to UniPortal</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your account has been created successfully. Start exploring top US universities and scholarships.</p>
      <a href="${data.verificationUrl}" style="background:#1a56db;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Verify Email</a>
      <p style="color:#666;font-size:12px">This link expires in 24 hours.</p>
    </div>`,
  }),

  applicationStatus: (data) => ({
    subject: `Application Update: ${data.universityName}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1a56db">Application Status Update</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your application to <strong>${data.universityName}</strong> for <strong>${data.programName}</strong> has been updated.</p>
      <p><strong>New Status:</strong> <span style="color:#1a56db">${data.status}</span></p>
      ${data.message ? `<p>${data.message}</p>` : ''}
      <a href="${data.dashboardUrl}" style="background:#1a56db;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">View Application</a>
    </div>`,
  }),

  offerLetter: (data) => ({
    subject: `Congratulations! Admission Offer from ${data.universityName}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1a56db">🎉 Congratulations!</h2>
      <p>Hi ${data.firstName},</p>
      <p>You have received an admission offer from <strong>${data.universityName}</strong>!</p>
      <p><strong>Program:</strong> ${data.programName}</p>
      <p><strong>Intake:</strong> ${data.intake}</p>
      <a href="${data.offerUrl}" style="background:#1a56db;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">View & Accept Offer</a>
    </div>`,
  }),

  passwordReset: (data) => ({
    subject: 'Reset Your UniPortal Password',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1a56db">Password Reset Request</h2>
      <p>Hi ${data.firstName},</p>
      <p>Click below to reset your password. This link expires in 1 hour.</p>
      <a href="${data.resetUrl}" style="background:#ef4444;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Reset Password</a>
      <p style="color:#666;font-size:12px">If you didn't request this, ignore this email.</p>
    </div>`,
  }),

  paymentVerified: (data) => ({
    subject: 'Payment Verified – UniPortal',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#16a34a">Payment Verified ✓</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your payment of <strong>${data.amount} ${data.currency}</strong> has been verified.</p>
      <p><strong>Reference:</strong> ${data.reference}</p>
      <a href="${data.dashboardUrl}" style="background:#1a56db;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Go to Dashboard</a>
    </div>`,
  }),
};

async function sendEmail({ to, template, data, attachments = [] }) {
  try {
    const templateFn = emailTemplates[template];
    if (!templateFn) throw new Error(`Unknown email template: ${template}`);

    const { subject, html } = templateFn(data);

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      attachments,
    });

    logger.info(`Email sent: ${info.messageId} to ${to} [${template}]`);
    return info;
  } catch (err) {
    logger.error(`Email send failed to ${to} [${template}]:`, err.message);
    throw err;
  }
}

module.exports = { sendEmail, transporter };
