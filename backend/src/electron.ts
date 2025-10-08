import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import { shareReplay, Subject } from 'rxjs';

export class ElectronApp {

  private static instance: ElectronApp;
  private static uiPath: string;

  public static setUipath(path: string) { ElectronApp.uiPath = path }

  private mainWindow?: BrowserWindow;

  private whenReady = new Subject<void>();
  public ready = this.whenReady.pipe(shareReplay(1));

  constructor() {

    if (ElectronApp.instance) return ElectronApp.instance;

    this.ready.subscribe();

    app.whenReady().then(() => this.onReady());
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
    });
    
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    });

    ElectronApp.instance = this;
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preloader.js')
      }
    });

    if (ElectronApp.uiPath.startsWith('http')) {
      this.mainWindow.loadURL(ElectronApp.uiPath)
    } else {
      this.mainWindow.loadFile(ElectronApp.uiPath);
    }
  
  }

  private onReady() {
    console.log('Electron onready')
    // ipcMain.handle('ping', (evt, data) => {
    //   console.log('data', data);

    //   return 'pong';
    // });

    // setInterval(() => {
      // if (this.mainWindow) this.mainWindow.webContents.send('interval', 'interval')
    // }, 1000)
    
    this.createWindow();

    this.whenReady.next();
  }

  public sendToWindow(topic: string, data: any) {
    if (this.mainWindow) this.mainWindow.webContents.send(topic, data);
  }

}