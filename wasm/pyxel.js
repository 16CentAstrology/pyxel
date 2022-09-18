const PYODIDE_SDL2_URL = 'https://cdn.jsdelivr.net/gh/kitao/pyodide-sdl2@main/pyodide.js';
const PYXEL_WHEEL_NAME = 'pyxel-1.8.4-cp37-abi3-emscripten_3_1_21_wasm32.whl';

class Pyxel {
    constructor(pyodide) {
        this.pyodide = pyodide;
    }

    async fetchFiles(root, names) {
        console.log('fetchFiles: ', root);
        console.log(names);
        let FS = this.pyodide.FS;
        for (let name of names) {
            if (!name) {
                continue;
            }
            let dirs = name.split('/');
            dirs.pop();
            let path = '';
            for (let dir of dirs) {
                path += dir;
                if (!FS.analyzePath(path).exists) {
                    FS.mkdir(path);
                }
                path += '/';
            }
            let fileResponse = await fetch(`${root}/${name}`);
            let fileBinary = new Uint8Array(await fileResponse.arrayBuffer());
            FS.writeFile(name, fileBinary, { encoding: 'binary' });
            console.log(`Fetched: ${root}${name}`);
        }
    }

    run(pythonScriptFile) {
        if (!pythonScriptFile) {
            return;
        }
        if (pythonScriptFile.endsWith('.py')) {
            this.pyodide.runPython(`import pyxel.cli; pyxel.cli.run_python_script("${pythonScriptFile}")`);
        } else {
            this.pyodide.runPython(pythonScriptFile);
        }
    }

    play(pyxelAppFile) {
        if (pyxelAppFile) {
            this.pyodide.runPython(`import pyxel.cli; pyxel.cli.play_pyxel_app("${pyxelAppFile}")`);
        }
    }

    edit(pyxelResourceFile) {
        this.pyodide.runPython(`import pyxel.cli; pyxel.cli.edit_pyxel_resource("${pyxelResourceFile}")`);
    }
}

function _scriptDir() {
    let scripts = document.getElementsByTagName('script');
    for (const script of scripts) {
        let match = script.src.match(/(^|.*\/)pyxel\.js$/);
        if (match) {
            return match[1];
        }
    }
}

function _setIcon() {
    let head = document.getElementsByTagName('head').item(0);
    let link = document.createElement('link');
    link.rel = 'icon';
    link.href = _scriptDir() + '../docs/images/pyxel_icon_64x64.ico';
    head.appendChild(link);
}

function _setStyleSheet() {
    let head = document.getElementsByTagName('head').item(0);
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = _scriptDir() + 'pyxel.css';
    head.appendChild(link);
}

function _addCanvas() {
    if (document.querySelector('canvas#canvas')) {
        return;
    }
    let body = document.getElementsByTagName('body').item(0);
    if (!body) {
        body = document.createElement('body');
        document.body = body;
    }
    let canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.oncontextmenu = 'event.preventDefault()';
    canvas.tabindex = -1;
    body.appendChild(canvas);

    function adjustCanvasHeight() {
        document.querySelector('canvas#canvas').style.height = window.innerHeight + 'px';
    }

    adjustCanvasHeight();
    window.addEventListener('resize', adjustCanvasHeight);
}

function loadPyxel(callback) {
    console.log('loadPyxel is called');
    _addCanvas();
    let script = document.createElement('script');
    script.src = PYODIDE_SDL2_URL;
    let firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
    script.onload = async () => {
        let pyodide = await loadPyodide();
        await pyodide.loadPackage(_scriptDir() + PYXEL_WHEEL_NAME);
        let pyxel = new Pyxel(pyodide);
        callback(pyxel);
    };
}

class PyxelAsset extends HTMLElement {
    static names = [];

    static get observedAttributes() {
        return ['name'];
    }

    constructor() {
        super();
    }

    connectedCallback() {
        console.log("pyxel-asset is connected");
        PyxelAsset.names.push(this.name);
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        console.log("pyxel-asset: ", name, newValue);
        this[name] = newValue;
    }
}

class PyxelRun extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name', 'script', 'onstart'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
        this.script = '';
        this.onstart = '';
    }

    connectedCallback() {
        console.log("pyxel-run is connected");
        loadPyxel(async (pyxel) => {
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            eval(this.onstart);
            pyxel.run(this.name);
            pyxel.run(this.script);
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        console.log("pyxel-run: ", name, newValue);
        this[name] = newValue;
    }
}

class PyxelPlay extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name', 'onstart'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
        this.onstart = '';
    }

    connectedCallback() {
        console.log("pyxel-play is connected");
        loadPyxel(async (pyxel) => {
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            eval(this.onstart);
            pyxel.play(this.name);
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        console.log("pyxel-play: ", name, newValue);
        this[name] = newValue;
    }
}

class PyxelEdit extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name', 'onstart'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
        this.onstart = '';
    }

    connectedCallback() {
        console.log("pyxel-edit is connected");
        loadPyxel(async (pyxel) => {
            console.log("loaded in pyxel-edit");
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            console.log("fetched in pyxel-edit");
            eval(this.onstart);
            console.log("end onstart in pyxel-edit");
            pyxel.edit(this.name);
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        console.log("add pyxel-edit: ", newValue);
        this[name] = newValue;
    }
}

_setIcon();
_setStyleSheet();

window.customElements.define('pyxel-asset', PyxelAsset);
window.customElements.define('pyxel-run', PyxelRun);
window.customElements.define('pyxel-play', PyxelPlay);
window.customElements.define('pyxel-edit', PyxelEdit);
