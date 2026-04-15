// Supabase Edge Function: send-email
// Sends transactional emails via Resend
import { Resend } from "npm:resend@3.2.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Fantasy Draft Pros <noreply@fantasydraftpros.com>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const { type, to, name, subject, message, userId, plan } = await req.json();

    let emailPayload: any = null;

    switch (type) {
      case "welcome": {
        emailPayload = {
          from: FROM,
          to: [to],
          subject: "Welcome to Fantasy Draft Pros 🏈",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#13111e;color:#e2e0f0;border-radius:16px">
              <img src="https://fantasydraftpros.com/logo-horizontal.png" alt="Fantasy Draft Pros" style="height:48px;margin-bottom:24px"/>
              <h1 style="font-size:24px;font-weight:900;color:#fff;margin:0 0 12px">Welcome to Fantasy Draft Pros, ${name || "Dynasty Manager"}!</h1>
              <p style="font-size:15px;color:#9b96b8;line-height:1.6;margin:0 0 20px">Your free account is ready. Start analyzing dynasty trades instantly — no setup required.</p>
              <a href="https://fantasydraftpros.com/#trade" style="display:inline-block;background:#7c4dff;color:#fff;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;margin-bottom:24px">Analyze Your First Trade →</a>
              <p style="font-size:13px;color:#6b6880;margin:0">Questions? Reply to this email or reach us at fantasydraftproshelp@gmail.com</p>
            </div>`,
        };
        break;
      }

      case "welcome_pro": {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: profile } = await supabase
          .from("users")
          .select("email, name")
          .eq("id", userId)
          .single();

        if (!profile) break;
        emailPayload = {
          from: FROM,
          to: [profile.email],
          subject: "You're now a Fantasy Draft Pros Pro member 🎉",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#13111e;color:#e2e0f0;border-radius:16px">
              <img src="https://fantasydraftpros.com/logo-horizontal.png" alt="Fantasy Draft Pros" style="height:48px;margin-bottom:24px"/>
              <h1 style="font-size:24px;font-weight:900;color:#f59e0b;margin:0 0 12px">⚡ Pro Unlocked!</h1>
              <p style="font-size:15px;color:#9b96b8;line-height:1.6;margin:0 0 16px">Hey ${profile.name || "there"}, your 7-day free trial has started. Here's what you now have access to:</p>
              <ul style="font-size:14px;color:#c4c0d8;line-height:2;padding-left:20px;margin:0 0 24px">
                <li>Unlimited trade analyses</li>
                <li>Full dynasty rankings (600+ players)</li>
                <li>League import (Sleeper, ESPN, Yahoo)</li>
                <li>AI trade suggestions powered by Claude</li>
                <li>Dynasty market reports</li>
              </ul>
              <a href="https://fantasydraftpros.com" style="display:inline-block;background:#7c4dff;color:#fff;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">Go to Fantasy Draft Pros →</a>
            </div>`,
        };
        break;
      }

      case "contact": {
        // Forward contact form to support inbox
        emailPayload = {
          from: FROM,
          to: ["fantasydraftproshelp@gmail.com"],
          reply_to: to,
          subject: `[Contact] ${subject || "New message from " + name}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="margin:0 0 16px">New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${to}</p>
              <p><strong>Subject:</strong> ${subject || "(none)"}</p>
              <hr/>
              <p style="white-space:pre-wrap">${message}</p>
            </div>`,
        };
        break;
      }

      case "password_reset": {
        // Supabase handles password reset emails natively — this is a fallback
        emailPayload = {
          from: FROM,
          to: [to],
          subject: "Reset your Fantasy Draft Pros password",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#13111e;color:#e2e0f0;border-radius:16px">
              <img src="https://fantasydraftpros.com/logo-horizontal.png" alt="Fantasy Draft Pros" style="height:48px;margin-bottom:24px"/>
              <h1 style="font-size:22px;font-weight:900;margin:0 0 12px">Password Reset</h1>
              <p style="font-size:15px;color:#9b96b8;margin:0 0 20px">Click the link below to reset your password. This link expires in 1 hour.</p>
              <a href="${message}" style="display:inline-block;background:#7c4dff;color:#fff;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">Reset Password →</a>
            </div>`,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown email type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (!emailPayload) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await resend.emails.send(emailPayload);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
