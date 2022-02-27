import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("hmmm-sidebar")
export class Sidebar extends LitElement {
  static styles = css`
    div {
      background-color: hotpink;
    }

    .sidebar {
      width: 0;
      overflow: hidden;
      transition: width 0.2s;
    }

    .sidebar--open {
      width: 100%;
    }
  `;

  constructor() {
    super();
    this.flipState.bind(this);
  }

  @property()
  open: Boolean = false;

  flipState({ detail: change }) {
    this.open = change;
  }

  render() {
    return html`
      <div class="sidebar ${this.open ? "sidebar--open" : ""}">
        Me the sidebar
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    store.addEventListener(Events.SIDENAV_STATE_CHANGED, (ev) =>
      this.flipState(ev)
    );
  }
}
