import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("hmmm-content")
export class Content extends LitElement {
  static styles = css`
    div {
      background-color: red;
    }
  `;

  render() {
    return html` <div>Me the content</div> `;
  }
}
