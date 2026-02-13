import { Mediator, Notification } from '../core';
import { AppNotes } from '../AppNotes';
import { api } from '../../utils/api';

export class AdminMediator extends Mediator {
  static override NAME = 'AdminMediator';
  private panel: HTMLElement | null = null;

  constructor() {
    super(AdminMediator.NAME);
  }

  override listNotificationInterests(): string[] {
    return [AppNotes.SHOW_ADMIN, AppNotes.SHOW_HISTORY, AppNotes.LOGOUT];
  }

  override handleNotification(notification: Notification): void {
    switch (notification.name) {
      case AppNotes.SHOW_ADMIN:
        this.showAdminPanel();
        break;
      case AppNotes.SHOW_HISTORY:
        this.showHistoryPanel();
        break;
      case AppNotes.LOGOUT:
        this.closePanel();
        break;
    }
  }

  private closePanel(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  private createOverlay(): HTMLElement {
    this.closePanel();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10000;overflow-y:auto;font-family:system-ui,-apple-system,sans-serif;';
    this.panel = overlay;
    document.body.appendChild(overlay);
    return overlay;
  }

  private async showHistoryPanel(): Promise<void> {
    const overlay = this.createOverlay();
    overlay.innerHTML = `<div style="max-width:900px;margin:0 auto;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2 style="color:#facc15;font-size:24px;font-weight:900;">📊 Game History</h2>
        <button id="close-hist" style="background:#374151;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:16px;">✕ Close</button>
      </div>
      <div id="stats-box" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;"></div>
      <div id="hist-table" style="background:#111827;border-radius:12px;overflow:hidden;">
        <div style="display:grid;grid-template-columns:80px 1fr 80px 80px 100px 100px;padding:12px 16px;background:#1f2937;color:#9ca3af;font-weight:700;font-size:13px;">
          <div>Round</div><div>Time</div><div>Mul</div><div>Bet</div><div>Win</div><div>Balance</div>
        </div>
        <div id="hist-rows" style="max-height:60vh;overflow-y:auto;"></div>
      </div>
      <div id="hist-pages" style="display:flex;gap:8px;justify-content:center;margin-top:16px;"></div>
    </div>`;

    overlay.querySelector('#close-hist')!.addEventListener('click', () => this.closePanel());

    try {
      const [histData, statsData] = await Promise.all([api.getHistory(1, 100), api.getStats()]);
      
      // Stats
      const statsBox = overlay.querySelector('#stats-box')!;
      const statItems = [
        { label: 'Total Bets', value: statsData.totalBets, color: '#60a5fa' },
        { label: 'Wagered', value: `$${statsData.totalWagered.toFixed(2)}`, color: '#fbbf24' },
        { label: 'Won', value: `$${statsData.totalWon.toFixed(2)}`, color: '#34d399' },
        { label: 'Net P/L', value: `$${statsData.netProfit.toFixed(2)}`, color: statsData.netProfit >= 0 ? '#34d399' : '#f87171' },
        { label: 'Jackpots', value: statsData.jackpots, color: '#c084fc' },
        { label: 'Biggest Win', value: `$${statsData.biggestWin.toFixed(2)}`, color: '#facc15' },
      ];
      statsBox.innerHTML = statItems.map(s => `
        <div style="background:#1f2937;padding:16px;border-radius:12px;text-align:center;border:1px solid #374151;">
          <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">${s.label}</div>
          <div style="color:${s.color};font-size:20px;font-weight:900;">${s.value}</div>
        </div>
      `).join('');

      // Records
      const rows = overlay.querySelector('#hist-rows')!;
      rows.innerHTML = histData.records.map(r => {
        const isWin = r.winAmount > r.betAmount;
        const time = new Date(r.createdAt).toLocaleTimeString();
        return `<div style="display:grid;grid-template-columns:80px 1fr 80px 80px 100px 100px;padding:10px 16px;border-bottom:1px solid #1f2937;font-size:13px;color:#d1d5db;">
          <div style="color:#6b7280;">#${r.roundId.slice(-4)}</div>
          <div style="color:#6b7280;">${time}</div>
          <div style="color:#60a5fa;font-weight:700;">x${r.multiplier}</div>
          <div>$${r.betAmount.toFixed(2)}</div>
          <div style="color:${isWin ? '#34d399' : '#f87171'};font-weight:700;">$${r.winAmount.toFixed(2)}</div>
          <div style="color:#facc15;">$${r.balAfter.toFixed(2)}</div>
        </div>`;
      }).join('');
    } catch (error) {
      console.error('History load error:', error);
    }
  }

  private async showAdminPanel(): Promise<void> {
    const overlay = this.createOverlay();
    overlay.innerHTML = `<div style="max-width:1100px;margin:0 auto;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2 style="color:#f87171;font-size:24px;font-weight:900;">🔧 Admin Panel</h2>
        <button id="close-admin" style="background:#374151;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">✕ Close</button>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <button class="admin-tab" data-tab="reports" style="padding:10px 20px;border-radius:8px;border:2px solid #f87171;background:#7f1d1d;color:#fca5a5;cursor:pointer;font-weight:700;">Reports</button>
        <button class="admin-tab" data-tab="players" style="padding:10px 20px;border-radius:8px;border:2px solid #374151;background:transparent;color:#9ca3af;cursor:pointer;font-weight:700;">Players</button>
        <button class="admin-tab" data-tab="config" style="padding:10px 20px;border-radius:8px;border:2px solid #374151;background:transparent;color:#9ca3af;cursor:pointer;font-weight:700;">Game Config</button>
      </div>
      <div id="admin-content"></div>
    </div>`;

    overlay.querySelector('#close-admin')!.addEventListener('click', () => this.closePanel());

    const tabs = overlay.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          (t as HTMLElement).style.background = 'transparent';
          (t as HTMLElement).style.borderColor = '#374151';
          (t as HTMLElement).style.color = '#9ca3af';
        });
        (tab as HTMLElement).style.background = '#7f1d1d';
        (tab as HTMLElement).style.borderColor = '#f87171';
        (tab as HTMLElement).style.color = '#fca5a5';
        this.loadAdminTab((tab as HTMLElement).dataset.tab!, overlay);
      });
    });

    this.loadAdminTab('reports', overlay);
  }

  private async loadAdminTab(tab: string, overlay: HTMLElement): Promise<void> {
    const content = overlay.querySelector('#admin-content')!;
    content.innerHTML = '<div style="color:#6b7280;text-align:center;padding:40px;">Loading...</div>';

    try {
      if (tab === 'reports') {
        const data = await api.adminGetReports() as {
          overview: Record<string, number>;
          dailyReport: Array<{ date: string; wagered: number; paid: number; bets: number; profit: number }>;
        };
        const o = data.overview;
        content.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px;">
            ${[
              { l: 'Total Players', v: o.totalPlayers, c: '#60a5fa' },
              { l: 'Total Bets', v: o.totalBets, c: '#fbbf24' },
              { l: 'Total Wagered', v: `$${o.totalWagered}`, c: '#f87171' },
              { l: 'Total Paid', v: `$${o.totalPaid}`, c: '#34d399' },
              { l: 'House Edge', v: `$${o.houseEdge}`, c: o.houseEdge >= 0 ? '#34d399' : '#f87171' },
              { l: 'Actual RTP', v: `${o.actualRTP}%`, c: '#c084fc' },
              { l: 'Jackpots', v: o.jackpots, c: '#facc15' },
            ].map(s => `<div style="background:#1f2937;padding:16px;border-radius:12px;text-align:center;border:1px solid #374151;">
              <div style="color:#6b7280;font-size:12px;">${s.l}</div>
              <div style="color:${s.c};font-size:22px;font-weight:900;">${s.v}</div>
            </div>`).join('')}
          </div>
          <h3 style="color:white;font-size:18px;font-weight:700;margin-bottom:12px;">Daily Report (Last 7 Days)</h3>
          <div style="background:#111827;border-radius:12px;overflow:hidden;">
            <div style="display:grid;grid-template-columns:repeat(5,1fr);padding:12px 16px;background:#1f2937;color:#9ca3af;font-weight:700;font-size:13px;">
              <div>Date</div><div>Bets</div><div>Wagered</div><div>Paid</div><div>Profit</div>
            </div>
            ${data.dailyReport.map(d => `<div style="display:grid;grid-template-columns:repeat(5,1fr);padding:10px 16px;border-bottom:1px solid #1f2937;font-size:13px;color:#d1d5db;">
              <div>${d.date}</div><div>${d.bets}</div><div>$${d.wagered.toFixed(2)}</div><div>$${d.paid.toFixed(2)}</div>
              <div style="color:${d.profit >= 0 ? '#34d399' : '#f87171'};font-weight:700;">$${d.profit.toFixed(2)}</div>
            </div>`).join('')}
          </div>`;
      } else if (tab === 'players') {
        const data = await api.adminGetPlayers();
        content.innerHTML = `
          <div style="background:#111827;border-radius:12px;overflow:hidden;">
            <div style="display:grid;grid-template-columns:1fr 1fr 120px 80px 80px 120px;padding:12px 16px;background:#1f2937;color:#9ca3af;font-weight:700;font-size:13px;">
              <div>Username</div><div>Nickname</div><div>Balance</div><div>Games</div><div>Status</div><div>Actions</div>
            </div>
            ${data.players.map(p => `<div style="display:grid;grid-template-columns:1fr 1fr 120px 80px 80px 120px;padding:10px 16px;border-bottom:1px solid #1f2937;font-size:13px;color:#d1d5db;align-items:center;">
              <div>${p.username}</div><div>${p.nickname}</div>
              <div style="color:#facc15;font-weight:700;">$${p.balance.toFixed(2)}</div>
              <div>${p.totalGames}</div>
              <div style="color:${p.status === 'active' ? '#34d399' : '#f87171'};">${p.status}</div>
              <div><button class="add-funds-btn" data-id="${p.id}" style="background:#1d4ed8;color:white;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;">+ Funds</button></div>
            </div>`).join('')}
          </div>`;

        content.querySelectorAll('.add-funds-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = (btn as HTMLElement).dataset.id!;
            const amount = prompt('Enter amount to add (negative to deduct):');
            if (amount) {
              try {
                await api.adminUpdateBalance(id, parseFloat(amount), 'Admin adjustment');
                this.loadAdminTab('players', overlay);
              } catch (e) {
                alert('Error: ' + (e as Error).message);
              }
            }
          });
        });
      } else if (tab === 'config') {
        const data = await api.adminGetGameConfig();
        content.innerHTML = `
          <div style="background:#1f2937;padding:24px;border-radius:12px;margin-bottom:16px;">
            <h3 style="color:#facc15;font-size:18px;font-weight:700;margin-bottom:16px;">Bet List (at least 5)</h3>
            <textarea id="cfg-betlist" style="width:100%;height:80px;background:#111827;color:white;border:1px solid #374151;border-radius:8px;padding:12px;font-family:monospace;font-size:14px;">${JSON.stringify(data.betList)}</textarea>
            <h3 style="color:#facc15;font-size:18px;font-weight:700;margin:16px 0 8px;">RTP (0.5 - 1.0)</h3>
            <input id="cfg-rtp" type="number" step="0.01" min="0.5" max="1.0" value="${data.rtp}" style="width:120px;padding:10px;background:#111827;color:white;border:1px solid #374151;border-radius:8px;font-size:16px;" />
            <div style="margin-top:20px;">
              <button id="save-config" style="background:linear-gradient(135deg,#facc15,#f59e0b);color:#000;border:none;padding:12px 32px;border-radius:10px;font-weight:900;font-size:16px;cursor:pointer;">Save Config</button>
              <span id="cfg-msg" style="color:#34d399;margin-left:12px;display:none;">Saved!</span>
            </div>
          </div>`;

        content.querySelector('#save-config')!.addEventListener('click', async () => {
          try {
            const betListStr = (content.querySelector('#cfg-betlist') as HTMLTextAreaElement).value;
            const rtp = parseFloat((content.querySelector('#cfg-rtp') as HTMLInputElement).value);
            const betList = JSON.parse(betListStr);
            await api.adminUpdateGameConfig(betList, rtp);
            const msg = content.querySelector('#cfg-msg') as HTMLElement;
            msg.style.display = 'inline';
            setTimeout(() => { msg.style.display = 'none'; }, 2000);
          } catch (e) {
            alert('Error: ' + (e as Error).message);
          }
        });
      }
    } catch (error) {
      content.innerHTML = `<div style="color:#f87171;text-align:center;padding:40px;">Error: ${(error as Error).message}</div>`;
    }
  }
}
