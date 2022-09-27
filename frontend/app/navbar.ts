import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { store, Events } from "./store";

@customElement("cq-navbar")
export class Navbar extends LitElement {
  static styles = css`
    .navbar-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0 68px;
      background: url("data:image/png;base64,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");
      color: #d0c5c0;
      font-family: "title-font";
      font-size: 24px;
    }

    .title-wrapper {
      display: flex;
      align-items: center;
      width: 1500px;
    }

    .title {
      margin-right: 18px;
    }

    .logo {
      height: 72px;
      margin-right: 18px;
    }

    .sidebar-button {
      transform: rotate(90deg);
      width: 40px;
      height: 40px;
    }

    .online-badge {
      height: 30px;
      image-rendering: pixelated;
    }
  `;

  @state()
  online: boolean = null;

  private open: boolean = false;

  flipState() {
    this.open = !this.open;
    store.dispatchEvent(
      new CustomEvent(Events.SIDENAV_STATE_CHANGE, { detail: this.open })
    );
  }

  protected firstUpdated(_changedProperties: PropertyValues<any>): void {
    store.addEventListener(Events.UPDATED_SERVER_STATE, ({ detail }) => {
      this.online = detail;
    });
  }

  render() {
    return html`
      <div class="navbar-wrapper">
        <div class="title-wrapper">
          <h1 class="title">Cobble Quarry</h1>
          <img src="favicon.png" class="logo" />
          ${this.online === null
            ? ""
            : this.online
            ? html`<img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAALCAYAAAAa5F88AAAAAXNSR0IArs4c6QAAAaZJREFUOE9lVNkVwjAMk0Yq7D8CzUjiyVcT4ANC4kOWZRP9WdCcRZCCQEDxHY/Mv4gL/2gOcc+yVBmShMYh40TIsQRwZZCMdEN8gZ1yHDppQ2Qmz2shQgx8w6gXau53kzwXeNv6eFMGQ4PAq17HazhI46iqP4GmKNqBVFm76eGVMZ/nBB7/F0UuSNfG1aosvvP1kmSgLuCG9Aa7ii1Pstr436BcYMf9UHiJThg+juXWz7vJtTYqaZ4zns8GQFNn5AbTwR2wehtw3S6b7cnDrzTgs4EM+9meZsQ5yEVpT35Zk4SWAmAzZrsAZNCmMsCPWlLIn24zgfY3i3408GbbTF8BPTXheInSuQVUoGEkklbwbo1ZMnhX2DR3bQGwEkSBBbZYHxlUT0eSwchdQVvMBhaUloCnDVVltesZKMHshCZ63LoNV/CEZj2KCjmWVHaN/KI8BDgbZNshPfR/01H1bfOa4i39bCtgRqf0ZYDPZFgPsbDO8Tyn9z/Zs4z+J/pYM/v49w4xPz0UU3SpfLbnM2fP0jpQRQ2Vfd8OvX3PyfhpSvkSuUiFL3ZrKsLW2tptAAAAAElFTkSuQmCC"
                class="online-badge"
              />`
            : html`<img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAALCAYAAAD8zZR4AAAAAXNSR0IArs4c6QAAAfZJREFUOE+FVYGRwyAMs4cIDJJ0/wGaDAIZwn+SICFN2u/1jtYYW5aMccPHzdYph3uY4etu+Ik/4VjcnCu9udDXHB7m4RYeCGMR2IPdzAO7iq+DijPueY+h08y9lMITzPlOKZa661gDcyBpsTvI0d5SPi9DMXK4Gm7bQ5Qt55hLcd9SjrkK6bcs5OcGegzf67/DeAbx4N8cuz9wCdxepIOZbTkFpHnVSuHwn4pAEgtbavV3zk1/STiX6lueAutY4Jp0Fsa57r6mKXAeFuwttfiaFEug3GDrOJxOeyU4OGrTrSfbUoqZAc/PQfvRhm5bmm5+jDPYQQQgAOgYH4DFzcnomsEc9AUggMs5ejOqMjCSAhXBYS7qS1aLCxBunXX4sYjGcBPCWNxRvIjYpgQhqMI2CbBYq7xK2IOdySWH25qnWJo0a078jeCsbGgeMYcz/QJBfjXxZ9/2IqUGCgARTZlaHVOiSzleGhBwASdWUqCPwCAA4fCrlkZ778s7EAYjWLUvzkNGjhgw3Pqrtw2Lpy2RKo0x+SHLTdax6pOof0bAt5nwa1Z8jJUz79lzYFk3g03f5lzz/DYCzjk33v2H3z/jXGk4R5Xs6v0KAcmmrRPkvKZmD4jt4cVoQJqRtepZ4PPA14GrAndZ1bOy64Vo7fn5KrlZ790/FbqI6l+cU/MAAAAASUVORK5CYII="
                class="online-badge"
              />`}
        </div>
        <button class="sidebar-button" @click="${this.flipState}">|||</button>
      </div>
    `;
  }
}
