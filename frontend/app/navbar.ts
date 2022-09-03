import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("cq-navbar")
export class Navbar extends LitElement {
  static styles = css`
    div {
      background-color: green;
    }

    .sidebar-activcator {
      transform: rotate(90deg);
    }
  `;

  private open: Boolean = false;

  flipState() {
    this.open = !this.open;
    store.dispatchEvent(
      new CustomEvent(Events.SIDENAV_STATE_CHANGE, { detail: this.open })
    );
  }

  render() {
    return html`
      <div>
        Me is the navbar
        <button class="sidebar-activcator" @click="${this.flipState}">
          |||
        </button>
      </div>
    `;
  }
}
