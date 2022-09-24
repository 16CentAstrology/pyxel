const NO_SLEEP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/nosleep/0.12.0/NoSleep.min.js';
const PYODIDE_SDL2_URL = 'https://cdn.jsdelivr.net/gh/kitao/pyodide-sdl2@20220923/pyodide.js';
const PYXEL_WHEEL_NAME = 'pyxel-1.8.6-cp37-abi3-emscripten_3_1_21_wasm32.whl';

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
            console.log(`Fetched ${root}${name}`);
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

function _addElements() {
    let body = document.getElementsByTagName('body').item(0);
    if (!body) {
        body = document.createElement('body');
        document.body = body;
    }
    if (!document.querySelector('canvas#canvas')) {
        let canvas = document.createElement('canvas');
        canvas.id = 'canvas';
        canvas.oncontextmenu = 'event.preventDefault()';
        canvas.tabindex = -1;
        body.appendChild(canvas);
        /*window.addEventListener('resize', () => {
            canvas.style.position = 'absolute';
            canvas.style.left = '0px';
            canvas.style.top = '0px';
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
        });*/
    }
    if (!document.querySelector('div#message')) {
        let div = document.createElement('div');
        div.id = 'message';
        div.oncontextmenu = 'event.preventDefault()';
        div.tabindex = -1;
        div.textContent = 'LOADING...';
        body.appendChild(div);
        /*window.addEventListener('resize', () => {
            div.style.position = 'absolute';
            div.style.transform = 'translate(-50%, -50%)';
            div.style.left = window.innerWidth / 2 + 'px';
            div.style.top = window.innerHeight / 2 + 'px';
        });*/
    }
    //window.dispatchEvent(new Event('resize'));
}

function _removeMessage() {
    let message = document.querySelector('div#message');
    if (message) {
        message.remove();
    }
}

function loadPyxel(callback) {
    _addElements();

    // Load and enable NoSleep
    let firstScript = document.getElementsByTagName('script')[0];
    let noSleepScript = document.createElement('script');
    noSleepScript.src = NO_SLEEP_URL;
    firstScript.parentNode.insertBefore(noSleepScript, firstScript);
    noSleepScript.onload = async () => {
        let noSleep = new NoSleep();
        noSleep.enable();

        // Load Pyodide
        let firstScript = document.getElementsByTagName('script')[0];
        let pyodideSdl2Script = document.createElement('script');
        pyodideSdl2Script.src = PYODIDE_SDL2_URL;
        firstScript.parentNode.insertBefore(pyodideSdl2Script, firstScript);
        pyodideSdl2Script.onload = async () => {

            // Initialize Pyodide and Pyxel
            let pyodide = await loadPyodide();
            await pyodide.loadPackage(_scriptDir() + PYXEL_WHEEL_NAME);
            let pyxel = new Pyxel(pyodide);
            callback(pyxel).catch(e => {
                if (e !== 'unwind') { throw e; }
            });
        };
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
        PyxelAsset.names.push(this.name);
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        this[name] = newValue;
    }
}
window.customElements.define('pyxel-asset', PyxelAsset);

class PyxelRun extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name', 'script'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
        this.script = '';
    }

    connectedCallback() {
        loadPyxel(async (pyxel) => {
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            _removeMessage();
            await pyxel.run(this.name);
            await pyxel.run(this.script);
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        this[name] = newValue;
    }
}
window.customElements.define('pyxel-run', PyxelRun);

class PyxelPlay extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
    }

    connectedCallback() {
        loadPyxel(async (pyxel) => {
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            _removeMessage();
            await pyxel.play(this.name)
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        this[name] = newValue;
    }
}
window.customElements.define('pyxel-play', PyxelPlay);

class PyxelEdit extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
    }

    connectedCallback() {
        loadPyxel(async (pyxel) => {
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            _removeMessage();
            await pyxel.edit(this.name);
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        this[name] = newValue;
    }
}
window.customElements.define('pyxel-edit', PyxelEdit);

_setIcon();
_setStyleSheet();
