// Проверка версии Node.js для start.bat. Vite 7 требует Node 20.19+ или 22.12+.
const [major, minor] = process.versions.node.split('.').map(Number)
const ok = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22

if (!ok) {
  console.log('')
  console.log('  Установлен Node.js ' + process.versions.node + ', а нужен 20.19 или новее (лучше 22 LTS).')
  console.log('  Скачайте Node.js с https://nodejs.org (кнопка LTS), установите и запустите start.bat снова.')
  console.log('')
  process.exit(1)
}
