import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";
import "./content";
import "./sidebar";

@customElement("hmmm-container")
export class Container extends LitElement {
  static styles = css`
    div {
      display: flex;
    }

    hmmm-content {
      width: 0;
      transition: width 0.2s;
      overflow: hidden;
    }

    hmmm-sidebar {
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
        <hmmm-content class="${!this.sidebarOpen ? "open" : ""}"></hmmm-content>
        <hmmm-sidebar class="${this.sidebarOpen ? "open" : ""}"></hmmm-sidebar>
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
