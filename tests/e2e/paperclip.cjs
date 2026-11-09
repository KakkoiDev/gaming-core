module.exports=function(test){
 const make=page=>page.getByRole('button',{name:'Make a paperclip'});
 const buy=page=>page.getByRole('button',{name:'Buy a machine'});
 const automation=page=>page.getByRole('button',{name:'Automation',exact:true});
 const total=page=>page.locator('#clips').textContent();
 const earn=async(page,n)=>{for(let i=0;i<n;i++)await make(page).evaluate(button=>button.click());};
 test('Make clips and buy a machine without starting automation',async({page,assert,shot})=>{
  await page.setViewportSize({width:390,height:844});
  await page.clock.install();
  assert.ok(await make(page).isVisible());
  assert.ok(await buy(page).isDisabled());
  await make(page).focus();await page.keyboard.press('Enter');
  assert.equal(await total(page),'1');
  await earn(page,9);await buy(page).click();
  await page.clock.fastForward(3000);
  assert.equal(await total(page),'0');
  assert.equal(await automation(page).getAttribute('aria-pressed'),'false');
  assert.match(await page.locator('#rate').textContent(),/1 machine · 0 clips\/sec/);
  await shot('mobile');
 });
 test('Toggle automatic production and restart',async({page,assert})=>{
  await page.clock.install();
  await earn(page,10);await buy(page).click();
  await automation(page).click();
  await page.clock.runFor(2000);assert.equal(await total(page),'2');
  await automation(page).click();
  await page.clock.fastForward(3000);assert.equal(await total(page),'2');
  await automation(page).click();
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  await page.clock.fastForward(3000);
  assert.equal(await total(page),'0');
  assert.ok(await automation(page).isDisabled());
 });
 test('Reach the goal with manual clicks',async({page,assert})=>{
  await earn(page,100);
  assert.equal(await total(page),'100');
  assert.match(await page.locator('#goal').textContent(),/Goal reached/);
 });
};
