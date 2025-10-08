# DWIN DEBUG

## Connect serial to USB

An Arduino Uno can be used to communicate over UART2
Altough an inverter needs to be placed between the Arduino and the DWIN UART

### Wiring

| PIN                 | Connect to  |
| ---                 | ----------  |
| DWIN ground         | Arduino ground & INVERTER ground |
| DWIN V              | 12V |
| INVERTER Vin        | Arduino 5V |
| Arduino Rx          | Inverter 1 input |
| R2                  | Inverter 1 output |
| Arduino Tx          | Inverter 2 output |
| T2                  | Inverter 2 input |


Data mode = 8N1
Baud rate = 115200

### Data frame structure

#### Send

Frame[0:1]  0x5AA5 \
Frame[3]    length (instruction + data) \
Frame[4]    instruction \
Frame[5:-]  data 

#### Reply

Frame[0:1]  0x5AA5 \
Frame[3]    length (instruction + data) \
Frame[4]    instruction \
Frame[5:-]  data 

#### Instructions

##### SRAM
0x82        Write \
0x83        Read

##### Register
0x80        Write \
0x81        Read

Instruction example: \
`5A A5 04 81 00 0A 04` \
Read 04 bytes of data in the os registers R10~R13 of the 00 register page.

#### Registers
0x00-0x07    Data register \
0x08         Port register

#### Write VPS example

5A A5: Frame header \
05: Data length \
82: Write VPS \
1000 : RAM address (2bytes) \
0002: Data(2bytes)

#### Read VPS example

Read the value in VP 0x1000: 5A A5 04 83 1000 01 5A A5: Frame header \
04: Data length \
83: Read VPS \
1000: RAM address \
01: Number of data (words) to read. \
Answer from LCM:5AA5 0683 1000 01 0002 \
0002: Value in RMA address 1000

## Start program

- > cd frontend
- > npm run
#
- > cd backend
- > npm run electron