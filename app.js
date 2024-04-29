const { file } = require('jszip');
const api = require('./api.js');

const dropper = document.querySelector(".dropper");
const canvas = document.querySelector(".canvas");
const picker = document.querySelector(".picker");
const openBtn = document.querySelector(".open-btn");
const saveBtn = document.querySelector(".save-btn");
const deleteBtn = document.querySelector(".delete-icon");
const projectInput = document.querySelector(".project-uploader");

let project = {
    map: null,
    doc: {
        width: 1000,
        height: 0,
        prop_width: 0,
        prop_height: 0
    },
    iconSelected: null,
    iconSelectedElement: null,
}

async function dropHandler(e) {
    e.preventDefault();

    const files = e.dataTransfer.files;

    for(let i=0; i<files.length; i++) {
        if(files[i].type === 'application/zip') {
            saveBtn.disabled = false;

            const base64 = await convertBase64(files[i]);
            let response = await api.openProject(base64);
            project.map = response;

            renderGrid();
        }

        if(files[i].type === 'image/png') {
            saveBtn.disabled = false;
            
            const base64 = await convertBase64(files[i]);
            
            let response = await api.addIcon(base64, project.map);
            project.map = response.project;
            
            renderGrid();
        }
    }
}

function dragOverHandler(e) {
    e.preventDefault();
}

function dragLeaveHandler(e) {
    e.preventDefault();
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

function renderGrid() {
    if(!project.map.grid) {
        return;
    }
    
    project.doc.height = 0;

    project.map.grid.forEach(row => {
        let max_height = 0;

        row.forEach(cella => {
            if(cella.height > max_height) max_height = cella.height;
        });

        project.doc.height += max_height;
    });

    if(project.doc.height > project.doc.width) {
        project.doc.prop_height = 496;
        project.doc.prop_width = (project.doc.prop_height * project.doc.width) / project.doc.height;

    } else {
        project.doc.prop_width = 396;
        project.doc.prop_height = (project.doc.prop_width * project.doc.height) / project.doc.width;
    }
    
    canvas.style.width = project.doc.prop_width + 'px';
    canvas.style.height = project.doc.prop_height + 'px';
    canvas.innerHTML = '';

    project.map.grid.forEach((row, i) => {
        row.forEach((icon, j) => {
            insertIcon(icon.width, icon.height, icon.x, icon.y, icon.base64, i, j);
        });
    });
}

function insertIcon(w, h, x, y, base64, i, j) {
    let image = document.createElement('img');
    image.classList.add('icon-cell');
    image.style.width = propX(w) + 'px';
    image.style.height = propY(h) + 'px';
    image.style.left = propX(x) + 'px';
    image.style.top = propY(y) + 'px';
    image.src = base64;
    image.dataset.i = i;
    image.dataset.j = j;
    canvas.insertAdjacentElement('beforeend', image);
    image.addEventListener('click', handleIconClick);
}

function handleIconClick(e) {
    const el = e.target;
    let icon = project.map.grid[el.dataset.i][el.dataset.j];

    document.querySelectorAll('.icon-cell').forEach(ic => {
        ic.classList.remove('selected');
    });

    if(project.iconSelected && icon.x == project.iconSelected.x && icon.y == project.iconSelected.y) {
        picker.classList.remove('open');
        project.iconSelected = null;
        project.iconSelectedElement = null;

        el.classList.remove('selected');

    } else {
        picker.classList.add('open');

        project.map.grid.forEach((row, i) => {
            row.forEach((cell, j) => {
                if(cell.x == icon.x && cell.y == icon.y) {
                    project.iconSelected = {
                        x: i,
                        y: j
                    };
                }
            });
        });


        project.iconSelectedElement = el;

        el.classList.add('selected');
    }
}

function propX(x) {
    return (x * project.doc.prop_width) / project.doc.width;
}

function propY(y) {
    return (y * project.doc.prop_height) / project.doc.height;
}

document.querySelectorAll('.color').forEach(color => {
    color.addEventListener('click', async (e) => {
        const rgb = e.target.dataset.rgb.split(',');

        let response = await api.changeColor(rgb, project.iconSelected.x, project.iconSelected.y, project.map);
        
        project.map = response;

        renderGrid();

        document.querySelectorAll('.icon-cell').forEach(el => {
            if(el.dataset.i == project.iconSelected.x && el.dataset.j == project.iconSelected.y) {
                project.iconSelectedElement = el;
            }
        });

        project.iconSelectedElement.classList.add('selected');
    });
});

dropper.addEventListener('dragover', dragOverHandler);
dropper.addEventListener('dragleave', dragLeaveHandler);
dropper.addEventListener('drop', dropHandler);
picker.querySelector(".close-picker").addEventListener('click', () => {
    project.iconSelected = null;
    project.iconSelectedElement.classList.remove('selected');
    project.iconSelectedElement = null;
    picker.classList.remove('open');
});

saveBtn.addEventListener('click', async () => {
    let response = await api.exportProject(project.map);
});

deleteBtn.addEventListener('click', async () => {
    let res = confirm("Are you sure you want to delete this icon?");

    if(res) {
        let grid = await api.removeIcon(project.iconSelected.x, project.iconSelected.y, project.map);
        project.map = grid;
        
        project.iconSelected = null;
        project.iconSelectedElement.classList.remove('selected');
        project.iconSelectedElement = null;
        picker.classList.remove('open');
    
        renderGrid();
    
        if(grid.grid.length == 0) {
            canvas.style.width = '365px';
            canvas.style.height = '550px';
        }
    }
});

openBtn.addEventListener('click', async () => {
    if(project.map) {
        let res = confirm("A project is currently open. Save it before proceeding, otherwise all changes will be lost. Do you want to continue?");
    
        if(res) {
            projectInput.click();
        }
    } else {
        projectInput.click();
    }
});

projectInput.addEventListener('change', async (e) => {
    if(e.target.files.length > 0) {
        const file = e.target.files[0];
        
        if(file.type === 'application/zip') {
            saveBtn.disabled = false;
            
            const base64 = await convertBase64(file);
            let response = await api.openProject(base64);
            project.map = response;
    
            renderGrid();

            e.target.value = '';
        }
    }
});