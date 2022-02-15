import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("hmmm-navbar")
export class Navbar extends LitElement {
  static styles = css`
    div {
      background-color: green;
    }
  `;

  render() {
    return html` <div>Me is the navbar</div> `;
  }
}
