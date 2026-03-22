// ================================
// 1. DEFINE AOI
// ================================
var admin = ee.FeatureCollection('FAO/GAUL/2015/level2');

var acehTamiang = admin
  .filter(ee.Filter.eq('ADM0_NAME', 'Indonesia'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Nangroe Aceh Darussalam'))
  .filter(ee.Filter.eq('ADM2_NAME', 'Aceh Tamiang'));


// ================================
// UI SIDEBAR
// ================================
ui.root.clear();

var map = ui.Map();
map.centerObject(acehTamiang, 10);

// Sidebar panel
var sidebar = ui.Panel({
  style: {width: '240px', padding: '8px'}
});

// Title
sidebar.add(ui.Label('Aceh Tamiang - River & Surface Water Map', {
  fontWeight: 'bold',
  fontSize: '18px',
  color: '#1a237e'
}));

// Description
sidebar.add(ui.Label(
  'HydroSHEDS river network and JRC Global Surface Water\n' +
  'Aceh Tamiang Regency',
  {whiteSpace: 'pre-wrap'}
));


// ================================
// LEGEND
// ================================
sidebar.add(ui.Label('Legend', {
  fontWeight: 'bold',
  margin: '10px 0 4px 0'
}));

function legendRow(color, label) {
  return ui.Panel([
    ui.Label('■', {color: color, fontSize: '18px', margin: '0 6px 0 0'}),
    ui.Label(label)
  ], ui.Panel.Layout.Flow('horizontal'));
}

sidebar.add(legendRow('#08306B','Permanent / frequent water'));
sidebar.add(legendRow('#00FFFF','River network'));
sidebar.add(legendRow('#FF0000','Administrative boundary'));


// ================================
// 2. ADMIN BOUNDARY (OUTLINE ONLY)
// ================================
var boundary = acehTamiang.style({
  color: 'red',
  fillColor: '00000000',
  width: 1
});


// ================================
// 3. HYDROSHEDS RIVER LINES
// ================================
var hydroRivers =
  ee.FeatureCollection('WWF/HydroSHEDS/v1/FreeFlowingRivers');

var tamiangRivers =
  hydroRivers.filterBounds(acehTamiang);


// ================================
// 4. JRC GLOBAL SURFACE WATER
// ================================
var gsw = ee.Image("JRC/GSW1_4/GlobalSurfaceWater");

var occurrence = gsw
  .select('occurrence')
  .clip(acehTamiang);

// show only water pixels
var waterMasked = occurrence.updateMask(occurrence.gt(0));

var jrcVis = {
  min: 0,
  max: 100,
  palette: ['#BDD7EE','#6BAED6','#2171B5','#08306B']
};


// ================================
// 5. ADD LAYERS
// ================================
map.addLayer(waterMasked, jrcVis,
  'Permanent Surface Water');

map.addLayer(
  tamiangRivers.style({color:'cyan', width:1}),
  {},
  'River Network'
);

map.addLayer(boundary, {}, 'Aceh Tamiang Boundary');


// ================================
// FINAL UI LAYOUT
// ================================
ui.root.add(sidebar);
ui.root.add(map);
