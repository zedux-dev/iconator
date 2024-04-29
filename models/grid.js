const sharp = require('sharp');
const Icon = require('./icon');

class Grid {
    constructor() {
        this.grid = [];
        this.maxWidth = 1000;
        this.xIndex = 0;
        this.yIndex = 0;
        this.xCursor = 0;
        this.yCursor = 0;
    }

    open(project) {
        let tmpGrid = project.grid;

        for(let i=0; i<tmpGrid.length; i++) {
            for(let j=0; j<tmpGrid[i].length; j++) {
                let newIcon = new Icon('');
                newIcon.open(tmpGrid[i][j]);
                tmpGrid[i][j] = newIcon;
            }
        }

        this.grid = tmpGrid;
        this.xIndex = project.xIndex;
        this.yIndex = project.yIndex;
        this.xCursor = project.xCursor;
        this.yCursor = project.yCursor;
    }

    async add(icon) {
        let coords = await this.handleIcon(icon);

        return {
            x: coords[0],
            y: coords[1],
        };
    }

    async handleIcon(icon) {
        if(this.xCursor + icon.width <= this.maxWidth) {
            this.xCursor += icon.width;
            this.xIndex++;
    
        } else {
            this.xCursor = icon.width;
            this.xIndex = 0;
    
            let max_height = 0;
    
            if(!this.grid[this.yIndex]) this.grid[this.yIndex] = [];
    
            this.grid[this.yIndex].forEach((gel => {
                if(gel.height > max_height) {
                    max_height = gel.height;
                }
            }));
    
            this.yCursor += max_height;
            this.yIndex++;
        }
    
        icon.x = this.xCursor - icon.width;
        icon.y = this.yCursor;
    
        if(!this.grid[this.yIndex]) this.grid[this.yIndex] = [];
        this.grid[this.yIndex].push(icon);

        return [this.yIndex, this.grid[this.yIndex].length-1];
    }
    
    async generate() {
        if(this.grid.length > 0) {
            let compositeImages = [];
            let total_height = 0;
    
            for(let i=0; i<this.grid.length; i++) {
                let max_height = 0;
                
                for(let j=0; j<this.grid[i].length; j++) {
                    if(this.grid[i][j].height > max_height) {
                        max_height = this.grid[i][j].height;
                    }
    
                    await this.grid[i][j].changeColor(this.grid[i][j].color);
    
                    const image = await sharp(this.grid[i][j].getBuffer())
                        .toBuffer()
                        .then(data => ({
                            input: data,
                            top: this.grid[i][j].y,
                            left: this.grid[i][j].x
                        }));
    
                    compositeImages.push(image);
                }
    
                total_height += max_height;
            }
    
            let canvas = sharp({
                create: {
                    width: this.maxWidth,
                    height: total_height,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            });
    
            compositeImages = await Promise.all(compositeImages);
    
            
            let outputBuffer = await canvas
                .composite(compositeImages)
                .png()
                .toBuffer();

            return outputBuffer.toString('base64');
        }
    }

    remove(x, y) {
        this.grid[x].splice(y, 1);
    }
}

module.exports = Grid;