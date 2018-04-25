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
        tmpdb.run("CREATE TABLE words( id integer primary key autoincrement, word varchar(60) UNIQUE, us_phonetic varchar(60), uk_phonetic varchar(60), explains TEXT, us_speech TEXT, uk_speech TEXT );");
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

ipcMain.on('query-word', (event, arg) => {
    var reg = new RegExp(/^[a-zA-Z]+(-[a-zA-Z]+)?$/);
    if (reg.test(arg)) {
        db.get('SELECT * FROM words WHERE word = ?', arg, function(err, queryRes) {
            if (typeof(queryRes) === 'undefined') {
                var salt = new Date().getTime();
                var sign = md5(config.appKey + arg + salt + config.secret).toUpperCase();
                var url = 'http://openapi.youdao.com/api?q=' + arg + '&from=EN&to=zh_CHS&appKey=' + config.appKey + '&salt=' + salt + '&sign=' + sign;
                var url = 'http://127.0.0.1/test/tans.json';
                var request = net.request(url);
                request.on('response', (response) => {
                    response.on('data', (chunk) => {
                        var data = JSON.parse(`${chunk}`);
                        if (typeof(data.basic) !== 'undefined') {
                            var res = format(arg, data.basic);
                            event.sender.send('query-result', res)
                        } else {
                            event.sender.send('query-result', {status: 1, msg: '查询错误，请检查拼写是否正确'})
                        }
                    })
                })
                request.end()
            } else {
            console.log('rr', queryRes)
                queryRes.status = 0;
                queryRes.exist = true;
                queryRes.explains = JSON.parse(queryRes.explains);
                event.sender.send('query-result', queryRes)
            }
        });
    }
})

ipcMain.on('add-word', (event, data) => {
    db.run('INSERT INTO words VALUES (?, ?, ?, ?, ?, ?, ?)', [
        null,
        data['word'],
        data['us-phonetic'],
        data['uk-phonetic'],
        JSON.stringify(data.explains),
        data['us-speech'],
        data['uk-speech'],
    ], function(err,res){
        var response = {status: 0, msg: '添加成功'}
        if (err) {
            switch (err.code) {
                case 'SQLITE_CONSTRAINT':
                    response = {status: 1, msg: '该单词已存在'};
                    break;
                default:
                    response = {status: 1, msg: '添加失败，错误代码：' + err.code};
                    break;
            }
        }
        event.sender.send('add-result', response); 
    });
})

function format(word, data) {
    var first = word.substr(0, 1);
    var savepath = path.join(__dirname, '/../../static/mp3/', first);
    fs.stat(savepath, function(err, stat){
        if(!stat || !stat.isDirectory()) {
            fs.mkdir(savepath);
        }
    });
    var usfile = path.join(__dirname, '/../../static/mp3/', first, '/', word + '.us.mp3');
    var ukfile = path.join(__dirname, '/../../static/mp3/', first, '/', word + '.uk.mp3');
    var request = require('request');
    request(data['us-speech']).pipe(fs.createWriteStream(usfile))
    request(data['uk-speech']).pipe(fs.createWriteStream(ukfile))
    data.us_phonetic = data['us-phonetic'];
    data.uk_phonetic = data['uk-phonetic'];
    data.us_speech = usfile;
    data.uk_speech = ukfile;
    data.status = 0;
    data.exist = false;
    data.word = word;
    return data;
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
