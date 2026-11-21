const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capture() {
  const outDir = path.join(__dirname, '..', 'screenshots', 'redesign');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // 1. Citizen Home
  console.log('Capturing Citizen Home...');
  try {
    await page.screenshot({ path: path.join(outDir, 'citizen_home.png') });
  } catch (e) {
    console.error('Error citizen home:', e);
  }

  // 2. Citizen Report
  console.log('Capturing Citizen Report...');
  try {
    const reportTab = page.locator('button:has-text("Report")');
    if (await reportTab.count() > 0) {
      await reportTab.first().click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, 'citizen_report.png') });
    }
  } catch (e) {
    console.error('Error report tab:', e);
  }

  // 3. Citizen Shelters
  console.log('Capturing Citizen Shelters...');
  try {
    const shelterTab = page.locator('button:has-text("Shelters")');
    if (await shelterTab.count() > 0) {
      await shelterTab.first().click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, 'citizen_shelters.png') });
    }
  } catch (e) {
    console.error('Error shelter tab:', e);
  }

  // 4. Citizen Map
  console.log('Capturing Citizen Map...');
  try {
    const mapTab = page.locator('button:has-text("Live Map")');
    if (await mapTab.count() > 0) {
      await mapTab.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(outDir, 'citizen_map.png') });
    }
  } catch (e) {
    console.error('Error map tab:', e);
  }

  // 5. Switch to Command Portal (Overview Workspace)
  console.log('Switching to Command Portal...');
  try {
    const cmdBtn = page.locator('button:has-text("Command Portal")');
    if (await cmdBtn.count() > 0) {
      await cmdBtn.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(outDir, 'command_overview.png') });
    }
  } catch (e) {
    console.error('Error command portal:', e);
  }

  // 6. Intelligence Workspace
  console.log('Navigating to Intelligence Workspace...');
  try {
    const intelBtn = page.locator('button:has-text("Intelligence Studio"), button:has-text("Intelligence")');
    if (await intelBtn.count() > 0) {
      await intelBtn.first().click();
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(outDir, 'command_intelligence.png') });
    }
  } catch (e) {
    console.error('Error intel workspace:', e);
  }

  // 7. Operations Workspace
  console.log('Navigating to Operations Workspace...');
  try {
    const opsBtn = page.locator('button:has-text("Incident Command"), button:has-text("Operations")');
    if (await opsBtn.count() > 0) {
      await opsBtn.first().click();
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(outDir, 'command_operations.png') });
    }
  } catch (e) {
    console.error('Error ops workspace:', e);
  }

  // 8. Field Teams Workspace
  console.log('Navigating to Field Teams Workspace...');
  try {
    const teamsBtn = page.locator('button:has-text("Live Response"), button:has-text("Field Teams")');
    if (await teamsBtn.count() > 0) {
      await teamsBtn.first().click();
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(outDir, 'command_teams.png') });
    }
  } catch (e) {
    console.error('Error teams workspace:', e);
  }

  // 9. Resources Workspace
  console.log('Navigating to Resources Workspace...');
  try {
    const resBtn = page.locator('button:has-text("Relief & Routing"), button:has-text("Relief Resources")');
    if (await resBtn.count() > 0) {
      await resBtn.first().click();
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(outDir, 'command_resources.png') });
    }
  } catch (e) {
    console.error('Error resources workspace:', e);
  }

  await browser.close();
  console.log('Redesign captures complete.');
}

capture().catch(console.error);
