const NO_SLEEP_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/nosleep/0.12.0/NoSleep.min.js";
const PYODIDE_SDL2_URL =
  "https://cdn.jsdelivr.net/gh/kitao/pyodide-sdl2@20220923/pyodide.js";
const PYXEL_WHEEL_PATH = "pyxel-1.8.8-cp37-abi3-emscripten_3_1_21_wasm32.whl";
const PYXEL_LOGO_PATH = "../docs/images/pyxel_logo_228x96.png";
const TOUCH_TO_START_PATH = "../docs/images/touch_to_start_342x42.png";
const CLICK_TO_START_PATH = "../docs/images/click_to_start_342x42.png";
const VPAD_CROSS_PATH = "../docs/images/vpad_cross_98x98.png";
const VPAD_BUTTON_PATH = "../docs/images/vpad_button_98x98.png";

class Pyxel {
  constructor(pyodide) {
    this.pyodide = pyodide;
  }

  async fetchFiles(root, names) {
    let FS = this.pyodide.FS;
    for (let name of names) {
      if (!name) {
        continue;
      }
      let dirs = name.split("/");
      dirs.pop();
      let path = "";
      for (let dir of dirs) {
        path += dir;
        if (!FS.analyzePath(path).exists) {
          FS.mkdir(path);
        }
        path += "/";
      }
      let fileResponse = await fetch(`${root}/${name}`);
      let fileBinary = new Uint8Array(await fileResponse.arrayBuffer());
      FS.writeFile(name, fileBinary, { encoding: "binary" });
      console.log(`Fetched: ${root}${name}`);
    }
  }

  run(pythonScriptFile) {
    if (!pythonScriptFile) {
      return;
    }
    if (pythonScriptFile.endsWith(".py")) {
      this.pyodide.runPython(
        `import pyxel.cli; pyxel.cli.run_python_script("${pythonScriptFile}")`
      );
    } else {
      this.pyodide.runPython(pythonScriptFile);
    }
  }

  play(pyxelAppFile) {
    if (pyxelAppFile) {
      this.pyodide.runPython(
        `import pyxel.cli; pyxel.cli.play_pyxel_app("${pyxelAppFile}")`
      );
    }
  }

  edit(pyxelResourceFile) {
    this.pyodide.runPython(
      `import pyxel.cli; pyxel.cli.edit_pyxel_resource("${pyxelResourceFile}")`
    );
  }
}

function _scriptDir() {
  let scripts = document.getElementsByTagName("script");
  for (const script of scripts) {
    let match = script.src.match(/(^|.*\/)pyxel\.js$/);
    if (match) {
      return match[1];
    }
  }
}

function _setIcon() {
  let head = document.getElementsByTagName("head").item(0);
  let link = document.createElement("link");
  link.rel = "icon";
  link.href = _scriptDir() + "../docs/images/pyxel_icon_64x64.ico";
  head.appendChild(link);
}

function _setStyleSheet() {
  let head = document.getElementsByTagName("head").item(0);
  link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = _scriptDir() + "pyxel.css";
  head.appendChild(link);
}

function _touchHandler(event) {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
}

function _addElements() {
  // Add body
  if (!document.getElementsByTagName("body").item(0)) {
    let body = document.createElement("body");
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    document.body = body;
  }

  // Add canvas for SDL2
  let canvas = document.createElement("canvas");
  canvas.id = "canvas";
  canvas.tabindex = -1;
  document.body.appendChild(canvas);

  // Add image for logo
  let img = document.createElement("img");
  img.id = "logo";
  img.src = _scriptDir() + PYXEL_LOGO_PATH;
  img.tabindex = -1;
  document.body.appendChild(img);

  // Prevent normal operation
  document.addEventListener("touchstart", _touchHandler, { passive: false });
  document.addEventListener("touchmove", _touchHandler, { passive: false });
  document.oncontextmenu = (event) => event.preventDefault();

  // Enable gamepad
  window.addEventListener("gamepadconnected", (event) => {
    console.log(`Connected: ${event.gamepad.id}`);
  });
}

function _isMobileDevice() {
  let userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.indexOf("iphone") > -1 ||
    userAgent.indexOf("ipad") > -1 ||
    userAgent.indexOf("android") > -1 ||
    (userAgent.indexOf("macintosh") > -1 && "ontouchend" in document)
  );
}

function _waitForInput(callback) {
  let img = document.querySelector("img#logo");
  if (img) {
    img.src =
      _scriptDir() +
      (_isMobileDevice() ? TOUCH_TO_START_PATH : CLICK_TO_START_PATH);
  }
  document.body.onclick = () => {
    document.body.onclick = "";
    if (img) {
      img.remove();
    }
    try {
      callback();
    } catch (error) {
      if (error !== "unwind") {
        throw error;
      }
    }
  };
}

function _addVirtualGamepad(mode) {
  if (mode !== "enabled" || !_isMobileDevice()) {
    return;
  }

  // Make canvas smaller
  document.querySelector("canvas#canvas").style.height = "80%";

  // Add virtual cross key
  let imgCross = document.createElement("img");
  imgCross.id = "vpad-cross";
  imgCross.src = _scriptDir() + VPAD_CROSS_PATH;
  imgCross.tabindex = -1;
  document.body.appendChild(imgCross);

  // Add virtual buttons
  let imgButton = document.createElement("img");
  imgButton.id = "vpad-button";
  imgButton.src = _scriptDir() + VPAD_BUTTON_PATH;
  imgButton.tabindex = -1;
  document.body.appendChild(imgButton);

  // Register virtual gamepad
  var gamepad = {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: [],
    id: "Virtual Gamepad for Pyxel",
    index: 0,
    mapping: "standard",
    timestamp: Date.now(),
  };
  for (let i = 0; i < 18; i++) {
    gamepad.buttons.push({ pressed: false, touched: false, value: 0 });
  }
  console.log(navigator.getGamepads());
  navigator.getGamepads = () => {
    return [gamepad];
  };
  console.log(navigator.getGamepads());
  let event = new Event("gamepadconnected");
  event.gamepad = gamepad;
  window.dispatchEvent(event);
  let touchHandler = (event) => {
    gamepad.buttons[15].pressed = true;
    gamepad.timestamp = Date.now();
    event.preventDefault();
  };

  // Set touch event handler
  let crossRect = imgCross.getBoundingClientRect();
  let buttonRect = imgButton.getBoundingClientRect();
  let onTouchStart = (event) => {
    for (let i = 0; i < gamepad.buttons.length; i++) {
      gamepad.buttons[i].pressed = false;
    }
    for (let i = 0; i < event.touches.length; i++) {
      let { clientX, clientY } = event.touches[i];
      let size = crossRect.width;
      let crossX = (clientX - crossRect.left) / size - 0.5;
      let crossY = (clientY - crossRect.bottom) / size + 0.5;
      let buttonX = (clientX - buttonRect.right) / size + 0.5;
      let buttonY = (clientY - buttonRect.bottom) / size + 0.5;
      if (crossX ** 2 + crossY ** 2 <= 0.5 ** 2) {
        let angle = (Math.atan2(-crossY, crossX) * 180) / Math.PI;
        if (angle > 22.5 && angle < 157.5) {
          gamepad.buttons[12].pressed = true; // Up
        }
        if (angle > -157.5 && angle < -22.5) {
          gamepad.buttons[13].pressed = true; // Down
        }
        if (Math.abs(angle) <= 67.5) {
          gamepad.buttons[15].pressed = true; // Right
        }
        if (Math.abs(angle) >= 112.5) {
          gamepad.buttons[14].pressed = true; // Left
        }
      }
      if (buttonX ** 2 + buttonY ** 2 <= 0.5 ** 2) {
        let angle = (Math.atan2(-buttonY, buttonX) * 180) / Math.PI;
        if (angle > -135 && angle < -45) {
          gamepad.buttons[0].pressed = true; // A
        }
        if (Math.abs(angle) <= 45) {
          gamepad.buttons[1].pressed = true; // B
        }
        if (Math.abs(angle) >= 135) {
          gamepad.buttons[2].pressed = true; // X
        }
        if (angle > 45 && angle < 135) {
          gamepad.buttons[3].pressed = true; // Y
        }
      }
    }
    gamepad.timestamp = Date.now();
    event.preventDefault();
  };
  let onTouchEnd = (event) => {
    for (let i = 0; i < gamepad.buttons.length; i++) {
      gamepad.buttons[i].pressed = false;
    }
    gamepad.timestamp = Date.now();
    event.preventDefault();
  };
  document.removeEventListener("touchstart", _touchHandler);
  document.removeEventListener("touchmove", _touchHandler);
  document.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchStart, { passive: false });
  document.addEventListener("touchend", onTouchEnd, { passive: false });
}

async function _loadScript(scriptSrc) {
  await new Promise((resolve) => {
    var firstScript = document.getElementsByTagName("script")[0];
    var script = document.createElement("script");
    script.src = scriptSrc;
    firstScript.parentNode.insertBefore(script, firstScript);
    script.onload = () => resolve();
  });
}

async function loadPyxel(callback) {
  await _loadScript(NO_SLEEP_URL);
  let noSleep = new NoSleep();
  noSleep.enable();
  await _loadScript(PYODIDE_SDL2_URL);
  let pyodide = await loadPyodide();
  await pyodide.loadPackage(_scriptDir() + PYXEL_WHEEL_PATH);
  let pyxel = new Pyxel(pyodide);
  await callback(pyxel).catch((error) => {
    if (error !== "unwind") {
      throw error;
    }
  });
}

class PyxelAsset extends HTMLElement {
  static names = [];

  static get observedAttributes() {
    return ["name"];
  }

  constructor() {
    super();
  }

  connectedCallback() {
    PyxelAsset.names.push(this.name);
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    this[name] = newValue;
  }
}
window.customElements.define("pyxel-asset", PyxelAsset);

class PyxelRun extends HTMLElement {
  static get observedAttributes() {
    return ["root", "name", "script", "vpad"];
  }

  constructor() {
    super();
    this.root = ".";
    this.name = "";
    this.script = "";
    this.vpad = "disabled";
  }

  connectedCallback() {
    loadPyxel(async (pyxel) => {
      await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
      _waitForInput(() => {
        _addVirtualGamepad(this.vpad);
        pyxel.run(this.name);
        pyxel.run(this.script);
      });
    });
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    this[name] = newValue;
  }
}
window.customElements.define("pyxel-run", PyxelRun);

class PyxelPlay extends HTMLElement {
  static get observedAttributes() {
    return ["root", "name", "vpad"];
  }

  constructor() {
    super();
    this.root = ".";
    this.name = "";
    this.vpad = "disabled";
  }

  connectedCallback() {
    loadPyxel(async (pyxel) => {
      await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
      _waitForInput(() => {
        _addVirtualGamepad(this.vpad);
        pyxel.play(this.name);
      });
    });
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    this[name] = newValue;
  }
}
window.customElements.define("pyxel-play", PyxelPlay);

class PyxelEdit extends HTMLElement {
  static get observedAttributes() {
    return ["root", "name", "vpad"];
  }

  constructor() {
    super();
    this.root = ".";
    this.name = "";
  }

  connectedCallback() {
    loadPyxel(async (pyxel) => {
      await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
      _waitForInput(() => {
        _addVirtualGamepad(this.vpad);
        pyxel.edit(this.name);
      });
    });
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    this[name] = newValue;
  }
}
window.customElements.define("pyxel-edit", PyxelEdit);

_setIcon();
_setStyleSheet();
_addElements();
