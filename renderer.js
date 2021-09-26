
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

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
                  + "<img id='[#STYLEID]' class='img-fluid card-img' src='[#IMAGEPATH]' data-bs-toggle='modal' data-bs-target='#cardModal'>"
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

  // Prepare Card Preview Onclick events for art selection
  AllCards.forEach(card => {
    var newCardElement = document.getElementById(card.styleID);
    newCardElement.onclick = OpenModal;
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
    imgElemPrepared = imgElem.replace("[#IMAGEPATH]", altFileImg)
                              .replace("[#STYLEID]", altFileStyle)
                              .replace("[#SEARCHTERM]", altFileImgName);
    resultsHTML += imgElemPrepared;
    cardCount++;

    if(cardCount % 3 == 0) {
      resultsHTML += endRowElem;
      resultsHTML += rowElem;
    }
  }
  resultsHTML += endRowElem;
  document.getElementById('art-options').innerHTML = resultsHTML;

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
