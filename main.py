from flask import Flask, render_template, jsonify
from gpiozero import OutputDevice, Button
from waitress import serve
import time
import threading

app = Flask(__name__)

pwr_btn = OutputDevice(17, active_high=True, initial_value=False)
pwr_led = Button(27, pull_up=True)

gpio_lock = threading.Lock()

def pulse(duration):
    with gpio_lock:
        pwr_btn.on()
        time.sleep(duration)
        pwr_btn.off()

def pc_on():
    return pwr_led.is_pressed

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/state')
def state():
    return jsonify({'on': pc_on()})

@app.route('/toggle', methods=['POST'])
def toggle():
    threading.Thread(target=pulse, args=(0.5,), daemon=True).start()
    return jsonify({'on': pc_on()})

@app.route('/force_shutdown', methods=['POST'])
def force_shutdown():
    threading.Thread(target=pulse, args=(5.5,), daemon=True).start()
    return jsonify({
        'status': 'shutting_down',
        'on': pc_on()
    })

if __name__ == '__main__':
    serve(app, host='0.0.0.0', port=5000)
