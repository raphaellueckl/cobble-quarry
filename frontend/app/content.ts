import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("cq-content")
export class Content extends LitElement {
  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
      margin: 8px;
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      margin: 8px;
      padding: 8px;
      width: 500px;
    }

    .action-buttons > button {
      margin: 4px;
      width: 150px;
      height: 50px;
    }
  `;

  @state()
  prefilledPW;

  constructor() {
    super();
    this.prefilledPW = "";
  }

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

  protected firstUpdated(_changedProperties: PropertyValues<any>): void {
    this.prefilledPW = store.userPW;
  }

  render() {
    return html`
      <div class="content">
        <label>
          Password:
          <input
            class="pw"
            type="password"
            @change="${this.handlePWChange}"
            .value="${this.prefilledPW}"
          />
        </label>
        <div class="action-buttons">
          <button class="button-start" @click="${this.handleStartServer}">
            Start Server
          </button>
          <button class="button-stop" @click="${this.handleStopServer}">
            Stop Server
          </button>
          <button class="button-backup" @click="${this.handleBackupServer}">
            Backup Server
          </button>
        </div>
        <h2>Logs</h2>
        <textarea></textarea>
        <h2>Commands</h2>
        <input />
      </div>
    `;
  }
}
