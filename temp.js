let mqttClient;

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById('menu');
  const menuPopup = document.getElementById('menu-popup');
  const popupClose = document.getElementById('popup-close');
  
  const page1BtnPopup = document.getElementById('page1-btn-popup');
  const page2BtnPopup = document.getElementById('page2-btn-popup');
  
  // Function to show the popup
  function showPopup() {
    menuPopup.style.display = 'flex';
  }
  
  // Function to hide the popup
  function hidePopup() {
    menuPopup.style.display = 'none';
  }
  
  // Function to show the selected page and hide others
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
      page.style.display = (page.id === pageId) ? 'block' : 'none';
    });
  }
  
  // Menu button click event
  menuBtn.addEventListener('click', showPopup);
  
  // Close popup button click event
  popupClose.addEventListener('click', hidePopup);
  
  // Page buttons click events
  page1BtnPopup.addEventListener('click', () => {
    showPage('page1');
    hidePopup();
  });
  
  page2BtnPopup.addEventListener('click', () => {
    showPage('page2');
    hidePopup();
  });
  
  // Page navigation buttons
  document.getElementById('page1-btn').addEventListener('click', () => {
    showPage('page1');
  });

  document.getElementById('page2-btn').addEventListener('click', () => {
    showPage('page2');
  });

  // Initialize on load
  window.addEventListener("load", () => {
    getUserLocation();
    connectToBroker();
    updateBackgroundBasedOnTime(); 
    setupLampButtons(); // Set up the lamp buttons

    const getDataBtn = document.querySelector("#get_data");
    getDataBtn.addEventListener("click", function () {
      if (mqttClient && mqttClient.connected) {
        subscribeToTopic(); // Subscribe to topics when the button is clicked
      } else {
        alert("MQTT client is not connected.");
      }
    });

    setInterval(updateBackgroundBasedOnTime, 60 * 60 * 1000); // Update background every hour
    showPage('page1');
  });

  function connectToBroker() {
    const clientId = "client" + Math.random().toString(36).substring(7);
    const host = "ws://broker.hivemq.com:8000/mqtt";

    const options = {
      keepalive: 60,
      clientId: clientId,
      protocolId: "MQTT",
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    };

    mqttClient = mqtt.connect(host, options);

    mqttClient.on("error", (err) => {
      console.log("Error: ", err);
      mqttClient.end();
    });

    mqttClient.on("reconnect", () => {
      console.log("Reconnecting...");
    });

    mqttClient.on("connect", () => {
      console.log("Client connected: " + clientId);
    });

    mqttClient.on("message", (topic, message) => {
      console.log("Received Message: " + message.toString() + "\nOn topic: " + topic);

      if (topic === "dht_temp") {
        const tempElement = document.querySelector("#dht_temp");
        const tempValue = parseFloat(message.toString());
        tempElement.textContent = tempValue;

        // Update temperature icon color logic
        const tempIcon = document.querySelector('.thermometer-icon i');
        if (tempValue >= 40) tempIcon.style.color = "#ff3333";
        else if (tempValue >= 30) tempIcon.style.color = "#ff9100";
        else if (tempValue >= 20) tempIcon.style.color = "#00b3ff";
        else tempIcon.style.color = "#93e6f5";
      } 
      
      else if (topic === "dht_hum") {
        const humElement = document.querySelector("#dht_hum");
        const humValue = parseFloat(message.toString());
        humElement.textContent = humValue;

        // Update humidity icon color logic
        const humIcon = document.querySelector('.humidity-icon i');
        if (humValue >= 60) humIcon.style.color = "#4960f5";
        else if (humValue >= 30) humIcon.style.color = "#57a3fa";
        else if (humValue >= 20) humIcon.style.color = "#85d5f2";
        else humIcon.style.color = "#b1ebfa";
      }
    });
  }

  function subscribeToTopic() {
    const topicTemp = "dht_temp";
    const topicHum = "dht_hum";
    
    console.log(`Subscribing to Topics: ${topicTemp}, ${topicHum}`);
    
    mqttClient.subscribe(topicTemp, { qos: 1 });
    mqttClient.subscribe(topicHum, { qos: 1 });
  }

  function setupLampButtons() {
    const lampOnBtn = document.querySelector("#lamp_on");
    const lampOffBtn = document.querySelector("#lamp_off");
    const lampElement = document.querySelector('#lamp_status');

    lampOnBtn.addEventListener("click", () => {
      const lampIcon = document.querySelector('.lamp i');
      lampIcon.style.color = "#f5e85f";
      lampElement.textContent = 'Status Lamp : ON';
      publishMessage("switch_lamp", "1"); 
    });

    lampOffBtn.addEventListener("click", () => {
      const lampIcon = document.querySelector('.lamp i');
      lampIcon.style.color = "#303030";
      lampElement.textContent = 'Status Lamp : OFF';
      publishMessage("switch_lamp", "0");
    });
  }

  function publishMessage(topic, message) {
    if (mqttClient && mqttClient.connected) {
      console.log(`Publishing Topic: ${topic}, Message: ${message}`);
      mqttClient.publish(topic, message, { qos: 1, retain: false });
    } else {
      console.error("MQTT client is not connected.");
    }
  }

  function getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(fetchLocationData, showError);
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  function fetchLocationData(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const apiKey = '3aeda88d901d1b3b49cfff1e9d250542'; 
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;

    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        const city = data.name;
        const weatherData = {
          name: city,
          weather: data.weather,
          main: data.main
        };
        displayWeather(weatherData);
        displayLocation(city);
      })
      .catch(() => {
        const locationElement = document.querySelector('#location');
        locationElement.textContent = "Unable to retrieve location.";
      });
  }

  function displayLocation(city) {
    const locationElement = document.querySelector('#location');
    locationElement.textContent = `City: ${city}`;
  }

  function displayWeather(data) {
    const locationElement = document.querySelector('#location');
    const weatherElement = document.querySelector('#dht_weather');
    const iconElement = document.querySelector('.weather-icon img');

    const { name } = data;
    const { description, icon, id } = data.weather[0];

    locationElement.textContent = 'City: ' + name;
    weatherElement.textContent = description.charAt(0).toUpperCase() + description.slice(1);

    // Custom weather icon logic
    if (id === 800) {
      iconElement.src = "icons/clear.svg";
    } else if (id >= 200 && id <= 232) {
      iconElement.src = "icons/storm.svg";
    } else if (id >= 600 && id <= 622) {
      iconElement.src = "icons/snow.svg";
    } else if (id >= 300 && id <= 321) {
      iconElement.src = "icons/drizzle.svg";
    } else if (id >= 500 && id <= 531) {
      iconElement.src = "icons/rain.svg";
    } else if (id >= 701 && id <= 781) {
      iconElement.src = "icons/fog.svg";
    } else if (id >= 802 && id <= 804) {
      iconElement.src = "icons/cloud.svg";
    }
  }

  function showError(error) {
    const locationElement = document.querySelector('#location');
    switch(error.code) {
      case error.PERMISSION_DENIED:
        locationElement.textContent = "User denied the request for Geolocation.";
        break;
      case error.POSITION_UNAVAILABLE:
        locationElement.textContent = "Location information is unavailable.";
        break;
      case error.TIMEOUT:
        locationElement.textContent = "The request to get user location timed out.";
        break;
      case error.UNKNOWN_ERROR:
        locationElement.textContent = "An unknown error occurred.";
        break;
    }
  }

  function updateBackgroundBasedOnTime() {
    const bodyElement = document.querySelector("body");
    const currentTime = new Date();
    const hours = currentTime.getHours();

    if (hours >= 4 && hours < 7) { // 4 AM to 6 AM
      bodyElement.style.background = "linear-gradient(to right, #A966FA, #5D88FC)"; 
    } 
    else if (hours >= 7 && hours < 11) { // 7 AM to 11 AM
      bodyElement.style.background = "linear-gradient(to right, #11C8FA, #AAE9FA)";
    } 
    else if (hours >= 11 && hours < 14) { // 11 AM to 2 PM
      bodyElement.style.background = "linear-gradient(to right, #FAF8DC, #FAE8AC)"; 
    } 
    else if (hours >= 14 && hours < 17) { // 2 PM to 5 PM
      bodyElement.style.background = "linear-gradient(to right, #FFA55C, #FF9A8B)";
    } 
    else if (hours >= 17 && hours < 20) { // 5 PM to 8 PM
      bodyElement.style.background = "linear-gradient(to right, #6A82FB, #FC5C7D)"; 
    } 
    else { // 8 PM to 4 AM
      bodyElement.style.background = "linear-gradient(to right, #3a1f9c, #180636)"; 
    }
  }
});
