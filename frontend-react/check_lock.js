const fs = require('fs');
try {
    const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
    const pkg = lock.packages['node_modules/react-confetti'] || lock.dependencies['react-confetti'];
    if (pkg) {
        console.log('FOUND: react-confetti is in lockfile');
    } else {
        console.log('MISSING: react-confetti NOT found in lockfile');
    }
} catch (e) {
    console.error('ERROR:', e.message);
}
