const sharp = require('sharp');

class Icon {
    constructor(base64) {
        this.base64 = base64;
        this.width = 0;
        this.height = 0;
        this.x = 0;
        this.y = 0;
        this.color = [0,0,0];
    }

    open(obj) {
        this.base64 = obj.base64;
        this.width = obj.width;
        this.height = obj.height;
        this.x = obj.x;
        this.y = obj.y;
        this.color = obj.color;
    }

    async init() {
        const image = await sharp(this.getBuffer());
        const metadata = await image.metadata();

        this.width = metadata.width;
        this.height = metadata.height;
    }

    getBuffer() {
        const uri = this.base64.split(';base64,').pop();
        return Buffer.from(uri, 'base64');
    }

    async changeColor(color) {
        const original = await sharp(this.getBuffer())
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
    
        // Create a red layer with the same dimensions as the original image
        const redLayer = Buffer.alloc(original.info.width * original.info.height * 4, 0);
        
        for(let i = 0; i < redLayer.length; i += 4) {
            redLayer[i] = color[0];       // R channel
            redLayer[i + 1] = color[1];   // G channel
            redLayer[i + 2] = color[2];   // B channel
            redLayer[i + 3] = 255;        // Alpha channel
        }
    
        // Use original image as a mask
        let outputBuffer = await sharp(redLayer, {
            raw: {
                width: original.info.width,
                height: original.info.height,
                channels: 4
            }
        })
        .composite([{
            input: original.data,
            raw: {
                width: original.info.width,
                height: original.info.height,
                channels: 4
            },
            blend: 'dest-in'
        }])
        .png()
        .toBuffer();

        this.color = color;
        this.base64 = 'data:image/png;base64,' + outputBuffer.toString('base64');
    }
}

module.exports = Icon;