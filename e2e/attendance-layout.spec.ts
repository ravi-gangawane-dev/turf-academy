import {expect,test} from '@playwright/test';
import {login} from './helpers';
for(const width of [1440,390]){
 test('attendance pages at '+width+'px',async({page})=>{
  test.setTimeout(180000);await login(page);await page.setViewportSize({width,height:1000});
  for(const tab of ['', '/manual-check-in','/manual-check-out','/qr','/correction','/history','/calendar','/offline-queue']){
   await page.goto('/attendance'+tab);
   await expect(page.locator('app-page-hero')).toBeVisible();
   await expect(page.locator('app-page-hero .pi-home')).toHaveCount(1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),tab).toBe(false);
   if(!tab){
    await expect(page.locator('.attendance-breadcrumb')).toHaveCount(0);
    const metrics=await page.locator('.attendance-metrics').boundingBox();
    const last=await page.locator('.attendance-metrics article').last().boundingBox();
    expect(Math.abs(metrics!.x+metrics!.width-last!.x-last!.width)).toBeLessThan(2);
    expect(await page.locator('app-attendance-page').textContent()).not.toMatch(/z\s*$/);
   }
   await page.screenshot({path:'test-results/attendance-'+(tab.slice(1)||'dashboard')+'-'+width+'.png',fullPage:true});
  }
 });
}
