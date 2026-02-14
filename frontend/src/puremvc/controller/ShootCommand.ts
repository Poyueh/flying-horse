import { SimpleCommand, Notification, Facade } from '../core';
import { GameProxy } from '../model/GameProxy';

export class ShootCommand extends SimpleCommand {
  override execute(_notification: Notification): void {
    const gameProxy = Facade.getInstance().retrieveProxy<GameProxy>(GameProxy.NAME)!;
    gameProxy.requestShoot();
  }
}
