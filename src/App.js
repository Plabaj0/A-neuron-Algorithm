import './App.css';
import React, {useCallback, useEffect, useState} from "react";
import sendPost from "./api/apiPost";
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

export default function App() {
    const [dotCount, setDotCount] = useState(0);
    const [value, setValue] = useState(50);
    const [roundValue, setRoundValue] = useState(50);


    const updateRangeValue = (event) => {
        setValue(event.target.value);
    };

    const updateRoundsValue = (event) => {
        setRoundValue(event.target.value);
    };

    function sortedCoordinatesMap(coordinatesMap) {
        const sortedEntries = Array.from(coordinatesMap.entries()).sort((a, b) => {
            const nameA = typeof a[0] === 'string' ? a[0] : '';
            const nameB = typeof b[0] === 'string' ? b[0] : '';

            const numA = parseInt(nameA.match(/\d+$/)?.[0] || 0, 10);
            const numB = parseInt(nameB.match(/\d+$/)?.[0] || 0, 10);

            return numA - numB;
        });

        return new Map(sortedEntries);
    }

    const webSocketStart = () => {
        const socket = new SockJS('http://localhost:8080/ws');
        const stompClient = Stomp.over(socket);

        const coordinatesMap = new Map();
        const unitDivs = new Map();
        let svg;

        stompClient.connect({}, () => {
            stompClient.subscribe('/topic/data', (message) => {

                const dataArray = JSON.parse(message.body);
                const interactiveConsole = document.getElementById("interactiveConsole");

                if (!svg) {
                    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.id = "connectionLines";
                    svg.style.position = "absolute";
                    svg.style.top = "0";
                    svg.style.left = "0";
                    svg.style.width = "100%";
                    svg.style.height = "100%";
                    svg.style.pointerEvents = "none";
                    interactiveConsole.appendChild(svg);
                }

                dataArray.forEach(data => {
                    const {name, coordinates} = data;

                    let unitDiv = unitDivs.get(name);
                    if (!unitDiv) {
                        unitDiv = document.createElement("div");
                        unitDiv.id = name;
                        unitDiv.className = "unit";
                        unitDiv.style.width = "10px";
                        unitDiv.style.height = "10px";
                        unitDiv.style.backgroundColor = "red";
                        unitDiv.style.position = "absolute";

                        interactiveConsole.appendChild(unitDiv);
                        unitDivs.set(name, unitDiv);
                    }

                    unitDiv.style.left = `${coordinates.x}px`;
                    unitDiv.style.top = `${coordinates.y}px`;
                    coordinatesMap.set(name, coordinates);
                });

                const sortedMap = sortedCoordinatesMap(coordinatesMap);

                updateConnections(svg, Array.from(sortedMap.values()));
            });
        });

        function updateConnections(svg, coordinatesList) {
            svg.innerHTML = "";

            for (let i = 1; i < coordinatesList.length; i++) {
                const start = coordinatesList[i - 1];
                const end = coordinatesList[i];

                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", start.x);
                line.setAttribute("y1", start.y);
                line.setAttribute("x2", end.x);
                line.setAttribute("y2", end.y);
                line.setAttribute("stroke", "black");
                line.setAttribute("stroke-width", "2");
                svg.appendChild(line);
            }
        }
    };


    function handleClearClick() {
        const startButton = document.getElementById('clearPoints');

        startButton.addEventListener('click', (e) => {
            const dotElements = document.getElementsByClassName('dot');

            Array.from(dotElements).forEach(dot => {
                dot.remove();
            });
        });
    }

    async function handleStartClick() {
        const urlInfo = "http://localhost:8080/api/v1/getInformation";
        const urlNeurons = "http://localhost:8080/api/v1/getNeurons";
        const urlData = "http://localhost:8080/api/v1/getRounds";

        const allDots = document.getElementsByClassName("dot");

        const positions = Array.from(allDots).reduce((acc, element) => {
            const pointName = element.classList[0];

            const elementRect = element.getBoundingClientRect();

            const parent = element.parentElement;
            const parentRect = parent.getBoundingClientRect();

            const x = elementRect.left - parentRect.left;
            const y = elementRect.top - parentRect.top;

            acc[pointName] = {x, y};
            return acc;
        }, {});

        console.log(positions);

        await sendPost(urlInfo, positions)
        await sendPost(urlNeurons, parseInt(value))
        await sendPost(urlData, parseInt(roundValue))
        webSocketStart();
    }


    const handleClick = useCallback((event) => {
        const interactiveConsole = document.getElementById("interactiveConsole");

        if (interactiveConsole) {
            setDotCount(prev => prev + 1);
            const rect = interactiveConsole.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const dot = document.createElement("div");
            dot.className = `point${dotCount}`;
            dot.classList.add("dot");

            dot.style.left = `${x}px`;
            dot.style.top = `${y}px`;

            interactiveConsole.appendChild(dot);
        }
    }, [dotCount]);

    return (
        <div className="container">
            <div className="buttons">
                <button onClick={handleStartClick} id="start-btn" className="start-btn">Start Simulation</button>
                <button
                    onClick={handleClearClick}
                    id="clearPoints"
                    className="clearPoints"
                    disabled
                >
                    Clear Points
                </button>
            </div>
            <div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={updateRangeValue}
                />
                <a id="neurons-per-action">Neurons: {value}</a> {}
            </div>

            <div>
                <input
                    id="wartosc"
                    type="range"
                    min="0"
                    max="100"
                    value={roundValue}
                    onChange={updateRoundsValue}
                />
                <a id="rounds-per-action">Rounds to learn: {roundValue}</a> {}
            </div>
            <div onClick={handleClick} className="interactiveConsole" id="interactiveConsole">
            </div>
        </div>
    );
}