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

    if(iconsToEdit != null) {
        if(iconsToEdit.length == 1) {
            let perc = document.getElementById(iconsToEdit[0]).dataset.scale * 100;
            document.querySelector('#scale-factor').innerText = perc + '%';
            document.querySelector('#scale-editor').value = perc;
        }
    }
    if(iconsToEdit.length > 1) document.querySelector('#scale-factor').innerText = 'multiple';
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

function insertIcon(base64, color = '', img = null, scale = 1) {
    document.querySelector('.save-btn').disabled = false;
    document.querySelector('.export-btn').disabled = false;

    let image = document.createElement('img');
    let div = document.createElement('div');

    let imgurl = base64;
    if(img) {
        imgurl = img;
    }

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

        div.style.height = height;
        div.style.width = width;

        if(color != '') {
            div.style.maskImage = 'url(' + imgurl + ')';
            div.style.backgroundColor = color;
            div.style.maskSize = width + 'px ' + height + 'px';
            div.style.maskPosition = '0 0';
        } else {


            div.style.backgroundImage = 'url(' + imgurl + ')';
            div.style.backgroundSize = width + 'px ' + height + 'px';
            div.style.backgroundPosition = '0 0';
        }

        div.setAttribute('onclick', 'editIcon(event);');
        div.setAttribute('oncontextmenu', 'deleteIcon(event);');
        div.setAttribute('data-scale', scale);

        grid.insertAdjacentElement('beforeend', div);

        applyScale(div.id, scale);
    };

    image.src = imgurl;
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
            let image;
            let icon = document.getElementById(id);

            if(icon) {
                let scale = icon.getAttribute('data-scale');
                let width = icon.style.width.replace('px', '');
                let height = icon.style.height.replace('px', '');
                let scaledWidth = width;
                let scaledHeight = height;

                if(icon.style.maskImage) {
                    image = icon.style.maskImage;
                } else {
                    image = icon.style.backgroundImage;
                }
                
                if(scale) {
                    icon.style.maskPosition = '50% 50%';
                    icon.style.maskSize = (width * scale) + 'px ' + (height * scale) + 'px';
                } else {
                    icon.style.maskPosition = '0 0';
                    icon.style.maskSize = width + 'px ' + height + 'px';
                }

                icon.style.maskImage = image;
                icon.style.backgroundImage = null;
                icon.style.backgroundPosition = null;
                icon.style.backgroundSize = null;
                icon.style.backgroundColor = e.target.style.backgroundColor;
            }
        });
    }
}

function applyScale(id, scaleFactor) {
    let icon = document.getElementById(id);

    if(icon) {
        icon.setAttribute('data-scale', scaleFactor);
        let width = icon.style.width.replace('px', '');
        let height = icon.style.height.replace('px', '');
        let newWidth = width * scaleFactor;
        let newHeight = height * scaleFactor;
    
        if(icon.style.backgroundImage) {
            icon.style.backgroundSize = newWidth + 'px ' + newHeight + 'px';
            icon.style.backgroundPosition = '50% 50%';
        } else {
            icon.style.maskSize = newWidth + 'px ' + newHeight + 'px';
            icon.style.maskPosition = '50% 50%';
        }
    }
}

function scaleIcon(e) {
    let scaleFactor = e.target.value / 100;
    document.querySelector('#scale-factor').innerText = e.target.value + '%';

    iconsToEdit.forEach(id => {
        applyScale(id, scaleFactor);
    });
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
            return path.join(process.env.HOME, "Library", "Application Support", "iconator");
        }
        case "win32": {
            return path.join(process.env.APPDATA, "iconator");
        }
        case "linux": {
            return path.join(process.env.HOME, ".iconator");
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
        insertIcon(icon.base64, icon.color, icon.image);
    });
}

function prepareIconsJSON() {
    let icons = [];
    document.querySelectorAll('.icon').forEach(icon => {
        icons.push({
            image: icon.style.backgroundImage.replace('url("', '').replace('")', ''),
            base64: icon.style.maskImage.replace('url("', '').replace('")', ''),
            color: icon.style.backgroundColor,
            scale: icon.dataset.scale
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
            insertIcon(icon.base64, icon.color, icon.image, icon.scale);
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
    if(e.keyCode == 78 && e.metaKey) document.querySelector('.project-uploader').click();;
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

function newProject() {
    let c = confirm('Are you sure you want to create a new project? All unsaved changes will be lost.');
    if(c) {
        try {
            fs.unlinkSync(path.join(appDatatDirPath, './tmp.json'));
            iconsToEdit = [];
            grid.innerHTML = '';
            document.querySelector('.save-btn').disabled = true;
            document.querySelector('.export-btn').disabled = true;
        } catch(err) {}
    }
}