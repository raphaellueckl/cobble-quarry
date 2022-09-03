import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";
import "./content";
import "./sidebar";

@customElement("cq-container")
export class Container extends LitElement {
  static styles = css`
    div {
      display: flex;
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
      <div>
        <cq-content class="${!this.sidebarOpen ? "open" : ""}"></cq-content>
        <cq-sidebar class="${this.sidebarOpen ? "open" : ""}"></cq-sidebar>
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
