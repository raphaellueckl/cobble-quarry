import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("cq-content")
export class Content extends LitElement {
  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
    }
  `;

  render() {
    return html`
      <div class="content">
        <h2>Logs</h2>
        <textarea></textarea>
        <h2>Commands</h2>
        <input />
      </div>
    `;
  }
}
