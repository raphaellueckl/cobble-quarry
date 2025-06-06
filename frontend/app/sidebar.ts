import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { store, Events } from "./store";
import { globalStyles, resetUL } from "./globals.ts";

@customElement("cq-sidebar")
export class Sidebar extends LitElement {
  @state()
  version = "";

  static styles = css`
    ${globalStyles}
    ${resetUL}

    a {
      color: black;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    div {
      background-color: hotpink;
    }
  `;

  constructor() {
    super();
  }

  render() {
    return html` ${this.version
        ? html`<h2>Currently installed version: ${this.version}</h2>`
        : ""}
      <ul>
        <li>
          <a
            href="https://github.com/raphaellueckl/cobble-quarry/releases/latest/download/cobblequarry.zip"
            target="_blank"
            >> Download newest version here</a
          >
        </li>
        <li>
          <a
            href="https://github.com/raphaellueckl/cobble-quarry/blob/main/readme.md"
            target="_blank"
            >> Manual</a
          >
        </li>
      </ul>`;
  }
}
