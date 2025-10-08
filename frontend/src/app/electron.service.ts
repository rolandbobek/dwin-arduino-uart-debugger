import { Injectable } from "@angular/core";
// import * as Electron from 'electron';
// import { ipcRenderer } from 'electron';

declare var window: {
  electronApi: any;
}

@Injectable({ providedIn: 'root' })
export class ElectronService {

  private electron?: any;

  public api = {
    on: (...args: any) => console.log('on stub') as any,
    off: (topic: string) => console.log('on stub') as any,
    send: (...args: any) => console.log('send stub') as any,
  };

  constructor() {
    this.init();
  }

  public async init() {
    if (window.electronApi) {
      this.api = window.electronApi;
    }
  }

}