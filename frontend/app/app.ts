import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./navbar";
import "./app-container";

@customElement("cq-app")
export class CqApp extends LitElement {
  static styles = css`
    span {
      color: green;
    }
  `;

  @property()
  mood = "great";

  render() {
    return html`
      <cq-navbar></cq-navbar>
      <cq-container></cq-container>
    `;
  }
}
