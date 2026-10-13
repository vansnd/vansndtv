(() => {
  const cfg = window.VANSND_CONFIG || {};
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const msg = document.getElementById("accountMessage");
  const form = document.getElementById("profileForm");
  const nicknameInput = document.getElementById("nickname");
  const emailInput = document.getElementById("email");
  const saveButton = document.getElementById("saveProfile");
  let client;

  function showMessage(text, error = false) {
    if (!msg) return;
    msg.textContent = text;
    msg.classList.toggle("error", error);
  }
  function getClient() {
    if (!window.supabase) throw new Error("Не удалось загрузить Supabase. Проверь подключение к интернету.");
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.startsWith("ВСТАВЬ_")) {
      throw new Error("Сначала добавь публичный ключ Supabase в config.js.");
    }
    if (!client) client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return client;
  }
  function initials(nick) {
    return (nick || "V").trim().slice(0, 1).toUpperCase() || "V";
  }
  function paint(user) {
    const nick = user.user_metadata?.nickname || user.email?.split("@")[0] || "Участник";
    ["sideNickname", "profileNickname", "detailNickname"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = nick;
    });
    ["sideEmail", "profileEmail"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = user.email || "";
    });
    ["avatar"].forEach(id => {
      document.querySelectorAll("#" + id).forEach(el => el.textContent = initials(nick));
    });
    if (nicknameInput) nicknameInput.value = nick;
    if (emailInput) emailInput.value = user.email || "";
  }
  async function signOut() {
    try {
      const sb = getClient();
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      location.href = "index.html";
    } catch (e) {
      alert(e.message || "Не удалось выйти из аккаунта.");
    }
  }
  document.getElementById("logoutTop")?.addEventListener("click", e => { e.preventDefault(); signOut(); });
  document.getElementById("logoutButton")?.addEventListener("click", signOut);

  (async () => {
    try {
      const sb = getClient();
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      const user = data.session?.user;
      if (!user) {
        location.replace("auth.html");
        return;
      }
      paint(user);
      sb.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) location.replace("auth.html");
        else paint(session.user);
      });
    } catch (e) {
      if (msg) showMessage(e.message || "Не удалось загрузить аккаунт.", true);
      else {
        const lead = document.querySelector(".page-lead");
        if (lead) lead.textContent = (e.message || "Ошибка загрузки аккаунта.") + " После настройки ключа Supabase обнови страницу.";
      }
    }
  })();

  if (form) form.addEventListener("submit", async e => {
    e.preventDefault();
    const nick = nicknameInput.value.trim();
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(nick)) {
      showMessage("Никнейм должен содержать 3–20 символов: латиницу, цифры, _ или -.", true);
      return;
    }
    saveButton.disabled = true;
    saveButton.textContent = "Сохраняем…";
    try {
      const sb = getClient();
      const { data, error } = await sb.auth.updateUser({ data: { nickname: nick } });
      if (error) throw error;
      paint(data.user);
      showMessage("Профиль обновлён!");
    } catch (e) {
      showMessage(e.message || "Не удалось сохранить изменения.", true);
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = 'Сохранить изменения <span>→</span>';
    }
  });
})();