// // server.js
// require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const chrono = require('chrono-node');
// const schedule = require('node-schedule');
// const OpenAI = require('openai');
// const { sendMail } = require('./gmail_service');
// const { searchAmazonProducts } = require('./amazon_service'); // Import fixed Amazon service
// const ScheduledJob = require("./models/ScheduledJob");
// const EmailHistory = require("./models/EmailHistory");
// const connectDB = require('./db');
// connectDB();


// // --- Initialize Express ---
// const app = express();
// app.use(cors());
// app.use(bodyParser.json({ limit: '1mb' }));

// const PORT = process.env.PORT || 3000;

// // --- OpenAI Client ---
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // --- Scheduled Jobs Store ---
// const scheduledJobs = {};

// // ----------------------------------------------
// // Email Utilities
// // ----------------------------------------------
// function extractEmail(text) {
//   if (!text) return null;
//   const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i);
//   return match ? match[0] : null;
// }

// function parseDatetimeFromText(text, refDate = new Date()) {
//   if (!text) return null;
//   const results = chrono.parse(text, refDate, { forwardDate: true });
//   return results?.[0]?.start?.date() || null;
// }

// async function generateEmailFromInstruction(instruction, recipientEmail = null) {
//   const systemPrompt = `You are an assistant that converts a user's instruction into a clear email.
// Return ONLY valid JSON:
// {
//   "subject": "short subject line",
//   "bodyHtml": "<p>HTML body</p>"
// }`;

//   const userPrompt = `Instruction: ${instruction}\nRecipient email: ${recipientEmail || 'unknown'}`;

//   try {
//     const resp = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: userPrompt }
//       ],
//       max_tokens: 400,
//       temperature: 0.2,
//     });

//     const text = resp.choices?.[0]?.message?.content || '';
//     return JSON.parse(text);
//   } catch {
//     return { subject: "Message", bodyHtml: `<p>${instruction}</p>` };
//   }
// }

// // ----------------------------------------------
// // Scheduled Email
// // ----------------------------------------------
// async function scheduleSend({ jobId, sendAt, to, subject, bodyHtml }) {
//   if (!sendAt || !to) return { ok: false, error: "Missing sendAt or recipient" };

//   // Save to DB
//   await ScheduledJob.create({
//     jobId,
//     to,
//     subject,
//     bodyHtml,
//     sendAt,
//     status: "scheduled"
//   });

//   // Create node-schedule job
//   schedule.scheduleJob(jobId, sendAt, async () => {
//     try {
//       console.log(`Sending scheduled job: ${jobId}`);
//       await sendMail({ to, subject, bodyHtml });

//       // Update status in DB
//       await ScheduledJob.updateOne({ jobId }, { status: "sent" });

//       await EmailHistory.create({
//         to,
//         subject,
//         bodyHtml,
//         sentAt: new Date()
//       });

//     } catch (err) {
//       console.log("Error sending scheduled email:", err);
//     }
//   });

//   return { ok: true, jobId };
// }


// // ----------------------------------------------
// // Orchestrator Endpoint
// // ----------------------------------------------
// const Request = require('./models/Request');

// app.post('/api/orchestrate', async (req, res) => {
//   try {
//     const payload = req.body || {};
//     const rawText = (payload.text || '').trim();

//     if (!rawText) return res.status(400).json({ ok: false, error: 'Missing text' });

//     // AMAZON REQUEST
//     if (/amazon|price|buy|cost|show.*price/i.test(rawText)) {
//       const keyword = rawText.replace(/show|me|amazon|price|buy|cost|of|find|product|for/gi, '').trim();
//       if (!keyword || keyword.length < 2) return res.json({ ok: false, error: "Keyword missing — e.g., 'iPhone 15'" });

//       const result = await searchAmazonProducts(keyword);
//       const doc = await Request.create({ text: rawText, response: result, type: 'amazon_products' });
//       if (!result.ok) return res.json({ ok: false, error: result.error });

//       return res.json({ ok: true, type: 'amazon_products', keyword, products: result.products });
//     }

//   app.get('/api/requests', async (req, res) => {
//   try {
//     const requests = await Request.find().sort({ createdAt: -1 }).limit(50); // last 50
//     res.json({ ok: true, requests });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });


//     // EMAIL REQUEST
//     const recipient = extractEmail(rawText) || payload.recipient;
//     if (!recipient) return res.status(400).json({ ok: false, error: 'Recipient email not found' });

//     const parsedDate = parseDatetimeFromText(rawText);
//     const sendAt = payload.sendAt ? new Date(payload.sendAt) : parsedDate;
//     const sendNow =
//       payload.sendNow === true ||
//       /\bnow\b/i.test(rawText) ||
//       /\bnow message\b/i.test(rawText) ||
//       /\bsend message now\b/i.test(rawText) ||
//       (!sendAt && /\bmessage\b/i.test(rawText));

//     const gen = await generateEmailFromInstruction(rawText, recipient);

//     if (sendNow) {
//       await sendMail({ to: recipient, subject: gen.subject, bodyHtml: gen.bodyHtml });
//       await Request.create({ text: rawText, recipient, response: gen, type: 'email' });
//       return res.json({ ok: true, mode: 'sent_now' });
//     }

//     const jobId = `job_${Date.now()}`;
//     scheduleSend({ jobId, sendAt, to: recipient, subject: gen.subject, bodyHtml: gen.bodyHtml });
//     await Request.create({ text: rawText, recipient, response: gen, type: 'email' });

//     return res.json({ ok: true, mode: 'scheduled', jobId, sendAt });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ----------------------------------------------
// // Job Management
// // ----------------------------------------------
// app.get('/api/jobs', (req, res) => {
//   const jobs = Object.entries(scheduledJobs).map(([id, job]) => ({
//     jobId: id,
//     to: job.to,
//     subject: job.subject,
//     sendAt: job.sendAt,
//   }));
//   res.json({ ok: true, jobs });
// });

// app.post('/api/cancel', (req, res) => {
//   const { jobId } = req.body;
//   if (!jobId || !scheduledJobs[jobId]) return res.status(400).json({ ok: false, error: "jobId not found" });

//   scheduledJobs[jobId].job.cancel();
//   delete scheduledJobs[jobId];
//   res.json({ ok: true, cancelled: jobId });
// });

// // ----------------------------------------------
// // Health Check
// // ----------------------------------------------
// app.get('/', (req, res) => res.send("Agentic Email + Amazon Orchestrator is running."));

// // --- START SERVER ---
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



                              //  fulll working code 






// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chrono = require('chrono-node');
const schedule = require('node-schedule');
const OpenAI = require('openai');
const { sendMail } = require('./gmail_service');
const { searchAmazonProducts } = require('./amazon_service'); // your amazon helper
const connectDB = require('./db');





// Models
const ScheduledJob = require('./models/ScheduledJob');
const EmailHistory = require('./models/EmailHistory');
const Request = require('./models/Request');

// Connect DB
connectDB();

// --- Initialize Express ---
const app = express();

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Allow Postman / server-to-server
//       if (!origin) return callback(null, true);

//       // ✅ Allow ALL Vercel frontend URLs
//       if (origin.endsWith(".vercel.app")) {
//         return callback(null, true);
//       }

//       return callback(new Error("CORS not allowed"), false);
//     },
//     credentials: true,
//   })
// );

app.use(cors());  


// app.use(cors({ origin: "*" }));

app.use(bodyParser.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;

// --- OpenAI Client ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------------------------------
// Helpers
// ----------------------------------------------
function extractEmail(text) {
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i);
  return match ? match[0] : null;
}

function parseDatetimeFromText(text, refDate = new Date()) {
  if (!text) return null;
  const results = chrono.parse(text, refDate, { forwardDate: true });
  return results?.[0]?.start?.date() || null;
}

async function generateEmailFromInstruction(instruction, recipientEmail = null) {
  const systemPrompt = `You are an assistant that converts a user's instruction into a clear email.
Return ONLY valid JSON:
{
  "subject": "short subject line",
  "bodyHtml": "<p>HTML body</p>"
}`;

  const userPrompt = `Instruction: ${instruction}\nRecipient email: ${recipientEmail || 'unknown'}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    const text = resp.choices?.[0]?.message?.content || '';
    return JSON.parse(text);
  } catch (err) {
    console.error("OpenAI generation error:", err?.message || err);
    return { subject: "Message", bodyHtml: `<p>${instruction}</p>` };
  }
}

// ----------------------------------------------
// Schedule + DB integration
// ----------------------------------------------
async function scheduleSend({ jobId, sendAt, to, subject, bodyHtml }) {
  if (!sendAt || !to) return { ok: false, error: "Missing sendAt or recipient" };

  // Save job in DB (upsert to avoid duplicates)
  await ScheduledJob.updateOne(
    { jobId },
    { jobId, to, subject, bodyHtml, sendAt, status: "scheduled" },
    { upsert: true }
  );

  // Cancel existing scheduled job with same name if exists
  const existing = schedule.scheduledJobs[jobId];
  if (existing) existing.cancel();

  // Create node-schedule job (named jobId)
  schedule.scheduleJob(jobId, sendAt, async () => {
    try {
      console.log(`[${new Date().toISOString()}] Sending scheduled job: ${jobId}`);
      const sendResult = await sendMail({ to, subject, bodyHtml });
      // mark as sent in DB
      await ScheduledJob.updateOne({ jobId }, { status: "sent", sentAt: new Date(), sendResult });
      await EmailHistory.create({ to, subject, bodyHtml, sentAt: new Date(), sendResult });
    } catch (err) {
      console.error("Error sending scheduled email:", err);
      // optionally record failure metadata
      await ScheduledJob.updateOne({ jobId }, { lastError: err?.message || String(err) });
    }
  });

  return { ok: true, jobId };
}

// Restore scheduled jobs from DB on startup
async function restoreJobs() {
  try {
    const jobs = await ScheduledJob.find({ status: "scheduled" });
    console.log(`Restoring ${jobs.length} scheduled job(s) from DB...`);
    for (const job of jobs) {
      // only schedule future jobs
      if (new Date(job.sendAt) > new Date()) {
        // cancel if already exists
        const existing = schedule.scheduledJobs[job.jobId];
        if (existing) existing.cancel();

        schedule.scheduleJob(job.jobId, job.sendAt, async () => {
          try {
            console.log(`Restored job executing: ${job.jobId}`);
            await sendMail({ to: job.to, subject: job.subject, bodyHtml: job.bodyHtml });
            await ScheduledJob.updateOne({ jobId: job.jobId }, { status: "sent", sentAt: new Date() });
            await EmailHistory.create({ to: job.to, subject: job.subject, bodyHtml: job.bodyHtml, sentAt: new Date() });
          } catch (err) {
            console.error("Error sending restored job:", err);
            await ScheduledJob.updateOne({ jobId: job.jobId }, { lastError: err?.message || String(err) });
          }
        });
      } else {
        // Past sendAt — mark cancelled/expired so it won't attempt sending
        await ScheduledJob.updateOne({ jobId: job.jobId }, { status: "expired" });
      }
    }
  } catch (err) {
    console.error("Error restoring jobs:", err);
  }
}

// ----------------------------------------------
// Routes
// ----------------------------------------------

// Health
app.get('/', (req, res) => res.send("Agentic Email + Amazon Orchestrator is running."));

// Get recent stored requests (history of what user asked)
app.get('/api/requests', async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 }).limit(50);
    res.json({ ok: true, requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get scheduled jobs (from DB)
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await ScheduledJob.find().sort({ sendAt: 1 });
    res.json({ ok: true, jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Cancel a job (DB + node-schedule)
app.post('/api/cancel', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ ok: false, error: "jobId missing" });

    // Cancel node-schedule job if exists
    const job = schedule.scheduledJobs[jobId];
    if (job) job.cancel();

    // Update DB record
    await ScheduledJob.updateOne({ jobId }, { status: "cancelled", cancelledAt: new Date() });

    res.json({ ok: true, cancelled: jobId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Return email send history
app.get('/api/history', async (req, res) => {
  try {
    const history = await EmailHistory.find().sort({ sentAt: -1 }).limit(100);
    res.json({ ok: true, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await EmailHistory.deleteOne({ _id: id });
    res.json({ ok: true, msg: "Deleted" });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});


// Delete a single email (already present)
// app.delete("/api/history/:id", ...)

// DELETE ALL history
app.post("/api/history/delete-all", async (req, res) => {
  try {
    await EmailHistory.deleteMany({});
    res.json({ ok: true, msg: "All history deleted" });
  } catch (err) {
    console.error("Delete all error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});



// The main orchestrator endpoint
app.post('/api/orchestrate', async (req, res) => {
  try {
    const payload = req.body || {};
    const rawText = (payload.text || '').trim();

    if (!rawText) return res.status(400).json({ ok: false, error: 'Missing text' });

    // AMAZON REQUEST
    if (/amazon|price|buy|cost|show.*price/i.test(rawText)) {
      const keyword = rawText.replace(/show|me|amazon|price|buy|cost|of|find|product|for/gi, '').trim();
      if (!keyword || keyword.length < 2) return res.json({ ok: false, error: "Keyword missing — e.g., 'iPhone 15'" });

      const result = await searchAmazonProducts(keyword);
      await Request.create({ text: rawText, response: result, type: 'amazon_products' });
      if (!result.ok) return res.json({ ok: false, error: result.error });

      return res.json({ ok: true, type: 'amazon_products', keyword, products: result.products });
    }

    // EMAIL REQUEST
    const recipient = extractEmail(rawText) || payload.recipient;
    if (!recipient) return res.status(400).json({ ok: false, error: 'Recipient email not found' });

    const parsedDate = parseDatetimeFromText(rawText);
    const sendAt = payload.sendAt ? new Date(payload.sendAt) : parsedDate;
    const sendNow =
      payload.sendNow === true ||
      /\bnow\b/i.test(rawText) ||
      /\bnow message\b/i.test(rawText) ||
      /\bsend message now\b/i.test(rawText) ||
      (!sendAt && /\bmessage\b/i.test(rawText));

    const gen = await generateEmailFromInstruction(rawText, recipient);

    // record the user's request (input + generated response preview)
    await Request.create({ text: rawText, recipient, response: gen, type: 'email' });

    if (sendNow) {
      const sendResult = await sendMail({ to: recipient, subject: gen.subject, bodyHtml: gen.bodyHtml });
      await EmailHistory.create({ to: recipient, subject: gen.subject, bodyHtml: gen.bodyHtml, sentAt: new Date(), sendResult });
      return res.json({ ok: true, mode: 'sent_now', sendResult });
    }

    // create job
    const jobId = `job_${Date.now()}`;
    const scheduleResult = await scheduleSend({ jobId, sendAt, to: recipient, subject: gen.subject, bodyHtml: gen.bodyHtml });

    return res.json({ ok: true, mode: 'scheduled', jobId, sendAt, scheduleResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ----------------------------------------------
// DASHBOARD SUMMARY API
// ----------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    // 1️⃣ Total Emails Processed
    const totalEmails = await EmailHistory.countDocuments();

    // 2️⃣ AI Workflow Success Rate
    const totalRequests = await Request.countDocuments();
    const successfulRequests = await Request.countDocuments({ type: "email" });
    const workflowSuccessRate = totalRequests > 0
      ? Math.round((successfulRequests / totalRequests) * 100)
      : 0;

    // 3️⃣ Scheduled Execution Rate
    const totalJobs = await ScheduledJob.countDocuments();
    const scheduledJobs = await ScheduledJob.countDocuments({ status: "scheduled" });
    const scheduledExecutionRate = totalJobs > 0
      ? Math.round((scheduledJobs / totalJobs) * 100)
      : 0;

   
    // ✅ Number of Email Requests (Request History)
const emailRequestCount = await Request.countDocuments({ type: "email" });

    res.json({
      ok: true,
      stats: {
        totalEmails,
        workflowSuccessRate,
        scheduledExecutionRate,
        emailRequestCount
      }
    });

  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});



// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // restore pending jobs after server starts
  restoreJobs().catch(err => console.error("restoreJobs error:", err));
});







                            // lastttttt finalllllllllllll






//                             // server.js
// require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const chrono = require('chrono-node');
// const schedule = require('node-schedule');
// const OpenAI = require('openai');
// const { sendMail } = require('./gmail_service');
// const { searchAmazonProducts } = require('./amazon_service');
// const connectDB = require('./db');

// // Models
// const ScheduledJob = require('./models/ScheduledJob');
// const EmailHistory = require('./models/EmailHistory');
// const Request = require('./models/Request');

// // DB Connect
// connectDB();

// const app = express();

// // Allow Vercel + localhost
// app.use(cors());
// app.use(bodyParser.json({ limit: '1mb' }));

// const PORT = process.env.PORT || 3000;
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // -------------------------------------------------------
// // 📌 IST → UTC Conversion FIX
// // -------------------------------------------------------
// function convertISTtoUTC(date) {
//   if (!date) return null;
//   return new Date(date.getTime() - (5.5 * 60 * 60 * 1000));
// }

// // -------------------------------------------------------
// // Helpers
// // -------------------------------------------------------
// function extractEmail(text) {
//   if (!text) return null;
//   const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i);
//   return match ? match[0] : null;
// }

// function parseDatetimeFromText(text, refDate = new Date()) {
//   if (!text) return null;
//   const results = chrono.parse(text, refDate, { forwardDate: true });
//   return results?.[0]?.start?.date() || null;
// }

// async function generateEmailFromInstruction(instruction, recipientEmail = null) {
//   const systemPrompt = `You are an assistant that converts a user's instruction into a clear email.
// Return ONLY valid JSON:
// {
//   "subject": "short subject line",
//   "bodyHtml": "<p>HTML body</p>"
// }`;

//   const userPrompt = `Instruction: ${instruction}\nRecipient email: ${recipientEmail || 'unknown'}`;

//   try {
//     const resp = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: userPrompt }
//       ],
//       max_tokens: 400,
//       temperature: 0.2,
//     });

//     const text = resp.choices?.[0]?.message?.content || '';
//     return JSON.parse(text);
//   } catch (err) {
//     console.error("OpenAI generation error:", err?.message || err);
//     return { subject: "Message", bodyHtml: `<p>${instruction}</p>` };
//   }
// }

// // -------------------------------------------------------
// // Scheduling + DB
// // -------------------------------------------------------
// async function scheduleSend({ jobId, sendAt, to, subject, bodyHtml }) {
//   if (!sendAt || !to) return { ok: false, error: "Missing sendAt or recipient" };

//   await ScheduledJob.updateOne(
//     { jobId },
//     { jobId, to, subject, bodyHtml, sendAt, status: "scheduled" },
//     { upsert: true }
//   );

//   // Cancel existing job if exists
//   if (schedule.scheduledJobs[jobId]) {
//     schedule.scheduledJobs[jobId].cancel();
//   }

//   // 🔥 FIXED: ensure JS Date object
//   schedule.scheduleJob(jobId, new Date(sendAt), async () => {
//     try {
//       console.log(`[${new Date().toISOString()}] Sending job ${jobId}`);

//       const sendResult = await sendMail({ to, subject, bodyHtml });

//       await ScheduledJob.updateOne(
//         { jobId }, 
//         { status: "sent", sentAt: new Date(), sendResult }
//       );

//       await EmailHistory.create({
//         to,
//         subject,
//         bodyHtml,
//         sentAt: new Date(),
//         sendResult
//       });

//     } catch (err) {
//       console.error("Error sending scheduled email:", err);
//       await ScheduledJob.updateOne(
//         { jobId }, 
//         { lastError: err?.message || String(err) }
//       );
//     }
//   });

//   return { ok: true, jobId };
// }

// // Restore jobs on restart
// async function restoreJobs() {
//   try {
//     const jobs = await ScheduledJob.find({ status: "scheduled" });
//     console.log(`Restoring ${jobs.length} job(s)...`);

//     for (const job of jobs) {
//       if (new Date(job.sendAt) > new Date()) {
//         if (schedule.scheduledJobs[job.jobId]) {
//           schedule.scheduledJobs[job.jobId].cancel();
//         }

//         schedule.scheduleJob(job.jobId, new Date(job.sendAt), async () => {
//           try {
//             await sendMail({ to: job.to, subject: job.subject, bodyHtml: job.bodyHtml });

//             await ScheduledJob.updateOne(
//               { jobId: job.jobId },
//               { status: "sent", sentAt: new Date() }
//             );

//             await EmailHistory.create({
//               to: job.to,
//               subject: job.subject,
//               bodyHtml: job.bodyHtml,
//               sentAt: new Date(),
//             });

//           } catch (err) {
//             await ScheduledJob.updateOne({ jobId: job.jobId }, { lastError: err.message });
//           }
//         });
//       } else {
//         await ScheduledJob.updateOne({ jobId: job.jobId }, { status: "expired" });
//       }
//     }
//   } catch (err) {
//     console.error("Restore jobs error:", err);
//   }
// }

// // -------------------------------------------------------
// // API Routes
// // -------------------------------------------------------

// // Health Check
// app.get('/', (req, res) => res.send("AI Email + Amazon Orchestrator Running"));

// // GET Request history
// app.get('/api/requests', async (req, res) => {
//   try {
//     const requests = await Request.find().sort({ createdAt: -1 }).limit(50);
//     res.json({ ok: true, requests });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // GET scheduled jobs
// app.get('/api/jobs', async (req, res) => {
//   try {
//     const jobs = await ScheduledJob.find().sort({ sendAt: 1 });
//     res.json({ ok: true, jobs });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // Cancel a job
// app.post('/api/cancel', async (req, res) => {
//   try {
//     const { jobId } = req.body;
//     if (!jobId) return res.status(400).json({ ok: false, error: "jobId missing" });

//     if (schedule.scheduledJobs[jobId]) {
//       schedule.scheduledJobs[jobId].cancel();
//     }

//     await ScheduledJob.updateOne(
//       { jobId }, 
//       { status: "cancelled", cancelledAt: new Date() }
//     );

//     res.json({ ok: true, cancelled: jobId });

//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // Email History
// app.get('/api/history', async (req, res) => {
//   try {
//     const history = await EmailHistory.find().sort({ sentAt: -1 }).limit(100);
//     res.json({ ok: true, history });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// app.delete("/api/history/:id", async (req, res) => {
//   try {
//     await EmailHistory.deleteOne({ _id: req.params.id });
//     res.json({ ok: true, msg: "Deleted" });
//   } catch (err) {
//     res.json({ ok: false, error: err.message });
//   }
// });

// app.post("/api/history/delete-all", async (req, res) => {
//   try {
//     await EmailHistory.deleteMany({});
//     res.json({ ok: true, msg: "All history deleted" });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // -------------------------------------------------------
// // MAIN ORCHESTRATOR (EMAIL + AMAZON)
// // -------------------------------------------------------
// app.post('/api/orchestrate', async (req, res) => {
//   try {
//     const payload = req.body || {};
//     const rawText = (payload.text || '').trim();

//     if (!rawText) return res.status(400).json({ ok: false, error: 'Missing text' });

//     // Amazon Request
//     if (/amazon|price|buy|cost|show.*price/i.test(rawText)) {
//       const keyword = rawText.replace(/show|me|amazon|price|buy|cost|of|find|product|for/gi, '').trim();

//       const result = await searchAmazonProducts(keyword);
//       await Request.create({ text: rawText, response: result, type: 'amazon_products' });

//       return res.json({ ok: true, type: 'amazon_products', products: result.products });
//     }

//     // Email Request
//     const recipient = extractEmail(rawText) || payload.recipient;
//     if (!recipient) return res.status(400).json({ ok: false, error: 'Recipient email missing' });

//     // Parse time
//     const parsedDate = parseDatetimeFromText(rawText);
//     let sendAtIST = payload.sendAt ? new Date(payload.sendAt) : parsedDate;

//     // 🔥 FIX: Convert IST → UTC
//     let sendAt = convertISTtoUTC(sendAtIST);

//     const sendNow =
//       payload.sendNow === true ||
//       /\bnow\b/i.test(rawText);

//     const gen = await generateEmailFromInstruction(rawText, recipient);

//     // Save request
//     await Request.create({ text: rawText, recipient, response: gen, type: 'email' });

//     // Send immediately
//     if (sendNow) {
//       const sendResult = await sendMail({
//         to: recipient,
//         subject: gen.subject,
//         bodyHtml: gen.bodyHtml
//       });

//       await EmailHistory.create({
//         to: recipient,
//         subject: gen.subject,
//         bodyHtml: gen.bodyHtml,
//         sentAt: new Date(),
//         sendResult
//       });

//       return res.json({ ok: true, mode: 'sent_now', sendResult });
//     }

//     // Schedule email
//     const jobId = `job_${Date.now()}`;

//     const scheduleResult = await scheduleSend({
//       jobId,
//       sendAt,
//       to: recipient,
//       subject: gen.subject,
//       bodyHtml: gen.bodyHtml
//     });

//     res.json({
//       ok: true,
//       mode: 'scheduled',
//       jobId,
//       sendAt
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // -------------------------------------------------------
// // Dashboard STATS
// // -------------------------------------------------------
// app.get('/api/stats', async (req, res) => {
//   try {
//     const totalEmails = await EmailHistory.countDocuments();
//     const totalRequests = await Request.countDocuments();
//     const successfulRequests = await Request.countDocuments({ type: "email" });
//     const workflowSuccessRate = totalRequests > 0
//       ? Math.round((successfulRequests / totalRequests) * 100)
//       : 0;

//     const totalJobs = await ScheduledJob.countDocuments();
//     const scheduledJobs = await ScheduledJob.countDocuments({ status: "scheduled" });
//     const scheduledExecutionRate = totalJobs > 0
//       ? Math.round((scheduledJobs / totalJobs) * 100)
//       : 0;

//     const emailRequestCount = await Request.countDocuments({ type: "email" });

//     res.json({
//       ok: true,
//       stats: {
//         totalEmails,
//         workflowSuccessRate,
//         scheduledExecutionRate,
//         emailRequestCount
//       }
//     });

//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // -------------------------------------------------------
// // Start Server + Restore Jobs
// // -------------------------------------------------------
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
//   restoreJobs();
// });
