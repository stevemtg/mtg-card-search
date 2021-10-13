
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const sizeOf = require('image-size');

// Static storage of card list:
var AllCards = [];
var SelectedCard;

// loading message for the file search
const loadingImgElem = document.getElementById('loading-img');

//-------------------------------------------
// Select file path to search
//-------------------------------------------
var ipc = require('electron').ipcRenderer;
const getFilePathButton = document.getElementById('getFilePathButton');
getFilePathButton.addEventListener('click', function(){
    ipc.once('actionReply', function(event, response){
        document.getElementById('searchPath').innerHTML = response;
    })
    ipc.send('getFilePath', "my data");
});


//-------------------------------------------
// Select copy path to output results
//-------------------------------------------
var ipc = require('electron').ipcRenderer;
const getCopyPathButton = document.getElementById('getCopyPathButton');
getCopyPathButton.addEventListener('click', function(){
    ipc.once('actionReply', function(event, response){
        document.getElementById('copyPath').innerHTML = response;
    })
    ipc.send('getCopyPath', "my data");
});


//-------------------------------------------
// Find images
//-------------------------------------------
const findImagesButton = document.getElementById('findImagesButton');
const findImagesInput = document.getElementById('findImagesInput');

const rowElem = "<div class='row'>";
const imgElem = "<div class='col-sm-4'>"
                  + "<img id='[#STYLEID]' class='img-fluid card-img lazy' data-src='[#IMAGEPATH]' data-bs-toggle='modal' data-bs-target='#cardModal'>"
                  +"<p>[#SEARCHTERM]</p>"
                  +"</div>";
const endRowElem = "</div>";

findImagesButton.addEventListener('click', function(){
    loadingImgElem.style.display = "block";
    var inputData = findImagesInput.value.split(/\n/);

    ipc.once('actionReply', function(event, response){

        AllCards = response;
        RefreshCardPreview();
        loadingImgElem.style.display = "none";

    })

    ipc.send('findImages', inputData);
});

function RefreshCardPreview() {
  // Prepare Card Previews
  var cardCount = 0;
  var resultsHTML = "";
  resultsHTML += rowElem;
  AllCards.forEach(card => {
    //console.log("filePath: " + card.filePath);
    //console.log("searchTerm: " + card.searchTerm);
    //console.log("styleID: " + card.styleID);
    imgElemPrepared = imgElem.replace("[#IMAGEPATH]", card.filePath)
                              .replace("[#STYLEID]", card.styleID)
                              .replace("[#SEARCHTERM]", card.searchTerm);
    resultsHTML += imgElemPrepared;
    cardCount++;

    if(cardCount % 3 == 0) {
      resultsHTML += endRowElem;
      resultsHTML += rowElem;
    }
  });
  resultsHTML += endRowElem;
  document.getElementById('preview').innerHTML = resultsHTML;

  ll.update();

  // Prepare Card Preview Onclick events for art selection
  cardCount = 0;
  AllCards.forEach(card => {
    var newCardElement = document.getElementById(card.styleID);
    newCardElement.onclick = OpenModal;
    cardCount++;
  });
}


//-------------------------------------------
// Prepare the preview images for the modal
//-------------------------------------------
// This function will be applied to the images in the preview to find alternative art or cards.
function OpenModal() {
  SelectedCard = GetCardObjectFromID(this.id);
  PrepareCardModal(SelectedCard);
}

function SelectCardArt() {
  selectedCardElem = document.getElementById(SelectedCard.styleID);
  newArtSelectionElem = document.getElementById(this.id);
  newArtSrc = newArtSelectionElem.getAttribute('src');

  // Updates the 'Cards' Object
  UpdateCardObjectImg(SelectedCard.styleID, newArtSrc);
  // Updates selected card data
  SelectedCard = GetCardObjectFromID(this.id);
  // Update Dom with new img src
  selectedCardElem.src = newArtSrc;
  // Update the stored cards in the backend to reflect the new image selection.
  ipc.send('updateCards', AllCards);
}

// Prepare the modal with the selected cards options
function PrepareCardModal(selectedCard) {

  var cardCount = 0;
  var resultsHTML = "";
  resultsHTML += rowElem;
  for (let i = 0; i < selectedCard.alternateFiles.length; i++) {

    var altFileImg = selectedCard.alternateFiles[i];
    var altFileImgName = getFileNameFromPath(selectedCard.alternateFiles[i]);
    var altFileStyle = selectedCard.styleID + cardCount;

    // Calculate PPI
    var ppi = 0;
    // Get the image dims
    var dimensions = sizeOf(altFileImg);
    //console.log("height: " + dimensions.height + " width: " + dimensions.width);
    var pixelDiag = Math.sqrt( ((dimensions.height * dimensions.height)
                                + (dimensions.width * dimensions.width)) );
    ppi = Math.trunc(pixelDiag / 4.3); //4.3 is the mtg card size diagonal
    //--------------------


    imgElemPrepared = imgElem.replace("[#IMAGEPATH]", altFileImg)
                              .replace("[#STYLEID]", altFileStyle)
                              .replace("[#SEARCHTERM]", altFileImgName + " ("+ppi+"ppi)");
    resultsHTML += imgElemPrepared;
    cardCount++;

    if(cardCount % 3 == 0) {
      resultsHTML += endRowElem;
      resultsHTML += rowElem;
    }
  }
  resultsHTML += endRowElem;
  document.getElementById('art-options').innerHTML = resultsHTML;

  ll.update();

  // Prepare Card Onclick events for alt art selection
  var cardCount = 0;
  for (let i = 0; i < selectedCard.alternateFiles.length; i++) {
    var altFileImg = selectedCard.alternateFiles[i];
    var altFileImgName = getFileNameFromPath(selectedCard.alternateFiles[i]);
    var altFileStyle = selectedCard.styleID + cardCount;
    var newCardOptionElement = document.getElementById(altFileStyle);
    newCardOptionElement.onclick = SelectCardArt;
    cardCount++;
  }

}

// Get the selected card using the id of the image.
function GetCardObjectFromID(cardID) {
  for (let i = 0; i < AllCards.length; i++) {
    var card = AllCards[i];
    if(card.styleID+"" === cardID+"") {
      return card;
    }
  }
  return null;
}

function UpdateCardObjectImg(cardID, newImg) {
  for (let i = 0; i < AllCards.length; i++) {
    var card = AllCards[i];
    if(card.styleID+"" === cardID+"") {
      AllCards[i].filePath = newImg;
    }
  }
}


function getFileNameFromPath(path) {
  var fileName = path.split('\\')[path.split('\\').length-1];
  fileName = fileName.split('/')[fileName.split('/').length-1];
  return fileName;
}


//-------------------------------------------
// Copy images
//-------------------------------------------
const copyImagesButton = document.getElementById('copyImagesButton');
//var copySuccessModal = new bootstrap.Modal(copySuccessModalElem);
copyImagesButton.addEventListener('click', function(){
    ipc.once('actionReply', function(event, response){
      alert("Copying images completed");
    })
    ipc.send('copyImages', "placeholder data");
});


//-------------------------------------------
// Lazy Load Images
//-------------------------------------------

function logElementEvent(eventName, element) {
  console.log(Date.now(), eventName, element.getAttribute("data-src"));
}

var callback_enter = function (element) {
  //logElementEvent("🔑 ENTERED", element);
};
var callback_exit = function (element) {
  //logElementEvent("🚪 EXITED", element);
};
var callback_loading = function (element) {
  //logElementEvent("⌚ LOADING", element);
};
var callback_loaded = function (element) {
  //logElementEvent("👍 LOADED", element);
};
var callback_error = function (element) {
  logElementEvent("💀 ERROR", element);
  element.src = "https://via.placeholder.com/440x560/?text=Error+Placeholder";
};
var callback_finish = function () {
  //logElementEvent("✔️ FINISHED", document.documentElement);
};
var callback_cancel = function (element) {
  //logElementEvent("🔥 CANCEL", element);
};

var ll = new LazyLoad({
  class_applied: "lz-applied",
  class_loading: "lz-loading",
  class_loaded: "lz-loaded",
  class_error: "lz-error",
  class_entered: "lz-entered",
  class_exited: "lz-exited",
  // Assign the callbacks defined above
  callback_enter: callback_enter,
  callback_exit: callback_exit,
  callback_cancel: callback_cancel,
  callback_loading: callback_loading,
  callback_loaded: callback_loaded,
  callback_error: callback_error,
  callback_finish: callback_finish
});
