module.exports = function(test) {
  const button = (page, name) => page.getByRole('button', {name});
  const value = (page, id) => page.locator('#'+id).textContent();
  test('Make and sell clips using wire', async ({page, assert, shot}) => {
    await page.clock.install();
    await page.reload();

    await button(page, 'Make paperclip').click();
    assert.equal(await value(page, 'wire'), '79');
    assert.equal(await value(page, 'stock'), '1');
    await page.clock.runFor(1000);
    assert.equal(await value(page, 'stock'), '0');
    assert.equal(await value(page, 'cash'), '$0.25');
    await shot('market');
  });
  test('Expand from the market to autonomous production', async ({page, assert}) => {
    await page.clock.install();
    await page.reload();

    for(let i=0;i<40;i++) await button(page,'Make paperclip').evaluate(b=>b.click());
    await page.clock.runFor(10000);
    await button(page,/Buy AutoClipper/).click();
    await page.clock.runFor(1000);
    assert.equal(await value(page,'total'),'41');
    await button(page,/Launch factories/).click();
    await page.clock.runFor(25000);
    await button(page,/Launch self-replicating probes/).click();
    await page.clock.runFor(11000);
    assert.match(await value(page,'phase'),/Complete/);
    await button(page,'Restart').click();
    assert.equal(await value(page,'total'),'0');
  });
};
