enum Events {
  SIDENAV_STATE_CHANGE = "SIDENAV_STATE_CHANGE",
  SIDENAV_STATE_CHANGED = "SIDENAV_STATE_CHANGED",
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

const store = new Proxy(_store, _pipeline);

store.addEventListener(Events.SIDENAV_STATE_CHANGE, ({ detail: change }) => {
  store.dispatchEvent(
    new CustomEvent(Events.SIDENAV_STATE_CHANGED, { detail: change })
  );
});

export { store, Events };
