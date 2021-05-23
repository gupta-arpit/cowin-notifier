import axios from 'axios';
import { useState } from 'react';

window.onbeforeunload = function(){
    sessionStorage.clear();
}

window.onload = function(){
    sessionStorage.clear();
}

const SlotNotifier = () => {
    const getPincode = () => {
        return localStorage.getItem('pincode') || "473660";
    }

    const setPincodeWrapper = (pin) => {
        localStorage.setItem('pincode', pin);
        setShouldPoll(false);
        setPincode(pin);
    }

    const [pincode, setPincode] = useState(getPincode());
    const [shouldPoll, setShouldPoll] = useState(true); // hack: maintaining poll to avoid running parallel js intervals

    async function showNotification(msg, redirectLink) {
        const notification = new Notification(msg);

        notification.onclick = function() {
            window.open(redirectLink);
        };
    }

    async function notifySlots(sessionData) {
        var nSlots = sessionData.available_capacity_dose1;
        var msg = `${nSlots} slots found for dose 1`;

        let granted = false;
        await Notification.requestPermission();

        if (Notification.permission === 'granted') {
            granted = true;
        } else if (Notification.permission !== 'denied') {
            let permission = await Notification.requestPermission();
            granted = permission === 'granted' ? true : false;
        }
        if (granted) {
            showNotification(msg, 'https://selfregistration.cowin.gov.in/appointment');
        }
    }

    async function addLine(line) {
        let date = new Date();
        document.getElementById("slot-details").innerHTML += `
        <span style="font-weight: 600">${date.getHours()}:${("00" + date.getMinutes()).slice(-2)}:${("00" + date.getSeconds()).slice(-2)}
        </span> => ${line} <br/>`;
    }

    async function handle401(err) {
        const href = "https://selfregistration.cowin.gov.in";
        const msg = `Received 401. Login to co-win to activate your session. Click <a style="color:white" href=${href}>here</a>`;
        addLine(err || msg);
        console.log("sending 401 notif");
        showNotification(msg, href);
    }

    async function getAllData(){
        let allPinCodes = [getPincode()];
        allPinCodes.forEach(pincode => {
            let date = new Date();
            date.setDate(date.getDate() + 1); // search for next day
            console.log(date);
            let url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByPin`;
            axios({
                url,
                method: 'GET',
                params: {
                    pincode,
                    date: `${("00" + date.getDate()).slice(-2)}-05-2021`
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                }).then(response => {
                    console.log(response);
                    const status = response.status;
                    if (status === 401) {
                        handle401();
                    }

                    if(status === 200){
                        const { data } = response;
                        const { centers } = data;
                        centers.forEach(eachCenter => {
                            let sessions = eachCenter.sessions || [];
                            sessions.forEach(eachSession => {
                                if(eachSession.min_age_limit < 45 && eachSession.available_capacity > 0){
                                    addLine(`${eachSession.available_capacity_dose1} slots found at ${eachCenter.name} for ${eachSession.date}`);
                                    notifySlots(eachSession);
                                }
                            })
                        })
                    }
                }).catch(err => {
                    handle401();
                })
        });
    }

    // to avoid creating multiple intervals on re-render event from the parent
    let started = window.sessionStorage.getItem('started') || false;
    if (!started && shouldPoll) {
        setInterval(getAllData, 15 * 1000);
        window.sessionStorage.setItem('started', true);
        getAllData();
    }

    return (
        <div>
            <div id="pincode">
                <label>Pincode:</label>
                <input value={pincode} onChange={e => setPincodeWrapper(e.target.value)} />
            </div>
            <div id="slot-details">
            </div>
        </div>
    )
}


export default SlotNotifier;