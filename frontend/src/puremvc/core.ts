// ============================================
// PureMVC TypeScript Implementation (Simplified)
// ============================================

/** Notification - the core message type */
export class Notification {
  constructor(
    public name: string,
    public body: unknown = null,
    public type: string = ''
  ) {}
}

/** Observer - wraps a callback + context */
export class Observer {
  constructor(
    public notifyMethod: (notification: Notification) => void,
    public notifyContext: unknown
  ) {}

  notifyObserver(notification: Notification): void {
    this.notifyMethod.call(this.notifyContext, notification);
  }
}

/** Proxy - manages data model */
export class Proxy {
  static NAME = 'Proxy';
  constructor(
    public proxyName: string = Proxy.NAME,
    public data: unknown = null
  ) {}

  onRegister(): void {}
  onRemove(): void {}

  sendNotification(name: string, body?: unknown, type?: string): void {
    Facade.getInstance().sendNotification(name, body, type);
  }
}

/** Mediator - manages view components */
export class Mediator {
  static NAME = 'Mediator';
  constructor(
    public mediatorName: string = Mediator.NAME,
    public viewComponent: unknown = null
  ) {}

  listNotificationInterests(): string[] { return []; }
  handleNotification(_notification: Notification): void {}
  onRegister(): void {}
  onRemove(): void {}

  sendNotification(name: string, body?: unknown, type?: string): void {
    Facade.getInstance().sendNotification(name, body, type);
  }
}

/** SimpleCommand - single-purpose command */
export class SimpleCommand {
  execute(_notification: Notification): void {}

  sendNotification(name: string, body?: unknown, type?: string): void {
    Facade.getInstance().sendNotification(name, body, type);
  }
}

/** Facade - central hub */
export class Facade {
  private static instance: Facade;

  private proxyMap = new Map<string, Proxy>();
  private mediatorMap = new Map<string, Mediator>();
  private commandMap = new Map<string, new () => SimpleCommand>();
  private observerMap = new Map<string, Observer[]>();

  protected constructor() {}

  static getInstance(): Facade {
    if (!Facade.instance) {
      Facade.instance = new Facade();
    }
    return Facade.instance;
  }

  // --- Proxy ---
  registerProxy(proxy: Proxy): void {
    this.proxyMap.set(proxy.proxyName, proxy);
    proxy.onRegister();
  }

  retrieveProxy<T extends Proxy>(name: string): T | undefined {
    return this.proxyMap.get(name) as T | undefined;
  }

  removeProxy(name: string): Proxy | undefined {
    const proxy = this.proxyMap.get(name);
    if (proxy) {
      this.proxyMap.delete(name);
      proxy.onRemove();
    }
    return proxy;
  }

  hasProxy(name: string): boolean {
    return this.proxyMap.has(name);
  }

  // --- Mediator ---
  registerMediator(mediator: Mediator): void {
    if (this.mediatorMap.has(mediator.mediatorName)) return;
    this.mediatorMap.set(mediator.mediatorName, mediator);

    const interests = mediator.listNotificationInterests();
    if (interests.length > 0) {
      const observer = new Observer(mediator.handleNotification, mediator);
      for (const interest of interests) {
        this.registerObserver(interest, observer);
      }
    }
    mediator.onRegister();
  }

  retrieveMediator<T extends Mediator>(name: string): T | undefined {
    return this.mediatorMap.get(name) as T | undefined;
  }

  removeMediator(name: string): Mediator | undefined {
    const mediator = this.mediatorMap.get(name);
    if (mediator) {
      const interests = mediator.listNotificationInterests();
      for (const interest of interests) {
        this.removeObserver(interest, mediator);
      }
      this.mediatorMap.delete(name);
      mediator.onRemove();
    }
    return mediator;
  }

  // --- Command ---
  registerCommand(notificationName: string, commandClass: new () => SimpleCommand): void {
    if (!this.commandMap.has(notificationName)) {
      this.registerObserver(notificationName, new Observer(this.executeCommand, this));
    }
    this.commandMap.set(notificationName, commandClass);
  }

  private executeCommand(notification: Notification): void {
    const CommandClass = this.commandMap.get(notification.name);
    if (CommandClass) {
      const command = new CommandClass();
      command.execute(notification);
    }
  }

  // --- Observer ---
  private registerObserver(notificationName: string, observer: Observer): void {
    const observers = this.observerMap.get(notificationName) || [];
    observers.push(observer);
    this.observerMap.set(notificationName, observers);
  }

  private removeObserver(notificationName: string, notifyContext: unknown): void {
    const observers = this.observerMap.get(notificationName);
    if (observers) {
      this.observerMap.set(
        notificationName,
        observers.filter(o => o.notifyContext !== notifyContext)
      );
    }
  }

  // --- Notification ---
  sendNotification(name: string, body?: unknown, type?: string): void {
    const notification = new Notification(name, body, type);
    this.notifyObservers(notification);
  }

  private notifyObservers(notification: Notification): void {
    const observers = this.observerMap.get(notification.name);
    if (observers) {
      // Copy to avoid modification during iteration
      const copy = [...observers];
      for (const observer of copy) {
        observer.notifyObserver(notification);
      }
    }
  }
}
