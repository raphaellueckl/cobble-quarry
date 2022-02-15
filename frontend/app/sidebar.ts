import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("hmmm-sidebar")
export class Sidebar extends LitElement {
  static styles = css`
    div {
      background-color: hotpink;
    }
  `;

  render() {
    return html` <div>Me the sidebar</div> `;
  }
}
