// 1. Define Aceh Tamiang Boundary
var admin = ee.FeatureCollection('FAO/GAUL/2015/level2');
var acehTamiang = admin
  .filter(ee.Filter.eq('ADM0_NAME', 'Indonesia'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Nangroe Aceh Darussalam'))
  .filter(ee.Filter.eq('ADM2_NAME', 'Aceh Tamiang'));

print('Aceh Tamiang:', acehTamiang);


// ================================
// UI SIDEBAR
// ================================

// Clear default map widgets
ui.root.clear();

// Create a map
var map = ui.Map();
map.centerObject(acehTamiang, 10);

// Create sidebar panel
var sidebar = ui.Panel({
  style: {
    width: '240px',
    padding: '8px'
  }
});

// Add title
var title = ui.Label('Aceh Tamiang - Flood Mapping', {
  fontWeight: 'bold',
  fontSize: '18px',
  margin: '0 0 8px 0',
  color: '#1a237e'
});

// Add description
var description = ui.Label(
  'Sentinel-1 VH SAR based flood detection\n' +
  'Pre-flood: Oct–Nov 2025\n' +
  'Post-flood: Nov–Dec 2025',
  {whiteSpace: 'pre-wrap'}
);

// Add legend
var legendTitle = ui.Label('Legend', {
  fontWeight: 'bold',
  margin: '10px 0 4px 0'
});

function legendRow(color, label, isPoint) {
  var symbol;

  if (isPoint) {
    // Circle for point features
    symbol = ui.Label('●', {
      color: color,
      fontSize: '18px',
      margin: '0 6px 0 0'
    });
  } else {
    // Square for raster/polygon
    symbol = ui.Label('■', {
      color: color,
      fontSize: '18px',
      margin: '0 6px 0 0'
    });
  }

  return ui.Panel({
    widgets: [
      symbol,
      ui.Label(label)
    ],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
}

var floodLegend = ui.Panel({
  widgets: [
    legendRow('#333333', 'Flooded Area', false),
    legendRow('#FF0000', 'Health Facilities', true),
    legendRow('#0000ff', 'Education Facilities', true)
  ]
});

// Assemble sidebar
sidebar.add(title);
sidebar.add(description);
sidebar.add(legendTitle);
sidebar.add(floodLegend);

// Add sidebar and map to UI
ui.root.add(sidebar);
ui.root.add(map);

  
// 2. Load Sentinel-1 SAR Collection
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(acehTamiang)
  .filterDate('2025-10-01', '2025-12-28')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('resolution_meters', 10))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .select('VH');

// 3. Create Before/After Composites
var preFlood = s1.filterDate('2025-10-01', '2025-11-15').median();
var postFlood = s1.filterDate('2025-11-25', '2025-12-28').median();

// 4. Speckle Filter
var SMOOTHING_RADIUS = 30;
var preSmooth = preFlood.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');
var postSmooth = postFlood.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');

// 5. Flood detection
var diff = preSmooth.subtract(postSmooth);
var floodMask = diff.gt(5);

// 5. Remove Slopes (Masking mountains where flood is impossible)
var terrain = ee.Algorithms.Terrain(ee.Image("USGS/SRTMGL1_003"));
var slope = terrain.select('slope');

var floodFinal = floodMask.select('VH').updateMask(slope.lt(5).clip(acehTamiang));

// 7. Visualizations
//map.addLayer(preSmooth, {min: -25, max: 0}, 'Pre-Flood (Oct)', false);
//map.addLayer(postSmooth, {min: -25, max: 0}, 'Post-Flood (Dec)', false);

var boundary = acehTamiang.style({
  color: 'red',
  fillColor: '00000000',   // transparent fill
  width: 1
});

map.addLayer(floodFinal.selfMask(), {palette: '333333'}, 'Flooded Areas');
map.addLayer(boundary, {}, 'Aceh Tamiang Boundary');

// 8. Area Calculation (Quick Check)
var stats = floodFinal.multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: acehTamiang,
  scale: 10,
  maxPixels: 1e9
});
print('Flooded Area in Aceh Tamiang (km²):', ee.Number(stats.get('VH')).divide(1000000));

var floodArea = floodFinal
  .multiply(ee.Image.pixelArea())
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: acehTamiang,
    scale: 10,
    maxPixels: 1e13
  });

var floodHa = ee.Number(floodArea.get('VH'))
  .divide(10000)
  .round();
  
  
var areaLabel = ui.Label('Calculating flooded area...');

floodHa.evaluate(function(val) {
  areaLabel.setValue('Estimated flooded area: ' + val + ' ha');
});

sidebar.add(ui.Label('Statistics', {fontWeight: 'bold', margin: '10px 0 4px 0'}));
sidebar.add(areaLabel);

// Load the CSV table
var hospitals = ee.FeatureCollection("projects/secret-well-475403-j1/assets/hospitals_aceh_tamiang");
var schools = ee.FeatureCollection("projects/secret-well-475403-j1/assets/schools_aceh_tamiang_fix");

// Convert lat/lng to geometry
var hospitalsPts = hospitals.map(function(f) {
  var lat = ee.Number(f.get('lat'));
  var lng = ee.Number(f.get('lon'));
  return f.setGeometry(ee.Geometry.Point([lng, lat]));
})
.filterBounds(acehTamiang);

// Visualize
map.addLayer(hospitalsPts, {color: 'red'}, 'Hospitals');

// Convert lat/lng to geometry
var schoolsPts = schools.map(function(f) {
    var lat = ee.Number(f.get('lat'));
    var lng = ee.Number(f.get('lon')); 
    return f.setGeometry(ee.Geometry.Point([lng, lat]));
  })
  .filterBounds(acehTamiang);

// Visualize schools (yellow)
map.addLayer(
  schoolsPts,
  {color: 'blue'},
  'Schools'
);

print('Schools count:', schools.size());
