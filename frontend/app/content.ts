import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("cq-content")
export class Content extends LitElement {
  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
      margin: 8px;

      font-family: "content-font";
      font-size: 24px;
      font-weight: 600;
    }

    .section {
      font-size: 36px;
      margin: 12px 0;
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      max-width: 500px;
    }

    .action-buttons > button {
      margin: 2px 4px 2px 0;
      width: 120px;
      height: 50px;
      font-family: "content-font";
      font-size: 24px;
    }

    pre {
      margin-top: 0;
      margin-bottom: 4px;
      white-space: pre-wrap;
    }

    .logs {
      border: 1px solid black;
      border-radius: 12px;
    }

    /* Reset UL */
    ul {
      list-style: none;
      padding: 6px;
      margin: 0;

      height: 500px;
      overflow: auto;
      font-size: 14px;
    }

    .run-away {
      animation: flee 3s linear 0s 1;
    }

    @keyframes flee {
      30% {
        transform: rotate(180deg);
        transform-origin: 500px 500px;
      }
      100% {
        transform: rotate(4320deg);
      }
    }
  `;

  @state()
  prefilledPW;
  @state()
  logs: Array<string>;

  @query("#password")
  passwordInput;

  constructor() {
    super();
    this.prefilledPW = "";
    this.logs = [];
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

  handleMouseOver(ev) {
    if (!this.passwordInput.value) {
      const elem = ev.target;
      ev.target.classList.add("run-away");
      setTimeout(() => {
        elem.classList.remove("run-away");
      }, 3100);
    }
  }

  handleCommand(ev) {
    if (ev.key !== "Enter") return;
    store.dispatchEvent(
      new CustomEvent(Events.EXECUTE_COMMAND, { detail: ev?.target?.value })
    );
    ev.target.value = "";
  }

  protected firstUpdated(_changedProperties: PropertyValues<any>): void {
    this.prefilledPW = store.userPW;

    store.addEventListener(Events.UPDATED_LOGS, ({ detail }) => {
      this.logs = detail;
    });
  }

  render() {
    return html`
      <div class="content">
        <label>
          Password:
          <input
            id="password"
            class="pw"
            type="password"
            @change="${this.handlePWChange}"
            .value="${this.prefilledPW}"
          />
        </label>
        <h2 class="section">Actions</h2>
        <div class="action-buttons">
          <button
            class="button-start"
            @click="${this.handleStartServer}"
            @mouseover="${this.handleMouseOver}"
          >
            Start Server
          </button>
          <button
            class="button-stop"
            @click="${this.handleStopServer}"
            @mouseover="${this.handleMouseOver}"
          >
            Stop Server
          </button>
          <button
            class="button-backup"
            @click="${this.handleBackupServer}"
            @mouseover="${this.handleMouseOver}"
          >
            Backup Server
          </button>
        </div>
        <h2 class="section">Commands (ENTER to send)</h2>
        <input class="command-input" @keyup="${this.handleCommand}" />
        <h2 class="section">Logs</h2>
        <ul class="logs">
          ${this.logs.length
            ? this.logs.map((l) => html`<li><pre>${l}</pre></li>`)
            : html`<li><pre>Loading Logs...</pre></li>`}
        </ul>
      </div>
    `;
  }
}
