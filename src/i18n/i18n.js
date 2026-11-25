'use strict';

// =========================================================================
// [BLOCK:I18N]
// ДВУЯЗЫЧНЫЙ ИНТЕРФЕЙС (RU / EN) — ПРОСТОЙ, ПОНЯТНЫЙ АНГЛИЙСКИЙ БЕЗ ОФИЦИОЗА
// =========================================================================
let currentLang = 'ru';
try {
    const savedLang = localStorage.getItem('sakhalin_map_lang');
    if (savedLang === 'en' || savedLang === 'ru') currentLang = savedLang;
} catch (_) {}

function isEn() {
    return currentLang === 'en';
}

function tr(ruText, enText) {
    return currentLang === 'en' ? enText : ruText;
}

// Простые и понятные переводы всех 29 объектов карты (Сахалин-2, Сахалин-1, Сахалин-3, СХВ)
const EN_FACILITIES = {
    'pa-b': {
        code: 'PA-B',
        name: 'Piltun-Astokhskaya-B Platform',
        shortName: 'Piltun-Astokhskaya-B',
        categoryLabel: 'Offshore Platform',
        location: 'Piltun-Astokhskoye field, Sea of Okhotsk (12 km offshore)',
        description: 'A large offshore oil and gas platform standing on a concrete gravity base. Built to handle heavy sea ice and earthquakes in the Sea of Okhotsk.',
        specs: [
            { label: 'Water depth', value: '32 m' },
            { label: 'Base type', value: 'Concrete gravity base' },
            { label: 'Started', value: '2008' },
            { label: 'Output', value: 'Oil and associated gas' }
        ]
    },
    'pa-a': {
        code: 'PA-A',
        name: 'Piltun-Astokhskaya-A Platform (Molikpaq)',
        shortName: 'PA-A Molikpaq',
        categoryLabel: 'Offshore Platform',
        location: 'Piltun-Astokhskoye field, Sea of Okhotsk (16 km offshore)',
        description: 'Russia\'s first ice-resistant offshore oil platform. Launched seasonal production in 1999 (Vityaz complex) and switched to year-round pipeline operation in 2008.',
        specs: [
            { label: 'Water depth', value: '30 m' },
            { label: 'Structure', value: 'Steel caisson' },
            { label: 'First oil', value: '1999 (year-round 2008)' },
            { label: 'Distance', value: '16 km offshore' }
        ]
    },
    'uoug-north': {
        code: 'Gas Node (N)',
        name: 'Northern Gas Metering Station',
        shortName: 'North Gas Node',
        categoryLabel: 'Onshore Node',
        location: 'Northern section of the trans-Sakhalin pipeline',
        description: 'An automated station that measures gas flow, adjusts pressure, and routes gas coming in from the PA-A and PA-B offshore platforms.',
        specs: [
            { label: 'Role', value: 'Metering & routing' },
            { label: 'Monitoring', value: '24/7 automated' },
            { label: 'Section', value: 'Northern corridor' },
            { label: 'Status', value: 'Active' }
        ]
    },
    'lun-a': {
        code: 'LUN-A',
        name: 'Lunskaya-A Platform',
        shortName: 'Lunskaya-A (LUN-A)',
        categoryLabel: 'Gas Platform',
        location: 'Lunskoye gas field (15 km offshore)',
        description: 'The main gas platform of Sakhalin-2. It sends natural gas and condensate to the Onshore Processing Facility (OPF) near Nogliki.',
        specs: [
            { label: 'Water depth', value: '48 m' },
            { label: 'Base', value: '4-leg concrete base' },
            { label: 'Wells', value: 'Up to 27 wells' },
            { label: 'Main output', value: 'Natural gas' }
        ]
    },
    'obtk': {
        code: 'OPF',
        name: 'Onshore Processing Facility (OPF)',
        shortName: 'OPF (Nogliki)',
        categoryLabel: 'Processing Plant',
        location: 'Near Nogliki, northeast coast of Sakhalin',
        description: 'The main onshore processing hub operated by Sakhalin Energy LLC. It separates, dries, and boosts pressure for gas from LUN-A and oil from PA-A and PA-B before sending them south across the island.',
        specs: [
            { label: 'Operator', value: 'Sakhalin Energy LLC' },
            { label: 'Gas capacity', value: 'Up to 51 mln m³/day' },
            { label: 'Oil capacity', value: 'Up to 29k tons/day' },
            { label: 'Setup', value: 'Gas plant, booster CS, 2 lines' }
        ]
    },
    'nks-2': {
        code: 'BS-2',
        name: 'Booster Station No. 2',
        shortName: 'Booster Station #2 (Gastello)',
        categoryLabel: 'Booster Station',
        location: 'Poronaysk district, near Gastello village',
        description: 'Midway pumping and compressor station along the 800 km island pipeline. Keeps steady pressure in both the oil and gas lines heading south.',
        specs: [
            { label: 'Pipeline length', value: 'About 800 km' },
            { label: 'Role', value: 'Pumping & compression' },
            { label: 'Safety', value: 'Earthquake-proof supports' },
            { label: 'District', value: 'Poronaysk' }
        ]
    },
    'uoug-south': {
        code: 'Gas Node (S)',
        name: 'Southern Gas Metering Station',
        shortName: 'South Gas Node',
        categoryLabel: 'Onshore Node',
        location: 'Southern Sakhalin, north of Yuzhno-Sakhalinsk',
        description: 'Splits the gas flow in southern Sakhalin: part goes to local towns and power plants in Yuzhno-Sakhalinsk, while the main volume feeds the LNG plant.',
        specs: [
            { label: 'Role', value: 'Local gas supply & LNG' },
            { label: 'Control', value: 'Ultrasonic metering' },
            { label: 'Direction', value: 'Prigorodnoye / Yuzhno-Sakhalinsk' },
            { label: 'Status', value: 'Active' }
        ]
    },
    'lng-plant': {
        code: 'Prigorodnoye',
        name: 'Prigorodnoye Complex: LNG Plant & OET',
        shortName: 'Prigorodnoye (LNG + OET)',
        categoryLabel: 'LNG Plant & OET',
        location: 'Aniva Bay coast, 13 km east of Korsakov',
        description: 'Integrated Prigorodnoye Production Complex operated by Sakhalin Energy LLC on Sakhalin\'s southern coast. Combines Russia\'s first LNG plant (two 100,000 m³ tanks & export jetty) and the Oil Export Terminal (OET) with an offshore loading tower (TLU) in Aniva Bay on one site.',
        specs: [
            { label: 'Operator', value: 'Sakhalin Energy LLC' },
            { label: 'LNG Output', value: '~10.3 mln t/yr (design 9.6)' },
            { label: 'Oil Export', value: 'Sakhalin Blend (offshore TLU)' },
            { label: 'Navigation', value: 'Year-round (365 days)' }
        ],
        subTabs: [
            {
                tabLabel: 'LNG Plant',
                badge: 'LNG Plant',
                code: 'LNG Plant',
                name: 'Prigorodnoye LNG Plant',
                location: 'West side of Prigorodnoye Complex, east of Korsakov',
                description: 'Russia\'s first large-scale LNG plant, launched in 2009. Its two liquefaction trains have a 9.6 mln t/yr design capacity and routinely produce around 10.3 mln t/yr after upgrades, with two 100,000 m³ storage tanks and an 805 m export jetty.',
                specs: [
                    { label: 'Design capacity', value: '9.6 mln tons/year' },
                    { label: 'Actual output', value: '~10.3 mln tons/year (2025)' },
                    { label: 'LNG tanks', value: '2 × 100,000 m³ (-162 °C)' },
                    { label: 'Export jetty', value: '805 m into Aniva Bay' }
                ]
            },
            {
                tabLabel: 'Oil Terminal (OET)',
                badge: 'Oil Terminal',
                code: 'OET',
                name: 'Oil Export Terminal (Prigorodnoye)',
                location: 'East side of Prigorodnoye Complex & offshore TLU',
                description: 'Crude oil storage and year-round export terminal sharing the Prigorodnoye site with the LNG plant. Pumps Sakhalin Blend oil via a subsea pipeline to an offshore loading tower (TLU) 4.5 km out in Aniva Bay for Aframax tankers.',
                specs: [
                    { label: 'Crude grade', value: 'Sakhalin Blend' },
                    { label: 'Offshore loading', value: 'Subsea line + TLU tower' },
                    { label: 'Navigation', value: 'Year-round (365 days)' },
                    { label: 'Bay', value: 'Ice-free Aniva Bay' }
                ]
            }
        ]
    },
    'aniva-lighthouse': {
        code: 'Aniva Lighthouse',
        name: 'Aniva Lighthouse (Sivuchya Rock)',
        shortName: 'Aniva Lighthouse',
        categoryLabel: 'Landmark',
        location: 'Southeast tip of Sakhalin, Cape Aniva',
        description: 'Famous 31-meter concrete lighthouse built in 1939 where the Sea of Okhotsk meets Aniva Bay. Decommissioned in 2006, now an iconic Sakhalin maritime landmark.',
        specs: [
            { label: 'Tower height', value: '31 m (40 m above sea)' },
            { label: 'Built', value: '1939 (retired 2006)' },
            { label: 'Light range', value: 'Historical 17.5 nmi' },
            { label: 'Landmark', value: 'Aniva Bay entrance' }
        ]
    },
    'tanker-aniva': {
        code: 'Oil Tanker',
        name: 'Zaliv Aniva Oil Tanker (Aframax)',
        shortName: 'Tanker "Zaliv Aniva"',
        categoryLabel: 'Oil Tanker',
        location: 'Aniva Bay — Sea of Okhotsk (from Oil Terminal)',
        description: 'Ice-class Aframax oil tanker (~103,000 DWT) carrying Sakhalin Blend oil year-round from Prigorodnoye to Asian markets.',
        specs: [
            { label: 'Deadweight', value: '~103,000 tons (Aframax)' },
            { label: 'Ice class', value: '1C (year-round)' },
            { label: 'Cargo', value: 'Sakhalin Blend oil' },
            { label: 'Loading port', value: 'Prigorodnoye OET' }
        ]
    },
    'lng-carrier': {
        code: 'LNG Carrier',
        name: 'Grand Aniva LNG Carrier',
        shortName: 'LNG Carrier "Grand Aniva"',
        categoryLabel: 'LNG Carrier',
        location: 'Southern sea lane — Aniva Bay / La Perouse Strait',
        description: 'Large LNG ship with four round Moss cryogenic tanks holding 145,000 m³ of liquefied natural gas at -162 °C from Prigorodnoye.',
        specs: [
            { label: 'Capacity', value: '145,000 m³ LNG' },
            { label: 'Tanks', value: '4 spherical (Moss)' },
            { label: 'Cargo temp', value: '-162 °C' },
            { label: 'Terminal', value: 'Prigorodnoye LNG' }
        ]
    },
    'supply-vessel': {
        code: 'Supply Icebreaker',
        name: 'Fyodor Ushakov Icebreaking Supply Vessel',
        shortName: 'Ship "Fyodor Ushakov"',
        categoryLabel: 'Supply Ship',
        location: 'Northeast shelf, Sea of Okhotsk (PA-B, PA-A, LUN-A)',
        description: 'Sovcomflot Icebreaker6 multi-purpose supply vessel delivering equipment and crews year-round with emergency standby duty for PA-B, Molikpaq, and LUN-A.',
        specs: [
            { label: 'Power', value: '13 MW (Azipod drives)' },
            { label: 'Ice class', value: 'Icebreaker6 (1.1–1.3 m ice)' },
            { label: 'Deadweight', value: '~3,820 tons' },
            { label: 'Route', value: 'PA-B, PA-A, LUN-A' }
        ]
    },
    's1-odoptu': {
        code: 'Odoptu',
        name: 'Odoptu Field (Onshore Site)',
        shortName: 'Odoptu (Drilling & OPF)',
        categoryLabel: 'Sakhalin-1 Field',
        location: 'Northeast coast of Sakhalin, Odoptu Bay spit',
        description: 'Northern field of Sakhalin-1 (operated by Sakhalin-1 LLC / Rosneft). Oil and gas are drilled from shore using super-long horizontal wells reaching under the seabed, then piped south to Chayvo.',
        specs: [
            { label: 'Operator', value: 'Sakhalin-1 LLC (Rosneft)' },
            { label: 'Well reach', value: '11–15 km from shore' },
            { label: 'Started', value: '2010' },
            { label: 'Pipeline', value: 'Line to Chayvo OPF' }
        ]
    },
    's1-berkut': {
        code: 'Berkut',
        name: 'Berkut Offshore Platform (Arkutun-Dagi)',
        shortName: 'Berkut Platform',
        categoryLabel: 'Sakhalin-1 Platform',
        location: 'Arkutun-Dagi field, Sea of Okhotsk (25 km offshore)',
        description: 'Russia\'s largest ice-resistant offshore oil platform, weighing over 200,000 tons (Sakhalin-1 LLC). Installed in 2014 and started oil production in January 2015.',
        specs: [
            { label: 'Total weight', value: '> 200,000 tons' },
            { label: 'Water depth', value: '35 m' },
            { label: 'First oil', value: 'January 2015' },
            { label: 'Operator', value: 'Sakhalin-1 LLC' }
        ]
    },
    's1-orlan': {
        code: 'Orlan',
        name: 'Orlan Offshore Platform (Chayvo)',
        shortName: 'Orlan Platform',
        categoryLabel: 'Sakhalin-1 Platform',
        location: 'Chayvo field, shallow shelf of the Sea of Okhotsk',
        description: 'Ice-resistant offshore platform sitting on a solid concrete caisson (CIDS). Started production in 2005 and works on the Chayvo field alongside the onshore Yastreb rig.',
        specs: [
            { label: 'Water depth', value: '15 m' },
            { label: 'Base', value: 'Concrete caisson (CIDS)' },
            { label: 'First oil', value: '2005' },
            { label: 'Operator', value: 'Sakhalin-1 LLC' }
        ]
    },
    's1-chayvo': {
        code: 'Chayvo • Yastreb',
        name: 'Chayvo Processing Facility & Yastreb Rig',
        shortName: 'Chayvo OPF + Yastreb Rig',
        categoryLabel: 'Sakhalin-1 Hub',
        location: 'East coast of Sakhalin, Chayvo Bay spit',
        description: 'Main onshore hub of Sakhalin-1 (Sakhalin-1 LLC), combining the Chayvo Processing Facility and the onshore Yastreb drilling rig. Sends Sokol oil 226 km to De-Kastri and gas to the Far East.',
        specs: [
            { label: 'Operator', value: 'Sakhalin-1 LLC' },
            { label: 'Oil pipeline', value: '226 km to De-Kastri' },
            { label: 'Onshore rig', value: 'Yastreb (> 15 km wells)' },
            { label: 'Oil grade', value: 'Sokol' }
        ],
        subTabs: [
            {
                tabLabel: 'Chayvo OPF',
                badge: 'Processing Hub S1',
                code: 'Chayvo OPF',
                name: 'Chayvo Onshore Processing Facility',
                location: 'East coast of Sakhalin, Chayvo Bay',
                description: 'Main processing center for Sakhalin-1 (Sakhalin-1 LLC). Takes oil and gas from Odoptu, Berkut, Orlan, and Yastreb, sending Sokol crude 226 km to De-Kastri and gas to the Far East network.',
                specs: [
                    { label: 'Operator', value: 'Sakhalin-1 LLC' },
                    { label: 'Oil pipeline', value: '226 km to De-Kastri' },
                    { label: 'Oil grade', value: 'Sokol' },
                    { label: 'Gas supply', value: 'Far East domestic market' }
                ]
            },
            {
                tabLabel: 'Yastreb Rig',
                badge: 'Onshore Rig S1',
                code: 'Yastreb Rig',
                name: 'Yastreb Onshore Drilling Rig (Chayvo)',
                location: 'East spit of Chayvo Bay',
                description: 'Arctic-grade onshore rig famous for setting world records by drilling horizontal wells over 15 km long from land out under the Sea of Okhotsk.',
                specs: [
                    { label: 'Well length', value: 'Record > 15 km' },
                    { label: 'Rating', value: 'Arctic (down to -40 °C)' },
                    { label: 'Site', value: 'Chayvo Bay spit' },
                    { label: 'Operator', value: 'Sakhalin-1 LLC' }
                ]
            }
        ]
    },
    's1-dekastri': {
        code: 'De-Kastri',
        name: 'De-Kastri Oil Terminal & Loading Buoy',
        shortName: 'De-Kastri Terminal',
        categoryLabel: 'Mainland Terminal',
        location: 'Khabarovsk Krai, Chikhachyov Bay (Tatar Strait)',
        description: 'Mainland export terminal for Sokol crude oil (Sakhalin-1 LLC). Connected to Chayvo by a 226 km pipeline across Tatar Strait, with an offshore loading tower in the bay for year-round shipping.',
        specs: [
            { label: 'Operator', value: 'Sakhalin-1 LLC' },
            { label: 'Oil grade', value: 'Sokol' },
            { label: 'Loading', value: 'Offshore SPM tower' },
            { label: 'Navigation', value: 'Year-round (icebreakers)' }
        ]
    },
    's1-tanker-dekastri': {
        code: 'Tanker S1',
        name: 'De-Kastri Oil Tanker (Sokol)',
        shortName: 'Tanker "De-Kastri"',
        categoryLabel: 'Oil Tanker S1',
        location: 'Tatar Strait — export route from De-Kastri',
        description: 'Double-hull ice-class Aframax tanker shipping Sokol crude oil all year from the De-Kastri offshore loading tower down through Tatar Strait.',
        specs: [
            { label: 'Cargo', value: 'Sokol crude oil' },
            { label: 'Deadweight', value: '100,000+ tons' },
            { label: 'Loading port', value: 'De-Kastri (SPM)' },
            { label: 'Operator', value: 'Sakhalin-1 LLC' }
        ]
    },
    's3-pdk': {
        code: 'Kirinskoye (Subsea)',
        name: 'Kirinskoye Field — Sakhalin-3 Subsea Complex',
        shortName: 'Kirinskoye Subsea (Active)',
        categoryLabel: 'Subsea Production S3',
        location: 'Kirinsky block, Sea of Okhotsk (28 km offshore)',
        description: 'Russia\'s first fully subsea gas field (started 2013–2014, operated by Gazprom Dobycha Shelf). All wellheads and manifolds sit on the seabed (~90 m deep) with zero surface platforms, keeping equipment safe from sea ice.',
        specs: [
            { label: 'Status', value: 'Active (since 2013–2014)' },
            { label: 'Operator', value: 'Gazprom Dobycha Shelf' },
            { label: 'Water depth', value: '~90 m (100% subsea)' },
            { label: 'Export line', value: '28 km seabed pipe → BTK' }
        ]
    },
    's3-south-kirinskoye': {
        code: 'South Kirinskoye',
        name: 'South Kirinskoye Field (Under Development)',
        shortName: 'South Kirinskoye (Inactive)',
        categoryLabel: 'Not Active • S3',
        location: 'Kirinsky block, Sea of Okhotsk (~35 km offshore)',
        description: 'The largest field in Sakhalin-3 (814.5 bcm gas, 130 mln t condensate, 3.8 mln t oil). Not producing yet — domestic subsea equipment and a dedicated seabed export line to BTK are in progress. Target start-up: 2027–2028.',
        specs: [
            { label: 'Status', value: 'Not active (target 2027–2028)' },
            { label: 'Reserves (C1+C2)', value: '814.5 bcm + 130 mln t cond.' },
            { label: 'Water depth', value: '110–320 m (subsea)' },
            { label: 'Operator', value: 'Gazprom Dobycha Shelf' }
        ]
    },
    's3-btk': {
        code: 'BTK Sakhalin-3',
        name: 'Sakhalin-3 Onshore Processing Plant (BTK)',
        shortName: 'BTK "Sakhalin-3"',
        categoryLabel: 'Onshore Plant S3',
        location: 'Nogliki district, east coast of Sakhalin',
        description: 'Onshore gas plant run by Gazprom Dobycha Shelf. Receives raw gas and condensate from the Kirinskoye seabed pipeline (and later South Kirinskoye), cleans it, and sends sales gas to the SHV pipeline.',
        specs: [
            { label: 'Operator', value: 'Gazprom Dobycha Shelf' },
            { label: 'Feed', value: 'Kirinsky block gas & condensate' },
            { label: 'Units', value: 'Gas plant, tanks, flare' },
            { label: 'Output', value: 'To Sakhalin Head CS (SHV)' }
        ]
    },
    's3-gks': {
        code: 'Sakhalin Head CS',
        name: 'Sakhalin Head Compressor Station (SHV)',
        shortName: 'Sakhalin Head CS',
        categoryLabel: 'SHV Start Hub',
        location: 'Nogliki district, Sakhalin Island',
        description: 'The starting station of the Sakhalin–Khabarovsk–Vladivostok gas pipeline (operated by Gazprom Transgaz Tomsk). Boosts Sakhalin offshore gas to 9.8 MPa to send it under Nevelskoy Strait to the mainland.',
        specs: [
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' },
            { label: 'Pressure', value: '9.8 MPa (1220 mm pipe)' },
            { label: 'Gas sources', value: 'Sakhalin-3 & Sakhalin-1' },
            { label: 'Direction', value: 'To Nevelskoy Strait' }
        ]
    },
    's3-nevelskoy': {
        code: 'Nevelskoy Strait',
        name: 'SHV Subsea Crossing — Nevelskoy Strait',
        shortName: 'Nevelskoy Strait Crossing',
        categoryLabel: 'Subsea Crossing',
        location: 'Nevelskoy Strait (Cape Pogibi — Cape Lazarev)',
        description: 'Twin underwater gas pipes crossing the narrowest part of the strait (~7.5 km) from Sakhalin Island to Khabarovsk Krai. Buried under the seabed with valve stations on both shores.',
        specs: [
            { label: 'Crossing', value: 'Cape Pogibi — Cape Lazarev' },
            { label: 'Design', value: '2 pipes under the seabed' },
            { label: 'Width', value: '~7.5 km (narrowest point)' },
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' }
        ]
    },
    's3-ks-north': {
        code: 'CS-4 Amurskaya',
        name: 'CS-4 Amurskaya Compressor Station (SHV)',
        shortName: 'CS-4 Amurskaya (SHV)',
        categoryLabel: 'Line Compressor CS',
        location: 'Khabarovsk Krai, Nevelskoy Strait — Komsomolsk section',
        description: 'First mainland compressor station after Nevelskoy Strait (Gazprom Transgaz Tomsk). Keeps steady gas pressure across the northern taiga mountains on the way to Komsomolsk-on-Amur.',
        specs: [
            { label: 'Section', value: 'Nevelskoy → Komsomolsk' },
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' },
            { label: 'Pressure', value: '9.8 MPa' },
            { label: 'Region', value: 'Khabarovsk Krai' }
        ]
    },
    's1-komsomolsk': {
        code: 'Komsomolsk',
        name: 'Komsomolsk-on-Amur Gas Hub',
        shortName: 'Komsomolsk-on-Amur',
        categoryLabel: 'Mainland Hub',
        location: 'Khabarovsk Krai, left bank of the Amur River',
        description: 'Major industrial gas hub along the SHV pipeline (Gazprom Transgaz Tomsk). Supplies power plants, factories, and homes in the Komsomolsk-on-Amur area.',
        specs: [
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' },
            { label: 'Pipe / Pressure', value: '1220 mm • 9.8 MPa' },
            { label: 'Role', value: 'City & industry gas supply' },
            { label: 'Region', value: 'Khabarovsk Krai' }
        ]
    },
    's1-khabarovsk': {
        code: 'Khabarovsk',
        name: 'Khabarovsk Gas Hub (CS-6 Khabarovskaya)',
        shortName: 'Khabarovsk (CS-6)',
        categoryLabel: 'Mainland Hub',
        location: 'Khabarovsk — central energy hub of the Far East',
        description: 'Main distribution hub built around CS-6 Khabarovskaya (Gazprom Transgaz Tomsk). Routes gas south to Vladivostok, supplies Khabarovsk Krai, and links westward toward Power of Siberia.',
        specs: [
            { label: 'Main station', value: 'CS-6 Khabarovskaya' },
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' },
            { label: 'South leg', value: 'To Primorye & Vladivostok' },
            { label: 'West link', value: 'Power of Siberia connection' }
        ]
    },
    's3-ks-mainland': {
        code: 'CS-9 Dalnerechensk',
        name: 'CS-9 Dalnerechenskaya Compressor Station (SHV)',
        shortName: 'CS-9 Dalnerechenskaya',
        categoryLabel: 'Line Compressor CS',
        location: 'Southern SHV leg (Khabarovsk / Primorye border)',
        description: 'Key southern compressor station (Gazprom Transgaz Tomsk). Keeps 9.8 MPa pressure heading into Primorye and connects to the Far Eastern Route export branch to China.',
        specs: [
            { label: 'Section', value: 'Khabarovsk → Primorye' },
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' },
            { label: 'Role', value: 'Transit & Far Eastern Route' },
            { label: 'Pressure', value: '9.8 MPa' }
        ]
    },
    's3-ks-south': {
        code: 'CS-12 Primorskaya',
        name: 'CS-12 Primorskaya Compressor Station (SHV)',
        shortName: 'CS-12 Primorskaya (SHV)',
        categoryLabel: 'Line Compressor CS',
        location: 'Primorsky Krai (final stretch to Vladivostok)',
        description: 'Southern booster station (Gazprom Transgaz Tomsk) on the final stretch before Vladivostok. Ensures steady gas supply for Ussuriysk, Vladivostok power plants, and Russky Island.',
        specs: [
            { label: 'Section', value: 'Primorye → Vladivostok' },
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' },
            { label: 'Users', value: 'Primorye & Russky Island' },
            { label: 'Region', value: 'Primorsky Krai' }
        ]
    },
    's1-vladivostok': {
        code: 'Vladivostok',
        name: 'Vladivostok Pipeline Terminal (GDS)',
        shortName: 'Vladivostok (GDS)',
        categoryLabel: 'Southern SHV Hub',
        location: 'Primorsky Krai, Peter the Great Gulf',
        description: 'Main southern node of the 1,820+ km Sakhalin–Khabarovsk–Vladivostok gas pipeline (Gazprom Transgaz Tomsk). Supplies Vladivostok CHP-2 power plant and feeds gas across to Russky Island.',
        specs: [
            { label: 'Total length', value: '> 1,820 km (1220 mm)' },
            { label: 'Full capacity', value: 'Up to 28–30 bcm/year' },
            { label: 'Pressure', value: '9.8 MPa' },
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' }
        ]
    },
    's3-grs-russky': {
        code: 'Russky Island GDS',
        name: 'Vladivostok GDS (Russky Island) — SHV End Point',
        shortName: 'Russky Island GDS',
        categoryLabel: 'SHV End Point',
        location: 'Primorsky Krai, Russky Island (Eastern Bosphorus)',
        description: 'Final point of the Sakhalin–Khabarovsk–Vladivostok gas pipeline (Gazprom Transgaz Tomsk). After crossing the Eastern Bosphorus Strait, gas powers Russky Island\'s mini-power plants and FEFU campus.',
        specs: [
            { label: 'Status', value: 'Final node of SHV' },
            { label: 'Operator', value: 'Gazprom Transgaz Tomsk' },
            { label: 'Crossing', value: 'Eastern Bosphorus Strait' },
            { label: 'Users', value: 'Russky Island & FEFU' }
        ]
    }
};

// Простые переводы городов, рек, ориентиров и стран на карте
const EN_MAP_NAMES = {
    'Оха': 'Okha',
    'Ноглики': 'Nogliki',
    'Александровск-Сахалинский': 'Aleksandrovsk-Sakhalinsky',
    'Поронайск': 'Poronaysk',
    'Шахтёрск': 'Shakhtyorsk',
    'Холмск': 'Kholmsk',
    'Южно-Сахалинск': 'Yuzhno-Sakhalinsk',
    'Корсаков': 'Korsakov',
    'о. Тюлений': 'Tyuleny Is.',
    'о. Монерон': 'Moneron Is.',
    'Скалы «Три Брата»': 'Three Brothers Rocks',
    'Хребет Жданко': 'Zhdanko Ridge',
    'Мыс Крильон (Маяк)': 'Cape Krillon (Lighthouse)',
    'Охотск': 'Okhotsk',
    'Аян': 'Ayan',
    'Шантарские о-ва': 'Shantar Islands',
    'Николаевск-на-Амуре': 'Nikolayevsk-on-Amur',
    'Де-Кастри': 'De-Kastri',
    'Комсомольск-на-Амуре': 'Komsomolsk-on-Amur',
    'Советская Гавань': 'Sovetskaya Gavan',
    'Хабаровск': 'Khabarovsk',
    'Биробиджан': 'Birobidzhan',
    'Благовещенск': 'Blagoveshchensk',
    'Белогорск': 'Belogorsk',
    'Свободный': 'Svobodny',
    'Дальнереченск': 'Dalnerechensk',
    'оз. Ханка': 'Lake Khanka',
    'Уссурийск': 'Ussuriysk',
    'Находка': 'Nakhodka',
    'Владивосток': 'Vladivostok',
    'ХАБАРОВСКИЙ КРАЙ': 'KHABAROVSK KRAI',
    'ПРИМОРСКИЙ КРАЙ': 'PRIMORSKY KRAI',
    'АМУРСКАЯ ОБЛАСТЬ': 'AMUR OBLAST',
    '← Связка с «Силой Сибири»': '← Link to Power of Siberia',
    'КИТАЙ': 'CHINA',
    'КНДР': 'NORTH KOREA',
    'РЕСПУБЛИКА КОРЕЯ': 'SOUTH KOREA',
    'ЯПОНИЯ': 'JAPAN',
    'КУРИЛЬСКИЕ О-ВА': 'KURIL ISLANDS',
    'Амурские столбы': 'Amur Pillars',
    'Космодром «Восточный»': 'Vostochny Cosmodrome',
    'Амурский мост': 'Amur Bridge',
    'Русский мост': 'Russky Bridge',
    'Мост Золотой Рог': 'Zolotoy Bridge',
    'р. Амур': 'Amur River',
    'р. Уссури': 'Ussuri River',
    'р. Зея': 'Zeya River',
    'р. Бурея': 'Bureya River'
};

function cacheOriginalFacilityTexts() {
    const all = [].concat(
        typeof FACILITIES_DATA !== 'undefined' ? FACILITIES_DATA : [],
        typeof SAKHALIN1_FACILITIES_DATA !== 'undefined' ? SAKHALIN1_FACILITIES_DATA : []
    );
    all.forEach(fac => {
        if (fac._ru) return;
        fac._ru = {
            code: fac.code,
            name: fac.name,
            shortName: fac.shortName,
            categoryLabel: fac.categoryLabel,
            location: fac.location,
            description: fac.description,
            specs: fac.specs ? fac.specs.map(s => ({ label: s.label, value: s.value })) : [],
            subTabs: fac.subTabs ? fac.subTabs.map(st => ({
                tabLabel: st.tabLabel,
                badge: st.badge,
                code: st.code,
                name: st.name,
                location: st.location,
                description: st.description,
                specs: st.specs ? st.specs.map(s => ({ label: s.label, value: s.value })) : []
            })) : null
        };
    });
}

function applyFacilityTextsForLang() {
    cacheOriginalFacilityTexts();
    const en = isEn();
    const all = [].concat(
        typeof FACILITIES_DATA !== 'undefined' ? FACILITIES_DATA : [],
        typeof SAKHALIN1_FACILITIES_DATA !== 'undefined' ? SAKHALIN1_FACILITIES_DATA : []
    );

    all.forEach(fac => {
        const src = (en && EN_FACILITIES[fac.id]) ? EN_FACILITIES[fac.id] : fac._ru;
        if (!src) return;
        fac.code = src.code;
        fac.name = src.name;
        fac.shortName = src.shortName;
        fac.categoryLabel = src.categoryLabel;
        fac.location = src.location;
        fac.description = src.description;
        fac.specs = src.specs;
        if (fac.subTabs && src.subTabs) {
            for (let i = 0; i < fac.subTabs.length; i++) {
                const t = src.subTabs[i];
                if (!t) continue;
                fac.subTabs[i].tabLabel = t.tabLabel;
                fac.subTabs[i].badge = t.badge;
                fac.subTabs[i].code = t.code;
                fac.subTabs[i].name = t.name;
                fac.subTabs[i].location = t.location;
                fac.subTabs[i].description = t.description;
                fac.subTabs[i].specs = t.specs;
            }
        }
    });
}

function updateDomMarkersForLang() {
    const en = isEn();
    const translateLabel = (ruStr) => (en && EN_MAP_NAMES[ruStr]) ? EN_MAP_NAMES[ruStr] : ruStr;

    // 1. Объекты Сахалин-2 и ДВ
    if (typeof FACILITIES_DATA !== 'undefined' && typeof markerDomMap !== 'undefined') {
        FACILITIES_DATA.forEach(fac => {
            const entry = markerDomMap.get(fac.id);
            if (!entry || !entry.el) return;
            const txt = entry.el.querySelector('.marker-text');
            if (txt) txt.textContent = fac.code;
        });
    }
    if (typeof SAKHALIN1_FACILITIES_DATA !== 'undefined' && typeof s1MarkerDomMap !== 'undefined') {
        SAKHALIN1_FACILITIES_DATA.forEach(fac => {
            const entry = s1MarkerDomMap.get(fac.id);
            if (!entry || !entry.el) return;
            const txt = entry.el.querySelector('.marker-text');
            if (txt) txt.textContent = fac.code;
        });
    }

    // 2. Города Сахалина
    if (typeof cityDomList !== 'undefined' && typeof CITIES_DATA !== 'undefined') {
        for (let i = 0; i < cityDomList.length && i < CITIES_DATA.length; i++) {
            const spans = cityDomList[i].el.querySelectorAll('span');
            if (spans.length >= 2) spans[1].textContent = translateLabel(CITIES_DATA[i].name);
        }
    }

    // 3. Природа Сахалина
    if (typeof natureDomList !== 'undefined' && typeof NATURE_LANDMARKS_DATA !== 'undefined') {
        for (let i = 0; i < natureDomList.length && i < NATURE_LANDMARKS_DATA.length; i++) {
            const spans = natureDomList[i].el.querySelectorAll('span');
            if (spans.length >= 2) spans[1].textContent = translateLabel(NATURE_LANDMARKS_DATA[i].name);
        }
    }

    // 4. Города, регионы и соседние страны ДВ
    if (typeof s1CityDomList !== 'undefined' && typeof FAR_EAST_CITIES_DATA !== 'undefined') {
        for (let i = 0; i < s1CityDomList.length && i < FAR_EAST_CITIES_DATA.length; i++) {
            const cData = FAR_EAST_CITIES_DATA[i];
            const el = s1CityDomList[i].el;
            const label = translateLabel(cData.name);
            if (cData.isRegion || cData.isTransit || cData.isNeighbor) {
                el.textContent = label;
            } else {
                const spans = el.querySelectorAll('span');
                if (spans.length >= 2) spans[1].textContent = label;
            }
        }
    }

    // 5. Достопримечательности ДВ (Амурские столбы, Восточный, мосты)
    if (typeof farEastAlive !== 'undefined' && Array.isArray(farEastAlive.domLabels)) {
        farEastAlive.domLabels.forEach(item => {
            if (!item || !item.el) return;
            if (!item._ruText) {
                const spans = item.el.querySelectorAll('span');
                item._ruText = spans.length >= 2 ? spans[1].textContent : item.el.textContent;
            }
            const label = translateLabel(item._ruText);
            const spans = item.el.querySelectorAll('span');
            if (spans.length >= 2) spans[1].textContent = label;
            else item.el.textContent = label;
        });
    }
}

function updateProjectHeaderAndLegendForLang() {
    const en = isEn();
    const brandSub = document.getElementById('header-brand-sub');
    const brandTitle = document.getElementById('header-brand-title');
    const resetText = document.getElementById('desktop-reset-text');

    if (en) {
        const metaEn = {
            sakhalin2: { sub: 'Sakhalin Energy', title: 'Sakhalin — Sakhalin-2 Project' },
            sakhalin1: { sub: 'Offshore & Oil Export', title: 'Sakhalin-1 Project' },
            sakhalin3: { sub: 'Subsea Production', title: 'Sakhalin-3 Project' },
            shv:       { sub: 'Main Gas Pipeline', title: 'Sakhalin–Vladivostok (SHV)' }
        }[activeProject];
        if (brandSub && metaEn) brandSub.textContent = metaEn.sub;
        if (brandTitle && metaEn) brandTitle.textContent = metaEn.title;
        if (resetText) resetText.textContent = 'Overview';
    } else {
        const metaRu = {
            sakhalin2: { sub: 'Сахалинская Энергия', title: 'о. Сахалин — «Сахалин-2»' },
            sakhalin1: { sub: 'Шельф и экспорт нефти', title: 'Проект «Сахалин-1»' },
            sakhalin3: { sub: 'Подводная добыча • ПДК', title: 'Проект «Сахалин-3»' },
            shv:       { sub: 'Магистральный газопровод', title: 'МГП Сахалин — Владивосток' }
        }[activeProject];
        if (brandSub && metaRu) brandSub.textContent = metaRu.sub;
        if (brandTitle && metaRu) brandTitle.textContent = metaRu.title;
        if (resetText) resetText.textContent = 'Обзор';
    }

    // Обновляем фильтры с количеством
    const activeList = typeof getActiveFacilitiesList === 'function' ? getActiveFacilitiesList() : [];
    const cntAll = activeList.length;
    const cntOff = activeList.filter(f => f.category === 'offshore').length;
    const cntOn = activeList.filter(f => f.category === 'onshore').length;
    const cntMar = activeList.filter(f => f.category === 'maritime').length;
    const fAll = document.getElementById('filter-tab-all');
    const fOff = document.getElementById('filter-tab-offshore');
    const fOn = document.getElementById('filter-tab-onshore');
    const fMar = document.getElementById('filter-tab-maritime');
    if (fAll) fAll.textContent = `${tr('Все', 'All')} (${cntAll})`;
    if (fOff) fOff.textContent = `${tr('Шельф', 'Offshore')} (${cntOff})`;
    if (fOn) fOn.textContent = `${tr('Берег', 'Onshore')} (${cntOn})`;
    if (fMar) fMar.textContent = `${tr('Флот', 'Fleet')} (${cntMar})`;

    // Актуальные 6-пунктовые условные обозначения карты
    renderProjectLegend(activeProject, en);
}

function renderProjectLegend(projId, en) {
    const legendGrid = document.getElementById('sidebar-legend-grid');
    if (!legendGrid) return;

    const dot = (cls) => `<span class="w-2.5 h-2.5 rounded-full ${cls} border border-white/90 inline-block shrink-0"></span>`;
    const line = (cls) => `<span class="w-4 h-1.5 rounded-full ${cls} inline-block shrink-0"></span>`;
    const dash = (color) => `<span class="w-4 h-0 border-t-2 border-dashed inline-block shrink-0" style="border-color:${color};"></span>`;
    const cross = `<span class="w-3 h-3 rounded bg-red-600 text-white text-[8px] font-black inline-flex items-center justify-center shrink-0">✕</span>`;

    const presets = {
        sakhalin2: en ? [
            [dot('bg-sky-500'), 'Offshore platforms (PA-A/B, LUN-A)'],
            [dot('bg-orange-500'), 'OPF, BS-2, LNG Plant & OET'],
            [dot('bg-amber-500'), 'Gas metering nodes (UOUG)'],
            [dot('bg-rose-500'), 'Aniva Lighthouse & fleet'],
            [line('bg-emerald-500'), 'Trans-Sakhalin lines (~800 km)'],
            [dash('#34d399'), 'LNG / oil tanker sea lanes']
        ] : [
            [dot('bg-sky-500'), 'Платформы (ПА-А/Б, ЛУН-А)'],
            [dot('bg-orange-500'), 'ОБТК, НКС-2, Завод СПГ, ТОН'],
            [dot('bg-amber-500'), 'Узлы учёта газа (УОУГ)'],
            [dot('bg-rose-500'), 'Маяк Анива и морской флот'],
            [line('bg-emerald-500'), 'Трубопроводы S2 (~800 км)'],
            [dash('#34d399'), 'Маршруты газовозов и танкеров']
        ],
        sakhalin1: en ? [
            [dot('bg-orange-500'), 'Orlan & Berkut platforms'],
            [dot('bg-amber-400'), 'Yastreb rig & Odoptu pad'],
            [dot('bg-orange-600'), 'Chayvo OPF & De-Kastri OET'],
            [dot('bg-orange-300'), 'Sokol crude export tankers'],
            [line('bg-orange-500'), 'Oil pipeline (226 km to mainland)'],
            [dash('#fb923c'), 'Tanker export lane (Tatar St.)']
        ] : [
            [dot('bg-orange-500'), 'Платформы «Орлан» и «Беркут»'],
            [dot('bg-amber-400'), 'БУ «Ястреб» и площадка Одопту'],
            [dot('bg-orange-600'), 'БКП Чайво и терминал Де-Кастри'],
            [dot('bg-orange-300'), 'Танкеры нефти сорта Sokol'],
            [line('bg-orange-500'), 'Нефтепровод S1 (226 км)'],
            [dash('#fb923c'), 'Морской экспорт (Тат. пролив)']
        ],
        sakhalin3: en ? [
            [dot('bg-yellow-400'), 'Kirinskoye subsea unit (Active)'],
            [cross, 'South Kirinskoye (In dev.)'],
            [dot('bg-sky-400'), 'BTK onshore gas plant'],
            [line('bg-sky-400'), 'Seabed gas pipeline to shore'],
            [dash('#facc15'), 'Subsea umbilical control line'],
            [dot('bg-slate-400'), 'Zero surface platforms (X-Ray)']
        ] : [
            [dot('bg-yellow-400'), 'ПДК Киринское (работает)'],
            [cross, 'Южно-Киринское (в освоении)'],
            [dot('bg-sky-400'), 'БТК «Сахалин-3» (берег)'],
            [line('bg-sky-400'), 'Донный газопровод ПДК → БТК'],
            [dash('#facc15'), 'Кабель управления с берега'],
            [dot('bg-slate-400'), 'Подводная добыча (без платформ)']
        ],
        shv: en ? [
            [dot('bg-sky-400'), 'Nevelskoy Strait subsea crossing'],
            [dot('bg-red-500'), 'Head CS Sakhalin & Mainland CS'],
            [dot('bg-rose-400'), 'Khabarovsk & Russky Island GDS'],
            [line('bg-red-500'), 'SHV gas trunkline (> 1,820 km)'],
            [dash('#f87171'), 'Power of Siberia west link'],
            [dash('#fbbf24'), 'Far Eastern export branch']
        ] : [
            [dot('bg-sky-400'), 'Переход через пр. Невельского'],
            [dot('bg-red-500'), 'ГКС «Сахалин» и материковые КС'],
            [dot('bg-rose-400'), 'ГРС Хабаровск и о. Русский'],
            [line('bg-red-500'), 'Магистраль СХВ (> 1 820 км)'],
            [dash('#f87171'), 'Связка с «Силой Сибири»'],
            [dash('#fbbf24'), '«Дальневосточный маршрут»']
        ]
    };

    const items = presets[projId] || presets.sakhalin2;
    legendGrid.innerHTML = items.map(([icon, label]) => `
        <div class="flex items-center gap-1.5 min-w-0">
            ${icon}
            <span class="truncate" title="${label}">${label}</span>
        </div>
    `).join('');
}

function applyLanguageToUI(silent = true) {
    const en = isEn();
    document.documentElement.lang = en ? 'en' : 'ru';

    applyFacilityTextsForLang();
    updateDomMarkersForLang();
    updateProjectHeaderAndLegendForLang();

    // Кнопки переключения языка (показывают активный язык)
    ['lang-label-desktop', 'lang-label-mobile', 'lang-label-globe'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = en ? 'EN' : 'RU';
    });

    // Вкладки проектов (ПК)
    const tabMapDesktop = {
        sakhalin1: tr('Сахалин-1', 'Sakhalin-1'),
        sakhalin2: tr('Сахалин-2', 'Sakhalin-2'),
        sakhalin3: tr('Сахалин-3', 'Sakhalin-3'),
        shv:       tr('СХВ', 'SHV')
    };
    const tabMapMobile = {
        sakhalin1: tr('Сах-1', 'S-1'),
        sakhalin2: tr('Сах-2', 'S-2'),
        sakhalin3: tr('Сах-3', 'S-3'),
        shv:       tr('СХВ', 'SHV')
    };
    document.querySelectorAll('#desktop-project-tabs .project-tab-btn').forEach(btn => {
        const sp = btn.querySelectorAll('span');
        if (sp.length >= 2 && tabMapDesktop[btn.dataset.project]) sp[1].textContent = tabMapDesktop[btn.dataset.project];
    });
    document.querySelectorAll('header .md\\:hidden .project-tab-btn').forEach(btn => {
        const sp = btn.querySelector('span');
        if (sp && tabMapMobile[btn.dataset.project]) sp.textContent = tabMapMobile[btn.dataset.project];
    });
    const brandCard = document.getElementById('btn-brand-title-card');
    if (brandCard) brandCard.title = tr('О проекте', 'About project');

    // Верхние кнопки действий (ПК)
    const dTour = document.getElementById('desktop-tour-text');
    if (dTour) dTour.textContent = (typeof tourState !== 'undefined' && tourState.active) ? tr('Стоп тур', 'Stop Tour') : tr('Автотур', 'Tour');
    const dReset = document.getElementById('desktop-reset-text');
    if (dReset) dReset.textContent = tr('Обзор', 'Reset');
    const dSettings = document.getElementById('desktop-settings-text');
    if (dSettings) dSettings.textContent = tr('Настройки', 'Settings');
    const dLabels = document.getElementById('desktop-labels-text');
    if (dLabels) dLabels.textContent = areLabelsVisible ? tr('Метки: ВКЛ', 'Labels: ON') : tr('Метки: ВЫКЛ', 'Labels: OFF');
    const dTop = document.querySelector('#btn-top-view span');
    if (dTop) dTop.textContent = tr('Сверху', 'Top');

    // Погода (3 режима)
    const dWeather = document.getElementById('desktop-weather-text');
    if (dWeather && typeof weatherModeIndex !== 'undefined') {
        const wLabels = en ? ['Summer • Day', 'Snow • Day', 'Snow • Night'] : ['Лето • День', 'Снег • День', 'Снег • Ночь'];
        dWeather.textContent = wLabels[weatherModeIndex] || wLabels[0];
    }

    // Левая панель и мобильный док
    const sbTitle = document.getElementById('sidebar-title-text');
    if (sbTitle) sbTitle.textContent = tr('Инфраструктура на карте', 'Map Facilities');
    const sbSearch = document.getElementById('facility-search');
    if (sbSearch) sbSearch.placeholder = tr('Поиск платформы, завода, судна...', 'Search platform, plant, ship...');
    const legTitle = document.getElementById('sidebar-legend-title');
    if (legTitle) legTitle.textContent = tr('Условные обозначения карты:', 'Map legend:');

    const mObj = document.querySelector('#btn-mobile-objects span');
    if (mObj) mObj.textContent = tr('Объекты', 'Objects');
    const mTour = document.getElementById('mobile-tour-text');
    if (mTour) mTour.textContent = (typeof tourState !== 'undefined' && tourState.active) ? tr('Стоп', 'Stop') : tr('Тур', 'Tour');
    const mTop = document.querySelector('#btn-mobile-top span');
    if (mTop) mTop.textContent = tr('Сверху', 'Top');
    const mReset = document.querySelector('#btn-mobile-reset span');
    if (mReset) mReset.textContent = tr('Обзор', 'Reset');

    // Кнопки мобильных шторок
    if (typeof setMobileSidebarFullscreen === 'function') {
        setMobileSidebarFullscreen(Boolean(isMobileSidebarFullscreen));
    }
    if (typeof setMobileDetailStage === 'function' && typeof mobileDetailStage !== 'undefined') {
        setMobileDetailStage(mobileDetailStage);
    }

    // Карточка объекта (статические кнопки)
    const webSpan = document.querySelector('#card-website-btn span');
    if (webSpan) webSpan.textContent = tr('Перейти на сайт объекта', 'Visit official website');
    const editUrlSpan = document.querySelector('#btn-edit-url span');
    if (editUrlSpan) editUrlSpan.textContent = tr('Изменить ссылку', 'Edit link');
    const urlLabel = document.querySelector('#url-editor-box label');
    if (urlLabel) urlLabel.textContent = tr('Собственная ссылка для перехода:', 'Custom link URL:');

    // Нижняя подсказка управления (ПК)
    const deskHintMain = document.getElementById('desktop-hint-main');
    if (deskHintMain) deskHintMain.textContent = tr('Нажмите на платформу, маяк или танкер', 'Click any platform, plant or ship');
    const deskHintKeys = document.getElementById('desktop-hint-keys');
    if (deskHintKeys) deskHintKeys.textContent = tr('ЛКМ: вращение • Колесо: масштаб • ПКМ: сдвиг', 'Drag: rotate • Scroll: zoom • Right-drag: pan');

    // Стартовый 3D-глобус
    const gSub = document.getElementById('globe-title-sub');
    if (gSub) gSub.textContent = tr('Интерактивный 3D-атлас', 'Interactive 3D Atlas');
    const gMain = document.getElementById('globe-title-main');
    if (gMain) gMain.textContent = tr('Проекты Сахалина и ДВ', 'Sakhalin & Far East Energy');
    const gPin1 = document.getElementById('globe-pin-title');
    if (gPin1) gPin1.textContent = tr('о. Сахалин', 'Sakhalin Island');
    const gPin2 = document.getElementById('globe-pin-sub');
    if (gPin2) gPin2.textContent = tr('Нажмите, чтобы открыть', 'Click to explore');
    const gFindMob = document.getElementById('globe-find-mob');
    if (gFindMob) gFindMob.textContent = tr('Сахалин', 'Sakhalin');
    const gFindDesk = document.getElementById('globe-find-desk');
    if (gFindDesk) gFindDesk.textContent = tr('Найти Сахалин', 'Find Sakhalin');
    const gHint = document.getElementById('globe-rotate-hint');
    if (gHint) gHint.textContent = tr('Крутите планету • Нажмите на точку у Сахалина', 'Spin the globe • Click the pin on Sakhalin');
    const gPlatLabel = document.getElementById('globe-platform-label');
    if (gPlatLabel) gPlatLabel.textContent = tr('Платформа (интерфейс)', 'Device layout');
    const gEnter = document.querySelector('#btn-globe-enter-main span');
    if (gEnter) gEnter.textContent = tr('Открыть карту', 'Open Map');
    document.querySelectorAll('.globe-mode-btn').forEach(btn => {
        const sp = btn.querySelector('span');
        if (!sp) return;
        if (btn.dataset.platform === 'auto') sp.textContent = tr('Авто', 'Auto');
        else if (btn.dataset.platform === 'mobile') sp.textContent = tr('Телефон', 'Mobile');
        else if (btn.dataset.platform === 'desktop') sp.textContent = tr('ПК', 'Desktop');
    });
    document.querySelectorAll('.globe-proj-btn').forEach(btn => {
        if (tabMapMobile[btn.dataset.startProj]) btn.textContent = tabMapMobile[btn.dataset.startProj];
    });

    // Карточка «Скалы Три Брата» и кнопка выхода из кино-режима
    const tbSub = document.getElementById('tb-sub');
    if (tbSub) tbSub.textContent = tr('Памятник природы Сахалина', 'Sakhalin Natural Landmark');
    const tbTitle = document.getElementById('tb-title');
    if (tbTitle) tbTitle.textContent = tr('Скалы «Три Брата»', 'Three Brothers Rocks');
    const tbDesc = document.getElementById('tb-desc');
    if (tbDesc) tbDesc.textContent = tr(
        'Знаменитая группа из трёх столбообразных базальтовых скал-кекуров в водах Татарского пролива у западного побережья Сахалина, рядом с Александровском-Сахалинским. Один из главных природных символов острова, упомянутый А. П. Чеховым в книге «Остров Сахалин».',
        'A famous trio of tall basalt sea stacks standing in the Tatar Strait off the west coast of Sakhalin, near Aleksandrovsk-Sakhalinsky. One of the island\'s best-known natural symbols, featured in Anton Chekhov\'s book "Sakhalin Island".'
    );
    const tbCoordLbl = document.getElementById('tb-coord-label');
    if (tbCoordLbl) tbCoordLbl.textContent = tr('Координаты', 'Coordinates');
    const tbCoordVal = document.getElementById('tb-coord-val');
    if (tbCoordVal) tbCoordVal.textContent = tr('50°53′ с. ш. 142°07′ в. д.', '50°53′ N 142°07′ E');
    const tbWikiBtn = document.getElementById('tb-wiki-btn');
    const tbWikiText = document.getElementById('tb-wiki-text');
    if (tbWikiText) tbWikiText.textContent = tr('Читать в Википедии', 'Read on Wikipedia');
    if (tbWikiBtn) {
        tbWikiBtn.href = en
            ? 'https://en.wikipedia.org/wiki/Aleksandrovsk-Sakhalinsky'
            : 'https://ru.wikipedia.org/wiki/%D0%A2%D1%80%D0%B8_%D0%91%D1%80%D0%B0%D1%82%D0%B0_(%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B2%D0%B0,_%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD)';
    }
    const cinExit = document.getElementById('cinema-exit-label');
    if (cinExit) cinExit.textContent = tr('Вернуть интерфейс', 'Show HUD');

    // Баннер проверки ссылок
    const lTitle = document.getElementById('link-fb-title');
    if (lTitle) lTitle.textContent = tr('Ссылка временно недоступна', 'Link currently unavailable');
    const lDesc = document.getElementById('link-fb-desc');
    if (lDesc) lDesc.textContent = tr(
        'Ресурс не отвечает или заблокировал подключение. Сайты российских компаний (gazprom.ru, rosneft.ru) часто не открываются при включённом VPN или без сертификата Минцифры — попробуйте отключить VPN либо откройте статью в Википедии.',
        'The website is not responding or blocked the connection. Corporate sites (gazprom.ru, rosneft.ru) often block VPN/foreign IPs or use local SSL certificates — try disabling VPN or open the Wikipedia article instead.'
    );
    const lWikiText = document.getElementById('link-fb-wiki-text');
    if (lWikiText) lWikiText.textContent = tr('Открыть в Википедии', 'Read on Wikipedia');
    const lSearch = document.getElementById('link-fb-search');
    if (lSearch) lSearch.textContent = tr('Найти в поиске', 'Search online');
    const lOpen = document.getElementById('link-fb-open');
    if (lOpen) lOpen.textContent = tr('Открыть всё равно', 'Open anyway');

    // Если открыто окно «О проекте» или «Настройки», обновляем их текст под новый язык
    const pModal = document.getElementById('project-info-modal');
    if (pModal && !pModal.classList.contains('hidden') && typeof openProjectInfoModal === 'function') {
        openProjectInfoModal(true);
    }
    if (typeof syncSettingsModalUI === 'function') {
        syncSettingsModalUI();
    }

    // Перерисовываем динамические списки и открытую карточку
    if (typeof renderSidebarList === 'function') renderSidebarList();
    if (typeof activeFacilityId !== 'undefined' && activeFacilityId && typeof renderFacilityCardContent === 'function') {
        const activeFac = (typeof getActiveFacilitiesList === 'function')
            ? getActiveFacilitiesList().find(f => f.id === activeFacilityId)
            : null;
        if (activeFac) renderFacilityCardContent(activeFac, 0);
    }

    if (!silent && typeof showToast === 'function') {
        showToast(en ? 'Language switched to English' : 'Язык переключён на русский');
    }
}

function setLanguage(lang, silent = false) {
    currentLang = (lang === 'en') ? 'en' : 'ru';
    try { localStorage.setItem('sakhalin_map_lang', currentLang); } catch (_) {}
    applyLanguageToUI(silent);
}

function toggleLanguage() {
    setLanguage(currentLang === 'en' ? 'ru' : 'en', false);
}
