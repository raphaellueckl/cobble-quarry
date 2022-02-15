import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

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
    return html`Web Components are <span>${this.mood}</span>!`;
  }
}
