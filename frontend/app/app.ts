import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import "./navbar";
import "./donation";
import "./app-container";

@customElement("cq-app")
export class CqApp extends LitElement {
  static styles = css`
    span {
      color: green;
    }
  `;

  render() {
    return html`
      <cq-navbar></cq-navbar>
      <cq-donation></cq-donation>
      <cq-app-container></cq-app-container>
    `;
  }
}
