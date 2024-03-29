import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";
import "./content";
import "./sidebar";

@customElement("cq-app-container")
export class Container extends LitElement {
  static styles = css`
    .app-wrapper {
      display: flex;
      justify-content: center;
    }

    .max-size-container {
      width: 1500px;
      display: flex;
      margin: 40px;
      padding: 20px;
      background: rgba(244, 164, 96, 0.6);
      border-radius: 20px;
    }

    cq-content {
      width: 0;
      transition: width 0.2s;
      overflow: hidden;
    }

    cq-sidebar {
      width: 0;
      transition: width 0.2s;
      overflow: hidden;
    }

    .open {
      width: 100%;
    }
  `;

  @property()
  sidebarOpen: Boolean = false;

  sidebarAction({ detail: change }) {
    this.sidebarOpen = change;
  }

  render() {
    return html`
      <div class="app-wrapper">
        <div class="max-size-container">
          <cq-content class="${!this.sidebarOpen ? "open" : ""}"></cq-content>
          <cq-sidebar class="${this.sidebarOpen ? "open" : ""}"></cq-sidebar>
        </div>
        <div></div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    store.addEventListener(Events.SIDENAV_STATE_CHANGED, (ev) =>
      this.sidebarAction(ev)
    );
  }
}
