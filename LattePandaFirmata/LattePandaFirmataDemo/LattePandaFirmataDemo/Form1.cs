using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using LattePanda.Firmata;
namespace LattePandaFirmataDemo
{
    public partial class Form1 : Form
    {
        //Arduino arduino = new Arduino("COM4",57600);
        Arduino arduino = new Arduino();

        public Form1()
        {
            InitializeComponent();
        }
        private void Form1_Load(object sender, EventArgs e)
        {
            this.FormClosing += Form1_FormClosing;

            arduino.pinMode(13, Arduino.OUTPUT);
            arduino.pinMode(12, Arduino.INPUT);
            arduino.pinMode(9,Arduino.SERVO);
            arduino.pinMode(11, Arduino.PWM);

            arduino.wireBegin(200);
            //arduino.wireRequest(0x53, 0x2D, new Int16[] { 8 }, Arduino.I2C_MODE_WRITE);//Write data to I2C bus
            //arduino.wireRequest(0x53, 0x32, new Int16[] { 6 }, Arduino.I2C_MODE_READ_CONTINUOUSLY);//Read data form I2C data
            //arduino.I2CRequest(0x53, 0x32, new Int16[] {}, Arduino.I2C_MODE_STOP_READING);//Stop Reading

            //arduino.didI2CDataReveive += Arduino_didI2CDataReveive;//did I2C Data Reveive
            //arduino.analogPinUpdated += Arduino_analogPinUpdated;//did analog input update
            //arduino.digitalPinUpdated += Arduino_digitalPinUpdated;//did digital input update

        }
        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            arduino.Close();
        }
        private void Arduino_digitalPinUpdated(byte pin, byte state)
        {
            Console.WriteLine(pin);
            Console.WriteLine(state);
        }
        private void Arduino_analogPinUpdated(int pin, int value)
        {
            Console.WriteLine(pin);
            Console.WriteLine(value);
        }
        private void Arduino_didI2CDataReveive(byte address, byte register, byte[] data)
        {
            Console.WriteLine(BitConverter.ToInt16(data, 0));
            Console.WriteLine(BitConverter.ToInt16(data, 2));
            Console.WriteLine(BitConverter.ToInt16(data, 4));
        }
        private void button1_Click(object sender, EventArgs e)
        {
            arduino.digitalWrite(13, Arduino.HIGH);
        }
        private void button2_Click(object sender, EventArgs e)
        {
            arduino.digitalWrite(13, Arduino.LOW);
        }
        private void trackBar1_Scroll(object sender, EventArgs e)
        {
            TrackBar bar = (TrackBar)(sender);
            arduino.servoWrite(9, bar.Value);
        }
        private void button3_Click(object sender, EventArgs e)
        {
            Console.WriteLine(arduino.digitalRead(12));
        }

        private void button4_Click(object sender, EventArgs e)
        {
            Console.WriteLine(arduino.analogRead(0));
        }

        private void trackBar2_Scroll(object sender, EventArgs e)
        {
            TrackBar bar = (TrackBar)(sender);
            arduino.analogWrite(11, bar.Value);
        }
    }
}
