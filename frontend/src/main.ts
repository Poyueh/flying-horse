import { Facade } from './puremvc/core';
import { AppNotes } from './puremvc/AppNotes';
import { StartupCommand } from './puremvc/controller/StartupCommand';

// ============================================
// Application Bootstrap
// ============================================
class App {
  private facade: Facade;

  constructor() {
    this.facade = Facade.getInstance();
    this.facade.registerCommand(AppNotes.STARTUP, StartupCommand);
    this.facade.sendNotification(AppNotes.STARTUP);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
