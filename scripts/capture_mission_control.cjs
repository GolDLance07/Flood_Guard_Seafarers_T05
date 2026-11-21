const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const desktopDir = path.join(__dirname, '..', 'screenshots', 'mission_control', 'desktop');
  const mobileDir = path.join(__dirname, '..', 'screenshots', 'mission_control', 'mobile');

  fs.mkdirSync(desktopDir, { recursive: true });
  fs.mkdirSync(mobileDir, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  // -------------------------------------------------------------
  // DESKTOP CAPTURES (1920x1080)
  // -------------------------------------------------------------
  console.log('=== Starting Desktop Captures (1920x1080) ===');
  const desktopCtx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await desktopCtx.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 1. Citizen Home
  console.log('Capturing Desktop: Citizen Home...');
  await page.screenshot({ path: path.join(desktopDir, 'citizen_home.png') });

  // 2. Citizen Report
  console.log('Capturing Desktop: Citizen Report...');
  const reportTab = page.locator('button:has-text("Report")');
  if (await reportTab.count() > 0) {
    await reportTab.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(desktopDir, 'citizen_report.png') });
  }

  // 3. Citizen Shelters
  console.log('Capturing Desktop: Citizen Shelters...');
  const shelterTab = page.locator('button:has-text("Shelters")');
  if (await shelterTab.count() > 0) {
    await shelterTab.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(desktopDir, 'citizen_shelters.png') });
  }

  // 4. Citizen Map
  console.log('Capturing Desktop: Citizen Map...');
  const mapTab = page.locator('button:has-text("Live Map")');
  if (await mapTab.count() > 0) {
    await mapTab.first().click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(desktopDir, 'citizen_map.png') });
  }

  // 5. Citizen Activity
  console.log('Capturing Desktop: Citizen Activity...');
  const actTab = page.locator('button:has-text("Activity")');
  if (await actTab.count() > 0) {
    await actTab.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(desktopDir, 'citizen_activity.png') });
  }

  // 6. Switch to Command Portal (Overview Workspace)
  console.log('Switching to Command Mission Control...');
  const cmdBtn = page.locator('button:has-text("Command Portal")');
  if (await cmdBtn.count() > 0) {
    await cmdBtn.first().click();
    await page.waitForTimeout(3500);
    console.log('Capturing Desktop: Command Overview...');
    await page.screenshot({ path: path.join(desktopDir, 'command_overview.png') });
  }

  // 7. Intelligence Workspace
  console.log('Navigating to Satellite Intelligence Studio...');
  const intelBtn = page.locator('button:has-text("Satellite Studio"), button:has-text("Intelligence")');
  if (await intelBtn.count() > 0) {
    await intelBtn.first().click();
    await page.waitForTimeout(3500);
    console.log('Capturing Desktop: Command Intelligence...');
    await page.screenshot({ path: path.join(desktopDir, 'command_intelligence.png') });
  }

  // 8. Operations Workspace
  console.log('Navigating to Incident Command...');
  const opsBtn = page.locator('button:has-text("Incident Command"), button:has-text("Operations")');
  if (await opsBtn.count() > 0) {
    await opsBtn.first().click();
    await page.waitForTimeout(3500);
    console.log('Capturing Desktop: Command Operations...');
    await page.screenshot({ path: path.join(desktopDir, 'command_operations.png') });
  }

  // 9. Field Teams Workspace
  console.log('Navigating to Live Response Teams...');
  const teamsBtn = page.locator('button:has-text("Live Response"), button:has-text("Field Teams")');
  if (await teamsBtn.count() > 0) {
    await teamsBtn.first().click();
    await page.waitForTimeout(3500);
    console.log('Capturing Desktop: Command Teams...');
    await page.screenshot({ path: path.join(desktopDir, 'command_teams.png') });
  }

  // 10. Resources Workspace
  console.log('Navigating to Relief & Routing...');
  const resBtn = page.locator('button:has-text("Relief & Routing"), button:has-text("Resources")');
  if (await resBtn.count() > 0) {
    await resBtn.first().click();
    await page.waitForTimeout(3500);
    console.log('Capturing Desktop: Command Resources...');
    await page.screenshot({ path: path.join(desktopDir, 'command_resources.png') });
  }

  await desktopCtx.close();

  // -------------------------------------------------------------
  // MOBILE CAPTURES (390x844 - iPhone 14 / Mobile standard)
  // -------------------------------------------------------------
  console.log('=== Starting Mobile Captures (390x844) ===');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true
  });
  const mobPage = await mobileCtx.newPage();

  console.log('Navigating to mobile Citizen Portal...');
  await mobPage.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await mobPage.waitForTimeout(3000);

  console.log('Capturing Mobile: Citizen Home...');
  await mobPage.screenshot({ path: path.join(mobileDir, 'mobile_citizen_home.png') });

  const mobReport = mobPage.locator('button:has-text("Report")');
  if (await mobReport.count() > 0) {
    await mobReport.first().click();
    await mobPage.waitForTimeout(1500);
    console.log('Capturing Mobile: Citizen Report...');
    await mobPage.screenshot({ path: path.join(mobileDir, 'mobile_citizen_report.png') });
  }

  const mobShelters = mobPage.locator('button:has-text("Shelters")');
  if (await mobShelters.count() > 0) {
    await mobShelters.first().click();
    await mobPage.waitForTimeout(1500);
    console.log('Capturing Mobile: Citizen Shelters...');
    await mobPage.screenshot({ path: path.join(mobileDir, 'mobile_citizen_shelters.png') });
  }

  const mobCmdBtn = mobPage.locator('button:has-text("Command Portal")');
  if (await mobCmdBtn.count() > 0) {
    await mobCmdBtn.first().click();
    await mobPage.waitForTimeout(3000);
    console.log('Capturing Mobile: Command Overview...');
    await mobPage.screenshot({ path: path.join(mobileDir, 'mobile_command_overview.png') });
  }

  await mobileCtx.close();
  await browser.close();

  console.log('=== All Mission Control Screenshots Captured Successfully ===');
}

run().catch((err) => {
  console.error('Capture script error:', err);
  process.exit(1);
});
