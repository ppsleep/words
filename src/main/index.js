import { app, BrowserWindow, ipcMain, net } from 'electron';
import md5 from 'js-md5';

// Config
let path = require('path');
let config = require('../../config');
let sqlite3 = require('sqlite3').verbose();
global.__basedir = app.getPath('userData');

var dbfile = path.join(__basedir, '/db.db');
let fs = require('fs');

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
    global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
}
global.__voicepath = path.join(__basedir, '/voice/');
mkdir(__voicepath);
//dialog.showErrorBox('dir', __basedir);
fs.stat(dbfile, function(err, stat){
    if(!stat || !stat.isFile()) {
        var tmpdb = new sqlite3.Database(dbfile, function (ret) {
        });
        tmpdb.run("CREATE TABLE words( id INTEGER PRIMARY KEY AUTOINCREMENT, word VARCHAR(60) UNIQUE, us_phonetic VARCHAR(60), uk_phonetic VARCHAR(60), explains TEXT, us_speech TEXT, uk_speech TEXT, rank REAL, last_time INTEGER);", function (err, ret) {
            if (!err) {
                tmpdb.run("CREATE INDEX rank_time ON words (last_time, rank);");
            }
        });
    }
});
let db = new sqlite3.Database(dbfile);
for(var i = 65; i < 91; i ++) {
    var dir = String.fromCharCode(i).toLowerCase();
    var savepath = path.join(__voicepath, dir);
    mkdir(savepath);
}
function mkdir(dir) {
    fs.mkdir(dir, function(err) {
        return;
    });
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
  //mainWindow.webContents.openDevTools()
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
                var request = net.request(url);
                request.on('response', (response) => {
                    response.on('data', (chunk) => {
                        var data = JSON.parse(`${chunk}`);
                        if (typeof(data.basic) !== 'undefined') {
                            var basic = data.basic;
                            basic.us_phonetic = basic['us-phonetic'];
                            basic.uk_phonetic = basic['uk-phonetic'];
                            basic.status = 0;
                            basic.exist = false;
                            basic.word = arg;
                            makeVoice(basic, event);
                            event.sender.send('query-result', basic)
                        } else {
                            event.sender.send('query-result', {status: 1, msg: '查询错误，请检查拼写是否正确'})
                        }
                    })
                })
                request.end()
            } else {
                queryRes.status = 0;
                queryRes.exist = true;
                queryRes.explains = JSON.parse(queryRes.explains);
                event.sender.send('query-result', queryRes)
            }
        });
    }
})

ipcMain.on('get-voice', (event, data) => {
    makeVoice(data, event);
})
function makeVoice(basic, event) {
    var first = basic.word.substr(0, 1);
    var usfile = path.join(__voicepath, first, '/', basic.word + '.us.mp3');
    var ukfile = path.join(__voicepath, first, '/', basic.word + '.uk.mp3');
    basic.us_speech = usfile;
    basic.uk_speech = ukfile;
    fs.open(usfile, 'r', (err, fd) => {
        if (err) {
            var request = require('request');
            request(basic['us-speech']).pipe(fs.createWriteStream(usfile).on('close', function () {
                event.sender.send('voice-result', {voice: 'us', file: usfile})
            }))
        } else {
            event.sender.send('voice-result', {voice: 'us', file: usfile})
        }
    })
    fs.open(ukfile, 'r', (err, fd) => {
        if (err) {
            var request = require('request');
            request(basic['uk-speech']).pipe(fs.createWriteStream(ukfile).on('close', function () {
                event.sender.send('voice-result', {voice: 'uk', file: ukfile})
            }))
        } else {
            event.sender.send('voice-result', {voice: 'uk', file: ukfile})
        }
    })
}

ipcMain.on('add-word', (event, data) => {
    db.run('INSERT INTO words VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        null,
        data['word'],
        data['us-phonetic'],
        data['uk-phonetic'],
        JSON.stringify(data.explains),
        data['us_speech'],
        data['uk_speech'],
        0,
        Date.parse( new Date()) / 1000
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

ipcMain.on('get-question', (event, data) => {
    var last_time = Date.parse( new Date()) / 1000 - 900;
    db.get('SELECT * FROM words WHERE last_time < ? ORDER BY rank ASC LIMIT 1', last_time, function (err, ret) {
        if (typeof(ret) !== 'undefined') {
            ret.status = 0;
            ret.explains = JSON.parse(ret.explains);
            event.sender.send('question-result', ret); 
        } else {
            db.get('SELECT * FROM words WHERE 1 = 1 ORDER BY last_time ASC, rank ASC LIMIT 1', function (err, ret) {
                if (typeof(ret) !== 'undefined') {
                    ret.status = 0;
                    ret.explains = JSON.parse(ret.explains);
                    event.sender.send('question-result', ret); 
                } else {
                    event.sender.send('question-result', {status: 1});
                }
            });
        }
    });
})
ipcMain.on('question-update', (event, data) => {
    db.get('SELECT * FROM words WHERE word = ?', data.word, function (err, ret) {
        if (typeof(ret) !== 'undefined') {
            var now = Date.parse( new Date()) / 1000;
            var last_time = ret.last_time;
            if (!last_time) {
                last_time = now;
            }
            var time = now - last_time;
            var rank = Math.atan(time);
            var setrank = ret.rank;
            switch (data.result) {
                case 'right':
                    setrank += rank;
                    break
                case 'help':
                    setrank -= rank / 2;
                    break;
                case 'error':
                    setrank -= rank * 2;
                    break;
                case 'forget':
                    setrank -= rank * 3;
                    break;
            }
            db.run('UPDATE words SET rank = ?, last_time = ? WHERE word = ?', [setrank, now, data.word]);
        }
    });
})
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
