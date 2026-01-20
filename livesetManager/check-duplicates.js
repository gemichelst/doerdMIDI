const fs = require('fs');

const files = [
    'js/liveset-data-structures.js',
    'js/liveset-storage.js',
    'js/liveset-controller.js',
    'js/liveset-ui.js',
    'js/liveset-performance.js',
    'js/liveset-app.js'
];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    const classes = content.match(/class\s+\w+/g) || [];
    const uniqueClasses = new Set(classes);
    
    if (classes.length !== uniqueClasses.size) {
        console.log(`❌ ${file}: DUPLICATE class declarations found!`);
        console.log(`   Found: ${classes.join(', ')}`);
    } else {
        console.log(`✅ ${file}: OK (${classes.length} classes)`);
    }
});

