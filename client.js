import { 
    CallClient,
    CallAgent,
    DeviceManager,
    LocalVideoStream,
    VideoStreamRenderer,
} from "@azure/communication-calling";
//import { AzureCommunicationTokenCredential, parseConnectionString } from '@azure/communication-common';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';

import { setLogLevel } from '@azure/logger';
setLogLevel('verbose');

const connectButton = document.getElementById("connect-button");
const disconnectButton = document.getElementById("disconnect-button");
const callStateElement = document.getElementById("call-state");
const destinationGroupElement = document.getElementById("destination-group-input");
const remoteParticipants = document.getElementById("remoteParticipants");
const displayNameInput = document.getElementById("displayName-input");

let call;
let callAgent;
let callClient;
let localVideoStream;
let localVideoRender;
let tokenCredential;

async function init(){
    callClient = new CallClient();

    //optenemos el codigo de acceso con fetch
    const response = await fetch(
        //"url de funcion de azure"
        "https://gettokenbex.azurewebsites.net/api/GetIdUserBex?code=hGQbdxCPI9NKShNOCAdekD6GOlyCMi20m86fRRpWoHXYVRCxLJyL0w=="        
    ); 

    const responseJson = await response.json();
    const token = responseJson.value.accessToken.token;
    tokenCredential = new AzureCommunicationTokenCredential(token);

    connectButton.disabled = false;

    //optenemos todas las camaras del usuario y escogemos la primera
    const deviceManager = await callClient.getDeviceManager();
    const videoDevices = await deviceManager.getCameras();
    const videoDeviceInfo = videoDevices[0];
    localVideoStream = new LocalVideoStream(videoDeviceInfo);

    destinationGroupElement.value = 
        "https://teams.live.com/meet/9321560526637";
    
}

init();

// connectButton click
connectButton.addEventListener("click", async () => {
    let displayName = 
        displayNameInput.value == "" ? "Usuario Anonimo" : displayNameInput.value;
    const callAgentOptions = { displayName: displayName };
    callAgent = await callClient.createCallAgent(
        tokenCredential,
        callAgentOptions
    ); 


    //unirse a la llamada
    const destinationToCall = { meetingLink :  destinationGroupElement.value };
    const callOptions = {
        videoOptions : { localVideoStreams : [localVideoStream]  },
    };

    console.log("esta es la info");
    console.log(destinationToCall);

    console.log("esta es las opciones de llamada");
    console.log(callOptions);

    console.log("llego hasta aca clic button");
    call = callAgent.join(destinationToCall, callOptions);
    //call = CallAgent.join(destinationToCall, callOptions);
    console.log("paso call - clic button");

    call.on("stateChanged", () => {
        callStateElement.innerText= call.state;
    });

    call.on("remoteParticipantsUpdate", () => {
        console.log("participantes remotos actulizados");

        call.remoteParticipants.forEach(function (participant){
            participant.on("displayNameChanged", () => {
                refreshRemoteparticipants();
            });
            
            participant.on("isMutedchanged", () => {
                refreshRemoteparticipants();
            });

            participant.on("videoStreamsUpdated", () => {
                refreshRemoteparticipants();
            });            
        });
        
        refreshRemoteparticipants();    
    });

    //mostrar video local
    await showLocalFeed();

    //cambiar estados del boton
    disconnectButton.disabled = false;
    connectButton.disabled = true;
}); 


//boton desconectarse
disconnectButton.addEventListener("click", async () => {
    await call.hangUp();
    
    //actualizamos los botones
    disconnectButton.disabled = true;
    connectButton.disabled = false;
    callStateElement.innerText="-"; 
});


function refreshRemoteparticipants(){
    
    remoteParticipants.innerHTML="";

    call.remoteParticipants.forEach(function (participant) {
        setUpRemoteParticipant(participant);
    });
}

async function showLocalFeed(){
    try {
        localVideoRender = new VideoStreamRenderer(localVideoStream);
        const view = await localVideoRender.createView();
        document.getElementById("selVideo").appendChild(view.target); 
    } catch (e) {
        alert(e.message);
    }
}

async function setUpRemoteParticipant(participant){
    console.log("llamado funcion setUpRemoteParticipant");
    let newParticipantContainer = document.getElementById("div");
    let newParticipantInfo = "<p> Muted: "+ participant.isMuted +"  </p>";

    newParticipantContainer.innerHTML=
    "<h3>"+ participant.displayName + "</h3>" + newParticipantInfo;

    let videoStream = participant.videoStreams.find(function (s){
        return s.mediaStreamType === "Video";
    });
    
    if (videoStream.isAvailable){
        RenderParticipantStream(videoStream, newParticipantContainer);
    }

    remoteParticipants.appendChild(newParticipantContainer);
}

async function RenderParticipantStream(stream, collection){
    let renderer = new VideoStreamRenderer(stream);
    const view = await renderer.createView({ scalingMode : "Fit"  });
    let container = document.createElement("div");
    container.style.width="40%";
    container.appendChild(view.target);
    container.appendChild(container);
}

