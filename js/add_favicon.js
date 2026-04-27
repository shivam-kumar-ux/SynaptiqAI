const fs = require('fs');
const path = require('path');

function addFavicon(dir, iconPath) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) continue;
        if (!fullPath.endsWith('.html')) continue;
        
        let content = fs.readFileSync(fullPath, 'utf8');
        if (!content.includes('rel="icon"')) {
            content = content.replace('</head>', `<link rel="icon" type="image/png" href="${iconPath}">\n</head>`);
            fs.writeFileSync(fullPath, content);
            console.log('Added favicon to', fullPath);
        }
    }
}

addFavicon('d:/Coding_SK/studyplanner', 'img/synaptiq_logo_removebg.png');
addFavicon('d:/Coding_SK/studyplanner/pages', '../img/synaptiq_logo_removebg.png');
