import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./content";
import "./sidebar";

@customElement("hmmm-container")
export class Container extends LitElement {
  static styles = css`
    div {
      display: flex;
    }
  `;

  render() {
    return html`
      <div>
        <hmmm-content></hmmm-content>
        <hmmm-sidebar></hmmm-sidebar>
      </div>
    `;
  }
}
