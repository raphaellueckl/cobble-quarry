enum Events {
  SIDENAV_STATE_CHANGE = "SIDENAV_STATE_CHANGE",
  SIDENAV_STATE_CHANGED = "SIDENAV_STATE_CHANGED",
  USER_PW_CHANGED = "USER_PW_CHANGED",
  START_SERVER = "START_SERVER",
  STOP_SERVER = "STOP_SERVER",
  BACKUP_SERVER = "BACKUP_SERVER",
  EXECUTE_COMMAND = "EXECUTE_COMMAND",
  UPDATED_LOGS = "UPDATED_LOGS",
}

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

let _logs = [];

const store = new Proxy(_store, _pipeline);

const request = async (url: string, body?: string) => {
  return await (
    await fetch(url, {
      method: "POST",
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
  request("/start");
});

store.addEventListener(Events.STOP_SERVER, () => {
  request("/stop");
});

store.addEventListener(Events.BACKUP_SERVER, () => {
  request("/backup");
});

store.addEventListener(Events.EXECUTE_COMMAND, ({ detail }) => {
  request("/command", detail);
});

const timer = (delayInMillis: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayInMillis);
  });

const fetchLogs = async () => {
  while (true) {
    await timer(1000);
    const logs = await request("/logs");
    store.dispatchEvent(Events.UPDATED_LOGS, { detail: logs });
  }
};

fetchLogs();

export { store, Events };
