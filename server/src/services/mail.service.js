const nodemailer = require('nodemailer');
let t;
const transport = () => (t ||= nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }));
const sendMail = async ({ to, subject, text, html }) => {
  if (!process.env.SMTP_HOST) { console.log(`\n[MAIL:console] to=${to}\nsubject=${subject}\n${text || html}\n`); return; }
  await transport().sendMail({ from: process.env.MAIL_FROM, to, subject, text, html });
};
module.exports = { sendMail };
