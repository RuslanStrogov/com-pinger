#include <Arduino.h>

// COM-Pinger firmware — echoes back every line received over Serial

char buf[64];
uint8_t idx = 0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (idx > 0) {
        buf[idx] = '\0';
        Serial.println(buf);   // echo the full line back
        idx = 0;
      }
    } else {
      if (idx < sizeof(buf) - 1) buf[idx++] = c;
    }
  }
}
