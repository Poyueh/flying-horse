import { Mediator, Notification, Facade } from '../core';
import { AppNotes } from '../AppNotes';
import { GameProxy } from '../model/GameProxy';
import { PlayerProxy } from '../model/PlayerProxy';
import { GameEngine } from '../../game/GameEngine';

export class GameMediator extends Mediator {
  static override NAME = 'GameMediator';

  private engine: GameEngine | null = null;

  constructor() {
    super(GameMediator.NAME);
  }

  override listNotificationInterests(): string[] {
    return [
      AppNotes.SHOW_GAME,
      AppNotes.GAME_CONFIG_LOADED,
      AppNotes.LAUNCH_RESULT,
      AppNotes.SHOOT_RESULT,
      AppNotes.BALANCE_UPDATED,
      AppNotes.BET_CHANGED,
      AppNotes.LOGOUT,
    ];
  }

  override handleNotification(notification: Notification): void {
    switch (notification.name) {
      case AppNotes.SHOW_GAME:
        this.showGame();
        break;
      case AppNotes.GAME_CONFIG_LOADED:
        if (this.engine) {
          const config = notification.body as { betList: number[]; mulSteps: number[] };
          this.engine.setConfig(config.betList, config.mulSteps);
        }
        break;
      case AppNotes.LAUNCH_RESULT:
        if (this.engine) {
          const result = notification.body as {
            isWin: boolean; winAmount: number; launchMultiplier: number; balance: number; roundId: string;
          };
          this.engine.handleLaunchResult(result);
        }
        break;
      case AppNotes.SHOOT_RESULT:
        if (this.engine) {
          const result = notification.body as {
            result: string; winAmount: number; balance: number; roundId: string;
          };
          this.engine.handleShootResult(result);
        }
        break;
      case AppNotes.BALANCE_UPDATED:
        if (this.engine) {
          this.engine.updateBalance(notification.body as number);
        }
        break;
      case AppNotes.BET_CHANGED:
        if (this.engine) {
          this.engine.updateBetDisplay(notification.body as number);
        }
        break;
      case AppNotes.LOGOUT:
        this.hideGame();
        break;
    }
  }

  private showGame(): void {
    const wrapper = document.getElementById('game-wrapper');
    if (wrapper) wrapper.style.display = 'block';

    if (!this.engine) {
      this.engine = new GameEngine({
        onLaunch: (springMul: number) => {
          this.sendNotification(AppNotes.LAUNCH_REQUEST, springMul);
        },
        onShoot: () => {
          this.sendNotification(AppNotes.SHOOT_REQUEST);
        },
        onBetChange: (amount: number) => {
          const gameProxy = Facade.getInstance().retrieveProxy<GameProxy>(GameProxy.NAME)!;
          gameProxy.setBet(amount);
        },
        onBetAdjust: (delta: number) => {
          const gameProxy = Facade.getInstance().retrieveProxy<GameProxy>(GameProxy.NAME)!;
          gameProxy.adjustBet(delta);
        },
        onShowHistory: () => {
          this.sendNotification(AppNotes.SHOW_HISTORY);
        },
        onShowAdmin: () => {
          this.sendNotification(AppNotes.SHOW_ADMIN);
        },
        onLogout: () => {
          const playerProxy = Facade.getInstance().retrieveProxy<PlayerProxy>(PlayerProxy.NAME)!;
          playerProxy.logout();
        },
      });

      // Apply config if already loaded
      const gameProxy = Facade.getInstance().retrieveProxy<GameProxy>(GameProxy.NAME)!;
      if (gameProxy.gameState.config) {
        this.engine.setConfig(
          gameProxy.gameState.config.betList,
          gameProxy.gameState.config.mulSteps
        );
      }

      // Set initial balance
      const playerProxy = Facade.getInstance().retrieveProxy<PlayerProxy>(PlayerProxy.NAME)!;
      this.engine.updateBalance(playerProxy.balance);
    }
  }

  private hideGame(): void {
    const wrapper = document.getElementById('game-wrapper');
    if (wrapper) wrapper.style.display = 'none';
  }
}
