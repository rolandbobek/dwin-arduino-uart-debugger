import { ipcMain } from 'electron';
import { InterByteTimeoutParser, ReadlineParser, SerialPort } from 'serialport';
import { ElectronApp } from './electron';
import { Transform } from 'stream';
const { SerialPortStream } = require('@serialport/stream')

// const serialport = new SerialPort({ path: PATH, baudRate: BAUD })
// const parser = new ReadlineParser({
//   // delimiter: Buffer.from([0x00])
//   includeDelimiter: true,
//   encoding: 'hex'
// });
// serialport.pipe(parser);
// parser.on('data', console.log);


// serialport.on('data', (data: Buffer) => {
//   console.log(data);
// })

export class AppUart {

  private static connectedPorts: string[] = [];

  public static isPortConnected(path: string) {
    return AppUart.connectedPorts.filter(p => p === path).length > 0;
  }

  public static async listPorts() {
    return (await SerialPort.list()).map(port => ({ ...port, connected: AppUart.isPortConnected(port.path) }));
  }

  public static connect(path: string, baudRate: number ) {
    if (AppUart.isPortConnected(path)) {
      return false;
    }

    new AppUart(path, baudRate);

    AppUart.connectedPorts.push(path);
  }

  public static initPublicApi() {
    ipcMain.handle('uart:list', (evt, data) => AppUart.listPorts());
    ipcMain.handle('uart:connect', (evt, data) => {
      try {
        return AppUart.connect(data.path, data.baudRate) !== false;
      } catch (error) {
        console.error(error);
        return false;
      }
    });
  }

  private serialport!: SerialPort;
  private electronApp = new ElectronApp();

  constructor(private path: string, private baudRate: number) {
    this.serialport = new SerialPort({ path, baudRate });

    const parser = this.serialport.pipe(new InterByteTimeoutParser({ interval: 100 }))
    // parser.on('data', console.log)

    this.initApi(parser);
  }

  private async initApi(parser: Transform) {
    ipcMain.handle(`uart:close:${this.path}`, (evt, data) => this.destroy());
    ipcMain.handle(`uart:send:${this.path}`, (evt, data) => {
      // console.log('send', data);

      this.serialport.write(data);
    });

    parser.on('connect', () => this.electronApp.sendToWindow(`uart:connect:${this.path}`, { path: this.path }));
    parser.on('data', (data) => this.electronApp.sendToWindow(`uart:data:${this.path}`, data));
    parser.on('disconnect', () => {
      this.electronApp.sendToWindow(`uart:cose:${this.path}`, { path: this.path });
      this.destroy();
    });
    parser.on('end', () => {
      this.electronApp.sendToWindow(`uart:end: ${this.path}`, { path: this.path })
      this.destroy();
    });
  }

  public destroy() {
    this.serialport.end();
    this.serialport.close();
    this.serialport.destroy();
    ipcMain.removeHandler(`uart:close:${this.path}`);
    ipcMain.removeHandler(`uart:send:${this.path}`);
    
    AppUart.connectedPorts = AppUart.connectedPorts.filter(p => p !== this.path);
  }

}