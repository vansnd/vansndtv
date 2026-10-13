const cfg = window.VANSND_CONFIG || {};
const registerTab = document.getElementById("registerTab");
const loginTab = document.getElementById("loginTab");
const form = document.getElementById("authForm");
const nicknameField = document.getElementById("nicknameField");
const repeatField = document.getElementById("repeatField");
const nickname = document.getElementById("nickname");
const email = document.getElementById("email");
const password = document.getElementById("password");
const repeatPassword = document.getElementById("repeatPassword");
const message = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");
let mode = "register";
let turnstileToken = "";
let turnstileWidgetId = null;
let captchaReady = false;
let client = null;

document.getElementById("year").textContent = new Date().getFullYear();
function showMessage(text, isError=false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}
function setMode(nextMode) {
  mode = nextMode;
  const isRegister = mode === "register";
  registerTab.classList.toggle("active", isRegister);
  loginTab.classList.toggle("active", !isRegister);
  nicknameField.hidden = !isRegister;
  repeatField.hidden = !isRegister;
  document.getElementById("formTitle").textContent = isRegister ? "Создать аккаунт" : "С возвращением!";
  document.getElementById("formSubtitle").textContent = isRegister ? "Заполни поля ниже — это займёт минуту." : "Введи данные своего аккаунта.";
  password.autocomplete = isRegister ? "new-password" : "current-password";
  submitButton.innerHTML = isRegister ? 'Создать аккаунт <span>→</span>' : 'Войти в аккаунт <span>→</span>';
  showMessage("");
  turnstileToken = "";
  if (window.turnstile && turnstileWidgetId !== null) {
    try { window.turnstile.reset(turnstileWidgetId); } catch (_) {}
  }
}
registerTab.addEventListener("click", () => setMode("register"));
loginTab.addEventListener("click", () => setMode("login"));

window.onTurnstileLoaded = function () {
  if (!cfg.TURNSTILE_SITE_KEY || cfg.TURNSTILE_SITE_KEY.startsWith("ВСТАВЬ_")) {
    showMessage("Сначала добавь Site Key Cloudflare Turnstile в config.js, а затем включи CAPTCHA в настройках Supabase.", true);
    return;
  }
  try {
    turnstileWidgetId = window.turnstile.render("#turnstileWidget", {
      sitekey: cfg.TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: token => { turnstileToken = token; captchaReady = true; },
      "expired-callback": () => { turnstileToken = ""; captchaReady = false; },
      "error-callback": () => { turnstileToken = ""; captchaReady = false; }
    });
  } catch (e) { showMessage("Не удалось загрузить CAPTCHA. Обнови страницу и проверь настройки.", true); }
};

function getClient() {
  if (!window.supabase) throw new Error("Не удалось загрузить библиотеку авторизации. Проверь подключение к интернету.");
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.startsWith("ВСТАВЬ_")) {
    throw new Error("Добавь публичный Supabase publishable/anon key в файл config.js.");
  }
  if (!client) client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  return client;
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage("");
  const mail = email.value.trim();
  const pass = password.value;
  if (!mail || !pass) return showMessage("Заполни электронную почту и пароль.", true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return showMessage("Проверь адрес электронной почты.", true);
  if (mode === "register") {
    const nick = nickname.value.trim();
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(nick)) return showMessage("Никнейм должен быть длиной 3–20 символов и содержать только латиницу, цифры, _ или -.", true);
    if (pass.length < 8) return showMessage("Пароль должен содержать минимум 8 символов.", true);
    if (pass !== repeatPassword.value) return showMessage("Пароли не совпадают.", true);
  }
  if (!turnstileToken) return showMessage("Пройди проверку CAPTCHA перед продолжением.", true);
  submitButton.disabled = true;
  submitButton.textContent = mode === "register" ? "Создаём аккаунт…" : "Входим…";
  try {
    const sb = getClient();
    let result;
    if (mode === "register") {
      result = await sb.auth.signUp({
        email: mail,
        password: pass,
        options: { data: { nickname: nickname.value.trim() }, captchaToken: turnstileToken }
      });
      if (result.error) throw result.error;
      if (result.data.session) {
        showMessage("Аккаунт создан! Ты уже вошёл в систему. Сейчас вернёмся на главную.");
        setTimeout(() => location.href = "account.html", 1400);
      } else {
        showMessage("Почти готово! Открой письмо от Supabase и подтверди электронную почту. После подтверждения сможешь войти.");
        form.reset(); turnstileToken = ""; captchaReady = false;
        if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
      }
    } else {
      result = await sb.auth.signInWithPassword({ email: mail, password: pass, options: { captchaToken: turnstileToken } });
      if (result.error) throw result.error;
      showMessage("Вход выполнен! Перенаправляем на главную…");
      setTimeout(() => location.href = "account.html", 900);
    }
  } catch (err) {
    const raw = String(err?.message || "Неизвестная ошибка");
    let friendly = raw;
    if (/Invalid login credentials/i.test(raw)) friendly = "Неверная почта или пароль.";
    else if (/Email not confirmed/i.test(raw)) friendly = "Сначала подтверди электронную почту по ссылке из письма.";
    else if (/already registered|User already registered/i.test(raw)) friendly = "Этот email уже зарегистрирован. Переключись на вкладку «Вход».";
    else if (/captcha/i.test(raw)) friendly = "CAPTCHA не прошла проверку. Обнови её и попробуй снова.";
    showMessage(friendly, true);
    turnstileToken = ""; captchaReady = false;
    if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = mode === "register" ? 'Создать аккаунт <span>→</span>' : 'Войти в аккаунт <span>→</span>';
  }
});
