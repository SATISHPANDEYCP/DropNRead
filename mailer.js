const { google } = require('googleapis');

async function sendEmail({ to, subject, text, html }) {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.REFRESH_TOKEN
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const emailContent = html || text;
        const emailBody = [
            `From: "DropNRead Support" <${process.env.EMAIL}>`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            html ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
            '',
            emailContent
        ].join('\n');

        const encodedMessage = Buffer.from(emailBody)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });

        return result.data;
    } catch (error) {
        console.error('Error sending email via Gmail API:', error);
        throw error;
    }
}

module.exports = { sendEmail };
