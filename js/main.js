import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const map = L.map('map', {zoomSnap: 0}).setView([39.95, -75.16], 12);

L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWp1bWJlLXRlc3QiLCJhIjoiY202dGU0ajBrMDF6cDJrb2hvYjdmNnVqbyJ9.56P4wOfH800ekNL19mAWWg', {
  maxZoom: 19,
  zoomOffset: -1,
  tileSize: 512,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
window.map = map;

function getPartyColor(party) {
  return party === 'REPUBLICAN' ? 'red' : 'blue';
}

const resp = await fetch('data/pa_pres_results.geojson');
const data = await resp.json();
const dataLayer = L.geoJSON(data, {
  style: (feature) => {
    const party = feature.properties.party;
    return {
      fillColor: getPartyColor(party),
      fillOpacity: 0.9,
      color: 'black',
      opacity: 0.5,
      weight: 1,
    };
  },
});

dataLayer.addTo(map);
map.fitBounds(dataLayer.getBounds(), {padding: [32, 32]});

const legend = L.control({position: 'bottomright'});

legend.onAdd = function(map) {
  const div = L.DomUtil.create('div', 'info legend');
  const parties = ['DEMOCRAT', 'REPUBLICAN'];
  const labels = ['Democrat', 'Republican'];

  // loop through our density intervals and generate a label with a colored square for each interval
  for (let i = 0; i < parties.length; i++) {
    div.innerHTML +=
            '<i style="background-color:' + getPartyColor(parties[i]) + '"></i> ' +
            labels[i] + '<br>';
  }

  return div;
};

legend.addTo(map);

dataLayer.bindTooltip((layer) => layer.feature.properties.name);
dataLayer.addEventListener('click', (evt) => {
  const props = evt.layer.feature.properties;
  const infoDiv = document.getElementById('info');

  const instructions = infoDiv.querySelector('.instructions');
  instructions.classList.remove('visually-hidden');
  instructions.setAttribute('aria-hidden', 'false');

  const resultsDiv = infoDiv.querySelector('#results');

  resultsDiv.innerHTML = `
    <h2 style="flow-">${props.name} County</h2>
    <p><strong>2020 Presidential Election Results</strong></p>
    <dl>
      <dt>Total Votes:</dt>
      <dd>${props.totalvotes.toLocaleString()}</dd>
      <dt>Winning Party (Candidate):</dt>
      <dd>${props.party} (${props.candidate})</dd>
      <dt>Winning Votes:</dt>
      <dd>${props.candidatevotes.toLocaleString()} (${(props.candidatevotes / props.totalvotes * 100).toFixed(1)}%)</dd>
    </dl>
  `;

  const chartSvg = infoDiv.querySelector('#chart');

  const width = resultsDiv.clientWidth;
  const height = 200;
  const chartData = [{
    label: 'Democrat',
    value: props.party === 'DEMOCRAT' ? props.candidatevotes / props.totalvotes :
      1 - props.candidatevotes / props.totalvotes,
    color: getPartyColor('DEMOCRAT'),
  }, {
    label: 'Republican',
    value: props.party === 'REPUBLICAN' ? props.candidatevotes / props.totalvotes :
      1 - props.candidatevotes / props.totalvotes,
    color: getPartyColor('REPUBLICAN'),
  }];

  const svg = d3.select(chartSvg)
    .attr('width', width)
    .attr('height', height);

  // Draw or update a pie chart
  const pie = d3.pie()
    .value((d) => d.value)
    .sort((a, b) => d3.ascending(a.label, b.label));
  const arcs = pie(chartData);

  svg.selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius(Math.min(width, height) / 2 - 10)
      .padAngle(0.02)
      .padRadius(50))
    .attr('transform', `translate(${width / 2}, ${height / 2})`)
    .attr('fill', (d) => d.data.color);
});
