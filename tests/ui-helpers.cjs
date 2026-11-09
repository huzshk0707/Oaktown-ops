'use strict';
async function openAppearance(page){
 const dialog=page.locator('#workspace-appearance-dialog');
 if(!await dialog.isVisible())await page.locator('#workspace-appearance-open').click();
 return dialog;
}
async function closeAppearance(page){
 const dialog=page.locator('#workspace-appearance-dialog');
 if(await dialog.isVisible())await dialog.getByRole('button',{name:'Close',exact:true}).click();
}
async function chooseTheme(page,theme){
 await openAppearance(page);await page.getByLabel('Workspace theme').selectOption(theme);await closeAppearance(page);
}
async function navigate(page,workflow,tab){
 const destination=page.locator('.sidebar [data-workspace="'+workflow+'"]');
 if(!await destination.isVisible())await page.locator('#workspace-menu-toggle').click();
 await destination.click();
 if(tab)await page.locator('[data-task-tab="'+tab+'"]').click();
}
async function openTasks(page,tab='work'){
 if(!await page.locator('#tasks-workflow').isVisible())await navigate(page,'tasks');
 const button=page.locator('[data-task-tab="'+tab+'"]');
 if(await button.getAttribute('aria-selected')!=='true')await button.click();
}
async function openTaskSettings(page){
 await openAdvanced(page);const panel=page.locator('.today-reset-settings');
 if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
}
async function openAdvanced(page){
 if(!await page.locator('#tasks-workflow').isVisible())await navigate(page,'tasks');
 const panel=page.locator('#workspace-advanced');
 if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
}
async function toggleDensity(page){
 await openAppearance(page);await page.locator('#operations-density').click();await closeAppearance(page);
}
module.exports={openAppearance,closeAppearance,chooseTheme,navigate,openTasks,openTaskSettings,openAdvanced,toggleDensity};
