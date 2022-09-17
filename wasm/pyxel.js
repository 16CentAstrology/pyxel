const PYODIDE_SDL2_URL = 'https://cdn.jsdelivr.net/gh/kitao/pyodide-sdl2@main/pyodide.js';
const PYXEL_WHEEL_NAME = 'pyxel-1.8.4-cp37-abi3-emscripten_3_1_21_wasm32.whl';

class Pyxel {
    constructor(pyodide) {
        this.pyodide = pyodide;
    }

    async fetchFiles(baseDir, files) {
        let FS = this.pyodide.FS;
        for (let file of files) {
            let dirs = file.split('/');
            dirs.pop();
            let path = '';
            for (let dir of dirs) {
                path += dir;
                if (!FS.analyzePath(path).exists) {
                    FS.mkdir(path);
                }
                path += '/';
            }
            console.log(baseDir, file);
            let fileResponse = await fetch(`${baseDir}/${file}`);
            let fileBinary = new Uint8Array(await fileResponse.arrayBuffer());
            FS.writeFile(file, fileBinary, { encoding: 'binary' });
        }
    }

    exec(pythonScript) {
        this.pyodide.runPython(pythonScript);
    }

    run(pythonScriptFile) {
        this.pyodide.runPython(`import pyxel.cli; pyxel.cli.run_python_script("${pythonScriptFile}")`);
    }

    play(pyxelAppFile) {
        this.pyodide.runPython(`import pyxel.cli; pyxel.cli.play_pyxel_app("${pyxelAppFile}")`);
    }

    edit(pyxelResourceFile) {
        this.pyodide.runPython(`import pyxel.cli; pyxel.cli.edit_pyxel_resource("${pyxelResourceFile}")`);
    }

    package(appRootDir, startupScriptName) {
        this.pyodide.runPython(`import pyxel.cli; pyxel.cli.package_pyxel_app("${appRootDir}", "${startupScriptName}")`);
    }

    copyExamples() {
        this.pyodide.runPython(`import pyxel.cli; pyxel.cli.copy_pyxel_examples()`);
    }
}

function scriptDir() {
    var scripts = document.getElementsByTagName('script');
    for (const script of scripts) {
        var match = script.src.match(/(^|.*\/)pyxel\.js$/);
        if (match) {
            return match[1];
        }
    }
}

function setPageStyle() {
    var head = document.getElementsByTagName('head').item(0);
    // Set icon
    var link = document.createElement('link');
    link.rel = 'icon';
    link.href = scriptDir() + '../docs/images/pyxel_icon_64x64.ico';
    head.appendChild(link);
    // Set stylesheet
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = scriptDir() + 'pyxel.css';
    link.type = 'text/css';
    head.appendChild(link);
}

function addCanvas() {
    if (document.querySelector('canvas#canvas')) {
        return;
    }
    var body = document.getElementsByTagName('body').item(0);
    if (!body) {
        body = document.createElement('body');
        document.body = body;
    }
    console.log(body);
    var canvas = document.createElement('canvas');
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
    addCanvas();
    // Load script dynamically
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = PYODIDE_SDL2_URL;
    var firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
    script.onload = async () => {
        // Initialize Pyodide
        let pyodide = await loadPyodide();
        await pyodide.loadPackage(scriptDir() + PYXEL_WHEEL_NAME);
        let pyxel = new Pyxel(pyodide);
        // Execute application logic
        callback(pyxel);
    };
}

setPageStyle();
