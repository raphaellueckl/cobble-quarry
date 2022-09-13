enum Events {
  SIDENAV_STATE_CHANGE = "SIDENAV_STATE_CHANGE",
  SIDENAV_STATE_CHANGED = "SIDENAV_STATE_CHANGED",
  USER_PW_CHANGED = "USER_PW_CHANGED",
  START_SERVER = "START_SERVER",
  STOP_SERVER = "STOP_SERVER",
  BACKUP_SERVER = "BACKUP_SERVER",
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

let _userPW = "";

const request = async (url: string) => {
  return await (
    await fetch(url, {
      method: "POST",
      headers: {
        pw: _userPW,
      },
    })
  ).json();
};

const store = new Proxy(_store, _pipeline);

store.addEventListener(Events.SIDENAV_STATE_CHANGE, ({ detail: change }) => {
  store.dispatchEvent(
    new CustomEvent(Events.SIDENAV_STATE_CHANGED, { detail: change })
  );
});

store.addEventListener(Events.USER_PW_CHANGED, ({ detail: change }) => {
  _userPW = change;
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

export { store, Events };
