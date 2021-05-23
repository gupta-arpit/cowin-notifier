import axios from 'axios';

window.onbeforeunload = function(){
    sessionStorage.setItem("origin", window.location.href);
}

window.onload = function(){
    if(window.location.href === sessionStorage.getItem("origin")){
        this.console.log("clearing storage");
        sessionStorage.clear();
    }
}

const SlotNotifier = () => {
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

    async function getAllData(){
        let allPinCodes = [473660];
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
                        addLine("401");
                        const msg = "Received 401. Login to cowin to activate your session.";
                        showNotification(msg, 'https://selfregistration.cowin.gov.in')
                        // reload page after 20s
                        setTimeout(window.location.reload.bind(window.location), 20000);
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
                    addLine(err);
                })
        });
    }
    let started = window.sessionStorage.getItem('started') || false;
    if (!started) {
        setInterval(getAllData, 15000);
        window.sessionStorage.setItem('started', true);
        getAllData();
    }

    return (
        <div>
            <div id="slot-details">
            </div>
            <div class="slot-error">
            </div>
        </div>
    )
}


export default SlotNotifier;
