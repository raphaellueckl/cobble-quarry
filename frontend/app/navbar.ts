import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("cq-navbar")
export class Navbar extends LitElement {
  static styles = css`
    div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      border-bottom: 2px solid black;
    }

    .sidebar-button {
      transform: rotate(90deg);
      width: 40px;
      height: 40px;
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
        <h1>Cobble Quarry 🗿</h1>
        <button class="sidebar-button" @click="${this.flipState}">|||</button>
      </div>
    `;
  }
}
