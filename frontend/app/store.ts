import { LOGS_MOCK } from "./mocks";

enum Events {
  SIDENAV_STATE_CHANGE = "SIDENAV_STATE_CHANGE",
  SIDENAV_STATE_CHANGED = "SIDENAV_STATE_CHANGED",
  USER_PW_CHANGED = "USER_PW_CHANGED",
  START_SERVER = "START_SERVER",
  STOP_SERVER = "STOP_SERVER",
  BACKUP_SERVER = "BACKUP_SERVER",
  EXECUTE_COMMAND = "EXECUTE_COMMAND",
  UPDATED_LOGS = "UPDATED_LOGS",
  UPDATED_SERVER_STATE = "UPDATED_SERVER_STATE",
}

const POST = "POST";
const GET = "GET";

// EventTarget, so that listeners can be registered on it
// Element, as a workaround for safari
const _store = new EventTarget() || Element.prototype;

const _pipeline = {
  set: function (target, key, value) {
    _store[key] = value;
    if (typeof property !== "function")
      localStorage.setItem("store_" + key, JSON.stringify(value));
    return true;
  },

  get: function (target, prop) {
    // To be able to register an eventlistener on the _store object,
    // 'this' has to be linked to the target.
    const property = Reflect.get(target, prop);
    if (typeof property === "function") return property.bind(target);
    return JSON.parse(localStorage.getItem("store_" + prop));
    // return property;
  },
};

const store = new Proxy(_store, _pipeline);

const request = async (url: string, method: string, body?: string) => {
  return await (
    await fetch(url, {
      method,
      headers: {
        pw: store.userPW,
      },
      body,
    })
  ).json();
};

store.addEventListener(Events.SIDENAV_STATE_CHANGE, ({ detail: change }) => {
  store.dispatchEvent(
    new CustomEvent(Events.SIDENAV_STATE_CHANGED, { detail: change })
  );
});

store.addEventListener(Events.USER_PW_CHANGED, ({ detail: change }) => {
  store.userPW = change;
});

store.addEventListener(Events.START_SERVER, () => {
  request("/start", POST);
});

store.addEventListener(Events.STOP_SERVER, () => {
  request("/stop", POST);
});

store.addEventListener(Events.BACKUP_SERVER, () => {
  request("/backup", POST);
});

store.addEventListener(Events.EXECUTE_COMMAND, ({ detail }) => {
  request("/command", POST, detail);
});

const timer = (delayInMillis: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayInMillis);
  });

const fetchLogs = async () => {
  while (true) {
    await timer(1000);
    try {
      const { status, logs } = await request("/status-and-logs", GET);
      store.dispatchEvent(
        new CustomEvent(Events.UPDATED_LOGS, { detail: logs })
      );
      store.dispatchEvent(
        new CustomEvent(Events.UPDATED_SERVER_STATE, {
          detail: status === "STARTED",
        })
      );
    } catch (e) {
      store.dispatchEvent(
        new CustomEvent(Events.UPDATED_SERVER_STATE, {
          detail: false,
        })
      );
      store.dispatchEvent(
        new CustomEvent(Events.UPDATED_LOGS, { detail: LOGS_MOCK.reverse() })
      );
    }
  }
};

fetchLogs();

export { store, Events };
