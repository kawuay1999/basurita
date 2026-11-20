// Antes de construir la APK: si la app apunta a un backend en tu red local
// (http://192.168.x.x:8000/api), pone la IP ACTUAL de tu PC. El router puede
// cambiarla de un día a otro y entonces la APK "no encuentra" el servidor.
// Si apunta a un servidor en internet (https://...), no toca nada.
import { readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

const ARCHIVO = new URL('../src/environments/environment.apk.ts', import.meta.url);
const texto = readFileSync(ARCHIVO, 'utf8');
const actual = texto.match(/apiUrl:\s*'([^']+)'/)?.[1] ?? '';
const local = actual.match(/^http:\/\/(\d+\.\d+\.\d+\.\d+)(:\d+)?(\/.*)$/);

if (!local) {
  console.log(`[ip-apk] La APK usa ${actual} (servidor en internet). No se cambia nada.`);
  process.exit(0);
}

// Adaptadores virtuales (VirtualBox, VMware, WSL, Hyper-V) no sirven para el celular
const VIRTUAL = /virtual|vbox|vmware|vethernet|hyper-v|wsl|loopback|bluetooth/i;
const candidatas = [];
for (const [nombre, direcciones] of Object.entries(networkInterfaces())) {
  if (VIRTUAL.test(nombre)) continue;
  for (const d of direcciones ?? []) {
    if (d.family !== 'IPv4' || d.internal) continue;
    if (!/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(d.address)) continue;
    if (d.address.startsWith('192.168.56.')) continue; // red típica de VirtualBox
    candidatas.push({ nombre, ip: d.address, wifi: /wi-?fi|wlan|inal/i.test(nombre) });
  }
}

if (candidatas.length === 0) {
  console.warn('[ip-apk] No encontré la IP de tu Wi-Fi. Se queda:', actual);
  process.exit(0);
}

const elegida = (candidatas.find((c) => c.wifi) ?? candidatas[0]).ip;
const nueva = `http://${elegida}${local[2] ?? ''}${local[3]}`;

if (nueva === actual) {
  console.log(`[ip-apk] La APK apunta a ${nueva} (tu IP no cambió).`);
} else {
  writeFileSync(ARCHIVO, texto.replace(actual, nueva));
  console.log(`[ip-apk] IP actualizada: ${actual}  ->  ${nueva}`);
}
console.log('[ip-apk] Recuerda: el backend debe correr con "php artisan serve --host=0.0.0.0" y el celular en el mismo Wi-Fi.');
