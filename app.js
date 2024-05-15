const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const JSZip = require('jszip'); 
const Sortable = require('./sortable.min.js');
const htmlToImage = require('html-to-image');
const FileSaver = require('file-saver');
const { domainToUnicode } = require('url');
const grid = document.querySelector('.grid');
const colorPicker = document.querySelector('.color-picker');
const dropArea = document.querySelector('.drop-area');

const MAX_WIDTH = 300;
const MAX_HEIGHT = 40;

let iconsToEdit = [];

const appDatatDirPath = getAppDataPath();

// Create appDataDir if not exist
if (!fs.existsSync(appDatatDirPath)) {
    fs.mkdirSync(appDatatDirPath);
}

function closeColorPicker() {
    iconsToEdit = [];
    document.querySelectorAll('.icon').forEach(ic => {
        ic.classList.remove('in-edit');
    });
    colorPicker.classList.remove('show');
}

new Sortable(grid, {
    animation: 150,
    ghostClass: 'ghost'
});

function editIcon(e) {
    if(e.target.id == iconsToEdit) {
        iconsToEdit = [];
        colorPicker.classList.remove('show');
        e.target.classList.remove('in-edit');
    } else {
        if(e.shiftKey || e.ctrlKey || e.metaKey) {
            iconsToEdit.push(e.target.id);
        } else {
            iconsToEdit = [ e.target.id ];
            document.querySelectorAll('.icon').forEach(ic => {
                ic.classList.remove('in-edit');
            });
        }

        e.target.classList.add('in-edit');
        colorPicker.classList.add('show');
    }
}

function generateMosaic() {
    return new Promise((resolve) => {
        htmlToImage.toPng(grid, {
            backgroundColor: 'transparent'
        }).then(function (dataUrl) {
            resolve(dataUrl);
        });
    });
}

dropArea.addEventListener('dragover', (e) => { e.preventDefault(); });
dropArea.addEventListener('dragleave', (e) => { e.preventDefault(); });
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    let dt = e.dataTransfer;
    let files = dt.files;

    Array.from(files).forEach(file => {
        if(file.type == 'image/png') {
            convertBase64(file).then(base64 => {
                insertIcon(base64);
            });
        }

        if(file.type == 'application/zip') {
            openProject(file);
        }
    });
});

function insertIcon(base64, color = '#ffffff') {
    document.querySelector('.save-btn').disabled = false;
    document.querySelector('.export-btn').disabled = false;

    let image = document.createElement('img');
    let div = document.createElement('div');

    image.onload = () => {
        let width = image.naturalWidth;
        let height = image.naturalHeight;

        div.classList.add('icon');
        div.id = uuidv4();

        if(width > MAX_WIDTH) {
            height = (MAX_WIDTH * image.naturalHeight) / image.naturalWidth;
            width = MAX_WIDTH;
        }

        if(height > MAX_HEIGHT) {
            height = MAX_HEIGHT;
            width = (MAX_HEIGHT * image.naturalWidth) / image.naturalHeight;
        }

        const css = 'background-color: ' + color + '; mask-size: ' + width + 'px ' + height + 'px; mask-image: url("' + base64 + '"); width: ' + width + 'px; height: ' + height + 'px;';
        div.setAttribute('style', css);
        div.setAttribute('onclick', 'editIcon(event);');
        div.setAttribute('oncontextmenu', 'deleteIcon(event);');

        grid.insertAdjacentElement('beforeend', div);
    };

    image.src = base64;
}

function convertBase64(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.readAsDataURL(file);

        fileReader.onload = () => {
            resolve(fileReader.result);
        };

        fileReader.onerror = (error) => {
            reject(error);
        };
    });
}


function applyColor(e) {
    document.querySelector('.save-btn').disabled = false;
    document.querySelector('.export-btn').disabled = false;

    if(iconsToEdit.length > 0) {
        iconsToEdit.forEach(id => {
            let icon = document.getElementById(id);
            if(icon) icon.style.backgroundColor = e.target.style.backgroundColor;
        });
    }
}

function refreshPalette() {
    document.querySelector('.refresh-btn').classList.add("animate");
    setTimeout(() => {
        document.querySelector('.refresh-btn').classList.remove("animate");
    }, 1000);
    
    let palette = [];
    
    try {
        palette = fs.readFileSync(path.join(appDatatDirPath, './palette.json'));
        if(palette) {
            palette = JSON.parse(palette);
        }
    } catch(err) {}

    document.querySelector('.palette-editor > .list').innerHTML = '';

    let groups = document.createElement('div');
    palette.forEach(group => {
        let div = document.createElement('div');
        div.classList.add('group');

        let span = document.createElement('span');
        span.innerText = group.label;
        div.insertAdjacentElement('beforeend', span);
        
        group.colors.forEach(color => {
            let clr = document.createElement('div');
            clr.style.backgroundColor = color;
            clr.classList.add('color');
            clr.setAttribute('onclick', 'applyColor(event);');
            div.insertAdjacentElement('beforeend', clr);
        });
        
        groups.insertAdjacentElement('beforeend', div);

        addPaletteGroup(group.label, group.colors);
    });


    colorPicker.querySelector('.colors').innerHTML = groups.innerHTML;
}

function deleteIcon(e) {
    e.preventDefault();
    let res = confirm('Are you sure you want to delete this icon?');
    if(res) {
        let icon = document.getElementById(e.target.id);
        if(icon) icon.remove();
    }
}

refreshPalette();

function getAppDataPath() {
    switch (process.platform) {
        case "darwin": {
            return path.join(process.env.HOME, "Library", "Application Support", "Your app name");
        }
        case "win32": {
            return path.join(process.env.APPDATA, "Your app name");
        }
        case "linux": {
            return path.join(process.env.HOME, ".Your app name");
        }
        default: {
            console.log("Unsupported platform!");
            process.exit(1);
        }
    }
}

function handleOpenProject(e) {
    if(e.target.files.length > 0) {
        const file = e.target.files[0];
        
        if(file.type === 'application/zip') {
            openProject(file);
        }
    }

    e.target.value = '';
}

async function openProject(file) {
    document.querySelector('.save-btn').disabled = false;
    document.querySelector('.export-btn').disabled = false;

    grid.innerHTML = '';

    let zipBase64 = await convertBase64(file);
    
    let projectZip = await JSZip.loadAsync(zipBase64.replace('data:application/zip;base64,', ''), { base64: true });
    let projectJson = await projectZip.file("project.json").async("string");
    let icons = JSON.parse(projectJson);

    icons.forEach(icon => {
        insertIcon(icon.base64, icon.color);
    });
}

function prepareIconsJSON() {
    let icons = [];
    document.querySelectorAll('.icon').forEach(icon => {
        icons.push({
            base64: icon.style.maskImage.replace('url("', '').replace('")', ''),
            color: icon.style.backgroundColor
        });
    });
    return JSON.stringify(icons);
}

function save() {
    fs.writeFileSync(path.join(appDatatDirPath, './tmp.json'), prepareIconsJSON());
    document.querySelector('.save-btn').disabled = true;
}

function exportProject() {
    generateMosaic().then(base64 => {
        const zip = new JSZip();

        zip.file('project.json', prepareIconsJSON());
        zip.file('icons.css', writeCSS());
        zip.file('icons.png', base64.replace('data:image/png;base64,', ''), { base64: true });

        zip.generateAsync({ type: 'blob' }).then(function (content) {
            FileSaver.saveAs(content, 'icons-project.zip');

            try {
                fs.unlinkSync(path.join(appDatatDirPath, './tmp.json'));
                document.querySelector('.save-btn').disabled = true;
            } catch(err) {}
        });
    });
}

function writeCSS() {
    let css = '';
    let bodyRect = grid.getBoundingClientRect();

    document.querySelectorAll('.icon').forEach((icon, i) => {
        let rect = icon.getBoundingClientRect();
        let x = rect.left - bodyRect.left;
        let y = rect.top - bodyRect.top;

        css += '.icon-' + i + ' {\n';
        css += '    background-position: ' + x + 'px ' + y + 'px;\n';
        css += '}\n';
    });

    return css;
}

function tryRecover() {
    try {
        let tmp = fs.readFileSync(path.join(appDatatDirPath, './tmp.json'));
        let icons = JSON.parse(tmp);
        icons.forEach(icon => {
            insertIcon(icon.base64, icon.color);
        });
        document.querySelector('.save-btn').disabled = false;
        document.querySelector('.export-btn').disabled = false;
    } catch(err) {}
}


tryRecover();

// autosave every 5 minutes
setInterval(() => {
    save();
}, (1000 * 60) * 5);



function KeyPress(e) {
    if(e.keyCode == 83 && e.metaKey) save();
    if(e.keyCode == 69 && e.metaKey) exportProject();
    if(e.keyCode == 79 && e.metaKey) document.querySelector('.project-uploader').click();;
}

document.addEventListener("keydown", KeyPress);

function setPaletteHandler() {
    document.querySelector('.palette-editor-wrapper').classList.add('open');
}

function addPaletteGroup(label = '', colors = []) {
    let guid = uuidv4();

    let html = '<div class="group" id="' + guid + '">';
       html += '    <input class="label" type="text" placeholder="Label" value="' + label + '">';
            colors.forEach(c => {
                    html += '<input class="color" type="color" value="' + c + '">';
            });
       html += '    <button class="new-color-btn" onclick="addColorToPalette(\'' + guid + '\');">+</button>';
       html += '    <button class="delete" onclick="deletePaletteGroup(\'' + guid + '\');">Del</button>';
       html += '</div>';

    document.querySelector('.palette-editor > .list').insertAdjacentHTML('beforeend', html);
    document.querySelector('#no-groups').style.display = 'none';
}

function deletePaletteGroup(id) {
    let gr = document.getElementById(id);
    if(gr) gr.remove();

    if(document.querySelectorAll('.palette-editor > .list > .group').length == 0) {
        if(document.querySelector('#no-groups').style.display = 'block');
    }
}

function addColorToPalette(id) {
    let gr = document.getElementById(id);
    let addbtn = gr.querySelector('.new-color-btn');

    if(gr) {
        let inp = document.createElement('input');
        inp.type = 'color';
        inp.classList.add('color');
        inp.setAttribute('oncontextmenu', 'removeColorFromGroup(event);');
        addbtn.parentNode.insertBefore(inp, addbtn);
    }
}

function removeColorFromGroup(e) {
    e.preventDefault();
    e.target.remove();
}

function savePalette() {
    let palette = [];
    let groups = document.querySelectorAll('.palette-editor > .list > .group');
    groups.forEach(gr => {
        let label = gr.querySelector('.label').value;
        let colors = [];
        gr.querySelectorAll('.color').forEach(c => {
            colors.push(c.value);
        });
        palette.push({
            label: label,
            colors: colors
        });
    });

    fs.writeFileSync(path.join(appDatatDirPath, './palette.json'), JSON.stringify(palette));
    document.querySelector('.palette-editor-wrapper').classList.remove('open');
    refreshPalette();
}