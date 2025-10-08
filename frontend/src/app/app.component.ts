import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ElectronService } from './electron.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Pipe, PipeTransform } from '@angular/core';
import { promiseDelay } from './promise.util';

enum Tokens {
  h5A       = 0x5a,
  hA5       = 0xa5,
  Read      = 0x83,
  Write     = 0x82
}

/*
5a a5 04 83 00 0f 01
5a a5 04 83 10 00 31
5A A5 05 82 10 00 31 32
*/

class AppTransformer {

  public static match (data: Uint8Array) {
    const match = data.subarray(0, 2).toString() === Uint8Array.from([Tokens.h5A, Tokens.hA5]).toString();
    return match;
  }

  public static translate(buff: Uint8Array) {
    const length = buff.at(2)!;
    let cmd: string;

    switch(buff.at(3)) {
      case Tokens.Read: cmd = 'Read'; break;
      case Tokens.Write: cmd = 'Write'; break;
      default: cmd = 'NOP'
    }

    const vp = buff.subarray(4, 6);
    const responseLength = cmd === 'Write' ? length - 3 : buff.at(6);
    const data = cmd === 'Write' ? buff.subarray(6) : buff.subarray(7);

    return { length, cmd, vp, responseLength, data };
  }
}

@Pipe({
  name: 'hex',
  standalone: true,
})
export class HexPipe implements PipeTransform {

  transform(value: Uint8Array, ...args: string[]): string {
    const chars: string[] = [];

    if (args[0] === 'str') {
      value.map(v => chars.push(v >= 0x20 && v <= 0x7f ? String.fromCharCode(v) : '.'));
      // value.map(v => chars.push(String.fromCharCode(v)));
      // return value.toString();
      return chars.join('');
    }

    value.map(v => chars.push(v.toString(16).padStart(2, '0')))
    return chars.join(' ').toUpperCase();
  }

}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HexPipe,
  ],
  templateUrl: './app.component.pug',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly electronService = inject(ElectronService);
  private readonly fb = inject(FormBuilder);

  public ports: any[] = [];
  public connectedPath?: string;

  public formHex = this.fb.group({
    value: ['', [Validators.required]]
  });

  public formString = this.fb.group({
    value: ['', [Validators.required]]
  });

  public formDwin = this.fb.group({
    command: ['read', [Validators.required]],
    len: [0],
    address: ['', [Validators.required]],
    value: ['']
  });

  public inputTypeSelectorControl = new FormControl('hex');

  public lines = signal<{ sender: string, data: Uint8Array, date: number, translation?: any }[]>([]);

  private async scroll() {
    await promiseDelay(200);
    
    const element: HTMLDivElement = document.querySelector('.output')!;
    element.scrollTo(0, element.scrollHeight);
  }

  private addLine(line: { sender: string, data: Uint8Array }) {
    const { sender, data } = line;
    let translation: any;

    if (AppTransformer.match(data)) {
      translation = AppTransformer.translate(data);
    }

    this.lines.update(values => [...values, { sender, data, date: Date.now(), translation }]);
    this.scroll();
  }

  public ngOnInit(): void {
    this.listPorts();
  }

  public async listPorts() {
    this.ports = await this.electronService.api.send('uart:list');
  }

  public async connect(path: string) {
    try {
      this.attach(path);
      const connected = await this.electronService.api.send('uart:connect', { path, baudRate: 115200 });

      if (!connected) {
        this.detach(path);
      }

      this.listPorts();
    } catch (error) {
      this.detach(path);
      console.error(error)
    }

  }

  public async sendBuffer(path: string, data: Uint8Array) {
    this.addLine({ sender: 'me', data });
    this.electronService.api.send(`uart:send:${path}`, data);
  }

  public sendHex() {
    if (!this.connectedPath) return;

    const form = this.formHex.getRawValue();

    const hex = form.value!.split(' ').map(ch => parseInt(ch, 16))
    const data = Uint8Array.from(hex);
    
    this.sendBuffer(this.connectedPath!, data);
  }

  public sendString() {
    if (!this.connectedPath) return;

    const form = this.formString.getRawValue();
    const text = form.value!.split('').map(ch => ch.charCodeAt(0));

    const data = Uint8Array.from(text);

    this.sendBuffer(this.connectedPath!, data);
  }

  public sendDwin() {
    if (!this.connectedPath) return;

    const form = this.formDwin.getRawValue();

    const { command, address, value, len } = form;

    const addressHex = address!.trim().split(' ').map(ch => parseInt(ch, 16));
    const valueHex = value!.trim().split(' ').map(ch => parseInt(ch, 16));

    let message = Uint8Array.from([]);

    if (command === 'read') {
      message = Uint8Array.from([
        Tokens.h5A, Tokens.hA5,
        4,
        Tokens.Read,
        ...addressHex,
        (len || 1)
      ]);
    } else if (command === 'write') {
      message = Uint8Array.from([
        Tokens.h5A, Tokens.hA5,
        valueHex.length + 3,
        Tokens.Write,
        ...addressHex,
        ...valueHex
      ]);
    }

    if (message.length === 0) {
      console.error('no message');
      return;
    }

    this.sendBuffer(this.connectedPath!, message);

  }

  public async attach(path: string) {

    const uartOndata = (evt: any, data: any) => {
      this.addLine({ sender: 'device', data });
    };

    const uartOnClose = (evt: any, arg: any) => {
      console.log('uart:close', arg);
      this.detach(path);
    };

    const uartOnEnd = (evt: any, arg: any) => {
      console.log('uart:end', arg);
      this.detach(path);
    };

    this.electronService.api.on(`uart:data:${path}`, uartOndata);
    this.electronService.api.on(`uart:close:${path}`, uartOnClose);
    this.electronService.api.on(`uart:end:${path}`, uartOnEnd);

    this.connectedPath = path;
  }

  public async detach(path: string) {

    this.electronService.api.off(`uart:data:${path}`);
    this.electronService.api.off(`uart:close:${path}`);
    this.electronService.api.off(`uart:end:${path}`);

    if (this.connectedPath === path) {
      this.connectedPath = undefined;
    }
  }

  public async disconnect(path: string) {
    await this.electronService.api.send(`uart:close:${path}`);
    if (this.connectedPath === path) {
      this.detach(path);
      this.connectedPath = undefined;
    }
    this.listPorts();
  }
}
