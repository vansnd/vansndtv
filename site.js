document.getElementById("year").textContent = new Date().getFullYear();
const menuButton = document.getElementById("menuButton");
if (menuButton) menuButton.addEventListener("click", () => {
  const nav = document.querySelector(".nav");
  nav.classList.toggle("mobile-open");
});
const cfg = window.VANSND_CONFIG || {};
const yt = document.getElementById("youtubeLink");
if (yt && cfg.YOUTUBE_URL) yt.href = cfg.YOUTUBE_URL;
(async () => {
  if (!window.supabase || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.startsWith("ВСТАВЬ_")) return;
  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const { data: { session } } = await client.auth.getSession();
  const link = document.getElementById("accountLink");
  if (session && link) {
    const nick = session.user.user_metadata?.nickname || session.user.email;
    link.textContent = nick + " · Личный кабинет";
    link.href = "account.html";
  }
})();
