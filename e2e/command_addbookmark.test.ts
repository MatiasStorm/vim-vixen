import express from 'express';
import * as path from 'path';
import * as assert from 'assert';
import * as http from 'http';

import eventually from './eventually';
import { Builder, Lanthan } from 'lanthan';
import { WebDriver } from 'selenium-webdriver';
import Page from './lib/Page';

const newApp = () => {
  let app = express();
  app.get('/happy', (_req, res) => {
    res.send(`<!DOCTYPEhtml>
<html lang="en">
  <head>
    <title>how to be happy</title>
  </head>
</html">`);
  });
  return app;
};

describe('addbookmark command test', () => {
  const port = 12321;
  let http: http.Server;
  let lanthan: Lanthan;
  let webdriver: WebDriver;
  let browser: any;

  before(async() => {
    http = newApp().listen(port);

    lanthan = await Builder
      .forBrowser('firefox')
      .spyAddon(path.join(__dirname, '..'))
      .build();
    webdriver = lanthan.getWebDriver();
    browser = lanthan.getWebExtBrowser();
  });

  after(async() => {
    http.close();
    if (lanthan) {
      await lanthan.quit();
    }
  });

  beforeEach(async() => {
    await webdriver.navigate().to(`http://127.0.0.1:${port}/happy`);
  });

  it('should add a bookmark from the current page', async() => {
    let page = await Page.currentContext(webdriver);
    let console = await page.showConsole();
    await console.execCommand('addbookmark how to be happy');

    await eventually(async() => {
      var bookmarks = await browser.bookmarks.search({ title: 'how to be happy' });
      assert.equal(bookmarks.length, 1);
      assert.equal(bookmarks[0].url, `http://127.0.0.1:${port}/happy`);
    });
  });
});
