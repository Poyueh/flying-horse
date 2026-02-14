import { Mediator, Notification, Facade } from '../core';
import { AppNotes } from '../AppNotes';
import { PlayerProxy } from '../model/PlayerProxy';

export class LoginMediator extends Mediator {
  static override NAME = 'LoginMediator';

  private loginScreen: HTMLElement | null = null;

  constructor() {
    super(LoginMediator.NAME);
  }

  override listNotificationInterests(): string[] {
    return [
      AppNotes.SHOW_LOGIN,
      AppNotes.LOGIN_SUCCESS,
      AppNotes.LOGIN_FAILED,
      AppNotes.REGISTER_SUCCESS,
      AppNotes.REGISTER_FAILED,
      AppNotes.LOGOUT,
    ];
  }

  override handleNotification(notification: Notification): void {
    switch (notification.name) {
      case AppNotes.SHOW_LOGIN:
        this.showLoginScreen();
        break;
      case AppNotes.LOGIN_SUCCESS:
      case AppNotes.REGISTER_SUCCESS:
        this.hideLoginScreen();
        this.sendNotification(AppNotes.SHOW_GAME);
        break;
      case AppNotes.LOGIN_FAILED:
      case AppNotes.REGISTER_FAILED:
        this.showError(notification.body as string);
        break;
      case AppNotes.LOGOUT:
        this.showLoginScreen();
        break;
    }
  }

  override onRegister(): void {
    this.createLoginScreen();
  }

  private createLoginScreen(): void {
    this.loginScreen = document.createElement('div');
    this.loginScreen.id = 'login-screen';
    this.loginScreen.innerHTML = `
      <div style="position:fixed;inset:0;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:system-ui,-apple-system,sans-serif;">
        <div style="background:rgba(0,0,0,0.6);backdrop-filter:blur(20px);border-radius:24px;padding:48px;width:420px;max-width:90vw;border:1px solid rgba(255,255,255,0.1);box-shadow:0 25px 50px rgba(0,0,0,0.5);">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="font-size:48px;margin-bottom:8px;">🐴</div>
            <h1 style="color:#facc15;font-size:28px;font-weight:900;letter-spacing:2px;margin:0;">飛天神駒</h1>
            <p style="color:#9ca3af;font-size:14px;margin-top:4px;">Flying Horse</p>
          </div>
          <div id="login-error" style="display:none;background:#7f1d1d;color:#fca5a5;padding:12px;border-radius:12px;margin-bottom:16px;font-size:14px;text-align:center;"></div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <input id="login-username" type="text" placeholder="Username" style="padding:14px 16px;border-radius:12px;border:2px solid #374151;background:#1f2937;color:white;font-size:16px;outline:none;" />
            <input id="login-password" type="password" placeholder="Password" style="padding:14px 16px;border-radius:12px;border:2px solid #374151;background:#1f2937;color:white;font-size:16px;outline:none;" />
            <input id="login-nickname" type="text" placeholder="Nickname (for register)" style="padding:14px 16px;border-radius:12px;border:2px solid #374151;background:#1f2937;color:white;font-size:14px;outline:none;display:none;" />
            <button id="login-btn" style="padding:16px;border-radius:12px;border:none;background:linear-gradient(135deg,#facc15,#f59e0b);color:#000;font-size:18px;font-weight:900;cursor:pointer;letter-spacing:1px;">LOGIN</button>
            <button id="register-btn" style="padding:16px;border-radius:12px;border:2px solid #374151;background:transparent;color:#9ca3af;font-size:14px;cursor:pointer;">Register New Account</button>
          </div>
          <div style="text-align:center;margin-top:16px;color:#6b7280;font-size:12px;">
            Test: player1 / test123 | Admin: admin / admin123
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.loginScreen);

    let isRegisterMode = false;

    const loginBtn = this.loginScreen.querySelector('#login-btn') as HTMLButtonElement;
    const registerBtn = this.loginScreen.querySelector('#register-btn') as HTMLButtonElement;
    const nicknameInput = this.loginScreen.querySelector('#login-nickname') as HTMLInputElement;

    loginBtn.addEventListener('click', () => {
      const username = (this.loginScreen!.querySelector('#login-username') as HTMLInputElement).value;
      const password = (this.loginScreen!.querySelector('#login-password') as HTMLInputElement).value;
      const playerProxy = Facade.getInstance().retrieveProxy<PlayerProxy>(PlayerProxy.NAME)!;

      if (isRegisterMode) {
        const nickname = nicknameInput.value;
        playerProxy.register(username, password, nickname || undefined);
      } else {
        playerProxy.login(username, password);
      }
    });

    registerBtn.addEventListener('click', () => {
      isRegisterMode = !isRegisterMode;
      nicknameInput.style.display = isRegisterMode ? 'block' : 'none';
      loginBtn.textContent = isRegisterMode ? 'REGISTER' : 'LOGIN';
      registerBtn.textContent = isRegisterMode ? 'Back to Login' : 'Register New Account';
    });

    // Enter key
    [this.loginScreen.querySelector('#login-username'),
     this.loginScreen.querySelector('#login-password')].forEach(el => {
      el?.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') loginBtn.click();
      });
    });
  }

  private showLoginScreen(): void {
    if (this.loginScreen) {
      this.loginScreen.style.display = 'block';
    }
  }

  private hideLoginScreen(): void {
    if (this.loginScreen) {
      this.loginScreen.style.display = 'none';
    }
  }

  private showError(msg: string): void {
    const errorEl = this.loginScreen?.querySelector('#login-error') as HTMLElement;
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
    }
  }
}
