const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN || "secret";
const API_KEY = process.env.THERESAV_APIKEY || "secret";

const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── AUTO SET WEBHOOK ─────────────────────────────────────────────────────────
async function autoSetWebhook(req) {
  try {
    // Deteksi domain otomatis dari request header
    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    if (!host) return;

    const webhookUrl = `https://${host}/api/webhook`;

    // Cek webhook yang sedang aktif
    const { data: info } = await axios.get(`${API_URL}/getWebhookInfo`);
    if (info.result?.url === webhookUrl) return; // Sudah benar, skip

    // Set webhook ke domain ini
    await axios.post(`${API_URL}/setWebhook`, { url: webhookUrl });
    console.log(`[AutoWebhook] ✅ Webhook set ke: ${webhookUrl}`);
  } catch (e) {
    console.error("[AutoWebhook] ❌ Gagal:", e.message);
  }
}

async function sendMessage(chat_id, text, parse_mode = "Markdown") {
  await axios.post(`${API_URL}/sendMessage`, { chat_id, text, parse_mode });
}

async function sendReaction(chat_id, message_id, emoji) {
  try {
    await axios.post(`${API_URL}/setMessageReaction`, {
      chat_id,
      message_id,
      reaction: [{ type: "emoji", emoji }],
    });
  } catch (_) {}
}

// ─── HANDLER: /ampremium ──────────────────────────────────────────────────────
async function handleAmPremium(msg, email) {
  const chat_id = msg.chat.id;
  const message_id = msg.message_id;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return sendMessage(chat_id, "❌ *Error:* Format email yang kamu masukkan tidak valid kak!");
  }

  await sendReaction(chat_id, message_id, "⏳");

  try {
    const url = `https://api.theresav.biz.id/premium/alightmotion/send?email=${encodeURIComponent(email.trim())}&apikey=${API_KEY}`;
    const { data } = await axios.get(url);

    if (data && data.status === true) {
      const caption =
        `🎉  *───「 ＡＬＩＧＨＴ  ＭＯＴＩＯＮ 」───*\n` +
        `⚡ _${data.message || "Link verifikasi berhasil dikirim!"}_\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        ` ◦ *Target Email:* \`${data.data?.email || email}\`\n` +
        ` ◦ *Tipe Akses:* \`${data.data?.type || "need_link"}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *LANGKAH AKTIVASI (WAJIB DIIKUTI):*\n\n` +
        `1️⃣ *Cek Kotak Masuk / Folder Spam:*\n` +
        `   Buka Gmail kamu. Jika tidak ada di kotak masuk utama, cek *Folder Spam* kak! Cari email terbaru dari *Alight Motion*.\n\n` +
        `2️⃣ *Tekan Tombol Login:*\n` +
        `   Buka email tersebut, klik tombol *"Login"* atau *"Log in to Alight Motion"*.\n\n` +
        `3️⃣ *Salin Tautan / Link Akhir:*\n` +
        `   Setelah browser terbuka, *Salin/Copy seluruh URL* yang muncul di address bar browser kamu kak.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Selesai disalin? Kirim link-nya dengan command_ /amverify _ya kak!_\n` +
        `_Engine System by Amane Ofc_`;

      await sendMessage(chat_id, caption);
      await sendReaction(chat_id, message_id, "✅");
    } else {
      throw new Error(data?.message || "Gagal mendapatkan respon sukses dari server.");
    }
  } catch (e) {
    await sendReaction(chat_id, message_id, "❌");
    await sendMessage(chat_id, `❌ *Gagal Mengirim Premium:* ${e.response?.data?.message || e.message}`);
  }
}

// ─── HANDLER: /amverify ───────────────────────────────────────────────────────
async function handleAmVerify(msg, args) {
  const chat_id = msg.chat.id;
  const message_id = msg.message_id;

  if (!args || !args.includes("|")) {
    return sendMessage(
      chat_id,
      `🔐 *Format Salah kak!*\n\nKetik: /amverify email | link_url\n\nContoh:\n/amverify emailkamu@gmail.com | https://alight-creative.firebaseapp.com/...`
    );
  }

  const [email, link] = args.split("|").map((v) => v.trim());

  if (!email || !link) {
    return sendMessage(
      chat_id,
      `⚠️ *Input Kurang Lengkap kak!*\n\nFormat: /amverify email | link_url`
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendMessage(chat_id, "❌ *Error:* Format email yang kamu masukkan tidak valid kak!");
  }

  await sendReaction(chat_id, message_id, "⏳");

  try {
    const url = `https://api.theresav.biz.id/premium/alightmotion/verify?email=${encodeURIComponent(email)}&link=${encodeURIComponent(link)}&apikey=${API_KEY}`;
    const { data } = await axios.get(url);

    if (data && data.status === true) {
      let rawDuration = data.data?.duration || "";
      let durationText = rawDuration === "1_year" ? "1 Tahun" : rawDuration.replace("_", " ");

      const caption =
        `🎉  *───「 ＡＭ  ＶＥＲＩＦＩＣＡＴＩＯＮ 」───*\n` +
        `⚡ _${data.message || "Verifikasi akun berhasil!"}_\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        ` ◦ *Email Terdaftar:* \`${data.data?.email || email}\`\n` +
        ` ◦ *Tipe Sukses:* \`${data.data?.type || "success"}\`\n` +
        ` ◦ *Durasi Paket:* \`${durationText}\` ⏳\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *INFORMASI USER:*\n\n` +
        `• Akun Alight Motion kamu sekarang sudah resmi *PRO / PREMIUM* kak!\n` +
        `• Buka aplikasi Alight Motion, lalu login dengan email \`${data.data?.email || email}\`.\n` +
        `• Nikmati semua fitur premium, efek berbayar, dan ekspor tanpa watermark!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Engine System by Amane Ofc_`;

      await sendMessage(chat_id, caption);
      await sendReaction(chat_id, message_id, "✅");
    } else {
      throw new Error(data?.message || "Gagal memverifikasi akun ke server database.");
    }
  } catch (e) {
    await sendReaction(chat_id, message_id, "❌");
    await sendMessage(chat_id, `❌ *Verification Error:* ${e.response?.data?.message || e.message}`);
  }
}

// ─── HANDLER: /start & /help ─────────────────────────────────────────────────
async function handleStart(msg) {
  const name = msg.from?.first_name || "kak";
  await sendMessage(
    msg.chat.id,
    `👋 Halo *${name}*! Selamat datang di *AM Premium Bot* 🎬\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *DAFTAR COMMAND:*\n\n` +
    `🔹 /ampremium <email>\n` +
    `   _Kirim link verifikasi Alight Motion Premium ke email_\n\n` +
    `🔹 /amverify <email> | <link>\n` +
    `   _Verifikasi akun setelah dapat link dari email_\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Engine System by Amane Ofc_`
  );
}

// ─── ROUTER UTAMA ─────────────────────────────────────────────────────────────
async function processUpdate(update) {
  const msg = update.message || update.channel_post;
  if (!msg || !msg.text) return;

  const text = msg.text.trim();
  const [rawCmd, ...rest] = text.split(" ");
  const cmd = rawCmd.split("@")[0].toLowerCase();
  const args = rest.join(" ");

  if (cmd === "/start" || cmd === "/help") {
    await handleStart(msg);
  } else if (["/ampremium", "/sendam", "/alightpremium", "/alightmotion"].includes(cmd)) {
    if (!args) {
      await sendMessage(msg.chat.id, `📧 *Format Salah kak!*\n\nKetik: /ampremium <email_kamu>\n\nContoh:\n/ampremium emailkamu@gmail.com`);
    } else {
      await handleAmPremium(msg, args);
    }
  } else if (["/amverify", "/alightverify", "/viam", "/verifyam"].includes(cmd)) {
    await handleAmVerify(msg, args);
  }
}

// ─── VERCEL SERVERLESS HANDLER ────────────────────────────────────────────────
module.exports = async (req, res) => {
  // Auto set webhook saat pertama kali ada request GET (misal buka di browser)
  if (req.method === "GET") {
    await autoSetWebhook(req);
    return res.status(200).send("AM Premium Bot is running! 🚀\nWebhook auto-configured ✅");
  }

  if (req.method === "POST") {
    // Juga coba auto-set webhook dari POST request (jika belum tersimpan)
    autoSetWebhook(req).catch(() => {});

    try {
      await processUpdate(req.body);
    } catch (err) {
      console.error("Error processing update:", err);
    }
    return res.status(200).json({ ok: true });
  }

  res.status(405).send("Method Not Allowed");
};
