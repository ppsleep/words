import { app, BrowserWindow, ipcMain, net } from 'electron';
import md5 from 'js-md5';

// Config
let path = require('path');
let config = require('../../config');
let sqlite3 = require('sqlite3').verbose();
var dbfile = path.join(__dirname, '/db.db');
let fs = require('fs');
fs.stat(dbfile, function(err, stat){
    if(!stat || !stat.isFile()) {
        var tmpdb = new sqlite3.Database(dbfile);
        tmpdb.run("CREATE TABLE words( id integer primary key autoincrement, word varchar(60), us_phonetic varchar(60), uk_phonetic varchar(60), explains TEXT, us_speech TEXT, uk_speech TEXT );");
    }
});
let db = new sqlite3.Database(dbfile);

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 700,
    height: 526,
    useContentSize: true,
    titleBarStyle: 'hidden',
    frame: false
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.on('add-word', (event, arg) => {
    var reg = new RegExp(/^[a-zA-Z]+(-[a-zA-Z]+)?$/);
    if (reg.test(arg)) {
        var salt = new Date().getTime();
        var sign = md5(config.appKey + arg + salt + config.secret).toUpperCase();
        var url = 'http://openapi.youdao.com/api?q=' + arg + '&from=EN&to=zh_CHS&appKey=' + config.appKey + '&salt=' + salt + '&sign=' + sign;
        var url = 'http://openapi.youdao.com/api';
        var request = net.request(url);
        request.on('response', (response) => {
            response.on('data', (chunk) => {
                var data = JSON.parse(`${chunk}`);
                if (typeof(data.basic) !== 'undefined') {
                    res = format(data.basic);
                    event.sender.send('add-result', res)
                } else {
                    event.sender.send('add-result', {status: 1, msg: '查询错误，请检查拼写是否正确'})
                }
            })
        })
        request.end()
    }
})
function save(word, data) {
    var us_speech = '';
    var uk_speech = '';
    var request = net.request(data['us-speech']);
    request.on('response', (response) => {
        response.on('data', (chunk) => {
            us_speech = `${chunk}`
        })
    })
    request.end()
    var request = net.request(data['uk-speech']);
    request.on('response', (response) => {
        response.on('data', (chunk) => {
            uk_speech = `${chunk}`
        })
    })
    request.end()
    db.run("INSERT INTO words VALUES (null, ?, ?, ?, ?, ?, ?)", [
        null,
        word,
        data['us-phonetic'],
        data['uk-phonetic'],
        JSON.stringify(data.explains),
        us_speech,
        uk_speech
    ]);
}
/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
