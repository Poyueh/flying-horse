import { SimpleCommand, Notification, Facade } from '../core';
import { GameProxy } from '../model/GameProxy';

export class LaunchCommand extends SimpleCommand {
  override execute(notification: Notification): void {
    const springMultiplier = notification.body as number;
    const gameProxy = Facade.getInstance().retrieveProxy<GameProxy>(GameProxy.NAME)!;
    gameProxy.requestLaunch(springMultiplier);
  }
}
