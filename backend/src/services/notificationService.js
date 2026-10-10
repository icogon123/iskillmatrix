import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendMail } from './mailService.js';

/**
 * Creates a dashboard notification and (optionally) emails the member. Never throws:
 * a notification failure must not roll back a financial action.
 */
export async function notify(userId, { title, message, type = 'info', link, email = false }) {
  try {
    await Notification.create({ user: userId, title, message, type, link });
    if (email) {
      const user = await User.findById(userId).select('email fullName').lean();
      if (user?.email) {
        await sendMail({ to: user.email, subject: `iSkillMatrix: ${title}`, text: `Hi ${user.fullName},\n\n${message}\n\nTeam iSkillMatrix` });
      }
    }
  } catch (err) {
    console.error('[notify] failed', err.message);
  }
}
