const fs = require('fs');
const Icon = require('./models/icon');
const Grid = require('./models/grid');
const JSZip = require('jszip');
const FileSaver = require('file-saver');

async function openProject(base64) {
    try {
        let projectZip = await JSZip.loadAsync(base64.replace('data:application/zip;base64,', ''), { base64: true });
        let projectJson = await projectZip.file("project.json").async("string");
        projectJson = JSON.parse(projectJson);

        let grid = new Grid();
        grid.open(projectJson);
        return grid;

    } catch(err) {
        return 0;
    }
}

async function addIcon(base64, project = null) {
    let grid = new Grid();
    
    if(project) {
        grid.open(project);
    }

    let icon = new Icon(base64); await icon.init();

    let iconPos = await grid.add(icon);

    return {
        project: grid,
        x: iconPos.x,
        y: iconPos.y
    };
}

async function changeColor(color, x, y, project) {
    let map = new Grid();
    map.open(project);
    await map.grid[x][y].changeColor(color);
    return map;
}

async function removeIcon(x, y, project) {
    let map = new Grid();
    map.open(project);
    map.remove(x, y);

    let newProject = {
        project: null
    };

    for(let i=0; i<map.grid.length; i++) {
        for(let j=0; j<map.grid[i].length; j++) {
            newProject = await addIcon(map.grid[i][j].base64, newProject.project);
        }
    }

    if(!newProject.project) {
        tmp = new Grid();
    } else {
        tmp = newProject.project;
    }

    return tmp;
}

function writeCSS(grid) {
    console.error('SOCO', "iokmasd");
    let index = 0;

    let css = '';

    grid.grid.forEach(row => {
        row.forEach(cell => {
            let name = 'icon-' + index;

            css += '.' + name + ' {\n';
            css += '    ' + 'background-position: ' + (-cell.x) + 'px ' + (-cell.y) + 'px;\n';
            css += '}\n\n';

            index++;
        });
    });

    return css;
}

async function exportProject(project) {
    let grid = new Grid();
    grid.open(project);

    let css = writeCSS(grid);

    let base64 = await grid.generate(project);

    const zip = new JSZip();

    zip.file('project.json', JSON.stringify(project));
    zip.file('icons.css', css);
    zip.file('icons.png', base64, { base64: true });

    zip.generateAsync({ type: 'blob' }).then(function (content) {
        FileSaver.saveAs(content, 'icons-project.zip');
    });
}

module.exports = { openProject, addIcon, removeIcon, changeColor, exportProject };