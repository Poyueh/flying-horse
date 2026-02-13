import { SimpleCommand, Notification, Facade } from '../core';
import { AppNotes } from '../AppNotes';
import { PlayerProxy } from '../model/PlayerProxy';
import { GameProxy } from '../model/GameProxy';
import { LoginMediator } from '../view/LoginMediator';
import { GameMediator } from '../view/GameMediator';
import { AdminMediator } from '../view/AdminMediator';
import { LaunchCommand } from './LaunchCommand';
import { ShootCommand } from './ShootCommand';

export class StartupCommand extends SimpleCommand {
  override execute(_notification: Notification): void {
    const facade = Facade.getInstance();

    // Register Proxies
    facade.registerProxy(new PlayerProxy());
    facade.registerProxy(new GameProxy());

    // Register Commands
    facade.registerCommand(AppNotes.LAUNCH_REQUEST, LaunchCommand);
    facade.registerCommand(AppNotes.SHOOT_REQUEST, ShootCommand);

    // Register Mediators
    facade.registerMediator(new LoginMediator());
    facade.registerMediator(new GameMediator());
    facade.registerMediator(new AdminMediator());

    // Load game config
    const gameProxy = facade.retrieveProxy<GameProxy>(GameProxy.NAME)!;
    gameProxy.loadConfig();

    // Check existing session
    const playerProxy = facade.retrieveProxy<PlayerProxy>(PlayerProxy.NAME)!;
    playerProxy.onRegister();
  }
}
