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
  const allFiles = walk(selectedSearchPath).map(fileName => {
    const imageName = "" + getFileNameFromPath(fileName);
    return [normalizeCardName(imageName), fileName];
  });

  cards = [];

  //Start of the search for files.
  var cardCount = 0;
  data.forEach(inputLine => {
    inputLine = inputLine.trim();

    // Different sites have different sideboard formats.
    // Look for the word "sideboard" or lines that start with a double slash and skip them.
    if (/Sideboard/i.test(inputLine) || /^\/\//.test(inputLine) || inputLine === '') {
        return;
    }

    // Extract the quantity and card name.
    // Cockatrice prefixes lines with "SB:" for sideboard cards, so optionally matching that.
    // MTGA's export format puts the set and collector number in the line. ex. Arid Mesa (ZEN) 211
    let extract = /^(?:SB:\s)?(?:(\d+)?x?\s)?([^(]+)(?:\s\(.+\) .+)?$/i.exec(inputLine);
    if (extract === null) {
      console.warn(`Failed to parse line: ${inputLine}`);
      return;
    }

    const card = {
      searchTerm: inputLine,
      filePath: "",
      alternateFiles: [],
      quantity: extract[1],
      cardName: extract[2],
      normalizedCardName: normalizeCardName(extract[2]),
      // Add a number to the end of each ID to make them unique for multiples of the same card name.
      styleID: normalizeCardName(inputLine).replace(/\s/g, '') + "----" + cardCount, //remove empty space from search term to use as id.
    };

    // Search for files
    card.alternateFiles = allFiles.filter(([normalizedCardName, fileName]) =>
      normalizedCardName.includes(card.normalizedCardName)
    ).map(([_, fileName]) => fileName);

    if (card.alternateFiles.length > 0) {
      card.filePath = card.alternateFiles.reduce((a, b) => a.length <= b.length ? a : b);
    }

    cards.push(card);
    cardCount++;
  });

  event.sender.send('actionReply', cards);
});

ipc.on('copyImages', function(event, data){
  var errors = "";
  var cardCount = 0;
  for (let i = 0; i < cards.length; i++) {
    card = cards[i];
    var imageName = getFileNameFromPath(card.filePath);
    var copyLocation = selectedCopyPath + "\\" + cardCount + "_" + imageName;

    fs.copyFile(card.filePath, copyLocation, (err) => {
      if (err) {
        console.log("Error Found:", err);
        errors += (""+err);
      }
      else {
        //console.log("\nFile copied");
      }
    });
    cardCount++;
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
    var list = fs.readdirSync(dir, {withFileTypes: true});
    list.forEach(function(dirent) {
        const file = dir + '/' + dirent.name;
        if (dirent.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(walk(file));
        } else if (dirent.isFile()) {
            /* Is a file */
            results.push(file);
        }
    });
    return results;
}

/**
 * There are a number of issues with card name input.
 * The below tries to tackle some of the obvious ones, but it'll probably depend on the drive's format too.
 */
var normalizeCardName = function(cardName) {
  return cardName
      // Convert diacritics down.
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

      // Fix those dumb apostrophes.
      .replace(/’/g, `'`)

      // Remove some common characters that are or aren't in some drives.
      // Split cards are a recurring issue, so you might have to be more aggressive with spaces and slashes.
      .replaceAll('_', '')
      .replaceAll(`'`, '')
      .replaceAll('/', '')

      .toLowerCase();
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
  mainWindow.webContents.openDevTools()
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
