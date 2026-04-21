import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { encodeBase64Url } from "https://deno.land/std@0.224.0/encoding/base64url.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID")!;
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET")!;
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN")!;
const GMAIL_USER = Deno.env.get("GMAIL_USER")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function logError(message: string, metadata: any = {}) {
  try {
    await supabase.from("error_logs").insert([{
      service: "send-notification-email",
      error_message: message,
      metadata: metadata,
    }]);
  } catch (err) {
    console.error("Failed to write to error_logs:", err);
  }
}

async function getAccessToken() {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  
  const data = await resp.json();
  if (!resp.ok) {
    await logError("OAuth2 Token Refresh Failed", data);
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function sendGmailEmail(to: string, subject: string, html: string, accessToken: string) {
  // Gmail API expects Base64Safe URL encoded raw message
  const emailContent = [
    `From: Colla Guirigall <${GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    "",
    html,
  ].join("\n");

  const utf8Encoder = new TextEncoder();
  const base64Raw = encodeBase64Url(utf8Encoder.encode(emailContent));

  const resp = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64Raw }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    await logError("Gmail API Send Failed", { data, to });
    throw new Error(`Gmail API error: ${JSON.stringify(data)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  let currentRecord = null;
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload = await req.json();
    const { record } = payload;
    currentRecord = record;

    if (!record || !record.userid) {
      await logError("Invalid payload", payload);
      return new Response("Invalid payload", { status: 400 });
    }

    // 1. Get User Email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, name")
      .eq("uid", record.userid)
      .single();

    if (userError || !userData?.email) {
      await logError("User not found or no email", { userid: record.userid, error: userError });
      return new Response("User not found or no email", { status: 404 });
    }

    if (userData.email.includes("@manual-entry.colla")) {
      return new Response(JSON.stringify({ success: true, message: "Manual entry skipped" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Get Event Details if applicable
    let eventDetails = "";
    if (record.eventid) {
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", record.eventid)
        .single();

      if (eventData) {
        const dateStr = new Date(eventData.date).toLocaleString("ca-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Madrid",
        });
        eventDetails = `
          <div style="background: #fff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; margin-top:24px;">
            <p style="margin:0;font-size:12px;font-weight:900;color:#d44211;text-transform:uppercase;letter-spacing:0.1em;">${eventData.type}</p>
            <h3 style="margin:8px 0;font-size:20px;font-weight:900;color:#0f172a;">${eventData.title}</h3>
            <p style="margin:4px 0;font-size:14px;color:#475569;">📅 ${dateStr}</p>
            ${eventData.location ? `<p style="margin:4px 0;font-size:14px;color:#475569;">📍 ${eventData.location}</p>` : ""}
          </div>
        `;
      }
    }

    // 3. Build HTML Email
    const firstName = userData.name.split(" ")[0];
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8f6f6;margin:0;padding:0;}
    .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,.1);}
    .header{background:#d44211;padding:40px 20px;text-align:center;color:#fff;}
    .content{padding:40px;}
    .footer{background:#f1f5f9;padding:20px;text-align:center;color:#94a3b8;font-size:12px;}
    .btn{display:inline-block;padding:16px 32px;background:#d44211;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;margin-top:24px;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1 style="margin:0;font-size:24px;font-weight:900;">🎵 Colla Guirigall</h1>
    </div>
    <div class="content">
      <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Hola, ${firstName}!</h2>
      <p style="font-size:16px;line-height:1.6;color:#475569;margin-bottom:24px;"><strong>${record.title}</strong></p>
      <div style="background:#f8fafc;border-left:4px solid #d44211;padding:16px;font-style:italic;color:#334155;">
        "${record.message}"
      </div>
      ${eventDetails}
      <div style="text-align:center;">
        <a href="https://colla-guirigall.vercel.app/" class="btn">Obrir l'App</a>
      </div>
    </div>
    <div class="footer">&copy; 2026 Colla Guirigall &mdash; guirigallcolla@gmail.com</div>
  </div>
</body>
</html>`;

    // 4. Send OAuth2 Email
    const accessToken = await getAccessToken();
    const sanitizedTitle = removeAccents(record.title);
    const sanitizedHtml = removeAccents(emailHtml);
    
    const sendResp = await sendGmailEmail(userData.email, sanitizedTitle, sanitizedHtml, accessToken);

    return new Response(JSON.stringify({ success: true, to: userData.email, gmail_data: sendResp }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    await logError("Unhandled exception in Edge Function", { message: error.message, record: currentRecord });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

