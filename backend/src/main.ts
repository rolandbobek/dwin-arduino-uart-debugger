import { tap } from 'rxjs';
import { ElectronApp } from './electron';
import { AppUart } from './serial';
import * as express from 'express';
import * as path from 'node:path';
import { cwd } from 'node:process';

class Application {

  private electronApp?: ElectronApp;

  constructor() {
    const port = 3000;
    const app = express();
    app.use('/', express.static(path.join(cwd(), '..', 'frontend')));

    app.listen(port, () => {
      console.log(`App listening on port ${port}`);

      // ElectronApp.setUipath(`http://localhost:${port}`);
      ElectronApp.setUipath(`http://localhost:4200`);
      this.electronApp = new ElectronApp();
      
      this.electronApp?.ready.pipe(tap(() => this.initApi())).subscribe();
    })

  }

  private async initApi() {
    console.log('initApi')
    AppUart.initPublicApi();
  }

  
}

new Application();