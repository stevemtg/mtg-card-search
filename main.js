// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const url = require('url')
const path = require('path')
var ipc = require('electron').ipcMain;


const { dialog } = require('electron')
const fs = require('fs');
// https://www.npmjs.com/package/find
var find = require('find');


var selectedSearchPath = "";
var selectedCopyPath = "";
var cards = [];


ipc.on('getFilePath', function(event, data){
    //DIALOG DOCS: https://www.electronjs.org/docs/api/dialog
    var path = dialog.showOpenDialog({
      properties: ['openDirectory']
    }).then(result => {
      selectedSearchPath = result.filePaths[0];
      event.sender.send('actionReply', selectedSearchPath);
    }).catch(err => {
      console.log(err);
    });
});
ipc.on('getCopyPath', function(event, data){
    //DIALOG DOCS: https://www.electronjs.org/docs/api/dialog
    var path = dialog.showOpenDialog({
      properties: ['openDirectory']
    }).then(result => {
      selectedCopyPath = result.filePaths[0];
      event.sender.send('actionReply', selectedCopyPath);
    }).catch(err => {
      console.log(err);
    });
});


ipc.on('findImages', function(event, data){
  var allFiles = walk(selectedSearchPath);
  cards = [];

  //Start of the search for files.
  data.forEach(inputLine => {
    card = {searchTerm:inputLine, filePath:"", alternateFiles:[]};

    // Search for a file.
    var foundFileName = "";
    allFiles.forEach(fileName => {
      fileNameString = "" + fileName;
      if(fileNameString.toLowerCase().includes(inputLine.toLowerCase())) {
        foundFileName = fileName;
        card.filePath = fileName;
        card.styleID = inputLine.replace(/\s/g, '');//remove empty space from search term to use as id.
        card.alternateFiles.push(fileName);
        return;
      }
    });
    cards.push(card);
  });

  event.sender.send('actionReply', cards);
});

ipc.on('copyImages', function(event, data){
  var errors = "";
  for (let i = 0; i < cards.length; i++) {
    card = cards[i];
    var imageName = getFileNameFromPath(card.filePath);
    var copyLocation = selectedCopyPath+"\\"+imageName;

    fs.copyFile(card.filePath, copyLocation, (err) => {
      if (err) {
        console.log("Error Found:", err);
        errors += (""+err);
      }
      else {
        //console.log("\nFile copied");
      }
    });

  }

  event.sender.send('actionReply', errors);
});

ipc.on('updateCards', function(event, data){
    console.log("cards data: " + data);
    cards = data;
});

var getFileNameFromPath = function(path) {
  var fileName = path.split('\\')[path.split('\\').length-1];
  fileName = fileName.split('/')[fileName.split('/').length-1];
  return fileName;
}

var walk = function(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(walk(file));
        } else {
            /* Is a file */
            results.push(file);
        }
    });
    return results;
}



function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
