import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./navbar";
import "./container";

@customElement("hmmm-app")
export class HmmmApp extends LitElement {
  static styles = css`
    span {
      color: green;
    }
  `;

  @property()
  mood = "great";

  render() {
    return html`
      <hmmm-navbar></hmmm-navbar>
      <hmmm-container></hmmm-container>
    `;
  }
}
