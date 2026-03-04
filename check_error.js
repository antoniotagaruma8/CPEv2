const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Log all errors
        page.on('pageerror', err => {
            console.log('PAGE ERROR STR:', err.toString());
        });

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('CONSOLE ERROR STR:', msg.text());
            }
        });

        console.log('Navigating to http://localhost:3000/ ...');
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

        console.log('Navigating to http://localhost:3000/dashboard ...');
        await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });

        // Wait for Next.js error overlay to appear if there is one
        await new Promise(r => setTimeout(r, 5000));

        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('Runtime Error') || bodyText.includes('client-side exception')) {
            console.log('--- FOUND ERROR OVERLAY TEXT ---');
            console.log(bodyText.substring(0, 1000));
        } else {
            console.log('No visible error overlay text detected on dashboard.');
        }

        await browser.close();
    } catch (err) {
        console.error('Puppeteer Script Error:', err);
    }
})();
