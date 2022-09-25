import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("cq-navbar")
export class Navbar extends LitElement {
  static styles = css`
    .navbar-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 68px;
      background: url("data:image/png;base64,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");
      color: #d0c5c0;
      font-family: "title-font";
      font-size: 24px;
    }

    .title-wrapper {
      display: flex;
      align-items: center;
    }

    .title {
      margin-right: 18px;
    }

    .logo {
      height: 72px;
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
      <div class="navbar-wrapper">
        <div class="title-wrapper">
          <h1 class="title">Cobble Quarry</h1>
          <img src="favicon.png" class="logo" />
        </div>
        <button class="sidebar-button" @click="${this.flipState}">|||</button>
      </div>
    `;
  }
}
