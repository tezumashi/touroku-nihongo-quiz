const listeners = [];

export function navigate(path) {
  if (location.hash.slice(1) === path) {
    dispatch();
  } else {
    location.hash = path;
  }
}

export function currentRoute() {
  const raw = location.hash.slice(1) || "/home";
  const [pathname, query] = raw.split("?");
  return { path: pathname || "/home", params: new URLSearchParams(query || "") };
}

export function onRoute(handler) {
  listeners.push(handler);
}

function dispatch() {
  const route = currentRoute();
  listeners.forEach((fn) => fn(route));
}

window.addEventListener("hashchange", dispatch);
export function startRouter() {
  dispatch();
}
