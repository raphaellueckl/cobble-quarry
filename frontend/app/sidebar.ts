import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("cq-sidebar")
export class Sidebar extends LitElement {
  static styles = css`
    div {
      background-color: hotpink;
    }
  `;

  constructor() {
    super();
  }

  render() {
    return html` <div>Yet unused sidebar (._. )'</div> `;
  }
}
