import { sendAlertEmail } from '../config/emailService.js';

export async function contactAdmin(req, res, next) {

  const { website_url, subject, message, playerName } = req.body;

  if (website_url) {
    return res.sendStatus(200)   // for bots
  }

  try {

    await sendAlertEmail({
      subject: subject,
      text: message,
      html: `<p><b>From:</b> ${playerName}</p><p><b>Message:</b> ${message}</p>`,
    });

    res.status(200).json({ success: true, message: 'Alert email sent' });

  } catch (error) {
    next(error);
  }
}