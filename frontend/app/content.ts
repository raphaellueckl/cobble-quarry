import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("cq-content")
export class Content extends LitElement {
  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
    }
  `;

  handlePWChange(ev) {
    store.dispatchEvent(
      new CustomEvent(Events.USER_PW_CHANGED, { detail: ev?.target?.value })
    );
  }

  handleStartServer(ev) {
    store.dispatchEvent(
      new CustomEvent(Events.START_SERVER, { detail: ev?.target?.value })
    );
  }

  handleStopServer(ev) {
    store.dispatchEvent(
      new CustomEvent(Events.STOP_SERVER, { detail: ev?.target?.value })
    );
  }

  handleBackupServer(ev) {
    store.dispatchEvent(
      new CustomEvent(Events.BACKUP_SERVER, { detail: ev?.target?.value })
    );
  }

  render() {
    return html`
      <div class="content">
        <input class="pw" @change="${this.handlePWChange}" />
        <button class="button-start" @click="${this.handleStartServer}">
          Start Server
        </button>
        <button class="button-stop" @click="${this.handleStopServer}">
          Stop Server
        </button>
        <button class="button-backup" @click="${this.handleBackupServer}">
          Backup Server
        </button>
        <h2>Logs</h2>
        <textarea></textarea>
        <h2>Commands</h2>
        <input />
      </div>
    `;
  }
}
