// // gmail_service.js
// const { google } = require('googleapis');

// function createOAuthClient() {
//   const clientId = process.env.GMAIL_CLIENT_ID;
//   const clientSecret = process.env.GMAIL_CLIENT_SECRET;
//   const redirectUri = process.env.GMAIL_REDIRECT_URI;
//   if (!clientId || !clientSecret || !redirectUri) {
//     throw new Error('Missing Gmail OAuth2 credentials in env');
//   }
//   return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
// }

// async function sendMail({ to, subject, bodyHtml }) {
//   const oauth2Client = createOAuthClient();
//   oauth2Client.setCredentials({
//     refresh_token: process.env.GMAIL_REFRESH_TOKEN,
//   });

//   const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

//   const messageParts = [];
//   messageParts.push(`From: ${process.env.SENDER_EMAIL}`);
//   messageParts.push(`To: ${to}`);
//   messageParts.push(`Subject: ${subject}`);
//   messageParts.push('MIME-Version: 1.0');
//   messageParts.push('Content-Type: text/html; charset="UTF-8"');
//   messageParts.push('');
//   messageParts.push(bodyHtml || '');

//   const raw = Buffer.from(messageParts.join('\r\n'))
//     .toString('base64')
//     .replace(/\+/g, '-')
//     .replace(/\//g, '_')
//     .replace(/=+$/, '');

//   try {
//     const res = await gmail.users.messages.send({
//       userId: 'me',
//       requestBody: { raw },
//     });
//     return { ok: true, id: res.data.id };
//   } catch (err) {
//     return { ok: false, error: err.message || JSON.stringify(err) };
//   }
// }

// module.exports = { sendMail };




const { google } = require("googleapis");

function createOAuthClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Gmail OAuth2 credentials");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function sendMail({ to, subject, bodyHtml }) {
  const oauth2Client = createOAuthClient();

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const messageParts = [
    `From: ${process.env.SENDER_EMAIL}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    bodyHtml || "",
  ];

  const raw = Buffer.from(messageParts.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    return { ok: true, id: res.data.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMail };
